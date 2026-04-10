require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

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

// Endpoint para processar pagamento
app.post('/api/processar-pagamento', async (req, res) => {
    try {
        const { customer, payment } = req.body;

        console.log(`[PAYMENT] Iniciando processo para: ${customer.email}`);
        
        // Log de diagnóstico
        console.log("[DEBUG] Payload recebido no pagamento:", JSON.stringify({
            billingType: payment.billingType,
            value: payment.value,
            creditCard: {
                holderName: payment.creditCard?.holderName,
                number: payment.creditCard?.number ? '****' + payment.creditCard.number.slice(-4) : 'AUSENTE',
                expiryMonth: payment.creditCard?.expiryMonth,
                expiryYear: payment.creditCard?.expiryYear,
                cvv: payment.creditCard?.cvv ? '***' : 'AUSENTE'
            }
        }, null, 2));

        // 1. Criar ou Buscar Cliente no Asaas
        // O ideal seria buscar por CPF antes de criar, mas seguiremos o fluxo sugerido
        const customerResponse = await axios.post(`${ASAAS_URL}/customers`, customer, {
            headers: {
                'access_token': ASAAS_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const customerId = customerResponse.data.id;
        console.log(`[ASAAS] Cliente Criado/Encontrado: ${customerId}`);

        // 2. Criar Cobrança (Cartão de Crédito)
        const paymentData = {
            ...payment,
            customer: customerId
        };

        // Garantir que enviamos tanto 'cvv' quanto 'ccv' por compatibilidade
        if (paymentData.creditCard && paymentData.creditCard.cvv) {
            paymentData.creditCard.ccv = paymentData.creditCard.cvv;
        }

        // Debug: Logar chaves presentes (sem dados sensíveis)
        console.log(`[ASAAS] Campos do Cartão: ${Object.keys(paymentData.creditCard || {}).join(', ')}`);
        if (paymentData.creditCard?.cvv) {
            console.log(`[ASAAS] CVV presente (${paymentData.creditCard.cvv.length} dígitos)`);
        } else {
            console.warn(`[ASAAS] ⚠️ CVV AUSENTE OU VAZIO!`);
        }

        const paymentResponse = await axios.post(`${ASAAS_URL}/payments`, paymentData, {
            headers: {
                'access_token': ASAAS_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log(`[ASAAS] Pagamento Gerado: ${paymentResponse.data.id} - Status: ${paymentResponse.data.status}`);

        res.json({
            success: true,
            paymentId: paymentResponse.data.id,
            status: paymentResponse.data.status,
            invoiceUrl: paymentResponse.data.invoiceUrl
        });

    } catch (error) {
        console.error('[ERROR] Erro Asaas:', error.response?.data || error.message);
        res.status(400).json({
            success: false,
            error: error.response?.data?.errors?.[0]?.description || 'Erro ao processar pagamento no Asaas'
        });
    }
});

// Webhook para notificações de pagamento
app.post('/webhook/asaas', (req, res) => {
    const { event, payment } = req.body;
    console.log(`[WEBHOOK] Evento recebido: ${event} para o pagamento ${payment.id}`);

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
        console.log('✅ Pagamento Aprovado!');
        // Aqui você pode adicionar lógica para liberar acesso, enviar e-mail, etc.
    }

    res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Maori rodando na porta ${PORT}`);
});
