-- Criar tabela para armazenar credenciais do Google (suporte a múltiplas contas)
CREATE TABLE IF NOT EXISTS google_credentials (
  id SERIAL PRIMARY KEY,
  conta_id VARCHAR(100) NOT NULL UNIQUE, -- Identificador único da conta (ex: atendente1, atendente2, atendente3)
  nome_conta VARCHAR(200) NOT NULL, -- Nome descritivo da conta
  email_conta VARCHAR(200) NOT NULL, -- Email da conta Google
  tipo VARCHAR(50) NOT NULL DEFAULT 'calendar',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  scope TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  calendar_id VARCHAR(200) DEFAULT 'primary', -- ID do calendário principal
  timezone VARCHAR(100) DEFAULT 'America/Sao_Paulo',
  horario_inicio VARCHAR(5) DEFAULT '09:00', -- HH:MM
  horario_fim VARCHAR(5) DEFAULT '18:00', -- HH:MM
  dias_trabalho INTEGER[] DEFAULT '{1,2,3,4,5}', -- Array com dias da semana (1=segunda, 7=domingo)
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_google_credentials_conta_id ON google_credentials(conta_id);
CREATE INDEX IF NOT EXISTS idx_google_credentials_tipo ON google_credentials(tipo);
CREATE INDEX IF NOT EXISTS idx_google_credentials_ativo ON google_credentials(ativo);

-- Comentários
COMMENT ON TABLE google_credentials IS 'Armazena credenciais de acesso ao Google Calendar para múltiplas contas';
COMMENT ON COLUMN google_credentials.conta_id IS 'Identificador único da conta (ex: atendente1, atendente2, atendente3)';
COMMENT ON COLUMN google_credentials.nome_conta IS 'Nome descritivo da conta';
COMMENT ON COLUMN google_credentials.email_conta IS 'Email da conta Google';
COMMENT ON COLUMN google_credentials.tipo IS 'Tipo de credencial (calendar, drive, etc)';
COMMENT ON COLUMN google_credentials.access_token IS 'Token de acesso do Google OAuth';
COMMENT ON COLUMN google_credentials.refresh_token IS 'Token de refresh do Google OAuth';
COMMENT ON COLUMN google_credentials.scope IS 'Escopo de permissões concedidas';
COMMENT ON COLUMN google_credentials.expires_at IS 'Data de expiração do access_token';
COMMENT ON COLUMN google_credentials.calendar_id IS 'ID do calendário principal da conta';
COMMENT ON COLUMN google_credentials.timezone IS 'Fuso horário da conta';
COMMENT ON COLUMN google_credentials.horario_inicio IS 'Horário de início do trabalho (HH:MM)';
COMMENT ON COLUMN google_credentials.horario_fim IS 'Horário de fim do trabalho (HH:MM)';
COMMENT ON COLUMN google_credentials.dias_trabalho IS 'Array com dias da semana que trabalha (1=segunda, 7=domingo)';
COMMENT ON COLUMN google_credentials.ativo IS 'Se a conta está ativa';

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_google_credentials_updated_at 
    BEFORE UPDATE ON google_credentials 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados iniciais para as 3 contas (opcional - pode ser feito via API)
-- INSERT INTO google_credentials (conta_id, nome_conta, email_conta, tipo) VALUES
--   ('atendente1', 'João Silva', 'joao.silva@resoluty.com', 'calendar'),
--   ('atendente2', 'Maria Santos', 'maria.santos@resoluty.com', 'calendar'),
--   ('atendente3', 'Pedro Costa', 'pedro.costa@resoluty.com', 'calendar');
