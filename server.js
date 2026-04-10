require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use(cors());

// Servir arquivos estáticos da pasta atual
app.use(express.static(__dirname));

// Configurações Asaas
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const IS_SANDBOX = process.env.ASAAS_ENVIRONMENT === 'sandbox';
const ASAAS_URL = IS_SANDBOX ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';

console.log(`[SERVER] Modo: ${IS_SANDBOX ? 'SANDBOX' : 'PRODUÇÃO'}`);

// Configurações Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Função para enviar WhatsApp via UAZAPI
async function enviarWhatsApp({ whatsapp, nome, produto, temReceita }) {
    try {
        const numeroLimpo = whatsapp.replace(/\D/g, '');
        const apikey = process.env.UAZAPI_KEY;
        const url = process.env.UAZAPI_URL;

        if (!url || !apikey) {
            console.warn('[WA] Configurações de WhatsApp ausentes (UAZAPI_URL/KEY)');
            return;
        }

        const mensagem = temReceita ? 
            `Oi, ${nome}, tudo bem?
Seja bem-vindo à Maori.
Recebemos sua receita e o pagamento do seu tratamento (${produto}), e já fizemos a validação inicial por aqui.
Para seguirmos com a liberação, precisamos de um passo rápido:
uma videochamada com um dos nossos médicos.
É uma consulta breve, apenas para validar e atualizar sua prescrição dentro dos nossos protocolos, garantindo mais segurança e precisão no seu tratamento.
Após isso, já liberamos o envio direto para sua casa.
Se você tiver exames recentes, pode me enviar por aqui.
Isso nos ajuda a ajustar ainda melhor sua estratégia junto com o tratamento.
Posso te enviar os horários disponíveis?` : 
            `Oi, ${nome}, tudo bem?
Seja bem-vindo à Maori.
Recebemos o pagamento do seu tratamento (${produto}) e já iniciamos seu onboarding por aqui.
O próximo passo agora é agendar sua teleconsulta com um dos nossos médicos.
Nessa consulta, vamos avaliar seu caso e estruturar seu protocolo de forma personalizada, para iniciar seu tratamento com mais precisão e segurança.
Após essa etapa, já organizamos o envio da sua medicação direto para sua casa.
Se você tiver exames recentes, pode me enviar por aqui também.
Suas respostas no questionário nos ajudam bastante a entender seu momento atual e direcionar melhor sua estratégia.
Posso te enviar os horários disponíveis?`;

        console.log(`[WA] Enviando para ${numeroLimpo}...`);

        await axios.post(url, {
            number: `55${numeroLimpo}`,
            options: { delay: 1200, presence: "composing" },
            textMessage: { text: mensagem }
        }, {
            headers: { 'apikey': apikey, 'Content-Type': 'application/json' }
        });

        console.log(`[WA] Mensagem enviada com sucesso para ${nome}`);
    } catch (error) {
        console.error('[WA-ERROR] Erro ao enviar WhatsApp:', error.response?.data || error.message);
    }
}


// Webhook para notificações de pagamento
app.post('/webhook/asaas', (req, res) => {
    const { event, payment } = req.body;
    console.log(`[WEBHOOK] Evento: ${event} ID: ${payment.id}`);

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
        console.log('✅ Pagamento Aprovado!');
    }

    res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Maori rodando na porta ${PORT}`);
});
