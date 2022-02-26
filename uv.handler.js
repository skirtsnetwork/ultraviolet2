if (!self.__uv) {
    __uvHook(self, self.__uv$config, self.__uv$config.bare);
};

async function __uvHook(window, config = {}, bare = '/bare/') {
    if ('__uv' in window && window.__uv instanceof Ultraviolet) return false;

    if (window.document && !!window.window) {
        window.document.querySelectorAll("script[__uv-script]").forEach(node => node.remove())
    };

    const worker = !window.window;
    const master = '__uv';
    const methodPrefix = '__uv$';
    const __uv = new Ultraviolet({
        ...config,
        window,
    });

    if (typeof config.construct === 'function') {
        config.construct(__uv, worker ? 'worker' : 'window');
    };

    const { client } = __uv;
    const {
        HTMLMediaElement,
        HTMLScriptElement,
        HTMLAudioElement,
        HTMLVideoElement,
        HTMLInputElement,
        HTMLEmbedElement,
        HTMLTrackElement,
        HTMLAnchorElement,
        HTMLIFrameElement,
        HTMLAreaElement,
        HTMLLinkElement,
        HTMLBaseElement,
        HTMLFormElement,
        HTMLImageElement,
        HTMLSourceElement,
    } = window;

    client.nativeMethods.defineProperty(window, '__uv', {
        value: __uv,
        enumerable: false,
    });


    __uv.meta.origin = location.origin;
    __uv.location = client.location.emulate(
        (href) => {
            if (href === 'about:srcdoc') return new URL(href);
            if (href.startsWith('blob:')) href = href.slice('blob:'.length);
            return new URL(__uv.sourceUrl(href));
        },
        (href) => {
            return __uv.rewriteUrl(href);
        },
    );

    __uv.cookieStr = window.__uv$cookies || '';
    __uv.meta.url = __uv.location;
    __uv.domain = __uv.meta.url.host;
    __uv.blobUrls = new window.Map();
    __uv.referrer = '';
    __uv.cookies = [];
    __uv.localStorageObj = {};
    __uv.sessionStorageObj = {};

    try {
        __uv.bare = new URL(bare, window.location.href);
    } catch(e) {
        __uv.bare = window.parent.__uv.bare;
    };

    if (__uv.location.href === 'about:srcdoc') {
        __uv.meta = window.parent.__uv.meta;
    };

    // Storage wrappers
    client.nativeMethods.defineProperty(client.storage.storeProto, '__uv$storageObj', {
        get() {
            if (this === client.storage.sessionStorage) return __uv.sessionStorageObj;
            if (this === client.storage.localStorage) return __uv.localStorageObj;
        },
        enumerable: false,
    });

    if (window.localStorage) {
        for (const key in window.localStorage) {
            if (key.startsWith(methodPrefix + __uv.location.origin + '@')) {
                __uv.localStorageObj[key.slice((methodPrefix + __uv.location.origin + '@').length)] = window.localStorage.getItem(key);
            };
        };

        __uv.lsWrap = client.storage.emulate(client.storage.localStorage, __uv.localStorageObj);
    };

    if (window.sessionStorage) {
        for (const key in window.sessionStorage) {
            if (key.startsWith(methodPrefix + __uv.location.origin + '@')) {
                __uv.sessionStorageObj[key.slice((methodPrefix + __uv.location.origin + '@').length)] = window.sessionStorage.getItem(key);
            };
        };

        __uv.ssWrap = client.storage.emulate(client.storage.sessionStorage, __uv.sessionStorageObj);
    };



    let rawBase = window.document ? client.node.baseURI.get.call(window.document) : window.location.href;
    let base = __uv.sourceUrl(rawBase);

    client.nativeMethods.defineProperty(__uv.meta, 'base', {
        get() {
            if (!window.document) return __uv.meta.url.href;

            if (client.node.baseURI.get.call(window.document) !== rawBase) {
                rawBase = client.node.baseURI.get.call(window.document);
                base = __uv.sourceUrl(rawBase);
            };

            return base;
        },
    });


    __uv.methods = {
        setSource: methodPrefix + 'setSource',
        source: methodPrefix + 'source',
        location: methodPrefix + 'location',
        function: methodPrefix + 'function',
        string: methodPrefix + 'string',
        eval: methodPrefix + 'eval',
        parent: methodPrefix + 'parent',
        top: methodPrefix + 'top',
    };

    __uv.filterKeys = [
        master,
        __uv.methods.setSource,
        __uv.methods.source,
        __uv.methods.location,
        __uv.methods.function,
        __uv.methods.string,
        __uv.methods.eval,
        __uv.methods.parent,
        __uv.methods.top,
        methodPrefix + 'protocol',
        methodPrefix + 'storageObj',
        methodPrefix + 'url',
        methodPrefix + 'modifiedStyle',
        methodPrefix + 'config',
        'Ultraviolet',
        '__uvHook',
    ];


    client.on('wrap', (target, wrapped) => {
        client.nativeMethods.defineProperty(wrapped, 'name', client.nativeMethods.getOwnPropertyDescriptor(target, 'name'));
        client.nativeMethods.defineProperty(wrapped, 'length', client.nativeMethods.getOwnPropertyDescriptor(target, 'length'));

        client.nativeMethods.defineProperty(wrapped, __uv.methods.string, {
            enumerable: false,
            value: client.nativeMethods.fnToString.call(target),
        });

        client.nativeMethods.defineProperty(wrapped, __uv.methods.function, {
            enumerable: false,
            value: target,
        });
    });

    client.fetch.on('request', event => {
        event.data.input = __uv.rewriteUrl(event.data.input);
    });

    client.fetch.on('requestUrl', event => {
        event.data.value = __uv.sourceUrl(event.data.value);
    });

    client.fetch.on('responseUrl', event => {
        event.data.value = __uv.sourceUrl(event.data.value);
    });

    // XMLHttpRequest
    client.xhr.on('open', event => {
        event.data.input = __uv.rewriteUrl(event.data.input);
    });

    client.xhr.on('responseUrl', event => {
        event.data.value = __uv.sourceUrl(event.data.value);
    });


    // Workers
    client.workers.on('worker', event => {
        event.data.url = __uv.rewriteUrl(event.data.url);
    });

    client.workers.on('addModule', event => {
        event.data.url = __uv.rewriteUrl(event.data.url);
    });

    client.workers.on('importScripts', event => {
        for (const i in event.data.scripts) {
            event.data.scripts[i] = __uv.rewriteUrl(event.data.scripts[i]);
        };
    });

    client.workers.on('postMessage', event => {
        let to = event.data.origin;

        event.data.origin = '*';
        event.data.message = {
            __data: event.data.message,
            __origin: __uv.meta.url.origin,
            __to: to,
        };
    });

    // Navigator
    client.navigator.on('sendBeacon', event => {
        event.data.url = __uv.rewriteUrl(event.data.url);
    });

    // Cookies
    client.document.on('getCookie', event => {
        event.data.value = __uv.cookieStr;
    });

    client.document.on('setCookie', event => {
        Promise.resolve(__uv.cookie.setCookies(event.data.value, __uv.db, __uv.meta)).then(() => {
            __uv.cookie.db().then(db => {
                __uv.cookie.getCookies(db).then(cookies => {
                    __uv.cookieStr = __uv.cookie.serialize(cookies, __uv.meta, true);
                });
            });
        });
        const cookie = __uv.cookie.setCookie(event.data.value)[0];

        if (!cookie.path) cookie.path = '/';
        if (!cookie.domain) cookie.domain = __uv.meta.url.hostname;

        if (__uv.cookie.validateCookie(cookie, __uv.meta, true)) {
            if (__uv.cookieStr.length) __uv.cookieStr += '; ';
            __uv.cookieStr += `${cookie.name}=${cookie.value}`;
        };

        event.respondWith(event.data.value);
    });

    // HTML
    client.element.on('setInnerHTML', event => {
        switch (event.that.tagName) {
            case 'SCRIPT':
                event.data.value = __uv.js.rewrite(event.data.value);
                break;
            case 'STYLE':
                event.data.value = __uv.rewriteCSS(event.data.value);
                break;
            default:
                event.data.value = __uv.rewriteHtml(event.data.value);
        };
    });

    client.element.on('getInnerHTML', event => {
        switch (event.that.tagName) {
            case 'SCRIPT':
                event.data.value = __uv.js.source(event.data.value);
                break;
            default:
                event.data.value = __uv.sourceHtml(event.data.value);
        };
    });

    client.element.on('setOuterHTML', event => {
        event.data.value = __uv.rewriteHtml(event.data.value, { document: event.that.tagName === 'HTML' });
    });

    client.element.on('getOuterHTML', event => {
        switch (event.that.tagName) {
            case 'HEAD':
                event.data.value = __uv.sourceHtml(
                    event.data.value.replace(/<head(.*)>(.*)<\/head>/s, '<op-head$1>$2</op-head>')
                ).replace(/<op-head(.*)>(.*)<\/op-head>/s, '<head$1>$2</head>');
                break;
            case 'BODY':
                event.data.value = __uv.sourceHtml(
                    event.data.value.replace(/<body(.*)>(.*)<\/body>/s, '<op-body$1>$2</op-body>')
                ).replace(/<op-body(.*)>(.*)<\/op-body>/s, '<body$1>$2</body>');
                break;
            default:
                event.data.value = __uv.sourceHtml(event.data.value, { document: event.that.tagName === 'HTML' });
                break;
        };

        //event.data.value = __uv.sourceHtml(event.data.value, { document: event.that.tagName === 'HTML' });
    });

    client.document.on('write', event => {
        if (!event.data.html.length) return false;
        event.data.html = [__uv.rewriteHtml(event.data.html.join(''))];
    });

    client.document.on('writeln', event => {
        if (!event.data.html.length) return false;
        event.data.html = [__uv.rewriteHtml(event.data.html.join(''))];
    });

    client.element.on('insertAdjacentHTML', event => {
        event.data.html = __uv.rewriteHtml(event.data.html);
    });

    // EventSource

    client.eventSource.on('construct', event => {
        event.data.url = __uv.rewriteUrl(event.data.url);
    });


    client.eventSource.on('url', event => {
        event.data.url = __uv.rewriteUrl(event.data.url);
    });

    // History
    client.history.on('replaceState', event => {
        if (event.data.url) event.data.url = __uv.rewriteUrl(event.data.url, '__uv' in event.that ? event.that.__uv.meta : __uv.meta);
    });
    client.history.on('pushState', event => {
        if (event.data.url) event.data.url = __uv.rewriteUrl(event.data.url, '__uv' in event.that ? event.that.__uv.meta : __uv.meta);
    });

    // Element get set attribute methods
    client.element.on('getAttribute', event => {
        if (client.element.hasAttribute.call(event.that, __uv.attributePrefix + '-attr-' + event.data.name)) {
            event.respondWith(
                event.target.call(event.that, __uv.attributePrefix + '-attr-' + event.data.name)
            );
        };
    });

    // Message
    client.message.on('postMessage', event => {
        let to = event.data.origin;
        let call = __uv.call;


        if (event.that) {
            call = event.that.__uv$source.call;
        };

        event.data.origin = '*';
        event.data.message = {
            __data: event.data.message,
            __origin: (event.that || event.target).__uv$source.location.origin,
            __to: to,
        };

        event.respondWith(
            worker ?
            call(event.target, [event.data.message, event.data.transfer], event.that) :
            call(event.target, [event.data.message, event.data.origin, event.data.transfer], event.that)
        );

    });

    client.message.on('data', event => {
        const { value: data } = event.data;
        if (typeof data === 'object' && '__data' in data && '__origin' in data) {
            event.respondWith(data.__data);
        };
    });

    client.message.on('origin', event => {
        const data = client.message.messageData.get.call(event.that);
        if (typeof data === 'object' && data.__data && data.__origin) {
            event.respondWith(data.__origin);
        };
    });

    client.overrideDescriptor(window, 'origin', {
        get: (target, that) => {
            return __uv.location.origin;
        },
    });

    client.node.on('baseURI', event => {
        if (event.data.value.startsWith(window.location.origin)) event.data.value = __uv.sourceUrl(event.data.value);
    });

    client.element.on('setAttribute', event => {
        if (event.that instanceof HTMLMediaElement && event.data.name === 'src' && event.data.value.startsWith('blob:')) {
            event.target.call(event.that, __uv.attributePrefix + '-attr-' + event.data.name, event.data.value);
            event.data.value = __uv.blobUrls.get(event.data.value);
            return;
        };

        if (__uv.attrs.isUrl(event.data.name)) {
            event.target.call(event.that, __uv.attributePrefix + '-attr-' + event.data.name, event.data.value);
            event.data.value = __uv.rewriteUrl(event.data.value);
        };

        if (__uv.attrs.isStyle(event.data.name)) {
            event.target.call(event.that, __uv.attributePrefix + '-attr-' + event.data.name, event.data.value);
            event.data.value = __uv.rewriteCSS(event.data.value, { context: 'declarationList' });
        };

        if (__uv.attrs.isHtml(event.data.name)) {
            event.target.call(event.that, __uv.attributePrefix + '-attr-' + event.data.name, event.data.value);
            event.data.value = __uv.rewriteHtml(event.data.value, {...__uv.meta, document: true, injectHead:__uv.createHtmlInject(__uv.handlerScript, __uv.bundleScript, __uv.configScript, __uv.cookieStr, window.location.href) });
        };

        if (__uv.attrs.isSrcset(event.data.name)) {
            event.target.call(event.that, __uv.attributePrefix + '-attr-' + event.data.name, event.data.value);
            event.data.value = __uv.html.wrapSrcset(event.data.value);
        };

        if (__uv.attrs.isForbidden(event.data.name)) {
            event.data.name = __uv.attributePrefix + '-attr-' + event.data.name;
        };
    });

    client.element.on('audio', event => {
        event.data.url = __uv.rewriteUrl(event.data.url);
    });

    // Element Property Attributes
    client.element.hookProperty([HTMLAnchorElement, HTMLAreaElement, HTMLLinkElement, HTMLBaseElement], 'href', {
        get: (target, that) => {
            return __uv.sourceUrl(
                target.call(that)
            );
        },
        set: (target, that, [val]) => {
            client.element.setAttribute.call(that, __uv.attributePrefix + '-attr-href', val)
            target.call(that, __uv.rewriteUrl(val));
        },
    });

    client.element.hookProperty([HTMLScriptElement, HTMLAudioElement, HTMLVideoElement,  HTMLMediaElement, HTMLImageElement, HTMLInputElement, HTMLEmbedElement, HTMLIFrameElement, HTMLTrackElement, HTMLSourceElement], 'src', {
        get: (target, that) => {
            return __uv.sourceUrl(
                target.call(that)
            );
        },
        set: (target, that, [val]) => {
            if (new String(val).toString().trim().startsWith('blob:') && that instanceof HTMLMediaElement) {
                client.element.setAttribute.call(that, __uv.attributePrefix + '-attr-src', val)
                return target.call(that, __uv.blobUrls.get(val) || val);
            };

            client.element.setAttribute.call(that, __uv.attributePrefix + '-attr-src', val)
            target.call(that, __uv.rewriteUrl(val));
        },
    });

    client.element.hookProperty([HTMLFormElement], 'action', {
        get: (target, that) => {
            return __uv.sourceUrl(
                target.call(that)
            );
        },
        set: (target, that, [val]) => {
            client.element.setAttribute.call(that, __uv.attributePrefix + '-attr-action', val)
            target.call(that, __uv.rewriteUrl(val));
        },
    });

    client.element.hookProperty([HTMLImageElement], 'srcset', {
        get: (target, that) => {
            return client.element.getAttribute.call(that, __uv.attributePrefix + '-attr-srcset') || target.call(that);
        },
        set: (target, that, [val]) => {
            client.element.setAttribute.call(that, __uv.attributePrefix + '-attr-srcset', val)
            target.call(that, __uv.html.wrapSrcset(val));
        },
    });

    client.element.hookProperty(HTMLScriptElement, 'integrity', {
        get: (target, that) => {
            return client.element.getAttribute.call(that, __uv.attributePrefix + '-attr-integrity');
        },
        set: (target, that, [val]) => {
            client.element.setAttribute.call(that, __uv.attributePrefix + '-attr-integrity', val);
        },
    });

    client.element.hookProperty(HTMLIFrameElement, 'sandbox', {
        get: (target, that) => {
            return client.element.getAttribute.call(that, __uv.attributePrefix + '-attr-sandbox') || target.call(that);
        },
        set: (target, that, [val]) => {
            client.element.setAttribute.call(that, __uv.attributePrefix + '-attr-sandbox', val);
        },
    });

    client.element.hookProperty(HTMLIFrameElement, 'contentWindow', {
        get: (target, that) => {
            const win = target.call(that);
            try {
                if (!win.__uv) __uvHook(win, config, bare);
                return win;
            } catch (e) {
                return win;
            };
        },
    });

    client.element.hookProperty(HTMLIFrameElement, 'contentDocument', {
        get: (target, that) => {
            const doc = target.call(that);
            try {
                const win = doc.defaultView
                if (!win.__uv) __uvHook(win, config, bare);
                return doc;
            } catch (e) {
                return win;
            };
        },
    });

    client.element.hookProperty(HTMLIFrameElement, 'srcdoc', {
        get: (target, that) => {
            return client.element.getAttribute.call(that, __uv.attributePrefix + '-attr-srcdoc') || target.call(that);
        },
        set: (target, that, [val]) => {
            target.call(that, __uv.rewriteHtml(val, {
                document: true,
                injectHead: __uv.createHtmlInject(__uv.handlerScript, __uv.bundleScript, __uv.configScript, __uv.cookieStr, window.location.href)
            }))
        },
    });

    client.node.on('getTextContent', event => {
        if (event.that.tagName === 'SCRIPT') {
            event.data.value = __uv.js.source(event.data.value);
        };
    });

    client.node.on('setTextContent', event => {
        if (event.that.tagName === 'SCRIPT') {
            event.data.value = __uv.js.rewrite(event.data.value);
        };
    });

    // Until proper rewriting is implemented for service workers.
    // Not sure atm how to implement it with the already built in service worker
    if ('serviceWorker' in window.navigator) {
        delete window.Navigator.prototype.serviceWorker;
    };

    // Document
    client.document.on('getDomain', event => {
        event.data.value = __uv.domain;
    });
    client.document.on('setDomain', event => {
        if (!event.data.value.toString().endsWith(__uv.meta.url.hostname.split('.').slice(-2).join('.'))) return event.respondWith('');
        event.respondWith(__uv.domain = event.data.value);
    })

    client.document.on('url', event => {
        event.data.value = __uv.location.href;
    });

    client.document.on('documentURI', event => {
        event.data.value = __uv.location.href;
    });

    client.document.on('referrer', event => {
        event.data.value = __uv.referrer || __uv.sourceUrl(event.data.value);
    });

    client.document.on('parseFromString', event => {
        if (event.data.type !== 'text/html') return false;
        event.data.string = __uv.rewriteHtml(event.data.string, {...__uv.meta, document: true, });
    });

    // Attribute (node.attributes)
    client.attribute.on('getValue', event => {
        if (client.element.hasAttribute.call(event.that.ownerElement, __uv.attributePrefix + '-attr-' + event.data.name)) {
            event.data.value = client.element.getAttribute.call(event.that.ownerElement, __uv.attributePrefix + '-attr-' + event.data.name);
        };
    });

    client.attribute.on('setValue', event => {
        if (__uv.attrs.isUrl(event.data.name)) {
            client.element.setAttribute.call(event.that.ownerElement, __uv.attributePrefix + '-attr-' + event.data.name, event.data.value);
            event.data.value = __uv.rewriteUrl(event.data.value);
        };

        if (__uv.attrs.isStyle(event.data.name)) {
            client.element.setAttribute.call(event.that.ownerElement, __uv.attributePrefix + '-attr-' + event.data.name, event.data.value);
            event.data.value = __uv.rewriteCSS(event.data.value, { context: 'declarationList' });
        };

        if (__uv.attrs.isHtml(event.data.name)) {
            client.element.setAttribute.call(event.that.ownerElement, __uv.attributePrefix + '-attr-' + event.data.name, event.data.value);
            event.data.value = __uv.rewriteHtml(event.data.value, {...__uv.meta, document: true, injectHead:__uv.createHtmlInject(__uv.handlerScript, __uv.bundleScript, __uv.configScript, __uv.cookieStr, window.location.href) });
        };

        if (__uv.attrs.isSrcset(event.data.name)) {
            client.element.setAttribute.call(event.that.ownerElement, __uv.attributePrefix + '-attr-' + event.data.name, event.data.value);
            event.data.value = __uv.html.wrapSrcset(event.data.value);
        };

    });

    // URL
    client.url.on('createObjectURL', event => {
        let url = event.target.call(event.that, event.data.object);
        if (url.startsWith('blob:' + location.origin)) {
            let newUrl = 'blob:' + (__uv.meta.url.href !== 'about:blank' ?  __uv.meta.url.origin : window.parent.__uv.meta.url.origin) + url.slice('blob:'.length + location.origin.length);
            __uv.blobUrls.set(newUrl, url);
            event.respondWith(newUrl);
        } else {
            event.respondWith(url);
        };
    });

    client.url.on('revokeObjectURL', event => {
        if (__uv.blobUrls.has(event.data.url)) {
            const old = event.data.url;
            event.data.url = __uv.blobUrls.get(event.data.url);
            __uv.blobUrls.delete(old);
        };
    });

    client.storage.on('get', event => {
        event.data.name = methodPrefix + __uv.meta.url.origin + '@' + event.data.name;
    });

    client.storage.on('set', event => {
        if (event.that.__uv$storageObj) {
            event.that.__uv$storageObj[event.data.name] = event.data.value;
        };
        event.data.name = methodPrefix + __uv.meta.url.origin + '@' + event.data.name;
    });

    client.storage.on('delete', event => {
        if (event.that.__uv$storageObj) {
            delete event.that.__uv$storageObj[event.data.name];
        };
        event.data.name = methodPrefix + __uv.meta.url.origin + '@' + event.data.name;
    });

    client.storage.on('getItem', event => {
        event.data.name = methodPrefix + __uv.meta.url.origin + '@' + event.data.name;
    });

    client.storage.on('setItem', event => {
        if (event.that.__uv$storageObj) {
            event.that.__uv$storageObj[event.data.name] = event.data.value;
        };
        event.data.name = methodPrefix + __uv.meta.url.origin + '@' + event.data.name;
    });

    client.storage.on('removeItem', event => {
        if (event.that.__uv$storageObj) {
            delete event.that.__uv$storageObj[event.data.name];
        };
        event.data.name = methodPrefix + __uv.meta.url.origin + '@' + event.data.name;
    });

    client.storage.on('clear', event => {
        if (event.that.__uv$storageObj) {
            for (const key of client.nativeMethods.keys.call(null, event.that.__uv$storageObj)) {
                delete event.that.__uv$storageObj[key];
                client.storage.removeItem.call(event.that, methodPrefix + __uv.meta.url.origin + '@' + key);
                event.respondWith();
            };
        };
    });

    client.storage.on('length', event => {
        if (event.that.__uv$storageObj) {
            event.respondWith(client.nativeMethods.keys.call(null, event.that.__uv$storageObj).length);
        };
    });

    client.storage.on('key', event => {
        if (event.that.__uv$storageObj) {
            event.respondWith(
                (client.nativeMethods.keys.call(null, event.that.__uv$storageObj)[event.data.index] || null)
            );
        };
    });

    client.websocket.on('websocket', async event => {
        let url;
        try {
            url = new URL(event.data.url);
        } catch(e) {
            return;
        };

        const headers = {
            Host: url.host,
            Origin: __uv.meta.url.origin,
            Pragma: 'no-cache',
            'Cache-Control': 'no-cache',
            Upgrade: 'websocket',
            'User-Agent': window.navigator.userAgent,
            'Connection': 'Upgrade',
        };

        const cookies = __uv.cookie.serialize(__uv.cookies, { url }, false);

        if (cookies) headers.Cookie = cookies;
        const protocols = [...event.data.protocols];

        const remote = {
            protocol: url.protocol,
            host: url.hostname,
            port: url.port || (url.protocol === 'wss:' ? '443' : '80'),
            path: url.pathname + url.search,
        };

        if (protocols.length) headers['Sec-WebSocket-Protocol'] = protocols.join(', ');

        event.data.url =  (__uv.bare.protocol === 'https:' ? 'wss://' : 'ws://') + __uv.bare.host + __uv.bare.pathname + 'v1/';
        event.data.protocols = [
            'bare',
            __uv.encodeProtocol(JSON.stringify({
                remote,
                headers,
                forward_headers: [
                    'accept',
                    'accept-encoding',
                    'accept-language',
                    'sec-websocket-extensions',
                    'sec-websocket-key',
                    'sec-websocket-version',
                ],
            })),
        ];

        const ws = new event.target(event.data.url, event.data.protocols);

        client.nativeMethods.defineProperty(ws, methodPrefix + 'url', {
            enumerable: false,
            value: url.href,
        });

        event.respondWith(
            ws
        );
    });

    client.websocket.on('url', event => {
        if ('__uv$url' in event.that) {
            event.data.value = event.that.__uv$url;
        };
    });

    client.websocket.on('protocol', event => {
        if ('__uv$protocol' in event.that) {
            event.data.value = event.that.__uv$protocol;
        };
    });

    client.function.on('function', event => {
        event.data.script = __uv.rewriteJS(event.data.script);
    });

    client.function.on('toString', event => {
        if (__uv.methods.string in event.that) event.respondWith(event.that[__uv.methods.string]);
    });

    client.object.on('getOwnPropertyNames', event => {
        event.data.names = event.data.names.filter(element => !(__uv.filterKeys.includes(element)));
    });

    client.object.on('getOwnPropertyDescriptors', event => {
        for (const forbidden of __uv.filterKeys) {
            delete event.data.descriptors[forbidden];
        };

    });

    client.style.on('setProperty', event => {
        if (client.style.dashedUrlProps.includes(event.data.property)) {
            event.data.value = __uv.rewriteCSS(event.data.value, {
                context: 'value',
                ...__uv.meta
            })
        };
    });

    client.style.on('getPropertyValue', event => {
        if (client.style.dashedUrlProps.includes(event.data.property)) {
            event.respondWith(
                __uv.sourceCSS(
                    event.target.call(event.that, event.data.property),
                    {
                        context: 'value',
                        ...__uv.meta
                    }
                )
            );
        };
    });

    if ('CSS2Properties' in window) {
        for (const key of client.style.urlProps) {
            client.overrideDescriptor(window.CSS2Properties.prototype, key, {
                get: (target, that) => {
                    return __uv.sourceCSS(
                        target.call(that),
                        {
                            context: 'value',
                            ...__uv.meta
                        }
                    )
                },
                set: (target, that, val) => {
                    target.call(
                        that,
                        __uv.rewriteCSS(val, {
                            context: 'value',
                            ...__uv.meta
                        })
                    );
                }
            });
        };
    } else if ('HTMLElement' in window) {

        client.overrideDescriptor(
            window.HTMLElement.prototype,
            'style',
            {
                get: (target, that) => {
                    const value = target.call(that);
                    if (!value[methodPrefix + 'modifiedStyle']) {

                        for (const key of client.style.urlProps) {
                            client.nativeMethods.defineProperty(value, key, {
                                enumerable: true,
                                configurable: true,
                                get() {
                                    const value = client.style.getPropertyValue.call(this, key) || '';
                                    return __uv.sourceCSS(
                                        value,
                                        {
                                            context: 'value',
                                            ...__uv.meta
                                        }
                                    )
                                },
                                set(val) {
                                    client.style.setProperty.call(this, 
                                        (client.style.propToDashed[key] || key),
                                        __uv.rewriteCSS(val, {
                                            context: 'value',
                                            ...__uv.meta
                                        })    
                                    )
                                }
                            });
                            client.nativeMethods.defineProperty(value, methodPrefix + 'modifiedStyle', {
                                enumerable: false,
                                value: true
                            });
                        };
                    };
                    return value;
                }
            }
        );
    };

    client.style.on('setCssText', event => {
        event.data.value = __uv.rewriteCSS(event.data.value, {
            context: 'declarationList',
            ...__uv.meta
        });
    });

    client.style.on('getCssText', event => {
        event.data.value = __uv.sourceCSS(event.data.value, {
            context: 'declarationList',
            ...__uv.meta
        });
    });

    // Hooking functions & descriptors
    client.fetch.overrideRequest();
    client.fetch.overrideUrl();
    client.xhr.overrideOpen();
    client.xhr.overrideResponseUrl();
    client.element.overrideHtml();
    client.element.overrideAttribute();
    client.element.overrideInsertAdjacentHTML();
    client.element.overrideAudio();
    // client.element.overrideQuerySelector();
    client.node.overrideBaseURI();
    client.node.overrideTextContent();
    client.attribute.override();
    client.document.overrideDomain();
    client.document.overrideURL();
    client.document.overrideDocumentURI();
    client.document.overrideWrite();
    client.document.overrideReferrer();
    client.document.overrideParseFromString();
    client.storage.overrideMethods();
    client.storage.overrideLength();
    //client.document.overrideQuerySelector();
    client.object.overrideGetPropertyNames();
    client.object.overrideGetOwnPropertyDescriptors();
    client.history.overridePushState();
    client.history.overrideReplaceState();
    client.eventSource.overrideConstruct();
    client.eventSource.overrideUrl();
    client.websocket.overrideWebSocket();
    client.websocket.overrideProtocol();
    client.websocket.overrideUrl();
    client.url.overrideObjectURL();
    client.document.overrideCookie();
    client.message.overridePostMessage();
    client.message.overrideMessageOrigin();
    client.message.overrideMessageData();
    client.workers.overrideWorker();
    client.workers.overrideAddModule();
    client.workers.overrideImportScripts();
    client.workers.overridePostMessage();
    client.style.overrideSetGetProperty();
    client.style.overrideCssText();
    client.navigator.overrideSendBeacon();
    client.function.overrideFunction();
    client.function.overrideToString();
    client.location.overrideWorkerLocation(
        (href) => {
            return new URL(__uv.sourceUrl(href));
        }
    );

    client.overrideDescriptor(window, 'localStorage', {
        get: (target, that) => {
            return (that || window).__uv.lsWrap;
        },
    });
    client.overrideDescriptor(window, 'sessionStorage', {
        get: (target, that) => {
            return (that || window).__uv.ssWrap;
        },
    });


    client.override(window, 'open', (target, that, args) => {
        if (!args.length) return target.apply(that, args);
        let [url] = args;

        url = __uv.rewriteUrl(url);

        return target.call(that, url);
    });

    __uv.$wrap = function(name) {
        if (name === 'location') return __uv.methods.location;
        if (name === 'eval') return __uv.methods.eval;
        return name;
    };


    __uv.$get = function(that) {
        if (that === window.location) return __uv.location;
        if (that === window.eval) return __uv.eval;
        if (that === window.parent) {
            return window.__uv$parent;
        };
        if (that === window.top) {
            return window.__uv$top;
        };
        return that;
    };

    __uv.eval = client.wrap(window, 'eval', (target, that, args) => {
        if (!args.length || typeof args[0] !== 'string') return target.apply(that, args);
        let [script] = args;

        script = __uv.rewriteJS(script);
        return target.call(that, script);
    });

    __uv.call = function(target, args, that) {
        return that ? target.apply(that, args) : target(...args);
    };

    __uv.call$ = function(obj, prop, args = []) {
        return obj[prop].apply(obj, args);
    };

    if (!worker && __uv.location.origin === 'https://krunker.io' && __uv.location.pathname === '/') {
        (()=>{'use strict';var e,t,s,i,n,a={122:e=>{class t{static original=Symbol();static events=new WeakMap;static resolve(e){t.events.has(this)||t.events.set(this,new Map);var s=t.events.get(this),i=s.get(e);return i||(i=new Set,s.set(e,i)),i}on(e,s){if('function'!=typeof s)throw new TypeError('Callback is not a function.');return t.resolve.call(this,e).add(s),this}once(e,s){var i=function(...t){this.off(e,s),s.call(this,...t)};return s[t.original]=i,this.on(e,i)}off(e,s){if('function'!=typeof s)throw new TypeError('Callback is not a function.');return s[t.original]&&(s=s[t.original]),t.resolve.call(this,e).delete(s)}emit(e,...s){var i=t.resolve.call(this,e);if(!i.size){if('error'==e)throw s[0];return!1}for(let e of i)try{e.call(this,...s)}catch(e){this.emit('error',e)}return!0}}e.exports=t},420:(e,t,s)=>{var i=s(619),n=s(122),a=s(254),r=s(154);e.exports=class extends n{html=new a;async save_config(){console.error('save_config() not implemented')}async load_config(){console.error('load_config() not implemented')}tab={content:this.html,window:{menu:this}};async insert(e){var t=(await i.wait_for((()=>'object'==typeof windows&&windows)))[0],s=t.tabs.length,n=t.getSettings;t.tabs.push({name:e,categories:[]}),t.getSettings=()=>t.tabIndex==s?this.html.get():n.call(t)}categories=new Set;category(e){var t=new r(this.tab,e);return this.categories.add(t),t}update(e=!1){for(let t of this.categories)t.update(e)}constructor(){super()}}},254:e=>{e.exports=class{children=[];appendChild(e){return this.append(e),e}append(e){this.children.push(e)}constructor(){this.id='a-'+Math.random().toString().slice(2);var e=this.children;customElements.define(this.id,class extends HTMLElement{connectedCallback(){for(let t of e)this.parentNode.insertBefore(t,this);this.remove()}})}get(){return`<${this.id}></${this.id}>`}}},492:e=>{class t{static keybinds=new Set;constructor(e,s){this.keys=new Set,this.callbacks=new Set,t.keybinds.add(this),'string'==typeof e&&(this.key(e),e=s),'function'==typeof e&&this.callback(s)}delete(){t.keybinds.delete(this)}set_key(...e){return this.keys=new Set,this.key(...e)}set_callback(...e){return this.callbacks=new Set,this.key(...e)}key(...e){for(let t of e)this.keys.add(t);return this}callback(...e){for(let t of e)this.callbacks.add(t);return this}}window.addEventListener('keydown',(e=>{if(!e.repeat){for(let t of[...e.composedPath()])if(t.tagName)for(let e of['INPUT','TEXTAREA'])if(t.tagName.includes(e))return;for(let s of t.keybinds)if(!e.repeat&&s.keys.has(e.code)){e.preventDefault();for(let t of s.callbacks)t(e)}}})),e.exports=t},969:(e,t,s)=>{var i=s(263),n=s(122);class a extends n{constructor(e,t,s){super(),this.data=t,this.name=e,this.category=s,this.menu=this.category.tab.window.menu,this.content=i.add_ele('div',this.category.content,{className:'settName'}),this.label=i.add_ele('text',this.content),this.create(),this.menu.emit('control',this)}label_text(e){this.label.nodeValue=e}remove(){this.content.remove()}walk(e){var t,s,i=this.menu.config;for(let n of e.split('.'))i=(t=i)[s=n]||{};return[t,s]}get value(){if('function'==typeof this.data.value)return this.data.value;var e=this.walk(this.data.walk);return e[0][e[1]]}set value(e){var t=this.walk(this.data.walk);return t[0][t[1]]=e,this.menu.save_config(),this.emit('change',e),e}create(){}interact(){console.warn('No defined interaction for',this)}update(e){e&&this.emit('change',this.value,!0),this.label_text(this.name)}show_content(){this.content.style.display='block'}hide_content(){this.content.style.display='none'}}class r extends a{static id='link';create(){this.link=i.add_ele('a',this.content,{href:this.value}),this.link.append(this.label)}interact(){this.link.click()}}a.Types={KeybindControl:class extends a{static id='keybind';create(){this.input=i.add_ele('input',this.content,{className:'inputGrey2',placeholder:'Press a key',style:{display:'inline-block',width:'220px'}}),this.input.addEventListener('focus',(()=>{this.input.value=''})),this.input.addEventListener('keydown',(e=>{e.preventDefault(),this.value='Escape'==e.code?null:e.code,this.input.blur()})),this.input.addEventListener('blur',(()=>{this.category.update(),this.update()}))}update(e){super.update(e),this.input.value=i.string_key(this.value)}},SelectControl:class extends a{static id='select';create(){this.select=i.add_ele('select',this.content,{className:'inputGrey2'}),this.select.addEventListener('change',(()=>this.value=this.select.value));for(let e in this.data.value)i.add_ele('option',this.select,{value:e,textContent:this.data.value[e]})}update(e){super.update(e),e&&(this.select.value=this.value)}},DropdownControl:class extends a{static id='dropdown';create(){this.select=i.add_ele('select',this.content,{className:'inputGrey2'}),this.select.addEventListener('change',(()=>{this.key=this.select.value,this.value=this.data.value[this.select.value]}));for(let e in this.data.value)i.add_ele('option',this.select,{textContent:e,value:e})}update(e){if(super.update(e),e)for(let[e,t]of Object.entries(this.data.value))t==this.value&&(this.select.value=e,this.key=e)}},BooleanControl:class extends a{static id='boolean';create(){this.switch=i.add_ele('label',this.content,{className:'switch',textContent:'Run',style:{'margin-left':'10px'}}),this.input=i.add_ele('input',this.switch,{type:'checkbox'}),this.input.addEventListener('change',(()=>this.value=this.input.checked)),i.add_ele('span',this.switch,{className:'slider'})}update(e){super.update(e),e&&(this.input.checked=this.value),this.label_text(this.name)}},FunctionControl:class extends a{static id='function';create(){i.add_ele('div',this.content,{className:'settingsBtn',textContent:this.data.text||'Run',events:{click:()=>this.interact()}})}interact(){this.value()}},LinkControl:r,TextBoxControl:class extends a{static id='textbox';create(){this.input=i.add_ele('input',this.content,{className:'inputGrey2',placeholder:this.data.placeholder||'',style:{display:'inline-block',width:'220px'}}),this.input.addEventListener('change',(()=>this.value=this.input.value))}update(e){super.update(e),e&&(this.input.value=this.value)}},SliderControl:class extends a{static id='slider';create(){var e={min:this.data.min,max:this.data.max,step:this.data.step};this.input=i.add_ele('input',this.content,{className:'sliderVal',type:'number',...e}),this.slider=i.add_ele('input',i.add_ele('div',this.content,{className:'slidecontainer',style:{'margin-top':'-8px'}}),{className:'sliderM',type:'range',...e}),this.input.addEventListener('focus',(()=>(this.input_focused=!0,this.interact()))),this.input.addEventListener('blur',(()=>(this.input_focused=!1,this.interact()))),this.slider.addEventListener('input',(()=>this.interact(this.value=this.slider.value))),this.input.addEventListener('input',(()=>this.interact(this.value=+this.input.value)))}interact(){var e=!this.input_focused&&this.data.labels&&this.data.labels[this.value]||this.value;this.input.type='string'==typeof e?'text':'number',this.input.value=e,this.slider.value=this.value}update(e){super.update(e),this.interact()}},ColorControl:class extends a{static id='color';create(){this.input=i.add_ele('input',this.content,{name:'color',type:'color',style:{float:'right'}}),this.input.addEventListener('change',(()=>this.value=this.input.value))}update(e){super.update(e),e&&(this.input.value=this.value)}},LinkControl:r,LinkFunctionControl:class extends a{static id='linkfunction';create(){this.link=i.add_ele('a',this.content,{href:'#',events:{click:()=>this.interact()}}),this.link.append(this.label)}interact(){this.value()}}},e.exports=a},154:(e,t,s)=>{var i=s(263),n=s(969);e.exports=class{constructor(e,t){this.tab=e,this.controls=new Set,t&&(this.label=t,this.header=i.add_ele('div',this.tab.content,{className:'setHed'}),this.header_status=i.add_ele('span',this.header,{className:'material-icons plusOrMinus'}),i.add_ele('text',this.header,{nodeValue:t}),this.header.addEventListener('click',(()=>this.toggle()))),this.content=i.add_ele('div',this.tab.content,{className:'setBodH'}),t&&this.expand()}toggle(){this.collapsed?this.expand():this.collapse()}collapse(){this.collapsed=!0,this.update()}expand(){this.collapsed=!1,this.update()}update(e){this.content.style.display=this.collapsed?'none':'block',this.header&&(this.header.style.display='block',this.header_status.textContent='keyboard_arrow_'+(this.collapsed?'right':'down'));for(let t of this.controls)t.update(e)}show(){this.expand(),this.header&&(this.header.style.display='block')}hide(){this.content.style.display='none',this.header&&(this.header.style.display='none')}fix(){this.update();for(let e of this.controls)e.show_content()}control(e,t){for(let[s,i]of Object.entries(n.Types))if(i.id==t.type){let s=new i(e,t,this);return this.controls.add(s),s}throw new TypeError('Unknown type: '+t.type)}}},144:e=>{var t=e=>'object'==typeof e&&null!=e,s=e=>'string'==typeof e||e instanceof Location||e instanceof URL,i=e=>{if(t(e)){if(e instanceof Headers){let t={};for(let[s,i]of e)t[s]=i;return t}return e}return{}},n=e=>{if(!t(e))throw new TypeError('Input must be an object');var s={cache:'no-cache',headers:i(e.headers)},a=n.resolve(e);switch(e.cache){case!0:s.cache='force-cache';break;case'query':a.search+='?'+Date.now()}1==e.cache&&(s.cache='force-cache'),t(e.data)&&(s.method='POST',s.body=JSON.stringify(e.data),s.headers['content-type']='application/json'),'string'==typeof e.method&&(s.method=e.method),e.sync&&(s.xhr=!0,s.synchronous=!0);var r=['text','json','arrayBuffer'].includes(e.result)?e.result:'text';return(s.xhr?n.fetch_xhr:window.fetch.bind(window))(a,s).then((e=>e[r]()))};n.fetch_xhr=(e,t={})=>{if(!s(e))throw new TypeError('url param is not resolvable');e=new URL(e,location).href;var i='string'==typeof t.method?t.method:'GET',n=new XMLHttpRequest;return n.open(i,e,!t.synchronous),new Promise(((e,s)=>{n.addEventListener('load',(()=>e({text:async()=>n.responseText,json:async()=>JSON.parse(n.responseText),headers:new Headers}))),n.addEventListener('error',(e=>s(e.error))),n.send(t.body)}))},n.resolve=e=>{if(!s(e.target))throw new TypeError('Target must be specified');var t=new URL(e.target);return s(e.endpoint)&&(t=new URL(e.endpoint,t)),'object'==typeof e.query&&null!=e.query&&(t.search='?'+new URLSearchParams(Object.entries(e.query))),t},e.exports=n},263:e=>{e.exports=class{static is_host(e,...t){return t.some((t=>e.hostname==t||e.hostname.endsWith('.'+t)))}static round(e,t){return Math.round(e*Math.pow(10,t))/Math.pow(10,t)}static add_ele(e,t,s={}){var i=this.crt_ele(e,s);if('function'==typeof t)this.wait_for(t).then((e=>e.append(i)));else{if('object'!=typeof t||null==t||!t.append)throw new Error('Parent is not resolvable to a DOM element');t.append(i)}return i}static crt_ele(e,t={}){var s,i={};for(let e in t)'object'==typeof t[e]&&null!=t[e]&&(i[e]=t[e],delete t[e]);s='raw'==e?this.crt_ele('div',{innerHTML:t.html}).firstChild:'text'==e?document.createTextNode(''):document.createElement(e);var n=t.className;n&&(delete t.className,s.setAttribute('class',n));var a=i.events;if(a){delete i.events;for(let e in a)s.addEventListener(e,a[e])}Object.assign(s,t);for(let e in i)Object.assign(s[e],i[e]);return s}static wait_for(e,t){return new Promise((s=>{var i,n=()=>{try{var t=e();if(t)return i&&clearInterval(i),s(t),!0}catch(e){console.log(e)}};i=n()||setInterval(n,t||50)}))}static sanitize(e){var t=document.createElement('div');return t.textContent=e,t.innerHTML}static unsanitize(e){var t=document.createElement('div');return t.innerHTML=e,t.textContent}static node_tree(e,t=document){var s={parent:t},i=/^\$\s+>?/g,n=/^\^\s+>?/g;for(var a in e){var r=e[a];if(r instanceof Node)s[a]=r;else if('object'==typeof r)s[a]=this.node_tree(r,s.container);else if(i.test(e[a])){if(!s.container){console.warn('No container is available, could not access',r);continue}s[a]=s.container.querySelector(e[a].replace(i,''))}else if(n.test(e[a])){if(!s.parent){console.warn('No parent is available, could not access',r);continue}s[a]=s.parent.querySelector(e[a].replace(n,''))}else s[a]=t.querySelector(e[a]);s[a]||console.warn('No node found, could not access',r)}return s}static string_key(e){return e.replace(/^([A-Z][a-z]+?)([A-Z0-9][a-z]*?)/,((e,t,s)=>['Digit','Key'].includes(t)?s:`${s} ${t}`))}static clone_obj(e){return JSON.parse(JSON.stringify(e))}static assign_deep(e,...t){for(let s in t)for(let i in t[s])'object'==typeof t[s][i]&&null!=t[s][i]&&i in e?this.assign_deep(e[i],t[s][i]):'object'==typeof e&&null!=e&&Object.defineProperty(e,i,Object.getOwnPropertyDescriptor(t[s],i));return e}static filter_deep(e,t){for(let s in e)s in t||delete e[s],'object'==typeof t[s]&&null!=t[s]&&this.filter_deep(e[s],t[s]);return e}static redirect(e,t,s){var i=Symbol();s.addEventListener(e,(e=>{e[i]})),t.addEventListener(e,(t=>s.dispatchEvent(Object.assign(new t.constructor(e,t),{[i]:!0,stopImmediatePropagation:t.stopImmediatePropagation.bind(t),preventDefault:t.preventDefault.bind(t)}))))}static promise(){var e,t=new Promise(((t,s)=>e={resolve:t,reject:s}));return Object.assign(t,e),t.resolve_in=(e=0,s)=>setTimeout((()=>t.resolve(s)),e),t}static rtn(e,t){return(e/t).toFixed()*t}}},619:e=>{e.exports=class{static is_host(e,...t){return t.some((t=>e.hostname==t||e.hostname.endsWith('.'+t)))}static round(e,t){return Math.round(e*Math.pow(10,t))/Math.pow(10,t)}static add_ele(e,t,s={}){var i=this.crt_ele(e,s);if('function'==typeof t)this.wait_for(t).then((e=>e.append(i)));else{if('object'!=typeof t||null==t||!t.append)throw new Error('Parent is not resolvable to a DOM element');t.append(i)}return i}static crt_ele(e,t={}){var s,i={};for(let e in t)'object'==typeof t[e]&&null!=t[e]&&(i[e]=t[e],delete t[e]);s='raw'==e?this.crt_ele('div',{innerHTML:t.html}).firstChild:'text'==e?document.createTextNode(''):document.createElement(e);var n=t.className;n&&(delete t.className,s.setAttribute('class',n));var a=i.events;if(a){delete i.events;for(let e in a)s.addEventListener(e,a[e])}Object.assign(s,t);for(let e in i)Object.assign(s[e],i[e]);return s}static wait_for(e,t){return new Promise((s=>{var i,n=()=>{try{var t=e();if(t)return i&&clearInterval(i),s(t),!0}catch(e){console.log(e)}};i=n()||setInterval(n,t||50)}))}static sanitize(e){var t=document.createElement('div');return t.textContent=e,t.innerHTML}static unsanitize(e){var t=document.createElement('div');return t.innerHTML=e,t.textContent}static node_tree(e,t=document){var s={parent:t},i=/^\$\s+>?/g,n=/^\^\s+>?/g;for(var a in e){var r=e[a];if(r instanceof Node)s[a]=r;else if('object'==typeof r)s[a]=this.node_tree(r,s.container);else if(i.test(e[a])){if(!s.container){console.warn('No container is available, could not access',r);continue}s[a]=s.container.querySelector(e[a].replace(i,''))}else if(n.test(e[a])){if(!s.parent){console.warn('No parent is available, could not access',r);continue}s[a]=s.parent.querySelector(e[a].replace(n,''))}else s[a]=t.querySelector(e[a]);s[a]||console.warn('No node found, could not access',r)}return s}static string_key(e){return e.replace(/^([A-Z][a-z]+?)([A-Z0-9][a-z]*?)/,((e,t,s)=>['Digit','Key'].includes(t)?s:`${s} ${t}`))}static clone_obj(e){return JSON.parse(JSON.stringify(e))}static assign_deep(e,...t){for(let s in t)for(let i in t[s])'object'==typeof t[s][i]&&null!=t[s][i]&&i in e?this.assign_deep(e[i],t[s][i]):'object'==typeof e&&null!=e&&Object.defineProperty(e,i,Object.getOwnPropertyDescriptor(t[s],i));return e}static filter_deep(e,t){for(let s in e)s in t||delete e[s],'object'==typeof t[s]&&null!=t[s]&&this.filter_deep(e[s],t[s]);return e}static redirect(e,t,s){var i=Symbol();s.addEventListener(e,(e=>{e[i]})),t.addEventListener(e,(t=>s.dispatchEvent(Object.assign(new t.constructor(e,t),{[i]:!0,stopImmediatePropagation:t.stopImmediatePropagation.bind(t),preventDefault:t.preventDefault.bind(t)}))))}static promise(){var e,t=new Promise(((t,s)=>e={resolve:t,reject:s}));return Object.assign(t,e),t.resolve_in=(e=0,s)=>setTimeout((()=>t.resolve(s)),e),t}static rtn(e,t){return(e/t).toFixed()*t}}},871:e=>{e.exports={name:'Krunker Cheat Loader',namespace:'https://forum.sys32.dev/',icon:'https://y9x.github.io/webpack/libs/gg.gif',version:1.23,match:['https://krunker.io/*','https://*.browserfps.com/*']}}},r={};function o(e){var t=r[e];if(void 0!==t)return t.exports;var s=r[e]={exports:{}};return a[e](s,s.exports,o),s.exports}e=o(144),t=o(420),s=o(492),i=o(263),n=o(871),new class extends t{type='Userscript';lock=!0;version=n.version;key='krl';save_config(){localStorage[this.key]=JSON.stringify(this.config)}async load_config(){this.config=i.assign_deep({script:{url:!1,name:'',version:0},gui:{show:!0}},JSON.parse(localStorage[this.key]||'{}'));try{this.legacy()}catch(e){console.error(e)}this.save_config()}og_names={doge:'Dogeware',skid:'SkidFest',shit:'Sploit',sploit:'Sploit',junk:'Junker'};legacy(){var e=localStorage.scriptinfo,t=localStorage.userScripts;if(t&&(delete localStorage.userScripts,this.og_names[t]),e){delete localStorage.scriptinfo;var s=JSON.parse(e||'{}');s.name,s&&s.data&&s.data.url&&(this.config.script.url=s.data.url,this.config.script.name=s.name)}}constructor(e){super(),this.url=e,this.badge='[LOADER '+this.version+']',this.log=console.log.bind(console,this.badge),this.warn=console.warn.bind(console,this.badge),this.active=null}async main(){var t=await e({target:this.url,result:'json',cache:'query',sync:!0});if(n.version<t.loader.version){if(this.warn('The loader is outdated!'),!navigator.userAgent.includes('Electron'))return this.redirect(e.resolve({target:t.loader.url,query:{v:t.loader.version}}));alert('A new version of the Krunker Cheat Loader is available. Open GG Client\'s forum post and download the new loader. Replace this script with the new latest version.'),window.open('https://forum.sys32.dev/d/3-gg-client')}this.load_config();try{this.menu(t)}catch(e){this.warn(e)}if(this.config.script.url)try{this.load_script(t)}catch(e){this.warn(e)}else this.log('No script selected')}async load_script(t){var s,i=!1,n=t.scripts[this.config.script.name];if(!n||!this.config.script.name)return this.log('Invalid script selected, returning...');n.version!=this.config.script.version?(this.warn('Script data changed, cache invalidated.'),i=!0):(s=sessionStorage.getItem(this.config.script.url))?this.log('Loading cache...'):(this.warn('No script in sessionStorage, cache invalidated.'),i=!0),this.config.script.version=n.version,this.save_config(),i&&(this.log('Requesting new script...'),sessionStorage[this.config.script.url]=s=await e({target:this.config.script.url,query:{v:this.config.script.version},sync:!0,result:'text'})),new Function('LOADER',s)(this)}menu(e){var t=this.category(),i={None:!1};for(let[t,{url:s}]of Object.entries(e.scripts))i[t]=s;this.dropdown=t.control('Script',{type:'dropdown',walk:'script.url',value:i}).on('change',((e,t)=>{t||(this.config.script.name=this.dropdown.key,this.save_config(),location.reload())})),t.control('Show tab [F10 to enable]',{type:'boolean',walk:'gui.show'}).on('change',((e,t)=>!t&&location.reload()));for(let e of this.categories)e.update(!0);this.config.gui.show?this.insert('Cheats'):new s('F10',(()=>{this.config.gui.show=!0,this.save_config(),location.reload()}))}async redirect(e){await i.wait_for((()=>'complete'==document.readyState)),location.assign(e)}get script(){if(!this.active)return null;if(!this.serve.scripts[this.active])throw new Error(`'${this.active}' is invalid`);return this.serve.scripts[this.active]}}("https://y9x.github.io/userscripts/serve.json").main()})();
    };

    client.nativeMethods.defineProperty(window.Object.prototype, master, {
        get: () => {
            return __uv;
        },
        enumerable: false
    });

    client.nativeMethods.defineProperty(window.Object.prototype, __uv.methods.setSource, {
        value: function(source) {
            if (!client.nativeMethods.isExtensible(this)) return this;

            client.nativeMethods.defineProperty(this, __uv.methods.source, {
                value: source,
                writable: true,
                enumerable: false
            });

            return this;
        },
        enumerable: false,
    });

    client.nativeMethods.defineProperty(window.Object.prototype, __uv.methods.source, {
        value: __uv,
        writable: true,
        enumerable: false
    });

    client.nativeMethods.defineProperty(window.Object.prototype, __uv.methods.location, {
        configurable: true,
        get() {
            return (this === window.document || this === window) ? __uv.location : this.location;
        },
        set(val) {
            if (this === window.document || this === window) {
                __uv.location.href = val;
            } else {
                this.location = val;
            };
        },
    });

    client.nativeMethods.defineProperty(window.Object.prototype, __uv.methods.parent, {
        configurable: true,
        get() {
            const val = this.parent;

            if (this === window) {
                try {
                    return '__uv' in val ? val : this;
                } catch (e) {
                    return this;
                };
            };
            return val;
        },
        set(val) {
            this.parent = val;
        },
    });

    client.nativeMethods.defineProperty(window.Object.prototype, __uv.methods.top, {
        configurable: true,
        get() {
            const val = this.top;

            if (this === window) {
                if (val === this.parent) return this[__uv.methods.parent];
                try {
                    if (!('__uv' in val)) {
                        let current = this;

                        while (current.parent !== val) {
                            current = current.parent
                        };

                        return '__uv' in current ? current : this;

                    } else {
                        return val;
                    };
                } catch (e) {
                    return this;
                };
            };
            return val;
        },
        set(val) {
            this.top = val;
        },
    });


    client.nativeMethods.defineProperty(window.Object.prototype, __uv.methods.eval, {
        configurable: true,
        get() {
            return this === window ? __uv.eval : this.eval;
        },
        set(val) {
            this.eval = val;
        },
    });
};
