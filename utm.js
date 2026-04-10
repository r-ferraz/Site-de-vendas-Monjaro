(function() {
    /**
     * Script Global de Captura de UTM
     * Captura parâmetros utm_source, utm_medium, utm_campaign da URL
     * e armazena no sessionStorage para persistência durante a navegação.
     */
    const params = new URLSearchParams(window.location.search);
    const utms = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'lead_id'];
    
    utms.forEach(utm => {
        const value = params.get(utm);
        if (value) {
            // Para lead_id, sempre sobrepomos se houver um novo na URL, pois pode ser uma atualização
            // Para UTMs, mantemos a primeira da sessão se o usuário assim preferir (comportamento original)
            if (utm === 'lead_id') {
                sessionStorage.setItem(utm, value);
                console.log(`[Flow] Lead ID Capturado: ${value}`);
            } else {
                const existing = sessionStorage.getItem(utm);
                if (!existing) {
                    sessionStorage.setItem(utm, value);
                    console.log(`[UTM] Capturado: ${utm}=${value}`);
                }
            }
        }
    });

    // Diagnóstico
    const currentUtms = {
        utm_source: sessionStorage.getItem('utm_source'),
        utm_medium: sessionStorage.getItem('utm_medium'),
        utm_campaign: sessionStorage.getItem('utm_campaign'),
        utm_term: sessionStorage.getItem('utm_term'),
        utm_content: sessionStorage.getItem('utm_content'),
        lead_id: sessionStorage.getItem('lead_id')
    };
    console.log('[UTM] Estado da Sessão:', currentUtms);

    /**
     * Helper: Adiciona UTMs da sessão a uma URL
     */
    window.addUtmsToUrl = function(url) {
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

    // Executa ao carregar e após um pequeno delay para garantir que conteúdos dinâmicos (como FAB) carreguem
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            propagateToLinks();
            setTimeout(propagateToLinks, 1000); // Repete para garantir botões dinâmicos
        });
    } else {
        propagateToLinks();
        setTimeout(propagateToLinks, 1000);
    }
})();
