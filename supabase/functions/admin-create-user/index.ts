// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const auth = req.headers.get('Authorization') || '';
    const token = auth.replace('Bearer ', '');

    const { data: userData, error: userError } = await supabase.auth.getUser(
      token
    );
    if (userError || !userData?.user?.id) {
      console.error('[admin-create-user] Auth error:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    const adminUserId = userData.user.id;

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUserId);

    if (rolesError) {
      console.error('[admin-create-user] Roles query error:', rolesError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error checking permissions' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const isAdmin = (roles || []).some(
      (r: { role: string }) => r.role === 'admin'
    );

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    const body = await req.json();
    const {
      email,
      password,
      full_name,
      company,
      specialty_id,
      roles: newRoles,
    } = body;

    if (
      !email ||
      !password ||
      !full_name ||
      !Array.isArray(newRoles) ||
      newRoles.length === 0
    ) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid payload' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // If a specialty_id was provided, validate it exists in medical_specialties
    if (specialty_id) {
      try {
        const { data: specData, error: specErr } = await supabase
          .from('medical_specialties')
          .select('id')
          .eq('id', specialty_id)
          .limit(1);

        if (specErr) {
          console.error('[admin-create-user] Specialty lookup error:', specErr);
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Error validating specialty',
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          );
        }

        if (!specData || specData.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'specialty_id not found' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          );
        }
      } catch (err) {
        console.error(
          '[admin-create-user] Unexpected specialty validation error:',
          err
        );
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Unexpected error validating specialty',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    }

    const { data: createRes, error: createErr } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Confirma email automaticamente
        user_metadata: {
          full_name,
          company: company || '',
          specialty_id: specialty_id || null,
        },
      });

    if (createErr) {
      console.error('[admin-create-user] Create user error:', createErr);

      // If the email already exists in Auth, try to find the corresponding profile
      const isEmailExists =
        (createErr &&
          (createErr.code === 'email_exists' || createErr.status === 422)) ||
        (createErr &&
          createErr.__isAuthError &&
          createErr.code === 'email_exists');

      if (isEmailExists) {
        try {
          const { data: existingProfile, error: existingProfileErr } =
            await supabase
              .from('profiles')
              .select('id')
              .eq('email', email)
              .limit(1)
              .single();

          if (existingProfileErr && existingProfileErr.code !== 'PGRST116') {
            // PGRST116: no rows found (Postgrest). If other error, log and return 500
            console.error(
              '[admin-create-user] Error querying profiles for existing email:',
              existingProfileErr
            );
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Error checking existing profile',
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
              }
            );
          }

          if (existingProfile && existingProfile.id) {
            const newUserId = existingProfile.id;
            console.log(
              '[admin-create-user] Email exists in Auth but profile found, reusing profile id',
              newUserId
            );

            // Ensure roles are inserted for the existing user
            for (const role of newRoles) {
              const { data: roleData, error: roleError } = await supabase
                .from('user_roles')
                .insert({ user_id: newUserId, role, created_by: adminUserId });

              if (roleError) {
                console.error(
                  '[admin-create-user] Role insert error for existing user:',
                  roleError,
                  'role:',
                  role
                );
              } else {
                console.log(
                  '[admin-create-user] Role inserted for existing user',
                  newUserId,
                  'role',
                  role,
                  'rows:',
                  roleData?.length || 0
                );
              }
            }

            return new Response(
              JSON.stringify({ success: true, user_id: newUserId }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
              }
            );
          }

          // No profile found - try to get user from auth and create profile
          console.log(
            '[admin-create-user] No profile found, fetching user from auth to create profile'
          );
          const { data: authUsers, error: listError } =
            await supabase.auth.admin.listUsers();

          if (listError) {
            console.error(
              '[admin-create-user] Error listing users from auth:',
              listError
            );
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Error listing users from auth',
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
              }
            );
          }

          const existingAuthUser = authUsers?.users?.find(
            (u: any) => u.email === email
          );

          if (!existingAuthUser) {
            console.error(
              '[admin-create-user] Email exists but user not found in auth list'
            );
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Email exists but user not found in auth',
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
              }
            );
          }

          const newUserId = existingAuthUser.id;
          console.log(
            '[admin-create-user] Found existing auth user, creating profile for id:',
            newUserId
          );

          // Create profile for existing auth user
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert(
              {
                id: newUserId,
                email,
                full_name,
                company: company || '',
                specialty_id: specialty_id || null,
              },
              { onConflict: 'id' }
            );

          if (profileError) {
            console.error(
              '[admin-create-user] Profile upsert error for existing auth user:',
              profileError
            );
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Error creating profile for existing user',
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
              }
            );
          }

          console.log(
            '[admin-create-user] Profile created for existing auth user',
            newUserId
          );

          // Insert roles
          for (const role of newRoles) {
            const { data: roleData, error: roleError } = await supabase
              .from('user_roles')
              .insert({ user_id: newUserId, role, created_by: adminUserId });

            if (roleError) {
              console.error(
                '[admin-create-user] Role insert error:',
                roleError,
                'role:',
                role
              );
            } else {
              console.log(
                '[admin-create-user] Role inserted',
                newUserId,
                'role',
                role
              );
            }
          }

          return new Response(
            JSON.stringify({ success: true, user_id: newUserId }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          );
        } catch (err) {
          console.error(
            '[admin-create-user] Unexpected error handling existing email:',
            err
          );
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Unexpected error handling existing email',
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          );
        }
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: createErr.message || 'Create user failed',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    if (!createRes?.user?.id) {
      console.error('[admin-create-user] No user ID in response');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Create user failed - no user ID',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const newUserId = createRes.user.id;

    // Inserir perfil
    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: newUserId,
        email,
        full_name,
        company: company || '',
        specialty_id: specialty_id || null,
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      console.error('[admin-create-user] Profile insert error:', profileError);
      // Não retorna erro aqui, continua com roles
    }

    // Inserir roles
    for (const role of newRoles) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: newUserId, role, created_by: adminUserId });

      if (roleError) {
        console.error(
          '[admin-create-user] Role insert error:',
          roleError,
          'for role:',
          role
        );
        // Continua tentando inserir outras roles
      }
    }

    return new Response(JSON.stringify({ success: true, user_id: newUserId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[admin-create-user] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
