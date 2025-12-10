-- Create queues/services table
CREATE TABLE public.queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tickets/passwords table
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES public.queues(id) ON DELETE CASCADE,
  ticket_number INT NOT NULL,
  prefix VARCHAR(5),
  display_number VARCHAR(20) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  called_at TIMESTAMP WITH TIME ZONE,
  served_at TIMESTAMP WITH TIME ZONE,
  operator_name VARCHAR(100),
  counter VARCHAR(50),
  UNIQUE(queue_id, ticket_number, created_at)
);

-- Enable RLS
ALTER TABLE public.queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Public read access for queues (everyone can see available queues)
CREATE POLICY "Anyone can view active queues"
ON public.queues
FOR SELECT
USING (is_active = true);

-- Public read/create access for tickets (kiosk can create, display can read)
CREATE POLICY "Anyone can view tickets"
ON public.tickets
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create tickets"
ON public.tickets
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update tickets"
ON public.tickets
FOR UPDATE
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_queues_updated_at
BEFORE UPDATE ON public.queues
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for tickets (for display panel)
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;