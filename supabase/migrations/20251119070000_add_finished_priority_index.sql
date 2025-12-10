-- Index para acelerar busca dos últimos tickets finalizados por prioridade
CREATE INDEX IF NOT EXISTS tickets_finished_priority_idx ON tickets (finished_at DESC, priority);
