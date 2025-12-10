-- Add printer settings to company_settings
alter table public.company_settings
  add column if not exists print_server_url text,
  add column if not exists printer_ip text,
  add column if not exists printer_port integer default 9100;
