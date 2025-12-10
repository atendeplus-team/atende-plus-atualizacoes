-- Add cancelled_at column to tickets table
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- Add comment to document the column
COMMENT ON COLUMN public.tickets.cancelled_at IS 'Timestamp when the ticket was cancelled';
