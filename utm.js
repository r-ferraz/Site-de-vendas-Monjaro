(function() {
    /**
     * Script Global de Captura de UTM
     * Captura parâmetros utm_source, utm_medium, utm_campaign da URL
     * e armazena no localStorage para persistência.
     */
    const params = new URLSearchParams(window.location.search);
    const utms = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'lead_id'];
    
    utms.forEach(utm => {
        const value = params.get(utm);
        if (value) {
            // Salva no localStorage para persistência entre sessões
            localStorage.setItem(utm, value);
            console.log(`[UTM] Capturado e Salvo: ${utm}=${value}`);
        }
    });

    /**
     * Helper: Retorna os parâmetros UTM salvos
     */
    window.getUtmParams = function() {
        return {
            utm_source: localStorage.getItem('utm_source') || '',
            utm_medium: localStorage.getItem('utm_medium') || '',
            utm_campaign: localStorage.getItem('utm_campaign') || '',
            utm_term: localStorage.getItem('utm_term') || '',
            utm_content: localStorage.getItem('utm_content') || '',
            lead_id: localStorage.getItem('lead_id') || ''
        };
    };

    // Diagnóstico
    console.log('[UTM] Estado Global:', window.getUtmParams());

    /**
     * Helper: Adiciona UTMs salvos a uma URL
     */
    window.addUtmsToUrl = function(url) {
        const currentUtms = window.getUtmParams();
        try {
            const urlObj = new URL(url, window.location.origin);
            // Só adiciona se for link interno (mesmo host)
            if (urlObj.hostname === window.location.hostname || urlObj.hostname === '') {
                Object.keys(currentUtms).forEach(key => {
                    const val = currentUtms[key];
                    if (val && !urlObj.searchParams.has(key)) {
                        urlObj.searchParams.set(key, val);
                    }
                });
                return urlObj.toString();
            }
        } catch (e) {
            // Se falhar (ex: link relativo simples), tenta tratar como string
            if (!url.startsWith('http') && !url.startsWith('//')) {
                const separator = url.includes('?') ? '&' : '?';
                let utmString = '';
                Object.keys(currentUtms).forEach(key => {
                    const val = currentUtms[key];
                    if (val && !url.includes(key + '=')) {
                        utmString += (utmString ? '&' : '') + `${key}=${encodeURIComponent(val)}`;
                    }
                });
                return utmString ? url + separator + utmString : url;
            }
        }
        return url;
    };

    /**
     * Propaga UTMs em todos os links internos da página
     */
    function propagateToLinks() {
        const links = document.querySelectorAll('a[href]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('tel:') && !href.startsWith('mailto:')) {
                // Verifica se é link interno (.html ou sem extensão)
                const isInternal = href.includes('.html') || (!href.includes('http') && !href.includes('//'));
                if (isInternal) {
                    const newHref = window.addUtmsToUrl(href);
                    if (newHref !== href) {
                        link.setAttribute('href', newHref);
                    }
                }
            }
        });
    }

    // Executa ao carregar e após um pequeno delay para garantir que conteúdos dinâmicos carreguem
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            propagateToLinks();
            setTimeout(propagateToLinks, 1500);
        });
    } else {
        propagateToLinks();
        setTimeout(propagateToLinks, 1500);
    }
})();

