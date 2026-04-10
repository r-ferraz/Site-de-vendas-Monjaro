import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Lidar com pre-flight do CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { customer, payment, temReceita, whatsapp, produto } = await req.json()

    console.log(`[PAYMENT] Iniciando processo para: ${customer.email} (${produto})`)

    const ASAA_API_KEY = Deno.env.get('ASAAS_API_KEY')
    const IS_SANDBOX = Deno.env.get('ASAAS_ENVIRONMENT') === 'sandbox'
    const ASAAS_URL = IS_SANDBOX ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3'
    
    const UAZAPI_KEY = Deno.env.get('UAZAPI_KEY')
    const UAZAPI_URL = Deno.env.get('UAZAPI_URL')

    // 1. Criar ou Buscar Cliente no Asaas
    const customerResponse = await fetch(`${ASAAS_URL}/customers`, {
      method: 'POST',
      headers: {
        'access_token': ASAA_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(customer)
    })
    const customerData = await customerResponse.json()
    const customerId = customerData.id
    console.log(`[ASAAS] Cliente: ${customerId}`)

    // 2. Criar Cobrança (Cartão de Crédito)
    const paymentPayload = {
      ...payment,
      customer: customerId
    }

    if (paymentPayload.creditCard && paymentPayload.creditCard.cvv) {
      paymentPayload.creditCard.ccv = paymentPayload.creditCard.cvv
    }

    const payResponse = await fetch(`${ASAAS_URL}/payments`, {
      method: 'POST',
      headers: {
        'access_token': ASAA_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentPayload)
    })
    const payData = await payResponse.json()

    if (!payResponse.ok) {
        throw new Error(payData.errors?.[0]?.description || 'Erro no Asaas')
    }

    console.log(`[ASAAS] Pagamento Gerado: ${payData.id}`)

    // 3. Salvar no Supabase (Internal Client)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: dbError } = await supabaseClient
      .from('clientes')
      .insert([{
        nome: customer.name,
        email: customer.email,
        cpf: customer.cpfCnpj,
        whatsapp: whatsapp || customer.phone,
        produto: produto || 'Plano Maori',
        tem_receita: temReceita === 'sim',
        payment_id: payData.id,
        status: 'aprovado'
      }])

    if (dbError) console.error("[DB-ERROR]", dbError)

    // 4. Enviar WhatsApp (UAZAPI)
    if (UAZAPI_URL && UAZAPI_KEY) {
        const nome = customer.name
        const prod = produto || 'Plano Maori'
        const isRec = temReceita === 'sim'
        const num = (whatsapp || customer.phone).replace(/\D/g, '')

        const mensagem = isRec ? 
            `Oi, ${nome}, tudo bem?\nSeja bem-vindo à Maori.\nRecebemos sua receita e o pagamento do seu tratamento (${prod}), e já fizemos a validação inicial por aqui.\n...` :
            `Oi, ${nome}, tudo bem?\nSeja bem-vindo à Maori.\nRecebemos o pagamento do seu tratamento (${prod}) e já iniciamos seu onboarding por aqui.\n...`;

        await fetch(UAZAPI_URL, {
            method: 'POST',
            headers: { 'apikey': UAZAPI_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                number: `55${num}`,
                options: { delay: 1200, presence: "composing" },
                textMessage: { text: mensagem }
            })
        })
    }

    return new Response(JSON.stringify({ success: true, paymentId: payData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
