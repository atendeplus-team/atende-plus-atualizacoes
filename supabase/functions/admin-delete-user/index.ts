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
      console.error('[admin-delete-user] Auth error:', userError);
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
      console.error('[admin-delete-user] Roles query error:', rolesError);
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
    const { user_id } = body;

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'user_id is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('[admin-delete-user] Deleting user:', user_id);

    // Delete from user_roles
    const { error: rolesDeleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', user_id);

    if (rolesDeleteError) {
      console.error(
        '[admin-delete-user] Error deleting roles:',
        rolesDeleteError
      );
    }

    // Delete from profiles
    const { error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user_id);

    if (profileDeleteError) {
      console.error(
        '[admin-delete-user] Error deleting profile:',
        profileDeleteError
      );
    }

    // Delete from auth.users
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
      user_id
    );

    if (authDeleteError) {
      console.error(
        '[admin-delete-user] Error deleting from auth:',
        authDeleteError
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: authDeleteError.message || 'Failed to delete user from auth',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log('[admin-delete-user] User deleted successfully:', user_id);

    return new Response(JSON.stringify({ success: true, user_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[admin-delete-user] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
