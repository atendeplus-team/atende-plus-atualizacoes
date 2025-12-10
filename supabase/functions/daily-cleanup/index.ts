// @ts-ignore: Deno runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore: Deno runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // @ts-ignore: Deno runtime environment variables
    const supabaseClient = createClient(
      // @ts-ignore: Deno runtime
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore: Deno runtime
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate date threshold (tickets older than 1 day)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Delete old served and cancelled tickets
    const { data: deletedTickets, error: deleteError } = await supabaseClient
      .from('tickets')
      .delete()
      .in('status', ['served', 'cancelled'])
      .lt('created_at', oneDayAgo.toISOString())
      .select('id');

    if (deleteError) {
      console.error('Error deleting old tickets:', deleteError);
      throw deleteError;
    }

    const deletedCount = deletedTickets?.length || 0;

    // Note: ticket_logs are preserved (cascade delete is only on ticket deletion)
    // Logs remain for audit trail even after tickets are deleted

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount,
        message: `Successfully deleted ${deletedCount} old tickets. Logs preserved for audit.`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Cleanup error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
