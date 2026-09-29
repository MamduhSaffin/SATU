import { useEffect, useMemo, useState } from 'react';
import { IndexedDbLocalStore } from '../core/storage/indexedDb';
import { OfflineSyncQueue, type SyncOperation } from '../core/sync/queue';
import { TemanRepository } from './repository';
import type { EmergencyContact, PilgrimProfile, TravelPlan } from './types';
import './teman-offline.css';

type CheckInStatus = 'safe' | 'with-group' | 'at-hotel' | 'need-contact';
type FamilyCheckIn = { id:string; status:CheckInStatus; label:string; createdAt:number; pilgrimName:string; hotelName?:string; groupCode?:string; busNumber?:string };
type CloudLink = { familyId:string; writeToken:string; viewerToken:string; viewerUrl:string; createdAt:number; lastSyncedAt?:number };

const CHECKIN_KEY='teman.family.checkins';
const CLOUD_KEY='teman.family.cloud';
const store=new IndexedDbLocalStore();
const repo=new TemanRepository(store);
const syncQueue=new OfflineSyncQueue(store);
const STATUS_LABELS:Record<CheckInStatus,string>={safe:'Saya selamat','with-group':'Saya bersama kumpulan','at-hotel':'Saya sudah di hotel','need-contact':'Tolong hubungi saya'};

