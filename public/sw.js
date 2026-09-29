const VERSION='tgpu-core-v1.0';
const SHELL_CACHE=`tgpu-shell-${VERSION}`;
const RUNTIME_CACHE=`tgpu-runtime-${VERSION}`;
const MAP_PACK_PREFIX='teman-map-pack-';
const PMTILES_CACHE='teman-pmtiles-v1';
const CORE=['/','/manifest.webmanifest','/satu-icon.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(SHELL_CACHE).then(cache=>cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys
        .filter(key=>![SHELL_CACHE,RUNTIME_CACHE,PMTILES_CACHE].includes(key) && !key.startsWith(MAP_PACK_PREFIX))
        .map(key=>caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);

  if(url.origin===self.location.origin && url.pathname.endsWith('.pmtiles')){
    const range=request.headers.get('range');
    event.respondWith(range ? servePmtilesRange(request,range) : servePmtilesFile(request));
    return;
  }

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

  if(url.origin===self.location.origin){
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

async function servePmtilesFile(request){
  const cache=await caches.open(PMTILES_CACHE);
  const cached=await cache.match(request.url);
  if(cached)return cached;
  try{return await fetch(request);}catch{return Response.error();}
}

async function servePmtilesRange(request,rangeHeader){
  const cache=await caches.open(PMTILES_CACHE);
  const cached=await cache.match(request.url);

  if(!cached){
    try{return await fetch(request);}catch{return Response.error();}
  }

  const buffer=await cached.arrayBuffer();
  const total=buffer.byteLength;
  const match=/bytes=(\d+)-(\d*)/.exec(rangeHeader);
  if(!match){
    return new Response(buffer,{status:200,headers:{
      'Content-Type':'application/vnd.pmtiles',
      'Content-Length':String(total),
      'Accept-Ranges':'bytes'
    }});
  }

  const start=Number(match[1]);
  const requestedEnd=match[2] ? Number(match[2]) : total-1;
  if(!Number.isFinite(start) || start<0 || start>=total){
    return new Response(null,{status:416,headers:{'Content-Range':`bytes */${total}`}});
  }
  const end=Math.min(requestedEnd,total-1);
  const slice=buffer.slice(start,end+1);
  return new Response(slice,{status:206,headers:{
    'Content-Type':'application/vnd.pmtiles',
    'Content-Length':String(slice.byteLength),
    'Content-Range':`bytes ${start}-${end}/${total}`,
    'Accept-Ranges':'bytes',
    'Cache-Control':'no-store'
  }});
}
