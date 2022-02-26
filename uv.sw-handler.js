importScripts('./uv.sw.js');

const sw = new UVServiceWorker();

sw.on('request', event => {
    const { url } = event.data;

    if (url.host === 'www.google.com' && url.pathname.endsWith('apple_00.png')) {
        event.data.base = event.data.url = new URL('https://incog.dev/e.png');
    };
});

self.addEventListener('fetch', event =>
    event.respondWith(
        sw.fetch(event)
    )
);
