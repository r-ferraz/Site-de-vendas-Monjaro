-- SQL para criar a tabela de clientes para automação pós-venda
-- Execute isso no painel SQL do seu Supabase

CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  cpf TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  produto TEXT NOT NULL,
  tem_receita BOOLEAN NOT NULL,
  payment_id TEXT,
  status TEXT DEFAULT 'aprovado',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar permissões (opcional, dependendo do seu setup)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir inserções anônimas para checkout" ON clientes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir leitura para administradores" ON clientes FOR SELECT USING (true);
