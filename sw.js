const CACHE_NAME='form-journal-shell-v2';
const CORE=['./','./index.html','./styles.css','./app.js','./program.json','./manifest.webmanifest','./assets/icons/icon-192.png','./assets/icons/icon-512.png','./assets/icons/apple-touch-icon.png'];
const DIAGRAMS = 'squat good_morning hip_abduction hip_adduction step_up dead_bug calf_raise high_cable_pulldown db_chest_press cable_row db_shoulder_press lateral_raise external_rotation biceps_curl triceps_pushdown box_squat seated_knee_extension prone_knee_curl db_rdl glute_bridge bird_dog incline_chest_press one_arm_cable_row face_pull hammer_curl overhead_march'.split(' ').map(x=>'./assets/exercises/'+x+'.svg');
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll([...CORE,...DIAGRAMS])).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==location.origin)return;
 event.respondWith(caches.match(req).then(hit=>{
  const network=fetch(req).then(resp=>{if(resp.ok&&new URL(req.url).pathname.match(/\.(svg|png|pdf|js|json|css|html)$/)){const copy=resp.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy));}return resp;}).catch(()=>hit);
  return hit||network;
 }));
});
