(() => {
'use strict';
const script=document.currentScript;
const APP=script?.dataset.app||'';
const APP_VERSION=script?.dataset.version||'web';
const URL='https://mpidjwjghtpeybedmbkd.supabase.co';
const KEY='sb_publishable_LUGX_-Co3zolt94Qaj9AQg_m2zidH68';
if(!APP)return;
const QKEY='tgpu_feedback_queue_v2:'+APP;
const lang=()=>{const l=(document.documentElement.lang||'en').toLowerCase();return l.startsWith('ar')?'ar':l.startsWith('ms')?'ms':'en'};
const C={
ms:{open:'Maklum Balas',title:'Kongsi Maklum Balas',intro:'Maklum balas ini digunakan untuk memperbaiki produk TGPU ini. Maklumat hubungan adalah pilihan.',research:'Maklum balas biasa ini bukan penyertaan penyelidikan formal.',type:'Jenis maklum balas',msg:'Maklum balas',ph:'Beritahu kami apa yang membantu, mengelirukan atau tidak berfungsi…',name:'Nama (pilihan)',contact:'E-mel / WhatsApp (pilihan)',send:'Hantar',sending:'Menghantar…',close:'Tutup',need:'Sila tulis maklum balas anda.',ok:'Terima kasih. Maklum balas anda telah diterima.',queued:'Maklum balas disimpan pada peranti dan akan dihantar apabila internet tersedia.',retry:'Belum dapat dihantar. Maklum balas disimpan dan akan dicuba semula.'},
en:{open:'Feedback',title:'Share Feedback',intro:'This feedback is used to improve this TGPU product. Contact details are optional.',research:'Ordinary product feedback is not formal research participation.',type:'Feedback type',msg:'Feedback',ph:'Tell us what helped, what was confusing, or what did not work…',name:'Name (optional)',contact:'Email / WhatsApp (optional)',send:'Submit',sending:'Sending…',close:'Close',need:'Please enter your feedback.',ok:'Thank you. Your feedback has been received.',queued:'Feedback is saved on this device and will send when internet is available.',retry:'Could not send yet. Feedback is saved and will retry.'},
ar:{open:'ملاحظات',title:'شارك ملاحظاتك',intro:'تُستخدم هذه الملاحظات لتحسين هذا المنتج من TGPU. معلومات التواصل اختيارية.',research:'هذه الملاحظات العامة ليست مشاركة في بحث رسمي.',type:'نوع الملاحظة',msg:'ملاحظاتك',ph:'أخبرنا بما كان مفيدًا أو غير واضح أو لم يعمل…',name:'الاسم (اختياري)',contact:'البريد الإلكتروني / واتساب (اختياري)',send:'إرسال',sending:'جارٍ الإرسال…',close:'إغلاق',need:'يرجى كتابة ملاحظاتك.',ok:'شكرًا لك. تم استلام ملاحظاتك.',queued:'تم حفظ الملاحظات على الجهاز وستُرسل عند توفر الإنترنت.',retry:'تعذر الإرسال الآن. تم حفظ الملاحظات وستتم إعادة المحاولة.'}
};
const fallback={ms:[['general_feedback','Maklum balas umum'],['technical_problem','Masalah teknikal'],['suggestion','Cadangan'],['other','Lain-lain']],en:[['general_feedback','General feedback'],['technical_problem','Technical problem'],['suggestion','Suggestion'],['other','Other']],ar:[['general_feedback','ملاحظات عامة'],['technical_problem','مشكلة تقنية'],['suggestion','اقتراح'],['other','أخرى']]};
const uuid=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2);
const browser=()=>{const u=navigator.userAgent;if(/Edg\//.test(u))return'Edge';if(/Chrome\//.test(u)&&!/Edg\//.test(u))return'Chrome';if(/Safari\//.test(u)&&!/Chrome\//.test(u))return'Safari';if(/Firefox\//.test(u))return'Firefox';return'Other'};
const os=()=>{const u=navigator.userAgent;if(/iPhone|iPad|iPod/i.test(u))return'iOS/iPadOS';if(/Android/i.test(u))return'Android';if(/Windows/i.test(u))return'Windows';if(/Macintosh/i.test(u))return'macOS';return'Other'};
async function categories(l){
 try{
  const r=await fetch(URL+'/rest/v1/feedback_categories?app_name=eq.'+encodeURIComponent(APP)+'&active=eq.true&select=category,label_ms,label_en,label_ar,display_order&order=display_order.asc',{headers:{apikey:KEY,Authorization:'Bearer '+KEY}});
  if(!r.ok)throw 0; const rows=await r.json();
  if(rows.length)return rows.map(x=>[x.category,x['label_'+l]||x.label_en||x.category]);
 }catch{}
 return fallback[l];
}
function readQ(){try{return JSON.parse(localStorage.getItem(QKEY)||'[]')}catch{return[]}}
function writeQ(q){localStorage.setItem(QKEY,JSON.stringify(q.slice(-20)))}
async function insert(p){const r=await fetch(URL+'/rest/v1/feedback_submissions',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(p)});if(!r.ok)throw new Error(String(r.status))}
async function flush(){if(!navigator.onLine)return;const q=readQ(),rem=[];for(const p of q){try{await insert(p)}catch{rem.push(p)}}writeQ(rem)}
async function open(){
 if(document.querySelector('[data-tgpu-feedback-overlay]'))return;
 const l=lang(),t=C[l],cats=await categories(l),dir=l==='ar'?'rtl':'ltr';
 const ov=document.createElement('div');ov.className='tgpuFeedbackOverlay';ov.dataset.tgpuFeedbackOverlay='1';ov.dir=dir;
 ov.innerHTML='<section class="tgpuFeedbackModal" role="dialog" aria-modal="true" aria-labelledby="tgpu-feedback-title"><button class="tgpuFeedbackClose" type="button" data-close aria-label="'+t.close+'">×</button><h2 id="tgpu-feedback-title">'+t.title+'</h2><p class="tgpuFeedbackIntro">'+t.intro+'</p><p class="tgpuFeedbackNote">'+t.research+'</p><form novalidate><label>'+t.type+'<select name="category">'+cats.map(x=>'<option value="'+x[0]+'">'+x[1]+'</option>').join('')+'</select></label><label>'+t.msg+'<textarea name="message" minlength="3" maxlength="3000" required placeholder="'+t.ph+'"></textarea></label><label>'+t.name+'<input name="name_optional" maxlength="120" autocomplete="name"></label><label>'+t.contact+'<input name="contact_optional" maxlength="240"></label><input class="tgpuFeedbackHp" name="website" tabindex="-1" autocomplete="off"><div class="tgpuFeedbackStatus" role="status" aria-live="polite"></div><button class="tgpuFeedbackSubmit" type="submit">'+t.send+'</button></form></section>';
 const prev=document.body.style.overflow;document.body.style.overflow='hidden';document.body.appendChild(ov);
 const close=()=>{ov.remove();document.body.style.overflow=prev};
 ov.addEventListener('click',e=>{if(e.target===ov||e.target.closest('[data-close]'))close()});
 const esc=e=>{if(e.key==='Escape'){document.removeEventListener('keydown',esc);close()}};document.addEventListener('keydown',esc);
 const form=ov.querySelector('form'),status=ov.querySelector('.tgpuFeedbackStatus'),submit=ov.querySelector('.tgpuFeedbackSubmit');
 form.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(form);if(fd.get('website')){close();return}const message=String(fd.get('message')||'').trim();if(message.length<3){status.textContent=t.need;return}
  const p={client_submission_id:uuid(),app_name:APP,category:String(fd.get('category')||'other'),message,name_optional:String(fd.get('name_optional')||'').trim()||null,contact_optional:String(fd.get('contact_optional')||'').trim()||null,language:l,device_info:navigator.userAgent.slice(0,500),browser:browser(),os:os(),page_url:location.origin+location.pathname,route:location.pathname,app_version:APP_VERSION,location_context_optional:null,rating_optional:null,context:{display_mode:matchMedia('(display-mode: standalone)').matches?'standalone':'browser'}};
  submit.disabled=true;status.textContent=t.sending;
  if(!navigator.onLine){const q=readQ();q.push(p);writeQ(q);status.textContent=t.queued;submit.disabled=false;form.reset();return}
  try{await insert(p);status.textContent=t.ok;form.reset()}catch{const q=readQ();q.push(p);writeQ(q);status.textContent=t.retry}finally{submit.disabled=false}
 });
}
const b=document.createElement('button');b.type='button';b.className='tgpuFeedbackTrigger';b.textContent='✦ '+C[lang()].open;b.addEventListener('click',open);document.body.appendChild(b);
new MutationObserver(()=>b.textContent='✦ '+C[lang()].open).observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});
window.addEventListener('online',flush);void flush();
})();