function formatTime(value:number){return new Date(value).toLocaleString('ms-MY',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}

export default function FamilyLinkApp(){
  const[profile,setProfile]=useState<PilgrimProfile>();
  const[travel,setTravel]=useState<TravelPlan>();
  const[contact,setContact]=useState<EmergencyContact>();
  const[checkIns,setCheckIns]=useState<FamilyCheckIn[]>([]);
  const[cloud,setCloud]=useState<CloudLink>();
  const[pendingCount,setPendingCount]=useState(0);
  const[online,setOnline]=useState(navigator.onLine);
  const[message,setMessage]=useState('');
  const[busy,setBusy]=useState(false);

  async function refreshPending(){const queue=await syncQueue.list();setPendingCount(queue.filter(x=>x.channel==='teman.family-checkin').length);}
  async function rememberSync(link:CloudLink){const next={...link,lastSyncedAt:Date.now()};await store.set(CLOUD_KEY,next);setCloud(next);}

  useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);

  useEffect(()=>{void(async()=>{const[savedProfile,savedTravel,contacts,savedCheckIns,savedCloud]=await Promise.all([repo.getPilgrim(),repo.getTravelPlan(),repo.getEmergencyContacts(),store.get<FamilyCheckIn[]>(CHECKIN_KEY),store.get<CloudLink>(CLOUD_KEY)]);setProfile(savedProfile);setTravel(savedTravel);setContact(contacts[0]);setCheckIns(savedCheckIns??[]);setCloud(savedCloud);await refreshPending();})();},[]);

  const latest=checkIns[0];
  const hotel=travel?.makkahHotel??travel?.madinahHotel;
  const group=travel?.group;
  const familyPreview=useMemo(()=>({pilgrimName:latest?.pilgrimName||profile?.fullName||'Nama jemaah',status:latest?.label||'Belum ada check-in',time:latest?formatTime(latest.createdAt):'—',hotel:latest?.hotelName||hotel?.name||'—',group:latest?.groupCode||group?.groupCode||'—',bus:latest?.busNumber||group?.busNumber||'—'}),[latest,profile,hotel,group]);

  async function sendToCloud(item:FamilyCheckIn,link:CloudLink):Promise<boolean>{
    try{const response=await fetch('/api/family/checkin',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({familyId:link.familyId,writeToken:link.writeToken,checkIn:item})});return response.ok;}catch{return false;}
  }

  async function flushQueue(link=cloud){
    if(!navigator.onLine||!link)return;
    const queue=await syncQueue.list();
    const pending=queue.filter(x=>x.channel==='teman.family-checkin');
    let sent=false;
    for(const op of pending){const ok=await sendToCloud(op.payload as FamilyCheckIn,link);if(!ok)break;await syncQueue.markDone(op.id);sent=true;}
    if(sent)await rememberSync(link);
    await refreshPending();
  }

  useEffect(()=>{if(online&&cloud)void flushQueue(cloud);},[online,cloud?.familyId]);

  async function activateCloud(){
    if(!online){setMessage('Sambungkan internet untuk mengaktifkan Family Link cloud.');return;}
    setBusy(true);
    try{
      const response=await fetch('/api/family/pair',{method:'POST'});
      const body=await response.json() as {ok?:boolean;familyId?:string;writeToken?:string;viewerToken?:string;configurationRequired?:boolean;message?:string};
      if(!response.ok||!body.familyId||!body.writeToken||!body.viewerToken){setMessage(body.configurationRequired?'Azure Family Link belum lengkap dikonfigurasi. Storage connection perlu ditambah sekali sahaja.':(body.message||'Tidak dapat mengaktifkan Family Link.'));return;}
      const viewerUrl=`${window.location.origin}/?app=teman-family-view&family=${encodeURIComponent(body.familyId)}&token=${encodeURIComponent(body.viewerToken)}`;
      const next:CloudLink={familyId:body.familyId,writeToken:body.writeToken,viewerToken:body.viewerToken,viewerUrl,createdAt:Date.now()};
      await store.set(CLOUD_KEY,next);setCloud(next);setMessage('Family Link cloud aktif. Kongsi pautan Family View kepada keluarga.');await flushQueue(next);
    }catch{setMessage('Tidak dapat menghubungi Azure Family Link.');}finally{setBusy(false);}
  }

  async function revokeCloud(){
    if(!cloud)return;
    if(!online){setMessage('Sambungkan internet untuk mematikan pautan keluarga dengan selamat.');return;}
    const confirmed=window.confirm('Matikan Family Link ini? Pautan lama keluarga akan berhenti berfungsi. Check-in yang disimpan pada telefon tidak akan dipadam.');
    if(!confirmed)return;
    setBusy(true);
    try{
      const response=await fetch('/api/family/link',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({familyId:cloud.familyId,writeToken:cloud.writeToken})});
      if(response.ok||response.status===404){await store.remove(CLOUD_KEY);setCloud(undefined);setMessage('Pautan Family View lama telah dimatikan. Aktifkan semula untuk menghasilkan pautan baharu.');return;}
      setMessage('Tidak dapat mematikan Family Link sekarang. Cuba lagi apabila sambungan stabil.');
    }catch{setMessage('Tidak dapat menghubungi TEMAN cloud. Pautan lama belum dimatikan.');}finally{setBusy(false);}
  }

  async function saveCheckIn(status:CheckInStatus){
    const item:FamilyCheckIn={id:`checkin-${Date.now()}`,status,label:STATUS_LABELS[status],createdAt:Date.now(),pilgrimName:profile?.fullName||'Jemaah TEMAN',hotelName:hotel?.name,groupCode:group?.groupCode,busNumber:group?.busNumber};
    const next=[item,...checkIns].slice(0,20);await store.set(CHECKIN_KEY,next);const op:SyncOperation<FamilyCheckIn>=await syncQueue.enqueue('teman.family-checkin','create',item);setCheckIns(next);
    if(online&&cloud&&await sendToCloud(item,cloud)){await syncQueue.markDone(op.id);await rememberSync(cloud);setMessage('Check-in berjaya dihantar ke Family View.');}else{setMessage(online?'Check-in disimpan. Ia menunggu Family Link cloud.':'Check-in disimpan offline dan akan dihantar apabila internet kembali.');}
    await refreshPending();
  }

  async function shareFamilyLink(){
    if(!cloud){setMessage('Aktifkan Family Link cloud dahulu.');return;}
    const text='TEMAN Family View — buka pautan ini untuk melihat check-in terkini saya.';
    try{if(navigator.share)await navigator.share({title:'TEMAN Family View',text,url:cloud.viewerUrl});else{await navigator.clipboard.writeText(cloud.viewerUrl);setMessage('Pautan Family View disalin.');}}catch{setMessage('Perkongsian dibatalkan.');}
  }

  async function shareLatest(){
    if(!latest){setMessage('Buat satu check-in dahulu.');return;}
    const text=[`TEMAN Family Link — ${latest.pilgrimName}`,`Status: ${latest.label}`,`Masa: ${formatTime(latest.createdAt)}`,latest.hotelName?`Hotel: ${latest.hotelName}`:'',latest.groupCode?`Kumpulan: ${latest.groupCode}`:'',latest.busNumber?`Bas: ${latest.busNumber}`:'','Dihantar melalui TEMAN Haramain by TGPU.'].filter(Boolean).join('\n');
    try{if(navigator.share)await navigator.share({title:'TEMAN Family Link',text});else{await navigator.clipboard.writeText(text);setMessage('Status disalin.');}}catch{setMessage('Perkongsian dibatalkan.');}
  }

  function callFamily(){if(!contact?.phone){setMessage('Nombor keluarga belum disimpan dalam TEMAN.');return;}const cleaned=contact.phone.replace(/[^\d+]/g,'');if(cleaned)window.location.href=`tel:${cleaned}`;}

  return <main className="teman-app">
    <header className="teman-header"><div><strong>TEMAN Family Link</strong><span> by <b>TGPU</b></span></div><div className={online?'status online':'status offline'}>{online?'Online':'Offline • check-in masih boleh disimpan'}</div></header>
    <button className="back" onClick={()=>{window.location.href='/?app=teman';}}>← Kembali ke TEMAN</button>
    <section className="teman-content">
      <div className="hero"><div className="eyebrow">Privacy-first Family Link</div><h1>Beritahu keluarga dengan satu tekan.</h1><p>Jemaah memilih sendiri apa yang hendak dikongsi. Live tracking kekal OFF secara lalai.</p></div>
      {!online&&<div className="offline-banner">OFFLINE • Check-in akan disimpan pada telefon</div>}{message&&<div className="saved-banner">{message}</div>}

      {!cloud?<div className="ready-panel warning"><strong>Family cloud belum aktif</strong><p>Aktifkan sekali untuk menghasilkan pautan Family View peribadi.</p><button className="primary big" disabled={busy} onClick={()=>void activateCloud()}>{busy?'MENGAKTIFKAN…':'AKTIFKAN FAMILY LINK CLOUD'}</button></div>:<div className="ready-panel success"><strong>Family cloud aktif</strong><p>Dicipta: {formatTime(cloud.createdAt)} • Sync terakhir: {cloud.lastSyncedAt?formatTime(cloud.lastSyncedAt):'belum ada'}</p><p>{pendingCount} check-in menunggu sync. Live tracking: OFF.</p><button className="primary big" onClick={()=>void shareFamilyLink()}>KONGSI PAUTAN FAMILY VIEW</button><button className="action big" onClick={()=>void flushQueue()}>SYNC SEKARANG</button><button className="warning-btn big" disabled={busy} onClick={()=>void revokeCloud()}>{busy?'MEMPROSES…':'MATIKAN PAUTAN KELUARGA'}</button></div>}

      <button className="primary huge" onClick={()=>void saveCheckIn('safe')}>SAYA SELAMAT<span>Hantar check-in keselamatan sekarang</span></button>
      <button className="action huge" onClick={()=>void saveCheckIn('with-group')}>SAYA BERSAMA KUMPULAN<span>Hantar status bersama kumpulan</span></button>
      <button className="action huge" onClick={()=>void saveCheckIn('at-hotel')}>SAYA SUDAH DI HOTEL<span>Hantar status sudah kembali ke hotel</span></button>
      <button className="warning-btn huge" onClick={()=>void saveCheckIn('need-contact')}>TOLONG HUBUNGI SAYA<span>Minta keluarga menghubungi anda</span></button>

      <h2>Status Terakhir</h2><div className="safety-card"><Info label="JEMAAH" value={familyPreview.pilgrimName}/><Info label="STATUS" value={familyPreview.status}/><Info label="MASA" value={familyPreview.time}/><Info label="HOTEL" value={familyPreview.hotel}/><Info label="KUMPULAN / BAS" value={`${familyPreview.group} • ${familyPreview.bus}`}/></div>
      <button className="action big" onClick={()=>void shareLatest()}>KONGSI STATUS MANUAL</button>{contact?.phone&&<button className="action big" onClick={callFamily}>TELEFON {contact.name||'KELUARGA'}</button>}
      <div className="ready-panel success"><strong>Privasi</strong><p>Tiada GPS live dihantar. Family View hanya menerima status, masa, hotel, kumpulan dan bas yang jemaah sendiri hantar. Jika pautan pernah tersalah kongsi, matikan pautan lama dan aktifkan pautan baharu.</p></div>
    </section>
  </main>;
}

function Info({label,value}:{label:string;value:string}){return <div className="info-row"><span>{label}</span><strong>{value}</strong></div>;}
