const VERSION='tgpu-core-v0.1';
const SHELL_CACHE=`tgpu-shell-${VERSION}`;
const RUNTIME_CACHE=`tgpu-runtime-${VERSION}`;
const CORE=['/','/manifest.webmanifest','/satu-icon.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(SHELL_CACHE).then(cache=>cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(key=>![SHELL_CACHE,RUNTIME_CACHE].includes(key)).map(key=>caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;

  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request)
        .then(response=>{
          const copy=response.clone();
          caches.open(RUNTIME_CACHE).then(cache=>cache.put(request,copy));
          return response;
        })
        .catch(async()=>
          (await caches.match(request)) || (await caches.match('/')) || Response.error()
        )
    );
    return;
  }

  if(new URL(request.url).origin===self.location.origin){
    event.respondWith(
      caches.match(request).then(cached=>{
        const network=fetch(request).then(response=>{
          if(response.ok){
            const copy=response.clone();
            caches.open(RUNTIME_CACHE).then(cache=>cache.put(request,copy));
          }
          return response;
        }).catch(()=>cached || Response.error());
        return cached || network;
      })
    );
  }
});
