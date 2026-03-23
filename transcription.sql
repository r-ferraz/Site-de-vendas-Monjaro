-- Script para criação da tabela de transcrições de receitas
-- Execute este script no SQL Editor do seu Dashboard do Supabase

-- 1. Criar a tabela de transcrições
CREATE TABLE IF NOT EXISTS public.transcription_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    full_text TEXT NOT NULL,
    structured_data JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'reviewed', 'error')),
    doctor_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.transcription_results ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas de acesso (Exemplo: apenas leitura anon/autenticado se necessário)
-- Nota: Ajuste conforme sua necessidade de segurança. 
-- Se for apenas para o CRM interno, você pode restringir mais.
CREATE POLICY "Permitir leitura para todos" ON public.transcription_results
    FOR SELECT USING (true);

CREATE POLICY "Permitir inserção para todos" ON public.transcription_results
    FOR INSERT WITH CHECK (true);

-- 4. Função para atualizar o timestamp 'updated_at' automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transcription_results_updated_at
    BEFORE UPDATE ON public.transcription_results
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Adicionar comentários explicativos
COMMENT ON TABLE public.transcription_results IS 'Armazena os resultados das transcrições de receitas médicas vinculadas aos leads.';
COMMENT ON COLUMN public.transcription_results.structured_data IS 'Dados estruturados (medicamentos, dosagem, etc) em formato JSON.';
