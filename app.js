/* ================= RNG（預設即時加密亂數／可選命運種子） ================= */
const QUERY = new URLSearchParams(location.search);
let RNG_MODE = (QUERY.get('mode')==='destiny'||QUERY.has('seed'))?'destiny':'random';
function secureUint32(){
  if(window.crypto&&crypto.getRandomValues){ const a=new Uint32Array(1); crypto.getRandomValues(a); return a[0]; }
  return Math.floor(Math.random()*4294967296);
}
function makeSeed(){ return secureUint32().toString(36)+secureUint32().toString(36).slice(0,4); }
let SEED = QUERY.get('seed') || makeSeed();
let _s = 0;
function seedInit(str){ _s = 1779033703; for(let i=0;i<str.length;i++){ _s = Math.imul(_s ^ str.charCodeAt(i), 3432918353); _s = _s<<13 | _s>>>19; } }
function seededR(){ _s|=0; _s = _s + 0x6D2B79F5 |0; let t = Math.imul(_s ^ _s>>>15, 1|_s); t = t + Math.imul(t ^ t>>>7, 61|t) ^ t; return ((t ^ t>>>14)>>>0)/4294967296; }
function R(){ return RNG_MODE==='destiny'?seededR():secureUint32()/4294967296; }
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const RATING_MAX=99;
/* 舊球探 20–80 基準映射到 1–99；所有聯盟門檻與模擬差值共用同一轉換，避免只換標籤。 */
const r99=v=>Math.round(20+(v-20)*79/60);
const ratingGap=(v,baseline)=>(v-baseline)*60/79;
const oldRating=v=>20+(v-20)*60/79;
const ri=(a,b)=>a+Math.floor(R()*(b-a+1));
const pick=a=>a[Math.floor(R()*a.length)];
/* 百分判定採連續高骰，保留 2.5% 等小數機率，不再先四捨五入扭曲實際結果。 */
const chance=p=>R()*100>=100-clamp(Number(p)||0,0,100);
function scrollBottom(){ /* 只捲動中央播報，不再推動整個頁面與兩側資訊欄。 */
  const log=document.getElementById('log');if(!log)return;
  try{requestAnimationFrame(()=>{log.scrollTop=log.scrollHeight;});}
  catch(e){log.scrollTop=log.scrollHeight;}
}
const N0=(sd)=> (R()+R()+R()+R()-2)/2*sd*2; /* 近似常態 */
function cleanPlayerName(value){
  const name=String(value||'').normalize('NFKC').replace(/[<>\u0000-\u001f\u007f]/g,'').trim().slice(0,10);
  return name||'黃鎖頭';
}
function escapeHTML(value){return String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function sanitizeSavedLog(value){
  const doc=new DOMParser().parseFromString(`<div id="safe-log">${String(value||'')}</div>`,'text/html'),root=doc.getElementById('safe-log');
  root.querySelectorAll('script,style,iframe,object,embed,link,meta,base,form,input,textarea,select').forEach(el=>el.remove());
  root.querySelectorAll('*').forEach(el=>[...el.attributes].forEach(attr=>{const n=attr.name.toLowerCase(),v=String(attr.value||'').trim().toLowerCase();if(n.startsWith('on')||n==='srcdoc'||((n==='href'||n==='src')&&(v.startsWith('javascript:')||v.startsWith('data:text/html'))))el.removeAttribute(attr.name);}));
  return root.innerHTML;
}
/* 真正常態分布：專門用在「整季型態」，讓年度波動彼此獨立，不再只靠幾個很窄的小亂數。 */
function normalZ(){const u=Math.max(R(),1e-9),v=R();return Math.sqrt(-2*Math.log(u))*Math.cos(Math.PI*2*v);}
function makeSeasonVarianceProfile(){
  const luck=Number.isFinite(S.seasonLuck)?S.seasonLuck:10,ageVol=S.age<=22?1.10:S.age>=34?1.16:1;
  /* 穩定輸出降低隨機雜訊，但手感骰、傷病與事件仍能造成真正的高低潮。 */
  const consistency=S.traits&&S.traits.steady?.78:1,noise=ageVol*consistency;
  const shared=clamp((luck-10.5)/5.75*.38+normalZ()*.72*noise,-2.65,2.65);
  const axis=(link,spread)=>clamp(shared*link+normalZ()*spread*noise,-2.8,2.8);
  const out={shared,workload:axis(.32,.82),contact:axis(.52,.78),power:axis(.36,.94),discipline:axis(.30,.76),running:axis(.24,.88),stuff:axis(.56,.72),command:axis(.34,.82),leverage:axis(.38,.90),support:axis(.28,.86),defense:axis(.22,.72),label:'',kind:''};
  if(shared>=1.50){out.label='全面爆發年';out.kind='hot';}
  else if(shared<=-1.50){out.label='全面低潮年';out.kind='cold';}
  else if(S.pos==='P'&&out.stuff>=1.55){out.label='壓制力上振';out.kind='hot';}
  else if(S.pos==='P'&&(out.stuff<=-1.55||out.command<=-1.65)){out.label='投球品質失速';out.kind='cold';}
  else if(S.pos!=='P'&&out.power>=1.65){out.label='長打上振';out.kind='hot';}
  else if(S.pos!=='P'&&out.contact>=1.55){out.label='擊球手感上振';out.kind='hot';}
  else if(S.pos!=='P'&&(out.contact<=-1.60||out.power<=-1.75)){out.label='打擊型態低潮';out.kind='cold';}
  return out;
}
function currentSeasonVariance(){return S._seasonVariance||makeSeasonVarianceProfile();}

/* ================= 靜態資料 ================= */
const ABL={sta:'體力',vel:'球速',ctl:'控球',brk:'變化球',con:'Contact',pow:'力量',spd:'速度',eye:'選球',rng:'守備範圍',fld:'接球',arm:'臂力',cat:'配球'};
const POS_AB={P:['sta','vel','ctl','brk'],C:['sta','con','pow','spd','eye','rng','fld','arm','cat'],IF:['sta','con','pow','spd','eye','rng','fld','arm'],OF:['sta','con','pow','spd','eye','rng','fld','arm']};
const POSN={P:'投手',C:'捕手',IF:'內野手',OF:'外野手'};
const PROSPECT_SURNAMES=['陳','林','黃','張','李','王','吳','劉','蔡','楊','許','鄭','謝','洪','郭','邱','曾','廖','賴','徐','周','葉','蘇','莊','呂','江','何','蕭','羅','高','潘','簡','朱','鍾','彭','詹','胡','施','沈','余','盧','梁','趙','顏','柯','翁','魏','孫','戴','范','宋','方','鄧','杜','傅','侯','曹','薛','丁','溫','紀','蔣','歐'];
const PROSPECT_GIVEN_A=['家','冠','柏','承','宇','俊','子','志','宗','建','昱','宥','佑','皓','彥','哲','品','凱','育','秉','詠','睿','書','庭','泓','維','奕','崇','恩','政','晉','嘉','聖','駿','翔','威','士','仕','靖','禹'];
const PROSPECT_GIVEN_B=['豪','傑','廷','軒','霖','安','翔','睿','宏','勳','毅','維','佑','宇','恩','杰','偉','倫','澤','辰','洋','凱','哲','昇','峰','鈞','銘','弘','平','德','丞','璋','文','賢','欽','遠','杰','毅','成','智'];
const PROSPECT_SCHOOLS=['平鎮高中','穀保家商','高苑工商','普門中學','成德高中','鶯歌工商','東石高中','西苑高中','文化大學','輔仁大學','國立體大','臺灣體大','開南大學','台電','合庫','安永鮮物','綺麗珊瑚'];
function normalizedPersonName(name){return String(name||'').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'');}
function isPlayerName(name){return !!S&&normalizedPersonName(name)===normalizedPersonName(S.name);}
function randomProspectName(used){
  let name='';for(let tries=0;tries<200;tries++){
    name=pick(PROSPECT_SURNAMES)+pick(PROSPECT_GIVEN_A)+(chance(86)?pick(PROSPECT_GIVEN_B):'');
    if(!isPlayerName(name)&&!used.has(name)){used.add(name);return name;}
  }
  do{name=pick(PROSPECT_SURNAMES)+pick(PROSPECT_GIVEN_A)+ri(10,99);}while(isPlayerName(name)||used.has(name));used.add(name);return name;
}
const NPB_SURNAMES=['佐藤','鈴木','高橋','田中','伊藤','渡邊','山本','中村','小林','加藤','吉田','山田','佐佐木','山口','松本','井上','木村','林','齋藤','清水','山崎','森','池田','橋本','阿部','石川','前田','藤田','岡田','後藤'];
const NPB_GIVEN=['蓮','湊','悠真','陽翔','颯太','樹','大輝','海斗','陸','蒼','拓海','健太','翔太','直樹','優斗','亮介','雄大','一樹','和真','龍之介'];
const US_FIRST=['Marcus','Diego','Ethan','Luis','Jordan','Mateo','Noah','Mason','Javier','Carlos','Logan','Tyler','Kenji','Miguel','Dominic','Andre','Caleb','Julio','Ryan','Dylan'];
const US_SURNAMES=['Reed','Alvarez','Walker','Moreno','Kim','Cruz','Johnson','Ramirez','Martinez','Lee','Hernandez','Rodriguez','Garcia','Williams','Anderson','Brown','Davis','Wilson','Miller','Thompson'];
function randomNpcName(org,used){
  used=used||new Set();let name='';
  for(let i=0;i<100;i++){
    if(org==='NPB')name=pick(NPB_SURNAMES)+pick(NPB_GIVEN);
    else if(org==='MiLB')name=pick(US_FIRST)+' '+pick(US_SURNAMES);
    else name=pick(PROSPECT_SURNAMES)+pick(PROSPECT_GIVEN_A)+(chance(82)?pick(PROSPECT_GIVEN_B):'');
    if(!isPlayerName(name)&&!used.has(name)){used.add(name);return name;}
  }
  do{name=(org==='MiLB'?pick(US_FIRST)+' '+pick(US_SURNAMES):org==='NPB'?pick(NPB_SURNAMES)+pick(NPB_GIVEN):pick(PROSPECT_SURNAMES)+pick(PROSPECT_GIVEN_A))+' '+ri(10,99);}while(isPlayerName(name)||used.has(name));used.add(name);return name;
}
/* 每個競賽層級都有自己的 26 人代表名單；一、二軍不再共用同一批隊友。 */
const NPC_ROSTER_ROLES=['SP','SP','SP','SP','SP','CL','SU','SU','RP','RP','RP','RP','RP','C','C','SS','2B','3B','1B','IF','CF','RF','LF','OF','DH','UTIL'];
function npcWorld(){const world=S.leagueWorld||(S.leagueWorld={version:3,rosters:{},lastYear:0,history:[]});world.rosters=world.rosters||{};world.history=world.history||[];world.version=3;return world;}
function npcRoleKey(){if(S.pos==='P'){if(S.role==='SP')return 'SP';const rs=reliefStatusKey();return rs==='CLOSER'?'CL':rs==='SETUP'?'SU':'RP';}if(S.pos==='C'||S.dpos==='C')return 'C';return S.dpos||'DH';}
function npcTeamsForOrg(org){return org==='CPBL'?CPBL_TEAMS:org==='NPB'?NPB_TEAMS:MLB_TEAMS;}
function npcRosterKey(org,team,lv){return `${org}|${team}|${lv||'TOP'}`;}
function createNpcPlayer(org,team,lv,role,used,rookie){
  const par=lv&&LV[lv]?LV[lv].par:r99(50),age=rookie?ri(18,23):ri(20,34),ageCurve=age<=24?1:age>=32?-2:0,overall=clamp(par+ageCurve+ri(-9,11),25,94);
  return {id:`${S.year}-${secureUint32().toString(36)}-${ri(10,99)}`,name:randomNpcName(org,used),team,role,age,overall,potential:clamp(overall+ri(rookie?4:0,rookie?15:8),overall,96),years:rookie?0:ri(1,8),contract:ri(1,4),status:rookie?'新人':'現役',lastMove:null,lastYear:S.year};
}
function ensureNpcRoster(org,team,lv){
  const world=npcWorld(),key=npcRosterKey(org,team,lv);if(world.rosters[key])return world.rosters[key];const used=new Set([S.name]);
  Object.values(world.rosters).flat().forEach(p=>used.add(p.name));world.rosters[key]=NPC_ROSTER_ROLES.map(role=>createNpcPlayer(org,team,lv,role,used,false));return world.rosters[key];
}
function evolveNpcRoster(org,team,lv,year){
  const roster=ensureNpcRoster(org,team,lv),world=npcWorld(),used=new Set(Object.values(world.rosters).flat().map(p=>p.name));
  roster.forEach(p=>{const delta=Math.max(0,year-(p.lastYear||year-1));for(let n=0;n<delta;n++){p.age++;p.years++;p.contract=Math.max(0,(p.contract||1)-1);let change=0;if(p.age<=25&&p.overall<p.potential&&chance(52))change=ri(1,2);else if(p.age>=36)change=-ri(1,3);else if(p.age>=32&&chance(48))change=-1;else if(p.age<=29&&p.overall<p.potential&&chance(28))change=1;p.overall=clamp(p.overall+change,20,99);if(p.contract===0)p.contract=ri(1,4);}p.lastYear=year;});
  for(let i=roster.length-1;i>=0;i--){const p=roster[i],retire=p.age>=42||p.age>=38&&chance(48)||p.age>=35&&p.overall<(LV[lv]?LV[lv].par:r99(50))-8&&chance(32);if(retire){world.history=world.history||[];world.history.push({year,type:'retire',name:p.name,team,role:p.role});roster.splice(i,1);}}
  const targets=NPC_ROSTER_ROLES.reduce((o,role)=>(o[role]=(o[role]||0)+1,o),{});Object.entries(targets).forEach(([role,count])=>{while(roster.filter(p=>p.role===role).length<count)roster.push(createNpcPlayer(org,team,lv,role,used,true));});while(roster.length>NPC_ROSTER_ROLES.length)roster.splice(ri(0,roster.length-1),1);return roster;
}
function evolveNpcLeague(org,lv){
  const world=npcWorld(),teams=npcTeamsForOrg(org);teams.forEach(team=>evolveNpcRoster(org,team,lv,S.year));
  const tradeKey=`${S.year}|${org}|${lv}`;world.tradedKeys=world.tradedKeys||{};
  if(!world.tradedKeys[tradeKey]){const swaps=org==='MiLB'?8:org==='NPB'?4:2;for(let i=0;i<swaps;i++){const a=pick(teams),b=pick(teams.filter(x=>x!==a)),ra=ensureNpcRoster(org,a,lv),rb=ensureNpcRoster(org,b,lv),role=pick(NPC_ROSTER_ROLES),ia=ra.findIndex(p=>p.role===role),ib=rb.findIndex(p=>p.role===role);if(ia>=0&&ib>=0){const pa=ra[ia],pb=rb[ib];pa.team=b;pb.team=a;pa.lastMove={year:S.year,from:a,to:b,lv};pb.lastMove={year:S.year,from:b,to:a,lv};ra[ia]=pb;rb[ib]=pa;world.history.push({year:S.year,type:'trade',a,b,players:[pa.name,pb.name],role,lv});}}world.tradedKeys[tradeKey]=true;Object.keys(world.tradedKeys).filter(k=>Number(k.split('|')[0])<S.year-2).forEach(k=>delete world.tradedKeys[k]);world.history=world.history.slice(-120);}
  world.lastYear=S.year;
}
function npcRosterStrength(org,team,lv){const roster=ensureNpcRoster(org,team,lv);return roster.length?roster.reduce((n,p)=>n+p.overall,0)/roster.length:(LV[lv]?LV[lv].par:r99(50));}
function prepareNpcSeason(){
  if(!S||S.stage!=='PRO'||!S.orgTeam||!S.lv)return null;evolveNpcLeague(S.org,S.lv);const roster=ensureNpcRoster(S.org,S.orgTeam,S.lv),role=npcRoleKey(),same=roster.filter(p=>p.role===role).sort((a,b)=>b.overall-a.overall),rival=same[0]||roster.slice().sort((a,b)=>b.overall-a.overall)[0],gap=rival?ratingGap(ovr(),rival.overall):0,usageAdj=clamp(gap*.014,-.13,.10),par=LV[S.lv].par,rosterAvg=npcRosterStrength(S.org,S.orgTeam,S.lv),supportAdj=clamp(ratingGap(rosterAvg,par)*.035,-.35,.35);
  S.npcSeasonContext={year:S.year,team:S.orgTeam,role,rival:rival?{id:rival.id,name:rival.name,age:rival.age,role:rival.role,overall:rival.overall}:null,usageAdj:+usageAdj.toFixed(3),supportAdj:+supportAdj.toFixed(2),rosterAvg:+rosterAvg.toFixed(1),teammates:roster.slice().sort((a,b)=>b.overall-a.overall).slice(0,4).map(p=>({name:p.name,age:p.age,role:p.role,overall:p.overall}))};
  if(rival){S.teammate={name:rival.name,age:rival.age,role:`${rival.role} 位置競爭者`,overall:rival.overall,desc:`同一位置的隊友，能力評價 ${rival.overall}/99；合作與競爭都會影響實際出賽。`};S.teammateTeam=S.orgTeam;}S.teamStrengths=S.teamStrengths||{};const key=`${S.org}|${S.orgTeam}`,rosterTalent=clamp(50+ratingGap(rosterAvg,par)*.7,34,68),old=Number.isFinite(S.teamStrengths[key])?S.teamStrengths[key]:50;S.teamStrengths[key]=+(old*.45+rosterTalent*.55).toFixed(1);return S.npcSeasonContext;
}
function npcDepthHTML(){
  const c=S&&S.npcSeasonContext;if(!c||c.year!==S.year)return '<span>本季尚未建立隊友名單</span>';const rival=c.rival,sign=v=>`${v>0?'+':''}${Math.round(v*100)}%`;
  return `<span>位置競爭</span><b>${rival?`${rival.name}・${rival.age} 歲・${rival.overall}/99`:'無直接競爭者'}</b><small>出賽機會 ${sign(c.usageAdj)}｜隊友支援 ${c.supportAdj>=0?'+':''}${c.supportAdj.toFixed(2)}｜全隊代表戰力 ${c.rosterAvg}</small>`;
}
/* ---------- 守位系統 ---------- */
const DPN={SS:'游擊手','2B':'二壘手','3B':'三壘手','1B':'一壘手',
 CF:'中外野手',RF:'右外野手',LF:'左外野手',DH:'指定打擊',C:'捕手'};
/* 每個守位對 範圍/接球/臂力 各有自己的門檻(相對聯盟基準的位移)
   例:三壘不需要游擊等級的範圍,一壘的臂力幾乎不看 */
/* 各守位守備分公式:依守位看重不同能力(回傳一個綜合守備分) */
function dpScore(p){ const a=S.ab;
  switch(p){
    case 'SS': return a.rng*0.5 + a.fld*0.3 + a.arm*0.2;   /* 游擊:範圍主導 */
    case '2B': return a.rng*0.45+ a.fld*0.4 + a.arm*0.15;  /* 二壘:範圍+守備,臂力次要 */
    case '3B': return a.arm*0.45+ a.fld*0.35+ a.rng*0.2;   /* 三壘:臂力主導 */
    case 'CF': return a.rng*0.55+ a.fld*0.3 + a.arm*0.15;  /* 中外野:範圍主導 */
    case 'RF': return a.arm*0.45+ a.rng*0.35+ a.fld*0.2;   /* 右外野:強臂 */
    case 'LF': return a.rng*0.4 + a.fld*0.35+ a.arm*0.25;  /* 左外野:範圍為主,要求低 */
    case 'C':  return a.fld*0.4 + a.cat*0.4 + a.arm*0.2;   /* 捕手:接球+配球+臂力,不看範圍 */
    case '1B': return a.fld*0.6 + a.rng*0.2 + a.arm*0.2;   /* 一壘:守備為主,門檻低 */
    default: return 99;
  }
}
/* 各守位 × 各聯盟 守備門檻(守備分需 >= 此值才守得動);大聯盟最嚴 */
const DP_TH={
  C:  {CPBL1:r99(46), NPB1:r99(54), MLB:r99(60)},
  SS: {CPBL1:r99(50), NPB1:r99(58), MLB:r99(64)},
  CF: {CPBL1:r99(49), NPB1:r99(57), MLB:r99(63)},
  '2B':{CPBL1:r99(46),NPB1:r99(53), MLB:r99(59)},
  '3B':{CPBL1:r99(44),NPB1:r99(51), MLB:r99(57)},
  RF: {CPBL1:r99(43), NPB1:r99(50), MLB:r99(56)},
  LF: {CPBL1:r99(41), NPB1:r99(47), MLB:r99(53)},
  '1B':{CPBL1:r99(36),NPB1:r99(42), MLB:r99(48)}};
const DP_BAR={CPBL1:r99(45),NPB1:r99(54),MLB:r99(60)}; /* 99 制捕手門檻 */
const DP_MULT={SS:1.15,CF:1.15,C:1.12,'2B':1.05,'3B':1.05,RF:1.05,'1B':1.0,LF:1.0,DH:0.92};
function dpBar(){ /* 年輕球員吃潛力紅利,球團不急著拔守位 */
  const base=Number.isFinite(DP_BAR[S.lv])?DP_BAR[S.lv]:((LV[S.lv]&&LV[S.lv].par)||0)+2;
  const disc=S.age<=21?9:S.age<=24?7:S.age<=26?3:0;
  return base-disc;
}
function dpQual(p){
  if(p==='DH')return true;
  const positional={C:2,SS:6,CF:5,'2B':2,'3B':0,RF:-1,LF:-3,'1B':-7}[p]||0;
  const threshold=DP_TH[p]&&Number.isFinite(DP_TH[p][S.lv])?DP_TH[p][S.lv]:((LV[S.lv]&&LV[S.lv].par)||0)+positional;
  /* 年輕球員吃潛力紅利:門檻略降(球團給時間成長) */
  const youthAdj = S.age<24?-4 : S.age<26?-2 : 0;
  return dpScore(p) >= threshold+youthAdj;
}
const DP_RANK={SS:0,CF:0,'2B':1,'3B':2,RF:2,'1B':3,LF:3,DH:4,C:0}; /* 守位身價階層(SS>2B>3B) */
function dpList(){ /* 依守位難度掃描:內野手守內野序、外野手守外野序,選出守得動的(最高階在前) */
  /* 候選守位依當前守位群:內野走內野光譜、外野走外野光譜 */
  const order = S.pos==='IF'
    ? ['SS','2B','3B','1B']       /* 內野:游擊>二壘>三壘>一壘 */
    : ['CF','RF','LF','1B'];      /* 外野:中外野>右外野>左外野>(一壘) */
  const q=order.filter(dpQual); q.push('DH'); return q;
}
function dpMult(){
  let m=(S.pos!=='P'&&S.dpos)?(DP_MULT[S.dpos]||1):1;
  if(S.pos==='P'){const rs=reliefStatusKey();m*=S.role==='SP'?1.08:rs==='CLOSER'?1.15:rs==='SETUP'?1.07:rs==='MIDDLE'?.98:.90;}
  if(S.traits.ace||S.traits.slugger)m*=1.04;
  if(S.traits.fanhero)m*=1.02;
  if(S.traits.booed)m*=.95;
  return +m.toFixed(3);
}
function dposReview(cont){
  if(S.stage!=='PRO'){ cont(); return; }
  if(S.pos==='C'){ /* 捕手容忍度高,但爛到底也會被移去一壘或DH */
    if(!S.dpos)S.dpos='C';
    const cOk=()=>{ const bar=dpBar(), a=S.ab;
      return a.fld>=bar-8 && a.cat>=bar-5 && a.arm>=bar-3; };
    if(S.dpos==='C'){
      if(cOk()){ cont(); return; }
      const opts=[];
      if(dpQual('1B'))opts.push({t:'移防 一壘手',main:true,s:'薪資係數 ×1.00',
        f:()=>{S.dpos='1B';card('info','守位調整','捕手裝備收進置物櫃——新球季改守<b class="hl">一壘</b>。');cont();}});
      opts.push({t:'轉任 指定打擊',main:!opts.length,s:'薪資係數 ×0.92',
        f:()=>{S.dpos='DH';card('info','守位調整','阻殺率成了聯盟笑話，球團決定讓你專心打擊——<b class="hl">DH</b>。');cont();}});
      choose(`守位會議：教練團已經不敢讓你蹲捕（${LV[S.lv].n}標準）`,opts); return;
    }
    if(cOk()){ /* 守備練回來了,可以回鍋蹲捕 */
      choose('守位會議：牛棚捕手回報你的接捕又行了',[
        {t:'重披捕手裝備',main:true,s:'薪資係數 ×1.12',
         f:()=>{S.dpos='C';card('good','守位調整','面罩戴回來——新球季重新登錄為<b class="hl">捕手</b>。');cont();}},
        {t:'維持現狀',f:()=>cont()}]); return; }
    if(S.dpos==='1B'&&!dpQual('1B')){ S.dpos='DH';
      card('info','守位調整','連一壘都站不住了，新球季登錄為<b class="hl">指定打擊</b>。'); }
    cont(); return; }
  if(S.pos==='P'){
    const oldRole=S.role,oldStatus=reliefStatusKey(),review=reviewPitcherAssignment();
    S.role=review.role;S.reliefStatus=review.status;
    const changed=oldRole!==review.role||oldStatus!==review.status;
    if(changed||!oldRole){
      const title=!oldRole?'投手定位':review.role==='SP'?'回到先發輪值':oldRole==='SP'?'轉任牛棚':'牛棚地位調整';
      card(review.rankUp?'good':review.rankDown?'info':'info',title,`教練團依上一季實績、體力與隊內競爭，將新球季定位調整為 <b class="hl">${roleN(review.role,review.status)}</b>。<div class="statline">${review.reason}</div>`); }
    cont(); return;
  }
  const q=dpList();
  if(!S.dpos){ S.dpos=q[0];
    card('info','守位登錄',`教練團評估守備工具後，將你登錄為 <b class="hl">${DPN[S.dpos]}</b>。`); cont(); return; }
  if(dpQual(S.dpos)){
    const best=q[0];
    if(DP_RANK[best]<DP_RANK[S.dpos]){ /* 更高身價守位站得住了 */
      choose(`守位會議：教練團想把你推上更吃重的位置`,[
        {t:`升防 ${DPN[best]}`,main:true,s:`薪資係數 ×${(DP_MULT[best]||1).toFixed(2)}`,
         f:()=>{S.dpos=best;card('good','守位調整',`守備數據說服了所有人——新球季改守 <b class="hl">${DPN[best]}</b>。`);cont();}},
        {t:`留守 ${DPN[S.dpos]}`,f:()=>cont()}]); return; }
    cont(); return; }
  const opts=q.slice(0,2).map((p,i)=>({t:`移防 ${DPN[p]}`,main:i===0,
    s:p==='DH'?'守備已無處可站｜薪資係數 ×0.92':`薪資係數 ×${(DP_MULT[p]||1).toFixed(2)}`,
    f:()=>{ S.dpos=p; card('info','守位調整',`球團季末評估後，新球季改守 <b class="hl">${DPN[p]}</b>。`); cont(); }}));
  choose(`守位會議：教練團認為你的守備已撐不住 ${DPN[S.dpos]}（${LV[S.lv].n}標準）`,opts);
}
const APP_VER='v5.0.3';
const SAVE_SCHEMA=6,SAVE_PREFIX='baseball-career-save-v4',SAVE_AUTO=`${SAVE_PREFIX}:auto`;
let _yearStartSnapshot=null;
function stateTeamName(){
  if(!this.orgTeam)return '';
  if(this.lv==='MLB')return this.orgTeam;
  if(this.lv&&LV[this.lv]&&LV[this.lv].org==='MiLB')return this.orgTeam+'體系｜'+({R:'新人聯盟',A1:'1A',A2:'2A',A3:'3A'}[this.lv]||LV[this.lv].n);
  if(this.lv==='CPBL1'||this.lv==='NPB1')return this.orgTeam;
  return this.orgTeam+'二軍';
}
function attachStateMethods(state){if(state)state.teamName=stateTeamName;return state;}
function cloneSaveValue(value){return JSON.parse(JSON.stringify(value,(key,val)=>typeof val==='function'?undefined:val));}
function mergeSaveDefaults(base,saved){
  if(Array.isArray(saved))return saved.slice();
  if(!saved||typeof saved!=='object')return saved===undefined?base:saved;
  const out=base&&typeof base==='object'&&!Array.isArray(base)?{...base}:{};
  Object.keys(saved).forEach(key=>{const value=saved[key];out[key]=value&&typeof value==='object'&&!Array.isArray(value)?mergeSaveDefaults(out[key],value):Array.isArray(value)?value.slice():value;});
  return out;
}
function saveSlotKey(slot){return slot==='auto'?SAVE_AUTO:`${SAVE_PREFIX}:slot-${slot}`;}
function saveMetaFromState(state){
  if(!state)return null;const team=state.stage==='PRO'?(state.orgTeam||'待業／自由球員'):(state.team||'業餘球隊'),level=state.stage==='PRO'&&state.lv&&LV[state.lv]?LV[state.lv].n:state.stage==='HS'?`高${['一','二','三'][Math.max(0,state.stageYr-1)]||''}`:state.stage==='U'?`大${['一','二','三','四'][Math.max(0,state.stageYr-1)]||''}`:'業餘成棒';
  return {name:state.name,age:state.age,year:state.year,team,level,pos:state.pos,overall:state.ab?Math.round(Object.values(state.ab).reduce((n,v)=>n+(Number(v)||0),0)/Math.max(1,Object.keys(state.ab).length)):0};
}
function buildSavePackage(state,logHTML){return {schema:SAVE_SCHEMA,appVersion:APP_VER,savedAt:new Date().toISOString(),seed:SEED,rngMode:RNG_MODE,rngCursor:_s,state:cloneSaveValue(state),logHTML:String(logHTML||''),meta:saveMetaFromState(state)};}
function normalizeSavePackage(raw){
  if(!raw||typeof raw!=='object'||!raw.state||!raw.state.name||!raw.state.pos)throw new Error('這不是有效的棒球人生存檔');
  const cursor=Number.isFinite(raw.rngCursor)?raw.rngCursor:_s,oldCursor=_s,oldMode=RNG_MODE;RNG_MODE=raw.rngMode==='destiny'?'destiny':'random';
  raw.state.name=cleanPlayerName(raw.state.name);const template=newState(raw.state.name,raw.state.pos,raw.state.role||null);_s=cursor;RNG_MODE=oldMode;
  const state=attachStateMethods(mergeSaveDefaults(template,raw.state));_s=oldCursor;
  state.rngMode=raw.rngMode==='destiny'?'destiny':'random';state.drawnEvents=state.drawnEvents||[];state.finance=state.finance||template.finance;state.social=state.social||template.social;state.eventProfile=state.eventProfile||template.eventProfile;state.leagueWorld=state.leagueWorld||{version:2,rosters:{},lastYear:0};state.promiseHistory=state.promiseHistory||[];state.effectHistory=state.effectHistory||[];state.cpblFaSignings=state.cpblFaSignings||{};state.cpblFaMarketByYear=state.cpblFaMarketByYear||{};
  if((state.leagueWorld.version||1)<3){state.leagueWorld.rosters={};state.leagueWorld.history=[];state.leagueWorld.lastYear=0;state.leagueWorld.version=3;}
  return {...raw,schema:SAVE_SCHEMA,appVersion:APP_VER,rngMode:state.rngMode,rngCursor:cursor,state,meta:saveMetaFromState(state),logHTML:sanitizeSavedLog(raw.logHTML)};
}
function readSave(slot){try{const raw=localStorage.getItem(saveSlotKey(slot));return raw?normalizeSavePackage(JSON.parse(raw)):null;}catch(err){console.warn('save read failed',err);return null;}}
function readSavePreview(slot){
  try{
    const text=localStorage.getItem(saveSlotKey(slot));if(!text)return null;const raw=JSON.parse(text);
    if(!raw||!raw.state||!raw.state.name||!raw.state.pos)return null;
    const source=raw.meta||saveMetaFromState(raw.state),meta={...source,name:cleanPlayerName(source.name||raw.state.name),year:Number(source.year)||0,age:Number(source.age)||0,team:String(source.team||''),level:String(source.level||''),overall:clamp(Math.round(Number(source.overall)||0),0,RATING_MAX)};
    return {...raw,meta};
  }catch(err){console.warn('save preview failed',err);return null;}
}
function writeSave(slot,pkg){try{const normalized=normalizeSavePackage(pkg);normalized.savedAt=new Date().toISOString();localStorage.setItem(saveSlotKey(slot),JSON.stringify(normalized));return normalized;}catch(err){console.warn('save write failed',err);return null;}}
function captureYearCheckpoint(){
  if(!S||S.done||QUERY.get('logic-audit')==='1')return null;
  _yearStartSnapshot=buildSavePackage(S,$('log')?$('log').innerHTML:'');writeSave('auto',_yearStartSnapshot);renderStartSaveList();return _yearStartSnapshot;
}
function manualSave(slot){
  if(!_yearStartSnapshot){setSaveStatus('目前還不能存檔');return;}
  const saved=writeSave(slot,_yearStartSnapshot);setSaveStatus(saved?`欄位 ${slot} 已儲存：${saved.meta.year} 年・${saved.meta.team}`:'瀏覽器無法寫入存檔');renderSaveManager();renderStartSaveList();
}
function restoreLogHTML(html){
  const log=$('log');log.innerHTML=sanitizeSavedLog(html);log.querySelectorAll('.yr-head').forEach(head=>head.onclick=()=>head.closest('.yr-block').classList.toggle('collapsed'));const bodies=log.querySelectorAll('.yr-body');_curYearBody=bodies.length?bodies[bodies.length-1]:null;
}
function showGameShell(){
  $('start').style.display='none';document.body.classList.add('game-started');setMobileView('broadcast');$('board').style.display='';$('act').style.display='';$('player-rail').style.display='';$('roll-rail').style.display='';
}
function loadSavePackage(pkg){
  try{
    const normalized=normalizeSavePackage(pkg);RNG_MODE=normalized.rngMode;SEED=normalized.seed||makeSeed();_s=Number.isFinite(normalized.rngCursor)?normalized.rngCursor:_s;S=attachStateMethods(normalized.state);history.replaceState(null,'',RNG_MODE==='destiny'?`?mode=destiny&seed=${encodeURIComponent(SEED)}`:location.pathname);restoreLogHTML(normalized.logHTML);showGameShell();closeFx('save-overlay');card('info','已讀取生涯',`<b class="hl">${S.year} 年・${S.age} 歲</b>`);startYear();return true;
  }catch(err){
    console.warn('save load failed',err);document.body.classList.remove('game-started');$('start').style.display='';$('board').style.display='none';$('act').style.display='none';$('player-rail').style.display='none';$('roll-rail').style.display='none';const status=$('start-save-status');if(status)status.textContent='這份舊存檔無法讀取';setSaveStatus('這份舊存檔無法讀取');return false;
  }
}
function setSaveStatus(text){const el=$('save-status');if(el)el.textContent=text||'';}
function saveTimeText(iso){if(!iso)return '—';try{return new Date(iso).toLocaleString('zh-TW',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});}catch(_){return iso;}}
function saveSlotHTML(slot,pkg){
  const label=slot==='auto'?'自動存檔':`手動欄位 ${slot}`;if(!pkg)return `<article class="save-slot"><div class="save-slot-copy"><span>${label}</span><b>空白欄位</b><small>尚未建立存檔</small></div><div class="save-slot-actions">${slot==='auto'?'':`<button class="primary" data-save-write="${slot}">儲存目前</button>`}</div></article>`;
  const m=pkg.meta;return `<article class="save-slot${slot==='auto'?' current':''}"><div class="save-slot-copy"><span>${label}｜${escapeHTML(saveTimeText(pkg.savedAt))}</span><b>${escapeHTML(m.name)}｜${m.year}・${m.age} 歲｜${escapeHTML(m.team)}</b><small>${escapeHTML(m.level)}｜綜合 ${m.overall}/99｜${escapeHTML(pkg.appVersion||'舊版本')} 已可遷移</small></div><div class="save-slot-actions"><button class="primary" data-save-load="${slot}">讀取</button>${slot==='auto'?'':`<button data-save-write="${slot}">覆寫</button><button class="danger" data-save-delete="${slot}">刪除</button>`}</div></article>`;
}
function bindSaveButtons(root){
  root.querySelectorAll('[data-save-load]').forEach(b=>b.onclick=()=>{const pkg=readSavePreview(b.dataset.saveLoad);if(pkg)loadSavePackage(pkg);});
  root.querySelectorAll('[data-save-write]').forEach(b=>b.onclick=()=>manualSave(Number(b.dataset.saveWrite)));
  root.querySelectorAll('[data-save-delete]').forEach(b=>b.onclick=()=>{const slot=b.dataset.saveDelete;if(confirm(`確定刪除手動欄位 ${slot}？`)){localStorage.removeItem(saveSlotKey(slot));renderSaveManager();renderStartSaveList();}});
}
function renderStartSaveList(){
  const root=$('start-save-list');if(!root)return;const rows=['auto',1,2,3].map(slot=>({slot,pkg:readSavePreview(slot)})),existing=rows.filter(x=>x.pkg);root.innerHTML=existing.length?existing.map(x=>`<button class="btn${x.slot==='auto'?' main':''}${x.slot===3?' wide':''}" data-save-load="${x.slot}">${x.slot==='auto'?'繼續自動存檔':`讀取欄位 ${x.slot}`}<small style="display:block;margin-top:2px">${x.pkg.meta.year}・${x.pkg.meta.age} 歲｜${escapeHTML(x.pkg.meta.team)}</small></button>`).join(''):'<div class="wide" style="color:#81958a;font-size:11px">尚無存檔</div>';bindSaveButtons(root);
}
function renderSaveManager(){const root=$('save-list');if(!root)return;root.innerHTML=['auto',1,2,3].map(slot=>saveSlotHTML(slot,readSavePreview(slot))).join('');bindSaveButtons(root);}
function exportCheckpoint(){
  const pkg=_yearStartSnapshot||readSave('auto');if(!pkg){setSaveStatus('目前沒有可匯出的安全檢查點');return;}const blob=new Blob([JSON.stringify(pkg,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`baseball-career-${pkg.meta.name}-${pkg.meta.year}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);setSaveStatus('存檔已匯出，可在其他裝置匯入');
}
function importCheckpoint(file){
  if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const pkg=normalizeSavePackage(JSON.parse(String(reader.result||'')));writeSave(1,pkg);setSaveStatus('匯入完成，已放入手動欄位 1');renderSaveManager();renderStartSaveList();}catch(err){setSaveStatus(err.message||'匯入失敗');}};reader.onerror=()=>setSaveStatus('檔案讀取失敗');reader.readAsText(file);
}
if(new URLSearchParams(location.search).get('logic-audit')==='1')window.addEventListener('error',e=>{document.documentElement.setAttribute('data-audit-error',`${e.message} @ ${e.lineno}:${e.colno}`);});
const TEAM_COLOR={
  '台中猛瑪':'#ffd800','府城雄獅':'#ff7f00','桃園金剛':'#8b1a1a','新北騎士':'#003f87','台北恐龍':'#c8102e','高雄神鵰':'#1a7a3a',
  '東京大人':'#f97709','阪神猛虎':'#ffe201','橫濱海星':'#0a3ce0','廣島紅鯉':'#e60012','神宮飛燕':'#0a7bc2','名古屋神龍':'#003a70','福岡猛禽':'#f5c400','北海道培根':'#0a2d5c','千葉海潮':'#111111','仙台金翼':'#8b0000','大阪蠻牛':'#0033a0','埼玉雄獅':'#1268b3',
  '巴爾的摩金鶯':'#df4601','波士頓紅襪':'#bd3039','紐約洋基':'#0c2340','坦帕灣光芒':'#8fbce6','多倫多藍鳥':'#134a8e',
  '芝加哥白襪':'#c4ced4','克里夫蘭守護者':'#e31937','底特律老虎':'#fa4616','堪薩斯市皇家':'#004687','明尼蘇達雙城':'#d31145',
  '運動家':'#003831','休士頓太空人':'#eb6e1f','洛杉磯天使':'#ba0021','西雅圖水手':'#00a4a6','德州遊騎兵':'#003278',
  '亞特蘭大勇士':'#ce1141','邁阿密馬林魚':'#00a3e0','紐約大都會':'#ff5910','費城費城人':'#e81828','華盛頓國民':'#ab0003',
  '芝加哥小熊':'#0e3386','辛辛那提紅人':'#c6011f','密爾瓦基釀酒人':'#ffc52f','匹茲堡海盜':'#fdb827','聖路易紅雀':'#c41e3a',
  '亞利桑那響尾蛇':'#a71930','科羅拉多洛磯':'#8a8d8f','洛杉磯道奇':'#005a9c','聖地牙哥教士':'#ffc425','舊金山巨人':'#fd5a1e'};
const CPBL_TEAMS=['台中猛瑪','府城雄獅','桃園金剛','新北騎士','台北恐龍','高雄神鵰'];
const NPB_TEAMS=['東京大人','阪神猛虎','橫濱海星','廣島紅鯉','神宮飛燕','名古屋神龍','福岡猛禽','北海道培根','千葉海潮','仙台金翼','大阪蠻牛','埼玉雄獅'];
const MLB_DIVISIONS={
  '美聯東區':['巴爾的摩金鶯','波士頓紅襪','紐約洋基','坦帕灣光芒','多倫多藍鳥'],
  '美聯中區':['芝加哥白襪','克里夫蘭守護者','底特律老虎','堪薩斯市皇家','明尼蘇達雙城'],
  '美聯西區':['運動家','休士頓太空人','洛杉磯天使','西雅圖水手','德州遊騎兵'],
  '國聯東區':['亞特蘭大勇士','邁阿密馬林魚','紐約大都會','費城費城人','華盛頓國民'],
  '國聯中區':['芝加哥小熊','辛辛那提紅人','密爾瓦基釀酒人','匹茲堡海盜','聖路易紅雀'],
  '國聯西區':['亞利桑那響尾蛇','科羅拉多洛磯','洛杉磯道奇','聖地牙哥教士','舊金山巨人']};
const MLB_TEAMS=Object.values(MLB_DIVISIONS).flat();
/* 主場因子：MLB 使用 Baseball Savant 2023–2025 三年滾動資料；2025 啟用新主場的運動家、光芒採 2025 單年資料。
   NPB／CPBL 依官方球場尺寸、屋頂與所在地氣候做保守的遊戲化估計。數值 100 代表聯盟平均；
   模擬只套用約半季主場賽事，因此不會把完整球場差距灌進整季。 */
const TEAM_PARK_PROFILES={
  '巴爾的摩金鶯':['金鶯公園',100,103,106],'波士頓紅襪':['芬威球場',110,107,89],'紐約洋基':['洋基體育場',100,94,119],'坦帕灣光芒':['喬治・史坦布瑞納球場',104,104,112],'多倫多藍鳥':['羅傑斯中心',100,99,104],
  '芝加哥白襪':['Rate Field',98,98,96],'克里夫蘭守護者':['進步球場',94,97,85],'底特律老虎':['聯信球場',102,100,99],'堪薩斯市皇家':['考夫曼體育場',102,104,85],'明尼蘇達雙城':['標靶球場',106,102,102],
  '運動家':['薩特健康球場',117,107,112],'休士頓太空人':['Daikin Park',100,100,105],'洛杉磯天使':['天使球場',102,98,113],'西雅圖水手':['T-Mobile Park',83,89,93],'德州遊騎兵':['全球人壽球場',94,97,104],
  '亞特蘭大勇士':['Truist Park',102,102,105],'邁阿密馬林魚':['loanDepot park',102,103,90],'紐約大都會':['花旗球場',96,94,104],'費城費城人':['市民銀行球場',102,101,115],'華盛頓國民':['國民球場',102,104,94],
  '芝加哥小熊':['瑞格利球場',94,96,99],'辛辛那提紅人':['大美國球場',106,100,123],'密爾瓦基釀酒人':['美國家庭球場',94,94,106],'匹茲堡海盜':['PNC Park',98,101,76],'聖路易紅雀':['布許體育場',100,103,87],
  '亞利桑那響尾蛇':['大通體育場',106,105,88],'科羅拉多洛磯':['庫爾斯球場',125,117,105],'洛杉磯道奇':['道奇體育場',102,97,127],'聖地牙哥教士':['沛可球場',94,96,102],'舊金山巨人':['甲骨文球場',94,101,81],
  '東京大人':['東京巨蛋',104,101,111],'阪神猛虎':['阪神甲子園球場',92,98,82],'橫濱海星':['橫濱球場',106,102,113],'廣島紅鯉':['MAZDA Zoom-Zoom 球場',99,101,97],'神宮飛燕':['明治神宮球場',108,103,116],'名古屋神龍':['Vantelin Dome',96,98,91],
  '福岡猛禽':['MIZUHO PayPay Dome',101,100,104],'北海道培根':['ES CON FIELD HOKKAIDO',108,105,110],'千葉海潮':['ZOZO Marine Stadium',94,98,88],'仙台金翼':['樂天 Mobile Park 宮城',99,101,96],'大阪蠻牛':['京瓷巨蛋大阪',96,98,93],'埼玉雄獅':['Belluna Dome',103,102,105],
  '台中猛瑪':['臺中洲際棒球場',102,102,101],'府城雄獅':['臺南亞太國際棒球訓練中心',98,99,96],'桃園金剛':['樂天桃園棒球場',105,103,108],'新北騎士':['新莊棒球場',101,101,103],'台北恐龍':['臺北大巨蛋',94,97,89],'高雄神鵰':['澄清湖棒球場',96,99,91]
};
const MLB_TEAM_META={
  '巴爾的摩金鶯':['美聯東區',1.00,.058],'波士頓紅襪':['美聯東區',1.18,.090],'紐約洋基':['美聯東區',1.30,.109],'坦帕灣光芒':['美聯東區',.88,0],'多倫多藍鳥':['美聯東區',1.12,.105],
  '芝加哥白襪':['美聯中區',1.02,.065],'克里夫蘭守護者':['美聯中區',.96,.040],'底特律老虎':['美聯中區',.98,.043],'堪薩斯市皇家':['美聯中區',.90,.048],'明尼蘇達雙城':['美聯中區',1.00,.079],
  '運動家':['美聯西區',.86,.093],'休士頓太空人':['美聯西區',1.12,0],'洛杉磯天使':['美聯西區',1.14,.123],'西雅圖水手':['美聯西區',1.04,0],'德州遊騎兵':['美聯西區',1.08,0],
  '亞特蘭大勇士':['國聯東區',1.10,.055],'邁阿密馬林魚':['國聯東區',.88,0],'紐約大都會':['國聯東區',1.28,.109],'費城費城人':['國聯東區',1.12,.065],'華盛頓國民':['國聯東區',1.02,.085],
  '芝加哥小熊':['國聯中區',1.15,.065],'辛辛那提紅人':['國聯中區',.92,.040],'密爾瓦基釀酒人':['國聯中區',.96,.077],'匹茲堡海盜':['國聯中區',.90,.061],'聖路易紅雀':['國聯中區',1.04,.048],
  '亞利桑那響尾蛇':['國聯西區',.98,.025],'科羅拉多洛磯':['國聯西區',.96,.044],'洛杉磯道奇':['國聯西區',1.32,.123],'聖地牙哥教士':['國聯西區',1.14,.123],'舊金山巨人':['國聯西區',1.20,.123]};
/* par=該層級平均水準, min=最低限度(低於→降級/戰力外), g=球季場次 */
const LV={
 CPBL2:{n:'中職二軍',par:r99(34),min:r99(30),g:80, org:'CPBL'},
 CPBL1:{n:'中職一軍',par:r99(44),min:r99(41),g:120,org:'CPBL',top:'CPBL'},
 NPB2:{n:'日職二軍',par:r99(47),min:r99(44),g:100,org:'NPB'},
 NPB1:{n:'日職一軍',par:r99(53),min:r99(50),g:143,org:'NPB',top:'NPB'},
 R:{n:'新人聯盟',par:r99(41),min:r99(39),g:55, org:'MiLB'},
 A1:{n:'1A',par:r99(45),min:r99(43),g:110,org:'MiLB'},
 A2:{n:'2A',par:r99(49),min:r99(47),g:120,org:'MiLB'},
 A3:{n:'3A',par:r99(54),min:r99(52),g:130,org:'MiLB'},
 MLB:{n:'大聯盟',par:r99(59),min:r99(56),g:162,org:'MiLB',top:'MLB'},
};
const PATHS={CPBL:['CPBL2','CPBL1'],NPB:['NPB2','NPB1'],MiLB:['R','A1','A2','A3','MLB']};
function mlbRosterState(){
  if(!S)return {forty:false,optionSeasons:[],optionAssignments:{},outrightCount:0,dfaCount:0,history:[]};
  if(!S.mlbRoster)S.mlbRoster={forty:S.org==='MiLB'&&S.lv==='MLB',optionSeasons:[],optionAssignments:{},outrightCount:0,dfaCount:0,history:[],fourthOptionGranted:false};
  const r=S.mlbRoster;r.optionSeasons=Array.isArray(r.optionSeasons)?r.optionSeasons:[];r.optionAssignments=r.optionAssignments||{};r.history=Array.isArray(r.history)?r.history:[];r.outrightCount=Number(r.outrightCount)||0;r.dfaCount=Number(r.dfaCount)||0;return r;
}
function mlbRosterStatus(){
  if(!S||S.org!=='MiLB')return {applies:false,forty:false,active:false,used:0,limit:3,remaining:3,assignments:0,service:0,consent:false,canRejectOutright:false,label:'非 MLB 體系',short:''};
  const r=mlbRosterState(),used=new Set(r.optionSeasons).size,limit=r.fourthOptionGranted?4:3,remaining=Math.max(0,limit-used),assignments=Number(r.optionAssignments[S.year])||0,service=Number(S.service&&S.service.MiLB)||0,active=S.lv==='MLB'&&r.forty;
  const label=active?`26 人名單｜40 人名單內｜選擇權剩 ${remaining} 年`:r.forty?`${LV[S.lv]?LV[S.lv].n:'小聯盟'}｜40 人名單內｜選擇權剩 ${remaining} 年`:`${LV[S.lv]?LV[S.lv].n:'小聯盟'}｜40 人名單外｜選擇權剩 ${remaining} 年`;
  return {applies:true,forty:!!r.forty,active,used,limit,remaining,assignments,service,consent:service>=5,canRejectOutright:service>=3||r.outrightCount>0,label,short:active?`26/40 人・選擇權 ${remaining} 年`:r.forty?`40 人名單・選擇權 ${remaining} 年`:`40 人名單外・選擇權 ${remaining} 年`};
}
function mlbAddToFortyMan(reason){
  if(!S||S.org!=='MiLB')return;const r=mlbRosterState(),was=r.forty;r.forty=true;if(!was){r.addedYear=S.year;r.history.push({year:S.year,type:'40-man',reason:reason||'球團選入合約'});}
}
function consumeMlbOptionYear(year){
  const r=mlbRosterState(),status=mlbRosterStatus(),y=Number(year)||S.year,assignments=Number(r.optionAssignments[y])||0;
  if(assignments>=5)return {ok:false,reason:'本季已達 5 次 option 上限，下一次下放必須先通過 outright waivers',...status};
  if(status.remaining<=0)return {ok:false,reason:'小聯盟選擇權已用完，必須先 DFA 並通過讓渡',...status};
  if(!r.optionSeasons.includes(y)){r.optionSeasons.push(y);if(new Set(r.optionSeasons).size>=3&&!r.fourthOptionGranted&&(Number(S.proYears)||0)<5)r.fourthOptionGranted=true;}
  r.optionAssignments[y]=assignments+1;r.history.push({year:y,type:'option',assignment:r.optionAssignments[y]});return {ok:true,...mlbRosterStatus(),assignmentYear:y,assignments:r.optionAssignments[y]};
}
function mlbDfaRights(){const st=mlbRosterStatus(),r=mlbRosterState();return {service:st.service,optionConsent:st.service>=5,canRejectOutright:st.service>=3||r.outrightCount>0,keepsGuarantee:st.service>=5,tenAndFive:st.service>=10&&(S.teamYears||0)>=5,priorOutright:r.outrightCount>0};}
const HS_CUPS=['木棒聯賽','黑豹旗','玉山盃'];
const U_CUPS=['大學春季聯賽','大專盃'];
/* 事件卡：基礎結果接近五五波；選擇、天賦與代價只改變機會，不保證成功。 */
const EVENTS=[
 {n:'打擊機特訓',for:'B',gt:'手感火燙，擊球點完全咬中',bt:'越打越糊，姿勢跑掉了',g:{con:2},b:{con:-2}},
 {n:'重量訓練週期',for:'A',gt:'深蹲破 PR，全身充滿力量',bt:'操之過急，肌肉緊繃了好幾週',g:{pow:2,sta:1},b:{sta:-2}},
 {n:'牛棚加練',for:'P',gt:'新的握法找到了，尾勁明顯提升',bt:'越丟越歪，投球機制亂掉',g:{brk:2},b:{ctl:-2}},
 {n:'長傳接訓練',for:'A',gt:'雷射肩養成中',bt:'肩膀有點緊，教練喊停',g:{arm:2},b:{arm:-2}},
 {n:'影像分析課',for:'*',gt:'看穿投打習性，判斷力大增',bt:'資訊爆炸，站上場反而想太多',g:{eye:2,cat:2,ctl:1},b:{eye:-2,ctl:-1}},
 {n:'跑壘特訓',for:'A',gt:'起跑判斷進步神速',bt:'拉傷大腿後側，休了兩週',g:{spd:2},b:{spd:-1,inj:5}},
 {n:'守備千球練習',for:'A',gt:'手套像吸塵器一樣',bt:'吃了無數個彈跳球，信心受挫',g:{rng:1,fld:2},b:{fld:-2}},
 {n:'觸身球驚魂',for:'*',gt:'側身閃過，反應快得嚇人',bt:'結結實實吃了一顆速球',g:{spd:1},b:{inj:12}},
 {n:'媒體專訪',for:'*',gt:'應對得體，人氣上升，打球更有動力',bt:'失言上了新聞，壓力影響狀態',g:{sta:1},b:{con:-1,ctl:-1,sta:-1}},
 {n:'教練團關注',for:'*',gt:'獲得單獨指導的機會',bt:'被盯上缺點，一直被要求改動作',g:{rand:2},b:{rand:-2}},
 {n:'伙食與睡眠計畫',for:'*',gt:'體脂下降，恢復速度變快',bt:'水土不服，腸胃炎折騰一週',g:{sta:2},b:{sta:-1,inj:4}},
 {n:'學長／老將指點',for:'*',gt:'一句話點醒夢中人',bt:'學了不適合自己的招，繞了遠路',g:{rand:2},b:{rand:-2}},
 {n:'球速測定日',for:'P',gt:'雷達槍跳出生涯新高',bt:'出力過猛，手肘發炎',g:{vel:2},b:{inj:10}},
 {n:'配球讀書會',for:'P',gt:'進壘點的想像力打開了',bt:'想得太多，投得綁手綁腳',g:{ctl:2},b:{brk:-2}},
 {n:'宵夜文化',for:'*',gt:'控制住了，體態維持得宜',bt:'體重直線上升，第一步變慢了',g:{sta:1},b:{spd:-2,sta:-1,rng:-1}},
 {n:'場外代言邀約',for:'PRO',gt:'商演安排得宜，多賺零用錢也沒荒廢訓練',bt:'行程太滿，訓練量明顯掉了',g:{sta:1},b:{rand:-2,sta:-1}},
 {n:'季中低潮',for:'*',gt:'靠著調整心態走出來，更強了',bt:'低潮拖了一個月',g:{eye:1,ctl:1,sta:1},b:{con:-2,brk:-1,sta:-1}},
 {n:'ABS 好球帶挑戰',for:'PRO',gt:'你果斷摸帽挑戰，關鍵一球成功改判',bt:'挑戰額度耗光，真正關鍵的一球只能接受原判',g:{eye:2,cat:2,ctl:1},b:{eye:-1,cat:-1,ctl:-1}},
 {n:'投球計時器適應',for:'P',gt:'縮短思考時間後節奏反而更流暢',bt:'節奏被時鐘追著跑，動作開始失去同步',g:{ctl:2,sta:1},b:{ctl:-2,sta:-1}},
 {n:'球場因子分析',for:'*',gt:'數據團隊找出這座球場最有利的攻防策略',bt:'你太依賴報表，臨場反應慢了半拍',g:{eye:2,ctl:2,cat:1},b:{eye:-1,ctl:-1}},
 {n:'跨時區客場之旅',for:'PRO',gt:'睡眠團隊把時差調整得恰到好處',bt:'連續早班機與晚場讓身體時鐘徹底混亂',g:{sta:2},b:{sta:-2,inj:6}},
 {n:'人工草皮系列賽',for:'PRO',gt:'你提早適應彈跳與腳步，守備範圍更有效率',bt:'下肢在硬地連戰後明顯緊繃',g:{rng:2,fld:1},b:{spd:-1,sta:-1,inj:5}},
 {n:'運動心理諮商',for:'*',gt:'呼吸與專注流程讓關鍵時刻變得安靜',bt:'新的心理暗示反而讓你過度在意每一個動作',g:{eye:2,ctl:2,sta:1},b:{eye:-1,ctl:-1}},
 {n:'高速攝影動作分析',for:'*',gt:'慢動作找到了肉眼看不見的發力斷點',bt:'同時改太多細節，原本自然的動作變僵硬',g:{rand:2},b:{rand:-2}},
 {n:'防護員負荷管理',for:'PRO',gt:'你接受休息安排，身體在九月仍保持新鮮',bt:'你瞞著緊繃硬上，疲勞一路累積',g:{sta:2},b:{inj:10,sta:-1}},
 {n:'營養師遠征菜單',for:'PRO',gt:'客場也吃得乾淨，恢復品質沒有打折',bt:'你受不了制式餐盒，深夜又叫了炸物',g:{sta:2,spd:1},b:{sta:-1,spd:-1}},
 {n:'社群媒體風暴',for:'PRO',gt:'你關掉通知，把外界雜音留在球場外',bt:'每一則批評都看進心裡，連睡前都在重播失誤',g:{sta:1,eye:1,ctl:1},b:{sta:-2,eye:-1,ctl:-1}},
 {n:'新球具測試',for:'*',gt:'新手套與球棒／手套的回饋非常合手',bt:'器材調整期比預期更長，手感整週不對',g:{fld:2,con:2,ctl:1},b:{fld:-1,con:-1,ctl:-1}},
 {n:'牛棚捕手與陪練員',for:'P',gt:'反覆溝通後，你的進壘點開始能精準複製',bt:'練習量拉得太滿，手臂在比賽前就先疲勞',g:{ctl:2,brk:1},b:{sta:-1,inj:6}},
 {n:'球員工會理財課',for:'PRO',gt:'財務安排穩定後，你不再為場外帳單分心',bt:'複雜投資讓你整天盯著價格波動',g:{sta:1,eye:1},b:{sta:-1,eye:-1}},
 {n:'雙重賽考驗',for:'PRO',gt:'你在漫長的一天妥善分配體力，兩場都有貢獻',bt:'第二場身體完全跟不上腦袋',g:{sta:2},b:{sta:-2,inj:5}},
 {n:'更衣室語言磨合',for:'PRO',gt:'你主動學習隊友語言，暗號與玩笑都接得上',bt:'溝通誤會讓你和教練團漸行漸遠',g:{cat:2,eye:1,ctl:1},b:{cat:-1,eye:-1,ctl:-1}},
];
/* 事件庫以系列生成，讓每個球季能從 100 種以上的真實棒球情境抽選。 */
function addEventSeries(names,forType,gt,bt,g,b,kind){
  names.forEach(n=>EVENTS.push({n,for:forType,gt,bt,g:{...g},b:{...b},kind:kind||null}));
}
addEventSeries(['橫掃球握法實驗','滑球軌跡重塑','指叉球落點校正','變速球臂速偽裝','伸卡球滾地球計畫','卡特球內角測試'],'P','新球種在實戰中產生預期位移，配球選擇明顯增加','握法還沒穩定，放球點與控球一起跑掉',{brk:2,ctl:1},{brk:-1,ctl:-2});
addEventSeries(['第一球搶好球','兩好球決勝策略','第三輪打線對策','左右打者配球拆解','壘上有人投球節奏','滿壘危機模擬'],'P','情境判讀更快，能把球投到真正有效的位置','腦中塞進太多暗號，出手前反而開始猶豫',{ctl:2,cat:1},{ctl:-2,sta:-1});
addEventSeries(['連兩天牛棚待命','跨局中繼任務','長中繼臨時登板','終結者休兵代班','先發投手提前退場','延長賽牛棚告急'],'P','你把熱身與體力分配得宜，完整吃下臨時任務','反覆熱身耗掉手臂新鮮度，隔天仍感到沉重',{sta:2,ctl:1},{sta:-2,inj:5});
addEventSeries(['捕手臨時更換暗號','菜鳥捕手首次搭檔','老捕手要求搖頭','投捕會議意見衝突','突破觸身球內角恐懼','牽制與投球動作同步'],'P','投捕溝通找到共識，關鍵球執行更果斷','暗號與想法沒有對上，危機時刻互相猜測',{cat:2,ctl:1},{cat:-1,ctl:-2});
addEventSeries(['內角速球反應課','外角球反方向攻擊','高球帶速球追蹤','低角度變化球辨識','兩好球纏鬥訓練','慢速球等待重心'],'B','你把好球帶切成明確區域，選球與擊球品質同步提升','刻意猜球讓揮棒失去自然節奏，錯過原本能攻擊的球',{con:2,eye:1},{con:-2,eye:-1});
addEventSeries(['仰角微調計畫','揮棒速度實驗室','下肢發力鏈重建','木棒甜蜜點測試','逆風長打訓練','滿球數強擊選擇'],'B','新的發力順序把強勁擊球送進外野深處','一味追求長打讓揮棒軌跡拉長，三振與軟弱擊球增加',{pow:2,con:1},{pow:-1,con:-2});
addEventSeries(['投手抬腿起跑判讀','一壘離壘距離調整','二壘滑壘路線選擇','外野飛球提前標記','三壘教練暗號測驗','一壘到三壘路線實測'],'A','起跑、轉壘與場上判讀連成一套，速度真正轉成壘包','判斷過度積極，幾次不必要的出局讓教練踩下煞車',{spd:2,eye:1},{spd:-1,eye:-2});
addEventSeries(['反手接球腳步重建','雙殺轉傳節奏','內外野截止暗號','極端佈陣站位測試','界外區追球演練','強襲球第一步反應'],'A','你的第一步與傳球選擇更俐落，守備能替球隊省下出局數','新腳步尚未內化，簡單球反而因猶豫變得困難',{rng:2,fld:1,arm:1},{rng:-1,fld:-2});
addEventSeries(['睡眠實驗室追蹤','賽後低溫恢復','長途移動補水計畫','個人營養血檢','軟組織按摩週期','穿戴裝置疲勞警報'],'*','恢復資料找到關鍵缺口，身體在密集賽程仍保有餘裕','你沒有適應新的恢復流程，睡眠與訓練品質一起下降',{sta:2},{sta:-2,inj:4});
addEventSeries(['角色定位面談','賽前球探報告會','隊長發起球員餐會','跨語言戰術會議','交易截止日前夕','新教練首次全隊會議'],'PRO','你讀懂球團期待，也讓隊友知道自己能提供什麼','會議中的立場沒有說清楚，角色與人際關係更加模糊',{rand:2,sta:1},{rand:-2,sta:-1});
addEventSeries(['賽後記者會追問','球員工會公開論壇','紀錄片跟拍一週','品牌形象拍攝日','播客節目長訪談','社群帳號接管日'],'PRO','你在曝光與備戰間拿捏得當，外界開始理解真正的你','一句話被切成片段瘋傳，場外噪音侵入比賽準備',{rand:2,sta:1},{rand:-2,sta:-2});
addEventSeries(['紅眼班機客場移動','球隊巴士臨時故障','海外系列賽通關延誤','雙重賽後立刻轉場','客場飯店火警演習','球具行李延遲送達'],'PRO','突發行程沒有打亂準備，你比其他人更快進入比賽節奏','休息與熱身時間被壓縮，身體在開賽前仍沒醒過來',{sta:2,eye:1,ctl:1},{sta:-2,eye:-1,ctl:-1,inj:3});
addEventSeries(['同區宿敵三連戰','滿場觀眾紀錄夜','裁判好球帶飄移','板凳席警告風波','延長十二局決勝','個人紀錄追逐週'],'*','高壓讓注意力更加集中，你在關鍵場面完成任務','情緒與壓力放大每個失誤，後續幾場仍甩不掉影響',{rand:2,sta:1},{rand:-2,sta:-1});
addEventSeries(['新人加入深度表','明星隊友短期缺陣','同位置老將復出','球隊連敗閉門會議','季中交易新援報到','板凳清空衝突後續'],'PRO','你在陣容變動中找到合作方式，球隊信任明顯增加','角色競爭轉成內耗，準備節奏也被更衣室氣氛拖慢',{rand:2,cat:1,eye:1},{rand:-2,cat:-1,eye:-1});
/* 守位專屬故事：同一事件只會進入對應守位的抽選池。 */
addEventSeries(['本壘攻防暗號重整','阻擋暴投專項週','投手丘會議時機','菜鳥投手引導計畫','盜壘阻殺連線','主審好球帶適應'],'C','你讀懂投手、跑者與主審的節奏，整套投捕防線因此穩定','一次判讀慢了半拍，投手和內野都開始懷疑暗號',{cat:2,arm:1,team:1},{cat:-2,fld:-1,team:-1},'捕手指揮');
addEventSeries(['強迫取分內野趨前','雙殺樞紐臨時換人','不規則彈跳連續考驗','跑者夾殺責任切換','游擊深區長傳','內野佈陣臨場改位'],'IF','你的第一步、補位與傳球選擇連成一套，投手敢把球留在場內','你和搭檔對責任區理解不同，一次猶豫擴大成整局失分',{rng:2,fld:1,team:1},{rng:-2,arm:-1,team:-1},'內野協防');
addEventSeries(['全壘打牆前判斷','陽光與屋頂吃球','中外野指揮權衝突','深遠飛球接力回傳','界外區護欄追球','兩出局長打提前起跑'],'OF','你提早讀到擊球軌跡，也讓兩側外野手知道誰該接手','第一步與喊聲同時慢了，原本能處理的球落在三人之間',{rng:2,arm:1,team:1},{rng:-2,fld:-1,team:-1},'外野判讀');
addEventSeries(['先發日臨時延後','第一局用球數失控','第三輪打線攻防','牛棚熱身次數管理','滿壘拆彈登板','跨局後援續投抉擇'],'P','你把角色需求與手臂負荷算清楚，關鍵局仍能執行投球','臨時調度打亂熱身，球威、控球與恢復全部互相牽制',{ctl:2,sta:1,team:1},{ctl:-2,sta:-1,inj:4,team:-1},'投手職責');
/* 官方紀錄與規則改編：不使用現役球員姓名，保留真實情境與制度後果。 */
const REAL_CASE_EVENTS=[
 {n:'四球後宣布保留比賽',for:'PRO',orgs:['MiLB'],case:true,kind:'身心狀態',basis:'真實案例中，突發暴雨讓比賽只打四球就暫停，隔天從原球數續戰。',source:'MLB 官方案例',url:'https://www.mlb.com/news/white-sox-rangers-suspended-by-rain-august-27-2024',gt:'你記好球數與攻防計畫，隔天重返球場立刻接上節奏',bt:'等待、熱身與重新開機消耗整套準備流程',g:{sta:2,eye:1,ctl:1},b:{sta:-2,eye:-1,ctl:-1}},
 {n:'補賽塞進唯一休兵日',for:'PRO',orgs:['MiLB'],case:true,kind:'身心狀態',basis:'因雨延賽可能迫使球隊在跨城市客場間多繞一站。',source:'MLB 官方案例',url:'https://www.mlb.com/news/game-2-of-braves-reds-doubleheader-postponed',gt:'你提前調整睡眠與恢復，額外旅程沒有拖垮身體',bt:'原本的休兵日消失，疲勞一路帶進下一個系列賽',g:{sta:2},b:{sta:-2,inj:5}},
 {n:'PitchCom 在滿壘時斷線',for:'P',orgs:['MiLB'],case:true,kind:'投球調整',basis:'MLB 規則允許投捕在通訊設備故障時向裁判請求暫停處理。',source:'MLB 規則說明',url:'https://www.mlb.com/news/mlb-clarifies-2023-rule-changes',gt:'你和捕手立即切回手勢暗號，沒有讓跑者看穿',bt:'暗號反覆重設，節奏與投球時鐘一起逼近',g:{ctl:2,cat:2},b:{ctl:-2,cat:-1}},
 {n:'裁判突襲檢查手套',for:'P',orgs:['MiLB'],case:true,kind:'投球調整',basis:'大聯盟會例行檢查投手手與手套，違規外部物質可導致驅逐與停賽。',source:'MLB 官方規範',url:'https://www.mlb.com/news/faq-sticky-stuff-and-new-rule-enforcement',gt:'你主動配合檢查，器材與松香使用都清楚過關',bt:'汗水、防曬與松香引發長時間爭議，投球節奏徹底中斷',g:{ctl:2,sta:1},b:{ctl:-2,sta:-1}},
 {n:'計時器與設備同時出錯',for:'PRO',orgs:['MiLB'],case:true,kind:'球場技術',basis:'投球計時新規與 PitchCom 故障有專門處理程序，臨場溝通變得更重要。',source:'MLB 規則說明',url:'https://www.mlb.com/news/mlb-clarifies-2023-rule-changes',gt:'你先確認裁判手勢再重置流程，避免白白丟掉一個好球',bt:'所有人都以為對方喊了暫停，判決卻已經成立',g:{eye:2,ctl:2,cat:1},b:{eye:-2,ctl:-1,cat:-1}},
 {n:'帆布故障淹掉內野',for:'PRO',orgs:['MiLB'],case:true,kind:'身心狀態',basis:'真實案例曾因自動帆布設備異常與突發暴雨造成場地無法恢復。',source:'MLB 官方案例',url:'https://www.mlb.com/news/mlb-issues-statement-on-bronx-tarp-malfunction/c-86120380',gt:'球隊把等待時間變成完整恢復，你沒有被不確定性拖走',bt:'反覆熱身又收操，下肢與手臂都失去原本節奏',g:{sta:2},b:{sta:-2,inj:4}},
 {n:'板凳清空後的禁賽名單',for:'PRO',orgs:['MiLB'],case:true,kind:'團隊關係',basis:'衝突後的驅逐、罰款與停賽會讓球隊立刻面臨人手短缺。',source:'MLB 官方案例',url:'https://www.mlb.com/news/kennedy-suspended-10-games-as-part-of-mlb-discipline/c-50618188',gt:'你把情緒留在場上，協助球隊重新集中於比賽',bt:'一句挑釁讓衝突延燒，更衣室與名單一起受損',g:{sta:1,rand:2},b:{sta:-2,rand:-2}},
 {n:'供電系統受損延賽',for:'PRO',orgs:['CPBL'],case:true,kind:'身心狀態',basis:'中職曾因球場供電嚴重受損、夜間照明無法開啟而公告延賽。',source:'中職官方案例',url:'https://cpbl.com.tw/xmdoc/cont?sid=0L132508434610944853',gt:'你保留身體熱度又不過度熱身，補賽仍維持準備',bt:'一整晚反覆等待開打，回家時身體比打完比賽還累',g:{sta:2},b:{sta:-2,inj:3}},
 {n:'七局球場突然全黑',for:'PRO',orgs:['CPBL'],case:true,kind:'球場技術',basis:'中職史上曾因變電箱短路起火，照明全熄並由裁判裁定比賽結束。',source:'中職官方案例',url:'https://cpbl.com.tw/xmdoc/cont?sid=0L132509587864989968',gt:'燈熄前你仍完成專注流程，重新判決時沒有失去控制',bt:'突發中斷讓情緒與注意力全被帶離比賽',g:{eye:2,ctl:2},b:{eye:-2,ctl:-2}},
 {n:'未滿五局的雨中等待',for:'PRO',orgs:['CPBL'],case:true,kind:'身心狀態',basis:'中職票務與賽務規定明載，未滿五局可能不成立並另行延賽。',source:'中職官方說明',url:'https://cpbl.com.tw/news/cont?SId=0O003536435371571984',gt:'你沒有被是否成賽綁架，依防護員指示控制熱身量',bt:'為了搶在雨勢前成立比賽，你把身體催得太急',g:{sta:2},b:{sta:-2,inj:5}},
 {n:'十一座球場的移動週',for:'PRO',orgs:['CPBL'],case:true,kind:'身心狀態',basis:'中職 2026 一軍賽程分布於全台十一座球場，場地與交通條件差異很大。',source:'中職官方賽程',url:'https://cpbl.com.tw/xmdoc/cont?sid=0Q055689330649348741',gt:'你為不同草皮、紅土與移動距離準備了個別流程',bt:'行李、交通與場地切換吃掉原本的恢復時間',g:{sta:2,fld:1},b:{sta:-2,fld:-1}},
 {n:'總冠軍第六戰因雨順延',for:'PRO',orgs:['NPB'],case:true,kind:'身心狀態',basis:'2024 日本大賽第六戰因雨取消，後續場次與開賽時間全部順延。',source:'NPB 官方公告',url:'https://npb.jp/news/detail/20241102_01.html',gt:'你把高張力狀態多保存一天，重新開賽仍能集中',bt:'等待把腎上腺素耗光，隔天反而像整夜沒睡',g:{sta:2,eye:1,ctl:1},b:{sta:-2,eye:-1,ctl:-1}},
 {n:'颱風逼近提前取消',for:'PRO',orgs:['NPB'],case:true,kind:'身心狀態',basis:'NPB 曾在颱風接近前一日就公告取消例行賽，替代日程另定。',source:'NPB 官方公告',url:'https://npb.jp/news/detail/20240815_03.html',gt:'你利用突如其來的空檔完成恢復，又維持訓練節奏',bt:'臨時行程讓作息完全放掉，補賽時身體仍沒醒來',g:{sta:2},b:{sta:-2}},
 {n:'危險球直接退場',for:'P',orgs:['NPB'],case:true,kind:'投球調整',basis:'NPB 年度紀錄會正式列出因頭部危險球遭驅逐的投手與場次。',source:'NPB 年度紀錄',url:'https://c.npb.jp/history/2024/records.pdf',gt:'你在失投後立刻找回放球點，內角球仍有品質',bt:'一顆失手的內角球讓你被驅逐，後續也不敢攻擊好球帶',g:{ctl:2,brk:1},b:{ctl:-3,sta:-1}},
 {n:'連四場延長賽',for:'PRO',orgs:['NPB'],case:true,kind:'身心狀態',basis:'NPB 2024 年度紀錄收錄球隊連續四場進入延長賽的罕見情況。',source:'NPB 年度紀錄',url:'https://c.npb.jp/history/2024/records.pdf',gt:'你把飲食、補水與熱身壓到最有效率，撐過超長系列賽',bt:'每天都不知道何時上場，疲勞與睡眠一起失控',g:{sta:3},b:{sta:-3,inj:6}},
 {n:'一個月六次再見敗',for:'PRO',orgs:['NPB'],case:true,kind:'團隊關係',basis:'NPB 年度紀錄曾出現單隊單月六次被再見的沉重低潮。',source:'NPB 年度紀錄',url:'https://c.npb.jp/history/2024/records.pdf',gt:'更衣室沒有互相找戰犯，你們把壓力拆成下一場的準備',bt:'每個人都害怕成為下一個輸球的人，場上決策越來越縮手',g:{sta:2,rand:1},b:{sta:-2,rand:-2}},
 {n:'危險揮棒新規警告',for:'B',orgs:['NPB'],case:true,kind:'球場技術',basis:'NPB 2026 對整支球棒飛向他人的危險揮棒新增警告與退場規範。',source:'NPB 官方規則',url:'https://npb.jp/npb/2026rules_2.html',gt:'你縮短失去控制的揮棒尾端，仍保留擊球速度',bt:'為了避免再被警告，你的揮棒變得僵硬而遲疑',g:{con:2,eye:1},b:{con:-2,eye:-1}},
 {n:'雙重賽第二場再度取消',for:'PRO',case:true,kind:'身心狀態',basis:'現實職棒可能連補賽都再次遇雨，投手與野手的準備全部重排。',source:'MLB 官方案例',url:'https://www.mlb.com/news/game-2-of-braves-reds-doubleheader-postponed',gt:'你接受不確定性，讓恢復與訓練都保留彈性',bt:'兩次取消讓你反覆進入比賽模式，身體與注意力被磨光',g:{sta:2},b:{sta:-2,inj:4}}
];
EVENTS.push(...REAL_CASE_EVENTS);
if(EVENTS.length<100)throw new Error('事件庫未達 100 種');
/* 每季現實環境：球場、天候、移動、教練與更衣室共同改變表現與傷病。 */
const SEASON_FACTORS={
  park:[
    {n:'投手友善球場',d:'深遠外野與厚重空氣壓低長打',p:1.4,h:-1.1,inj:0},
    {n:'打者天堂',d:'短右外野與乾燥空氣讓飛球更危險',p:-1.2,h:1.5,inj:0},
    {n:'中性球場',d:'攻守條件接近聯盟平均',p:0,h:0,inj:0},
    {n:'不規則外野',d:'牆面與界外區考驗判斷和溝通',p:-.3,h:.3,inj:2}],
  weather:[
    {n:'炎熱潮濕',d:'高溫連戰增加補水與恢復壓力',p:-.4,h:-.2,inj:4},
    {n:'涼爽穩定',d:'整季大多在舒適氣候下比賽',p:.5,h:.5,inj:-2},
    {n:'多雨賽季',d:'延賽與臨時雙重賽打亂節奏',p:-.5,h:-.5,inj:3},
    {n:'強風球季',d:'飛球判斷與控球每天都要重算',p:-.2,h:.2,inj:1}],
  travel:[
    {n:'密集客場',d:'長途移動與短休息壓縮恢復時間',p:-.7,h:-.7,inj:5},
    {n:'主場甜蜜期',d:'連續主場讓訓練與睡眠保持規律',p:.7,h:.7,inj:-3},
    {n:'標準賽程',d:'移動與休息分布正常',p:0,h:0,inj:0},
    {n:'跨國系列賽',d:'陌生球場與時差帶來額外變數',p:-.4,h:-.4,inj:3}],
  staff:[
    {n:'數據型教練團',d:'影像與追蹤數據帶來精準對策',p:.8,h:.8,inj:0},
    {n:'溝通型教練團',d:'角色明確，低潮時有人及時介入',p:.6,h:.6,inj:-1},
    {n:'高壓教練團',d:'訓練量大、競爭激烈，成長與風險並存',p:1,h:1,inj:5},
    {n:'磨合中的教練團',d:'戰術與角色頻繁改動',p:-.8,h:-.8,inj:1}],
  room:[
    {n:'更衣室團結',d:'隊友互相補位，連敗時也沒有失控',p:.7,h:.7,inj:-1},
    {n:'良性競爭',d:'位置競爭把訓練強度推高',p:.8,h:.8,inj:2},
    {n:'交易流言四起',d:'每個人都在猜下一個被送走的是誰',p:-.8,h:-.8,inj:1},
    {n:'平靜球季',d:'場內外沒有特別的順風或逆風',p:0,h:0,inj:0}]
};
/* ================= 遊戲狀態 ================= */
let S=null, stepQ=[];
function newState(name,pos,role){
  name=cleanPlayerName(name);
  /* 能進甲組高中校隊的球員不該從遠低於高中競賽基準起跑；仍保留弱項，但正常新生約落在替補至輪替水準。 */
  const ab={}; POS_AB[pos].forEach(k=>ab[k]=ri(25,37));
  if(pos==='P'){ab.vel+=ri(0,6);ab.brk+=ri(0,4);} else {ab.con+=ri(0,6);ab.pow+=ri(0,4);}
  POS_AB[pos].forEach(k=>ab[k]=r99(ab[k]));
  /* OOTP 式潛力天花板:洗牌後 1 項頂尖工具、1 項優質、1 項中上,其餘平庸 */
  const pot={}, sh=POS_AB[pos].slice();
  for(let i=sh.length-1;i>0;i--){const j=Math.floor(R()*(i+1));const t=sh[i];sh[i]=sh[j];sh[j]=t;}
  if(pos==='P'){
    /* 投手只有 4 項能力,天花板更集中:1 項招牌武器,其餘明顯壓低,避免動輒雙 70/四滿天賦 */
    sh.forEach((k,i)=>{ pot[k]=r99(i===0?ri(70,80) : i===1?ri(58,68) : i===2?ri(50,60) : ri(44,54)); });
  } else {
    sh.forEach((k,i)=>{ pot[k]=r99(i===0?ri(72,80) : i===1?ri(64,74) : i===2?ri(56,68) : ri(46,62)); });
  }
  /* 高中固定分級表(隱藏):T1 名門 +6 / T2 中堅 ±0 / T3 弱旅 -6 */
  const hsMap={'平鎮高中':1,'穀保家商':1,'高苑工商':2,'北科附工':2,'普門高中':3,'東大體中':3};
  const schools=Object.keys(hsMap);
  const myTeam=schools[Math.floor(R()*schools.length)];
  return {name,pos,role:pos==='P'?(role||null):null,reliefStatus:pos==='P'&&role==='CL'?'CLOSER':pos==='P'&&role==='MR'?'MIDDLE':null,reliefStatusYears:{},pitcherAssignmentHistory:[],age:16,year:2026,stage:'HS',stageYr:1,pot,
    hsMap,hsTier:hsMap[myTeam],team:myTeam,potSum0:Object.values(pot).reduce((a,b)=>a+b,0),
    league:null,org:null,orgTeam:null,teamTally:{CPBL:{},NPB:{},MLB:{}},
    ab,traits:{genius:false,glass:false,iron:false,scum:false,
      late:false,disc:false,academy:false,intlace:false,franchise:false,clutch:false,phoenix:false,combo:false,onetool:false,rubber:false,legend:false,
      yips:false,distract:false,cancer:false,ambience:false,goldcloth:false,thief:false,mrteam:false,confidante:false,smallschool:false,grinder:false,
      ace:false,slugger:false,sparkplug:false,defchief:false,steady:false,fanhero:false,community:false,leader:false,mentor:false,island:false,booed:false,
      fireball:false,command:false,workhorse:false,stopper:false,patient:false,basethief:false,october:false,moneywise:false,familyanchor:false,globetrotter:false},
    removed:[], /* 被覆蓋/解除的特性,結算畫刪除線 */
    cntSave:0,cntSaveWin:0,cntSnack:0,cntBoldWin:0,cntBoldFail:0,samePick:0,samePickKey:null,teamYears:0,
    six:0,bigInj:0,seasonEndingInjuries:0,injuryHistory:[],ironStreak:0,npbYears:0,hsCupBonus:0,hsTrainingDiceMod:0,hsUsageBonus:0,hsPlan:null,hsPlanEffect:null,hsCupHistory:[],
    injNext:0,tmpInj:0,rehab:0,salary:0,pool:0,seasonFactor:1,lastD:0,lastMarketD:0,lastMarketBreakdown:null,minorStruggle:0,developmentWatch:null,formerPro:false,
    stats:{CPBL:null,NPB:null,MLB:null,MINOR:null},honors:[],awardWatch:[],intlCount:0,intlLock:null,intlStat:{G:0,PA:0,AB:0,H:0,HR:0,RBI:0,IP:0,OUTS:0,SO:0,ER:0,W:0,SV:0},intlBest:null,dpos:null,dposYears:{},roleYears:{},tradeRefuse:0,champThisTeam:false,svc:0,service:{CPBL:0,NPB:0,MiLB:0},serviceDays:{CPBL:0,NPB:0,MiLB:0},proYears:0,retirementAgeLimit:null,mlbRoster:{forty:false,optionSeasons:[],optionAssignments:{},outrightCount:0,dfaCount:0,history:[],fourthOptionGranted:false},proEntry:null,draftDecision:null,svcOrg:null,faElig:false,tradeHeat:0,complainCount:0,demotionRefused:false,tj:0,tjCount:0,effort:'普通',tjSuccess:0,love:{st:'single',partner:null,partnerJob:null,affection:0,kids:0,caught:0,affairs:0,exes:[],dyrs:0,datedTimes:0},traits2:{},log:[],ct:null,done:false,
    rngMode:RNG_MODE,rolls:[],lastRoll:null,drawnEvents:[],eventThreads:{team:0,family:0,fan:0,media:0},seasonContext:null,seasonLuck:10,seasonMomentum:0,_seasonVariance:null,teammate:null,chemistry:0,aging:{checks:0,declines:0,totalLoss:0,last:null},
    social:{fanRep:0,playerRep:0,fanActs:0,playerActs:0,communityActs:0,mentorActs:0,ignoredFans:0,ignoredPlayers:0,viral:0},
    eventProfile:{total:0,wins:0,fails:0,boldWins:0,teamWins:0,mediaWins:0,positionWins:0,positionFails:0,healthWins:0},
    traitProgress:{elite:0,power:0,spark:0,defense:0,steady:0,cold:0,eliteCold:0,powerCold:0,sparkCold:0,defenseCold:0,velocity:0,command:0,workhorse:0,stopper:0,patience:0,speed:0,postseason:0},potentialBreakthrough:{streaks:{},successes:{},history:[]},achievementQueue:[],standingsHistory:[],currentStandings:null,
    finance:{gross:0,tax:0,agent:0,living:0,luxury:0,family:0,cash:0,investments:0,debt:0,netWorth:0,ledger:[],taxableByYear:{},homeOwned:false,homeEquity:0,investmentYears:0,discipline:0,crisesResolved:0},offseasonTrainingDice:0,awardLeverage:0,awardLeverageUntil:0,awardStreakBonusYear:0,poachCount:0,poachEffect:null,poachHistory:[],poachLeverage:0,poachLeverageUntil:0,teamStrengths:{},tradeHistory:[],lastDemotion:null,overseasDepth:{npb2:0,milb:0},returnInquiryHistory:[],cpblFaSignings:{},cpblFaMarketByYear:{},leagueWorld:{version:3,rosters:{},lastYear:0},npcSeasonContext:null,promiseHistory:[],effectHistory:[]};
}
function blankStat(){return {yr:0,qualYrs:0,eliteYrs:0,G:0,PA:0,AB:0,H:0,_1B:0,_2B:0,_3B:0,HR:0,RBI:0,SB:0,BB:0,W:0,L:0,SV:0,HLD:0,HP:0,IP:0,OUTS:0,SO:0,ER:0,AS:0,DEF:0,TC:0,E:0,PO:0,A:0,DP:0,OFA:0,CS:0,SBA:0,CALL_RUNS:0,CALL_DEF:0,CALL_SCORE_G:0,CALL_G:0,VeloIP:0,avgVelo:0};}
function bucketOf(lv){ const l=lv&&LV[lv]; return l&&l.top?l.top:'MINOR'; } /* 業餘引退時 lv 為空,歸類 MINOR */
function traitCard(key,name,desc,tone){ S.traits[key]=true;
  card(tone||'gold','隱藏屬性解鎖：'+name,desc); board(0); }
function removeTrait(key,label){ if(S.traits[key]){ S.traits[key]=false;
    if(!S.removed.includes(label))S.removed.push(label); } }
const DYNAMIC_TRAIT_LABELS={ace:'王牌氣場',slugger:'重砲核心',sparkplug:'上壘發動機',defchief:'守備指揮官',steady:'穩定輸出',fanhero:'球迷寵兒',community:'公益隊長',leader:'更衣室領袖',mentor:'新秀導師',island:'孤島球員',booed:'噓聲纏身',fireball:'火球製造機',command:'控球藝術家',workhorse:'吃局數機器',stopper:'牛棚拆彈手',patient:'好球帶獵人',basethief:'盜壘威脅',october:'季後賽強心臟',moneywise:'財務紀律',familyanchor:'家庭支柱',globetrotter:'跨國適應者'};
const TRAIT_EFFECTS={
  genius:'每顆訓練成果最低 3；一般事件成功率 +6 個百分點。覺醒時兩項能力與潛力上限獲得提升。',late:'每顆訓練成果最低 2；一般事件成功率 +6 個百分點。',iron:'每季基礎傷病風險最高 6%。',glass:'每季基礎傷病風險至少 30%。',disc:'老化判定的有效年齡延後 2 年。',academy:'25 歲前基礎傷病風險 −3%。',clutch:'高風險事件不再承受 −12% 成功率；冠軍與國際賽 MVP 機會提高。',rubber:'TJ 負荷上限由 50 提高到 100，硬撐成功率由 55% 提高到 85%。',intlace:'國際賽能力點至少 2，且不增加下季傷病負荷。',franchise:'母隊續約年薪係數至少 1.20，並提高生涯評價。',smallschool:'生涯成就標記；不直接改變比賽數值。',grinder:'生涯成就標記；不直接改變比賽數值。',goldcloth:'生涯忠誠成就；不直接改變單季數值。',mrteam:'長期效力同隊的稱號；不直接改變單季數值。',confidante:'家庭／關係故事特性；不直接改變球場能力。',phoenix:'解除玻璃人傷病懲罰，並在解鎖時獲得能力點。',onetool:'突出工具提高特殊代打／代跑／代守出賽機會。',legend:'首輪名人堂成就；不再改變已結束的生涯數值。',combo:'連續三年專注同一能力後，每季有 45% 機會增加 1 顆專精訓練骰。',
  ace:'ERA −0.08、三振 +2%、球季修正 +0.30、合約行情約 +4%。',slugger:'全壘打 +5%（有產量時至少多 1 支）、打點 +3%、合約行情約 +4%。',sparkplug:'保送約 +3%（至少多 1 次）、盜壘 +5%。',defchief:'單季守備貢獻 +1，並緩慢增加球員聲望；捕手另使模擬投手群 ERA 約下降 0.04。',steady:'球季綜合修正 +0.25，年度隨機雜訊約 −22%；仍會受手感、事件與傷病影響。',fanhero:'明星票選 +7%、球迷互動小幅提高、合約行情約 +2%，並增加代言收入。',community:'明星票選 +3%、增加公益合作收入，並可競逐年度公益獎。',leader:'球季修正 +0.30、隊友互動 +5%、交易風險 −5%。',mentor:'球季修正 +0.15、隊友互動 +4%。',island:'球季修正 −0.45、隊友互動 −8%、交易風險 +10%。',booed:'球季修正 −0.30、明星票選 −8%、球迷互動 −6%、合約行情約 −5%。',
  fireball:'平均球速 +0.3 mph、三振約 +2%；高球速仍會照常累積手臂負荷。',command:'單季保送約 −4%，WHIP 隨實際被安打與保送重算。',workhorse:'每季基礎傷病風險 −2 個百分點；不保證先發場次。',stopper:'後援 ERA −0.08，中繼／救援產量約 +2%。',patient:'保送約 +4%（至少多 1 次），打席與上壘數同步增加。',basethief:'盜壘產量約 +6%；速度老化後仍可能失去威脅。',october:'只在實際季後賽加成：約 +4%，短系列的小數加成至少反映 1 個有效結果；例行賽不加成。',moneywise:'突發財務事件預估成本 −5%，代表準備金與議價能力。',familyanchor:'婚姻穩定時球季修正 +0.15；家庭關係轉差就不再提供加成。',globetrotter:'跨國移動適應帶來球季修正 +0.15。',
  cancer:'交易風險 +25%、FA 報價數 −1、續約行情上限受壓，且可能被母隊拒絕續約。',yips:'系統評價暫時 −3，直到升級或取得主要年度獎項。',distract:'場外活動造成的負面特性；部分訓練與評價會受影響。',ambience:'交易風險 +20%。',thief:'一般事件成功率 −6%。',scum:'再次感情事件被抓時會承受額外全能力損失。'
};
const STATIC_TRAIT_LABELS={genius:'天才',iron:'鐵人',glass:'玻璃人',scum:'渣男',late:'大器晚成',disc:'自律狂',academy:'學院派',intlace:'國際賽之鬼',franchise:'神主牌',clutch:'大心臟',phoenix:'浴火重生',combo:'無巧不工',onetool:'只會這個',rubber:'橡膠手臂',goldcloth:'黃金聖衣',mrteam:'球隊先生',confidante:'閨中密友',smallschool:'小學校之光',grinder:'努力仔',legend:'歷史級球星',yips:'失憶症',distract:'外務纏身',cancer:'更衣室毒瘤',ambience:'氣氛大師',thief:'薪水小倫'};
const TRAIT_ORIGINS={
  genius:'22 歲前，公平訓練骰累積 6 次最高點數。',clutch:'25 歲前至少 6 次高風險事件成功，且已有一季強勢成績。',disc:'25 歲前長期保守成功、少宵夜且沒有感情失控。',
  ace:'連續兩季達王牌成績，並累積投手職責事件成功。',slugger:'連續兩季達聯盟長打門檻。',sparkplug:'連續兩季高上壘並具速度／安打產量。',defchief:'連續兩季守備貢獻出色，並累積守位專屬事件成功。',steady:'連續三季維持正向成績。',
  leader:'團隊事件多次成功、團隊關係良好，且球季成績能服眾。',mentor:'27 歲後多次成功協助年輕隊友。',fanhero:'球迷／媒體事件累積成功，且球季成績出色。',community:'長期公益參與與球迷信任。',island:'多次拒絕隊友或團隊事件處理失敗。',booed:'低潮期間持續失去球迷信任。',
  fireball:'連續兩季平均球速至少 98.0 mph，且 K/9 至少 9.0。',command:'連續三季 BB/9 不高於 2.2，並達到最低投球局數。',workhorse:'先發投手連續三季達聯盟吃局數門檻。',stopper:'後援投手連續兩季至少 25 次中繼／救援且 ERA 2.75 以下。',patient:'連續三季保送率至少 10%，且維持規則性打席。',basethief:'連續兩季達聯盟盜壘威脅門檻。',october:'兩次在實際季後賽出賽中繳出強勢短期成績。',moneywise:'至少四年選擇穩健現金流、保險或專業稅務規劃。',familyanchor:'已婚、家庭關係長期良好，且願意承擔實際家庭支出。',globetrotter:'在兩個以上國家的頂級聯盟留下球季，且團隊關係不差。'
};
const NEGATIVE_TRAITS=new Set(['glass','scum','yips','distract','cancer','ambience','thief','island','booed']);
function traitTagHTML(key,label,style){
  const bad=NEGATIVE_TRAITS.has(key),effect=TRAIT_EFFECTS[key]||'故事特性；目前沒有直接數值加成。',tip=effect+(TRAIT_ORIGINS[key]?`｜生成：${TRAIT_ORIGINS[key]}`:'');
  return `<span class="tag trait-tip" tabindex="0" data-tip="${tip}" title="${tip}" style="${bad?'background:#2a0f0f;border-color:#c0392b;color:#ff8b7a;':''}${style||''}">${label}</span>`;
}
function socialState(){return S.social||(S.social={fanRep:0,playerRep:0,fanActs:0,playerActs:0,communityActs:0,mentorActs:0,ignoredFans:0,ignoredPlayers:0,viral:0});}
function eventProfile(){return S.eventProfile||(S.eventProfile={total:0,wins:0,fails:0,boldWins:0,teamWins:0,mediaWins:0,positionWins:0,positionFails:0,healthWins:0});}
function addSeasonState(amt){const before=S.pendStat||0;S.pendStat=clamp(before+amt,-4,4);return S.pendStat-before;}
function traitProgress(){return S.traitProgress||(S.traitProgress={elite:0,power:0,spark:0,defense:0,steady:0,cold:0,eliteCold:0,powerCold:0,sparkCold:0,defenseCold:0,velocity:0,command:0,workhorse:0,stopper:0,patience:0,speed:0,postseason:0});}
function unlockDynamicTrait(key,desc,tone){
  if(S.traits[key])return false;
  const label=DYNAMIC_TRAIT_LABELS[key];S.removed=S.removed.filter(x=>x!==label);
  traitCard(key,label,desc,tone);queueAchievement({kind:'trait',kicker:'特性生成',title:label,subtitle:'事件履歷與球季成績共同達標',detail:(TRAIT_ORIGINS[key]||'生涯條件達標')});return true;
}
function clearDynamicTrait(key,reason){
  if(!S.traits[key])return false;
  const label=DYNAMIC_TRAIT_LABELS[key];removeTrait(key,label);
  card('good','特性轉變｜'+label,`${reason}<br><b class="hl">「${label}」已解除</b>；你的聲望與球風仍會繼續變化。`);board(1);return true;
}
/* 只會這個:只吃三種角色維度——打擊(力量/Contact)、跑壘(速度)、守備(綜合) */
function careerAllStars(){ let n=0; ['CPBL','NPB','MLB'].forEach(b=>{ if(S.stats[b])n+=(S.stats[b].AS||0); }); return n; }
function toolGap(){ const a=S.ab;
  const hit=Math.max(a.pow,a.con);        /* 打擊維度:力量或 Contact 取高 */
  const run=a.spd;                         /* 跑壘維度 */
  const def=S.pos==='C'?(a.rng+a.fld+a.arm+a.cat)/4:(a.rng+a.fld+a.arm)/3; /* 守備綜合 */
  const dims=[['hit',hit,'代打'],['run',run,'代跑'],['def',def,'代守']];
  dims.sort((x,y)=>y[1]-x[1]);
  const topDim=dims[0], secDim=dims[1];
  const gap=topDim[1]-secDim[1];
  /* 對照角色:代打看力量/Contact 哪個高決定文案來源 */
  const role=topDim[2];
  return {gap, role, val:topDim[1], dim:topDim[0]}; }
function pitchingLoadForEffort(effort){
  if(!S||S.pos!=='P')return 0;
  const mult={'全力投':1.25,'普通投':1.0,'養生球':0.65}[effort||S.effort]||1.0;
  return (oldRating(S.ab.vel)+oldRating(S.ab.brk))/19*mult*(S.tjCount>=1?1.15:1);
}
function armConditionProfile(){
  const cap=tjCap(),load=Math.max(0,Number(S.tj)||0),ratio=load/Math.max(1,cap),pct=Math.round(ratio*100);
  const label=S.rehab>0?'復健中':ratio>=.85?'手肘隱隱作痛':ratio>=.6?'手臂略感疲勞':ratio>=.35?'狀況尚可':'手感輕盈';
  const meaning=ratio>=.85?'已接近手肘警戒線':ratio>=.6?'可用空間開始縮小':ratio>=.35?'仍有負荷，但未進入警戒區':'累積負荷低，離手肘警戒線仍遠';
  return {cap,load,ratio,pct,label,meaning};
}
function pitchingPlanProjection(effort){
  const arm=armConditionProfile(),added=pitchingLoadForEffort(effort),projected=arm.load+added,pct=Math.round(projected/Math.max(1,arm.cap)*100);
  const effects={
    '全力投':{velo:'+1.2 mph',era:'−0.25',so:'+6%',grade:'+1',tone:'bad'},
    '普通投':{velo:'無修正',era:'無修正',so:'無修正',grade:'無修正',tone:'info'},
    '養生球':{velo:'−1.1 mph',era:'+0.25',so:'−6%',grade:'−1',tone:'info'}
  }[effort]||{velo:'無修正',era:'無修正',so:'無修正',grade:'無修正',tone:'info'};
  return {arm,added,projected,pct,...effects};
}
function tjAccrue(){ /* 每季累積 TJ 量表:球速+變化球越高負擔越大,投法決定倍率 */
  if(S.pos!=='P'||S.seasonFactor<=0)return;
  S.tj+=pitchingLoadForEffort(S.effort); /* 99 制換算回負荷基準，避免憑空提高傷病。 */
}
function tjCap(){ /* 基礎 50(橡膠手臂 100);體力高手臂更耐操:sta≥70 +10、≥65 +5(與橡膠疊加) */
  let cap=S.traits.rubber?100:50;
  const sta=S.ab.sta; cap+= sta>=r99(70)?10 : sta>=r99(65)?5 : 0;
  return cap; }
function tjGamble(cont){ /* 量表達上限:先扣 -5,再對賭 */
  if(S.pos!=='P'||S.tj<tjCap()){ cont(); return; }
  addAb('vel',-5); addAb('brk',-5); board(1);
  card('bad','手肘拉起警報',`累積的負荷讓韌帶發出哀鳴——球速、變化球各 <b class="dn">−5</b>。醫療團隊把兩個選項攤在你面前。`);
  const succP=S.traits.rubber?85:55;
  choose('TJ 抉擇：你的手肘撐到極限了',[
    {t:'動 Tommy John 手術',main:true,s:'報銷一整年，回來球速/變化球回春（各 +3~+10）',f:()=>{
              S.tj=0; S.tjCount++; S.rehab=1;
              const gv=ri(3,10),gb=ri(3,10);
              /* 不經過訓練進度條，直接提升能力，但仍受 99 上限限制。 */
              S.ab.vel = clamp(S.ab.vel + gv, 1, RATING_MAX);
              S.ab.brk = clamp(S.ab.brk + gb, 1, RATING_MAX);
              if(S.tjCount>=2){ tjTwoStrike(); }
              board(1);
              card('gold','手術成功',`手術很順利。漫長復健後，你的球威煥然一新——球速 <b class="up">+${gv}</b>、變化球 <b class="up">+${gb}</b>。（本季報銷）`);
              afterGamble('surgery',cont); }},
            {t:'打針硬撐這一季',risk:true,probability:succP,s:`成功機會 ${succP}%｜成功＝球速、變化球各 +5；失敗＝TJ 大傷（隔年報銷、能力再崩）`,f:()=>{
              if(chance(succP)){ S.tj=Math.max(0,S.tj-20);
                /* 【修正】打針成功也是直接給予絕對能力值 */
                S.ab.vel = clamp(S.ab.vel + 5, 1, RATING_MAX);
                S.ab.brk = clamp(S.ab.brk + 5, 1, RATING_MAX);
                board(1);
                card('good','險過一關',`封閉針撐住了，你咬牙投完球季——量表 <b class="hl">−20</b>，球速、變化球各 <b class="up">+5</b>。但這是在跟時間借命。`);
                afterGamble('inject',cont); }
              else { tjBigInjury(cont); } }}]);
}
function tjTwoStrike(){ /* 累計 2 次 TJ:球速與變化球砍半 */
  S.ab.vel=clamp(Math.round(S.ab.vel/2),1,RATING_MAX);
  S.ab.brk=clamp(Math.round(S.ab.brk/2),1,RATING_MAX);
  card('bad','兩度動刀的代價','第二次進手術室——韌帶再也不是原廠的了。球速與變化球<b class="dn">直接砍半</b>。');
}
function tjBigInjury(cont){
  S.tjCount++; S.rehab=1; S.tj=0;
  /* 5% 肩膀報廢 */
  if(chance(5)){ S.ab.vel=10; S.ab.brk=10; S.pot.vel=20; S.pot.brk=20;
    card('bad','最壞的結果',`針扎下去的瞬間，肩膀傳來從未有過的撕裂感。醫生的臉色說明了一切——<b class="dn">肩膀報廢，球速與變化球歸零剩 10，潛力上限砍到 20</b>。你的投手生涯，大概到這裡了。`);
    board(1); afterGamble('fail',cont); return; }

  /* 韌帶斷裂的懲罰 (-5) 以及手術後的回春 (+3~+10) */
  const gv=ri(3,10), gb=ri(3,10);
  /* 合併計算淨變動：(回春 - 斷裂懲罰) */
  const netV = gv - 5;
  const netB = gb - 5;

  S.ab.vel = clamp(S.ab.vel + netV, 1, RATING_MAX);
  S.ab.brk = clamp(S.ab.brk + netB, 1, RATING_MAX);

  if(S.tjCount>=2)tjTwoStrike();
  board(1);

  /* 處理字卡顯示的顏色與符號 */
  const vStr = netV > 0 ? `<b class="up">+${netV}</b>` : netV < 0 ? `<b class="dn">${netV}</b>` : `<b>0</b>`;
  const bStr = netB > 0 ? `<b class="up">+${netB}</b>` : netB < 0 ? `<b class="dn">${netB}</b>` : `<b>0</b>`;

  card('bad','TJ 大傷',`硬撐的代價來了——韌帶當場斷裂。隔年<b class="dn">全年報銷</b>。經歷了漫長的手術與復健（斷裂 −5 加上手術回春），最終你的球速 ${vStr}、變化球 ${bStr}。就算滿血回歸，也真的只是勉強打平。`);
  afterGamble('fail',cont);
}
function afterGamble(kind,cont){
  if(kind==='inject'){ S.tjSuccess++;
    if(S.tjSuccess>=2&&!S.traits.rubber){ S.traits.rubber=true;
      card('gold','隱藏屬性解鎖：橡膠手臂','連續兩次靠打針硬撐挺過手肘危機、完全不進手術室——你的韌帶像橡膠一樣柔韌。<b class="hl">TJ 量表上限翻倍、打針成功率翻倍</b>。'); board(1); } }
  else if(kind==='surgery'){ S.tjSuccess=0; /* 開刀重置連續 */
    if(S.traits.rubber){ removeTrait('rubber','橡膠手臂');
      card('bad','橡膠不再','終究還是進了手術室——那雙被稱為橡膠的手臂，也有極限。<b class="dn">橡膠手臂失效</b>。'); board(1); } }
  else { S.tjSuccess=0; } /* 大傷失敗重置 */
  cont();
}
const RELIEF_STATUS={LONG:{name:'長中繼',rank:0},MIDDLE:{name:'一般中繼',rank:1},SETUP:{name:'勝利組',rank:2},CLOSER:{name:'終結者',rank:3}};
function reliefStatusKey(status,role){
  status=status||(S&&S.reliefStatus);role=role||(S&&S.role);
  return RELIEF_STATUS[status]?status:role==='CL'?'CLOSER':role==='MR'?'MIDDLE':null;
}
function reliefStatusName(status,role){const key=reliefStatusKey(status,role);return key?RELIEF_STATUS[key].name:'後援投手';}
function relieverPerformanceScore(st){
  if(!st||!(st.G>0)||!(st.IP>0))return -2.5;
  const era=st.ER*9/st.IP,whip=(st.H+st.BB)/st.IP,k9=(st.SO||0)*9/st.IP,sample=clamp(st.G/42,.35,1);
  return +(((4.20-era)*1.65+(1.38-whip)*2.7+(k9-7.5)*.15+(st.HLD||0)*.035+(st.SV||0)*.045)*sample).toFixed(1);
}
function reviewReliefStatus(){
  const keys=['LONG','MIDDLE','SETUP','CLOSER'],old=reliefStatusKey()||'MIDDLE',oldRank=RELIEF_STATUS[old].rank,st=S.lastSt,perf=relieverPerformanceScore(st),prior=Number.isFinite(S.prevSeasonD)?S.prevSeasonD:(Number(S.lastD)||0),npc=S.npcSeasonContext&&S.npcSeasonContext.year===S.year?Number(S.npcSeasonContext.usageAdj)||0:0;
  const experience=clamp((S.proYears||0)*.08,0,.65),teamCompetition=clamp(npc*7,-.9,.7),score=perf*.72+prior*.28+experience+teamCompetition+N0(.35);
  let target=score>=4.1?'CLOSER':score>=1.45?'SETUP':score>=-.8?'MIDDLE':'LONG',targetRank=RELIEF_STATUS[target].rank;
  /* 地位逐級變動；極端崩盤可一次掉兩級，避免一年好運直接從敗戰組跳終結者。 */
  if(targetRank>oldRank+1)targetRank=oldRank+1;
  if(targetRank<oldRank-1&&score>-3.5)targetRank=oldRank-1;
  target=keys[clamp(targetRank,0,3)];
  return {status:target,score:+score.toFixed(1),old,rankUp:targetRank>oldRank,rankDown:targetRank<oldRank,reason:`上一季後援評價 ${perf>=0?'+':''}${perf.toFixed(1)}｜球季評價 ${prior>=0?'+':''}${prior.toFixed(1)}｜隊內競爭 ${teamCompetition>=0?'+':''}${teamCompetition.toFixed(1)}`};
}
function reviewPitcherAssignment(){
  const old=S.role,sta=S.ab.sta,prior=Number.isFinite(S.prevSeasonD)?S.prevSeasonD:(Number(S.lastD)||0),starterFloor=r99(52);
  let role=old||((sta>=starterFloor)?'SP':'MR'),status=reliefStatusKey(),reason='',rankUp=false,rankDown=false;
  if(old==='SP'){
    const veteranMove=S.age>=34&&prior<=-2.5&&sta<r99(60),cannotStart=sta<starterFloor;
    if(cannotStart||veteranMove){role='MR';S.reliefStatus=status=status||'LONG';reason=cannotStart?`體力 ${sta}/99 已低於先發負荷門檻 ${starterFloor}`:`${S.age} 歲、上一季評價 ${prior.toFixed(1)}，球團改以縮短局數延續生涯`;rankDown=true;}
    else return {role:'SP',status:null,reason:`體力 ${sta}/99｜上一季評價 ${prior>=0?'+':''}${prior.toFixed(1)}，維持先發輪值`,rankUp:false,rankDown:false};
  }else if(old&&old!=='SP'){
    const starterTry=S.age<=30&&sta>=r99(58)&&prior>=2.5&&(S.proYears||0)<=7;
    if(starterTry){return {role:'SP',status:null,reason:`體力 ${sta}/99 與上一季評價 +${prior.toFixed(1)} 通過先發轉任門檻`,rankUp:true,rankDown:false};}
  }
  if(role!=='SP'){
    const review=reviewReliefStatus();status=review.status;role=status==='CLOSER'?'CL':'MR';reason=reason?`${reason}；${review.reason}`:review.reason;rankUp=rankUp||review.rankUp;rankDown=rankDown||review.rankDown;
  }
  S.pitcherAssignmentHistory=S.pitcherAssignmentHistory||[];S.pitcherAssignmentHistory.push({year:S.year,role,status,reason});S.pitcherAssignmentHistory=S.pitcherAssignmentHistory.slice(-24);
  return {role,status,reason,rankUp,rankDown};
}
function pitcherRole(){return reviewPitcherAssignment().role;}
function outsFromIP(ip){return Math.max(0,Math.round((Number(ip)||0)*3));}
function pitchingOuts(st){
  const fromIp=outsFromIP(st&&st.IP);
  /* 舊存檔沒有 OUTS；正規化時即使補成 0，也不能蓋掉原有局數。 */
  if(st&&Number.isFinite(st.OUTS)&&((Number(st.OUTS)||0)>0||fromIp===0))return Math.max(0,Math.round(st.OUTS));
  return fromIp;
}
function setPitchingOuts(st,outs){st.OUTS=Math.max(0,Math.round(Number(outs)||0));st.IP=st.OUTS/3;return st;}
function fmtIP(ip){ /* 內部以出局數換算，顯示永遠只會是合法的 .0／.1／.2。 */
  const outs=outsFromIP(ip);
  return Math.floor(outs/3)+'.'+(outs%3);
}
function roleN(r,status){return r==='SP'?'先發投手':r==='CL'?'終結者':r==='MR'?reliefStatusName(status,r):'—';}
function reliefPoints(st,role){
  role=role||(st&&st.role)||S.role;if(role!=='MR')return 0;
  return Math.max(0,Math.round((st&&st.HLD)||0));
}
function isSP(){ return S.role==='SP'; } /* 先發引擎判定 */
function ovr(){
  const a=S.ab;
  if(S.pos==='P'){ const arr=[a.vel,a.ctl,a.brk].sort((x,y)=>y-x);
    return Math.round(arr[0]*0.42+arr[1]*0.30+arr[2]*0.18+a.sta*0.10); }
  const off=[a.con,a.pow,a.eye,a.spd].sort((x,y)=>y-x);
  const offv=off[0]*0.38+off[1]*0.27+off[2]*0.20+off[3]*0.15;
  /* 守備分:用當前守位的 dpScore(與守位門檻系統一致);DH 無守備價值 → 以「1B 守備分 −12」計(確保同打擊下 1B 恆 > DH);未定守位則取最佳可守守位的分 */
  const dpForOvr = S.dpos || (S.pos==='C'?'C':(S.pos==='OF'?'CF':'SS'));
  const def = S.dpos==='DH' ? (dpScore('1B')-12) : dpScore(dpForOvr);
  /* 守備權重:關鍵守位(SS/CF/C)最高 30%,角落降低;DH 用與 1B 相同權重(守備分已內含 DH 懲罰) */
  const dw=S.dpos?({SS:0.30,CF:0.30,C:0.30,'2B':0.22,'3B':0.22,RF:0.20,'1B':0.12,LF:0.14,DH:0.12})[S.dpos]??0.22:0.24;
  let v=Math.round(offv*(1-dw)+def*dw);
  if(S.traits.yips)v-=3; /* 失憶症:心理陰影,系統評價 -3 */
  return v;
}
function playerType(){
  const a=S.ab;
  const developingLabel=()=>{
    if(S.stage==='HS'||S.stage==='U'||S.stage==='AMA'||S.age<=24)return '潛力股';
    if(S.age>=35)return (S.lastD||0)>=2?'資深戰力':(S.lastD||0)>=-1?'經驗老將':'生涯末段';
    if(S.age>=31)return (S.lastD||0)>=1?'成熟戰力':'板凳老將';
    return (S.lastD||0)>=0?'角色球員':'待證明球員';
  };
  if(S.traits.onetool&&S.toolRole)return S.toolRole+'工具人';
  if(S.pos==='P'){
    const m=Math.max(a.vel,a.ctl,a.brk);
    if(m<r99(52))return developingLabel();
    if(a.sta>=m&&a.sta>=r99(62))return '工作馬';
    if(m===a.vel)return '火球男'; if(m===a.brk)return '變化球藝師'; return '控球大師';
  }
  if(S.pos==='C'){ const rest=Math.max(a.con,a.pow,a.spd,a.eye,a.rng,a.fld,a.arm);
    if(a.cat>=r99(58)&&rest<=a.cat-11)return '配球皇帝'; }
  const dv=S.pos==='C'?(a.rng+a.fld+a.cat)/3:(a.rng+a.fld+a.arm)/3;
  const cand=[['巨炮型',a.pow],['安打製造機',a.con],['選球大師',a.eye],['飛毛腿',a.spd],['守備至上',dv]];
  cand.sort((x,y)=>y[1]-x[1]);
  if(cand[0][1]<r99(52))return developingLabel();
  if(cand[0][1]-cand[1][1]<=4&&cand[0][1]>=r99(60))return '全能型';
  return cand[0][0];
}
function abCost(k){ /* 目前這一級要花幾點(須與 addAb 成本公式一致) */
  const cur=S.ab[k], pk=(S.pot&&S.pot[k])||r99(62), isP=S.pos==='P';
  return growthCost(cur,pk,isP)*ageGrowthCost(k);
}
function ageGrowthLimit(k){
  if(!S)return 99;
  if(k==='spd'&&S.age>=31)return 0;
  if(k==='vel')return S.age>=35?0:S.age>=33?1:99;
  if(k==='sta')return S.age>=39?0:S.age>=35?1:S.age>=32?2:99;
  if(['rng','arm'].includes(k))return S.age>=40?0:S.age>=36?1:99;
  return 99;
}
function ageGrowthUsed(k){return S&&S._seasonAgeGains?S._seasonAgeGains[k]||0:0;}
function ageGrowthLocked(k){const limit=ageGrowthLimit(k);return limit<=0||ageGrowthUsed(k)>=limit;}
function ageGrowthCost(k){
  if(!S)return 1;
  if(k==='spd')return S.age>=31?99:S.age>=29?4:1;if(k==='vel')return S.age>=35?99:S.age>=33?4:S.age>=31?2:1;
  if(k==='sta')return S.age>=39?99:S.age>=35?6:S.age>=32?3:1;
  if(['rng','arm'].includes(k))return S.age>=40?99:S.age>=36?5:S.age>=33?2:1;
  return 1;
}
/* 越接近職業頂尖，進步所需的訓練量越大；超過天花板後成本再明顯提高。 */
function growthCost(cur,pk,isP){
  let c=isP?(cur>=r99(68)?8:cur>=r99(60)?5:cur>=r99(52)?3:1):(cur>=r99(74)?6:cur>=r99(68)?4:cur>=r99(60)?2:1);
  if(cur>=pk)c*=isP?5:4;
  return c;
}
function addAb(k,v){ if(!(k in S.ab))return 0; const o=S.ab[k];
  if(v<0){ S.ab[k]=clamp(o+v,1,RATING_MAX); return S.ab[k]-o; } /* 扣值 1:1,不吃量表成本 */
  if(v>0&&ageGrowthLocked(k)){if(S.carry)S.carry[k]=0;return 0;} /* 高齡速度／球速只能維持，不能靠一般事件逆齡成長。 */
  if(!S.carry)S.carry={};
  let cur=o,bud=v+(S.carry[k]||0); /* 未滿一級的點數累積在進度槽,不再蒸發 */
  const pk=(S&&S.pot&&S.pot[k])||r99(62);
  const isP=S&&S.pos==='P';
  const ageLimit=ageGrowthLimit(k),ageRoom=Math.max(0,ageLimit-ageGrowthUsed(k));
  while(bud>0&&cur<RATING_MAX&&cur-o<ageRoom){
    const cost=growthCost(cur,pk,isP)*ageGrowthCost(k);
    if(bud>=cost){bud-=cost;cur++;} else break; }
  S.carry[k]=cur>=RATING_MAX?0:bud;
  S.ab[k]=cur;if(cur>o){S._seasonAgeGains=S._seasonAgeGains||{};S._seasonAgeGains[k]=(S._seasonAgeGains[k]||0)+(cur-o);}return cur-o; }
function injuryProb(){ /* 只計需要缺席比賽的傷勢；一般痠痛不另開傷兵事件。 */
  let p=8;
  if(S.age>=35)p+=10; else if(S.age>=32)p+=5;
  p+=(S.bigInj||0)*3+(S.tjCount||0)*2; /* 舊傷會持續提高之後再次缺席的機率。 */
  if(S.traits.academy&&S.age<25)p-=3; /* 學院派:25歲前科學化管理 */
  if(S.traits.workhorse)p-=2; /* 吃局數機器:長期負荷管理經驗 */
  /* 體質特性:先套用在「基礎體質風險」上(不含額外自找的風險) */
  if(S.traits.iron&&S.traits.glass)p=18;
  else if(S.traits.iron)p=Math.min(p,6); /* 鐵人:基礎風險上限 6% */
  else if(S.traits.glass)p=Math.max(p,30); /* 玻璃人:基礎至少 30% */
  /* 額外自找的風險疊加在體質之上,不被鐵人上限/玻璃人下限吃掉:
     injNext=國際賽消耗(+10)、tmpInj=事件卡風險 */
  p+=(S.injNext||0)+(S.tmpInj||0);
  p+=(S.seasonContext&&S.seasonContext.injury)||0;
  return clamp(p,2,70);
}
/* ================= 數據模擬 ================= */
function amateurSeasonConfig(){
  if(S.stage==='HS')return {name:'高中球季',games:32,par:r99(34),maxStarts:12,reliefGames:18};
  if(S.stage==='U')return {name:'大專球季',games:46,par:r99(41),maxStarts:15,reliefGames:25};
  return {name:'成棒球季',games:60,par:r99(47),maxStarts:19,reliefGames:34};
}
/* 投手平均球速：能力是主因，牛棚角色、投球策略、健康與當季狀態只做有限修正；硬上限 105 mph。 */
function pitcherAvgVelocityMph(form){
  if(!S||S.pos!=='P')return 0;
  const ability=clamp(Number(S.ab.vel)||1,1,RATING_MAX),effort={'全力投':1.15,'普通投':0,'養生球':-1.05}[S.effort]||0;
  const relief=S.stage==='PRO'&&!isSP()?.65:0,health=-Math.max(0,1-clamp(Number(S.seasonFactor)||0,0,1))*2.8;
  const ageAdj=S.age<18?-.45:S.age>=37?-(S.age-36)*.12:0,formAdj=clamp(Number(form)||0,-5,5)*.12;
  return +clamp(72.7+ability*.303+effort+relief+health+ageAdj+formAdj+(S.traits.fireball?.3:0)+N0(.28),70,105).toFixed(1);
}
const veloText=st=>st&&st.avgVelo?`${Number(st.avgVelo).toFixed(1)} mph`:'—';
/* 2025 各聯盟環境基準：能力等於 par 時應接近該聯盟平均，而不是所有國家共用 MLB 式常數。 */
const LEAGUE_RUN_ENV={
  MLB:{era:4.25,k9:8.60,bb9:3.25,h9:8.55,avg:.248,bb:.082,hr:.030},NPB1:{era:3.05,k9:7.35,bb9:2.75,h9:8.25,avg:.244,bb:.078,hr:.020},CPBL1:{era:4.15,k9:7.45,bb9:3.25,h9:9.05,avg:.259,bb:.083,hr:.023},
  A3:{era:4.45,k9:8.65,bb9:3.80,h9:8.70,avg:.250,bb:.085,hr:.027},A2:{era:4.55,k9:8.70,bb9:4.00,h9:8.85,avg:.248,bb:.087,hr:.025},A1:{era:4.65,k9:9.00,bb9:4.25,h9:8.90,avg:.247,bb:.090,hr:.023},R:{era:4.75,k9:9.20,bb9:4.60,h9:9.00,avg:.245,bb:.095,hr:.020},
  NPB2:{era:3.35,k9:7.55,bb9:3.15,h9:8.55,avg:.246,bb:.082,hr:.018},CPBL2:{era:4.35,k9:7.60,bb9:3.60,h9:9.20,avg:.255,bb:.086,hr:.020}
};
function leagueRunEnv(lv){return LEAGUE_RUN_ENV[lv]||LEAGUE_RUN_ENV.MLB;}
/* 厚尾球季：官方紀錄證明極端年確實存在，但只能由頂尖工具＋火燙狀態低機率觸發；崩盤尾端也同樣存在。 */
function seasonOutlierProfile(lv){
  const L=LV[lv]||amateurSeasonConfig(),par=L.par,luck=Number.isFinite(S.seasonLuck)?S.seasonLuck:10;
  const out={power:1,speed:1,avg:0,era:0,k:1,label:'',kind:''},hot=luck>=18,cold=luck<=3;
  if(S.pos==='P'){
    const stuff=ratingGap((S.ab.vel+S.ab.brk)/2,par);
    if(hot&&stuff>=5&&chance(clamp(8+(luck-17)*9+stuff*1.1,12,48))){out.era=-(.22+R()*.38);out.k=1.06+R()*.10;out.label='歷史級壓制波動';out.kind='hot';}
    else if(cold&&chance(38)){out.era=.48+R()*.72;out.k=.84+R()*.10;out.label='罕見崩盤波動';out.kind='cold';}
  }else{
    const pg=ratingGap(S.ab.pow,par),sg=ratingGap(S.ab.spd,par),cg=ratingGap(S.ab.con,par),labels=[];
    if(hot&&pg>=6&&chance(clamp(7+(luck-17)*8+pg*1.05+(S.traits.slugger?5:0),10,52))){out.power=1.18+R()*.34;labels.push('長打爆發');}
    else if(cold&&chance(34)){out.power=.58+R()*.22;labels.push('長打失速');}
    if(hot&&sg>=7&&chance(clamp(5+(luck-17)*7+sg*.9,8,46))){out.speed=1.16+R()*.34;labels.push('跑壘爆發');}
    else if(cold&&chance(30)){out.speed=.56+R()*.25;labels.push('跑壘停滯');}
    if(hot&&cg>=5&&chance(clamp(8+(luck-17)*7+cg*.8,10,42)))out.avg=.012+R()*.020;
    else if(cold&&chance(38))out.avg=-(.016+R()*.026);
    out.label=labels.join('＋')||(Math.abs(out.avg)>=.012?(out.avg>0?'罕見打擊高潮':'罕見打擊低潮'):'');out.kind=hot&&out.label?'hot':cold&&out.label?'cold':'';
  }
  return out;
}
function simAmateurSeason(){
  const C=amateurSeasonConfig(),a=S.ab,par=C.par,scheduleF=(S.seasonContext&&S.seasonContext.scheduleF)||1,f=clamp(S.seasonFactor*scheduleF,0,1),swing=seasonSwing(),variance=currentSeasonVariance();
  const st={G:0,PA:0,AB:0,H:0,HR:0,RBI:0,SB:0,BB:0,W:0,L:0,SV:0,HLD:0,HP:0,IP:0,SO:0,ER:0,avg:0,era:0,WHIP:0,DEF:0,d:0,luck:swing.luck,swing:+swing.total.toFixed(1),variance:+variance.shared.toFixed(2),varianceLabel:variance.label,varianceKind:variance.kind,scheduled:C.games,availability:Math.round(f*100),usageRole:'未定'};
  if(f<=0)return st;
  const talent=ratingGap(ovr(),par);
  /* 高中團隊關係每級直接改變 2% 上場競爭；球季計畫可再調整角色，但大賽準備只留給盃賽公式。 */
  const roleShare=S.stage==='HS'?clamp(((S.hsUsageBonus||0)+(S.chemistry||0)*2)/100,-.22,.22):0;
  if(S.pos==='P'){
    const stuff=ratingGap(a.vel,par)*.52+ratingGap(a.brk,par)*.48,prevention=ratingGap(a.vel,par)*.30+ratingGap(a.brk,par)*.35+ratingGap(a.ctl,par)*.35,d=prevention+swing.total;st.d=d;
    st.avgVelo=pitcherAvgVelocityMph(swing.total);
    /* 業餘階段尊重玩家建立角色時選的定位；進入職業後再由教練團依體力與實績調整。 */
    const starter=S.role==='SP'||(!S.role&&(ratingGap(a.sta,par)>=-2||talent>=2));
    if(starter){const share=clamp(.70+talent*.025+swing.total*.015+roleShare+variance.workload*.065,.28,1);st.G=clamp(Math.round(C.maxStarts*f*share*(.90+R()*.20)),1,Math.round(C.maxStarts*f));const ipg=clamp(4.3+d*.06+ratingGap(a.sta,par)*.025+variance.workload*.16+N0(.22),3.0,6.9);st.IP=+(st.G*ipg).toFixed(1);st.usageRole=talent>=5?'校隊王牌':'主要先發';}
    else{const share=clamp(.62+talent*.03+swing.total*.015+roleShare+variance.workload*.105,.18,1);st.G=clamp(Math.round(C.reliefGames*f*share*(.84+R()*.32)),1,Math.round(C.reliefGames*f));st.IP=+(st.G*clamp(1.05+ratingGap(a.sta,par)*.012+variance.workload*.055,.65,1.9)).toFixed(1);st.usageRole=S.role==='CL'?(talent>=1?'校隊終結者':'後段牛棚'):talent>=1?'主力中繼':'牛棚輪替';}
    const reliefVol=starter?1:1.28;
    st.era=clamp(4.25-d*.18-variance.stuff*.58*reliefVol+N0(.48),.65,11.50);st.ER=Math.round(st.era*st.IP/9);
    const k9=clamp(6.4+ratingGap(a.vel,par)*.12+ratingGap(a.brk,par)*.09+variance.stuff*.72*reliefVol+N0(.56),2.6,16),bb9=clamp(4.8-ratingGap(a.ctl,par)*.15-variance.command*.42*reliefVol+N0(.42),.7,9.2),h9=clamp(9.1-stuff*.14-swing.total*.08-variance.stuff*.52*reliefVol+N0(.52),3.8,14.8);
    st.SO=Math.round(st.IP/9*k9);st.BB=Math.round(st.IP/9*bb9);st.H=Math.round(st.IP/9*h9);st.WHIP=st.IP?+((st.H+st.BB)/st.IP).toFixed(2):0;
    const dec=Math.max(1,Math.round(st.G*(starter ? .72 : .28))),wp=clamp(.5+d*.018+variance.support*.045+N0(.07),.15,.85);st.W=Math.round(dec*wp);st.L=Math.max(0,dec-st.W);if(!starter)st.SV=Math.round(clamp((d+4)*.7,0,12)*Math.min(1,st.G/15)*clamp(1+variance.leverage*.18,.50,1.55));
  }else{
    const offense=a.con*.58+a.eye*.22+a.spd*.20,d=ratingGap(offense,par)+swing.total;st.d=d;
    let share,paG;if(talent>=6){share=.96;paG=4.25;st.usageRole='中心打線主力';}else if(talent>=1){share=.84;paG=4.0;st.usageRole='固定先發';}else if(talent>=-4){share=.62;paG=3.35;st.usageRole='輪替先發';}else{share=.34;paG=1.9;st.usageRole='替補／代打';}
    const roleVol=talent>=6?.82:talent>=1?1:talent>=-4?1.18:1.38,usageVol=S.dpos==='C'?.78:1;
    share=clamp(share+swing.total*.014+roleShare+variance.workload*.072*roleVol*usageVol-ratingGap(r99(45),a.sta)*.006,.12,1);st.G=clamp(Math.round(C.games*f*share*(.91+R()*.18)),1,Math.round(C.games*f));st.PA=Math.round(st.G*paG*clamp(1+variance.workload*.025,.90,1.08));st.BB=Math.round(st.PA*clamp(.065+ratingGap(a.eye,par)*.0035+variance.discipline*.010*roleVol,.025,.21));st.AB=Math.max(1,st.PA-st.BB);
    st.avg=clamp(.258+d*.0062+ratingGap(a.spd,par)*.0006+variance.contact*.020*roleVol+N0(.019),.095,.445);st.H=Math.round(st.AB*st.avg);st.avg=st.H/st.AB;st.HR=Math.min(st.H,binomialCount(st.AB,clamp(.009+ratingGap(a.pow,par)*.0024,.001,.09)*clamp(1+variance.power*.20*roleVol,.40,1.80)));st.RBI=Math.round((st.HR*2.05+(st.H-st.HR)*.31)*clamp(1+variance.support*.12,.68,1.38));
    const timesOnBase=st.H+st.BB,speedGap=ratingGap(a.spd,par),attemptRate=clamp(.05+speedGap*.006,.012,.30),successRate=clamp(.68+speedGap*.007,.48,.93);
    st.SB=Math.min(Math.floor(timesOnBase*.42),Math.round(timesOnBase*attemptRate*successRate*(.78+R()*.44)*clamp(1+variance.running*.20,.42,1.72)));
    st._varianceDefense=variance.defense;applyDefenseStats(st,par);applyCatcherCalling(st,par);st.DEF=Math.round(defRunsAmateur(par,f)*Math.min(1,(st.defG||0)/Math.max(1,C.games*.9)))+(st.CALL_DEF||0)+Math.round(variance.defense*1.25*Math.sqrt((st.defG||0)/Math.max(1,C.games)));
  }
  if(S.pos==='P'){setPitchingOuts(st,pitchingOuts(st));st.era=st.IP?st.ER*9/st.IP:0;st.WHIP=st.IP?(st.H+st.BB)/st.IP:0;}
  else assignHitTypes(st,null);
  return st;
}
function defRunsAmateur(par,f){
  if(S.pos==='P'||S.dpos==='DH')return 0;const a=S.ab,skill=S.pos==='C'?(a.fld*.4+a.arm*.3+a.cat*.3):(a.rng*.45+a.fld*.4+a.arm*.15);return Math.round(ratingGap(skill,par)*.38*f);
}
function binomialCount(trials,p){
  let hits=0;trials=Math.max(0,Math.round(trials||0));p=clamp(Number(p)||0,0,1);
  for(let i=0;i<trials;i++)if(R()<p)hits++;
  return hits;
}
function assignHitTypes(st,lv){
  if(!st||S.pos==='P'||!(st.AB>0))return st;
  const par=(lv&&LV[lv]?LV[lv].par:amateurSeasonConfig().par),nonHR=Math.max(0,(st.H||0)-(st.HR||0));
  const powerGap=ratingGap(S.ab.pow||par,par),speedGap=ratingGap(S.ab.spd||par,par),variance=currentSeasonVariance();
  const tripleRate=clamp(.018+speedGap*.0010+(variance.running||0)*.003,.002,.075);
  const doubleRate=clamp(.205+powerGap*.0017+speedGap*.00025+(variance.power||0)*.006,.10,.37);
  const triples=binomialCount(nonHR,tripleRate),doubles=binomialCount(Math.max(0,nonHR-triples),doubleRate);
  st._3B=triples;st._2B=doubles;st._1B=Math.max(0,nonHR-doubles-triples);return st;
}
function catcherCallingGrade(score,par){
  const gap=ratingGap(score,par);
  return gap>=18?'S':gap>=10?'A':gap>=4?'B+':gap>=-3?'B':gap>=-9?'C+':gap>=-15?'C':'D';
}
function applyCatcherCalling(st,par){
  const dp=S.dpos||(S.pos==='C'?'C':'2B');
  if(S.pos==='P'||dp!=='C'||st._dh||!(st.defG>0))return st;
  const a=S.ab,chem=clamp(Number(S.chemistry)||0,-5,5),score=clamp(Math.round(a.cat*.78+a.fld*.16+a.arm*.06+chem*.55+N0(1.4)),1,99);
  const callGap=ratingGap(a.cat*.82+a.fld*.13+a.arm*.05,par),schedule=S.stage==='PRO'&&S.lv&&LV[S.lv]?LV[S.lv].g:Math.max(1,st.G),workload=clamp(st.defG/Math.max(1,schedule*.78),.18,1);
  /* 配球對投手群的影響是模擬值：能力決定長期方向，單季仍保留投手群執行與運氣波動。 */
  const prevention=clamp(callGap*.0085+chem*.007+(S.traits.defchief?.035:0)+N0(.018),-.24,.34);
  st.CALL_SCORE=score;st.CALL_GRADE=catcherCallingGrade(score,par);st.STAFF_ERA_ADJ=+(-prevention).toFixed(2);
  st.CALL_RUNS=Math.round(prevention*st.defG*.65*workload);st.CALL_DEF=Math.round(st.CALL_RUNS*.35);
  return st;
}
function applyDefenseStats(st,par){
  if(S.pos==='P'||st._dh||S.dpos==='DH'||!(st.G>0))return st;
  const dp=S.dpos||(S.pos==='C'?'C':'2B'),a=S.ab,defG=Math.max(0,Math.round(st.G*(dp==='C'?.88:.91))),chancePerGame={C:8.8,'1B':8.7,'2B':4.7,'3B':3.1,SS:4.8,LF:2.2,CF:2.6,RF:2.3}[dp]||3.5;
  st.defG=defG;
  const skill=dp==='C'?(a.fld*.42+a.arm*.28+a.cat*.30):(a.fld*.48+a.rng*.37+a.arm*.15),gap=ratingGap(skill,par),tc=Math.max(0,Math.round(defG*chancePerGame*(.94+R()*.12)));
  const errorSkill=dp==='C'?(a.fld*.65+a.cat*.25+a.arm*.10):skill,baseErr=dp==='C'?.0155:.022;
  const yearDefense=Number(st._varianceDefense)||0,errRate=clamp(baseErr-ratingGap(errorSkill,par)*.00045-yearDefense*(dp==='C'?.0018:.0028)+N0(dp==='C'?.0012:.0025),.002,.052),errors=Math.min(tc,binomialCount(tc,errRate));
  st.TC=tc;st.E=errors;st.EXPECTED_E=+(tc*errRate).toFixed(1);
  if(dp==='C'){
    st.PO=Math.max(0,Math.round(tc*.82));st.A=Math.max(0,tc-st.PO-errors);
    st.SBA=Math.max(0,Math.round(defG*clamp(.57-ratingGap(a.cat,par)*.006,.25,.90)));
    const csRate=clamp(.24+ratingGap(a.arm,par)*.008+ratingGap(a.cat,par)*.004+N0(.025),.10,.55);st.CS=Math.min(st.SBA,Math.round(st.SBA*csRate));
  }else if(['LF','CF','RF'].includes(dp)){
    st.PO=Math.max(0,tc-errors);st.A=Math.max(0,Math.round(defG*clamp(.045+ratingGap(a.arm,par)*.003,.01,.16)));st.OFA=st.A;
  }else{
    const poShare=dp==='1B'?.80:dp==='3B'?.30:.42;st.PO=Math.max(0,Math.round((tc-errors)*poShare));st.A=Math.max(0,tc-errors-st.PO);
    st.DP=Math.max(0,Math.round(defG*({SS:.46,'2B':.52,'3B':.17,'1B':.55}[dp]||.20)*clamp(1+gap*.018,.65,1.35)));
  }
  st.FPCT=tc?+(Math.max(0,tc-errors)/tc).toFixed(3):0;return st;
}
function simSeason(lv){
  if(S.pos==='P'&&!S.role)S.role=pitcherRole();
  const L=LV[lv], par=L.par,env=leagueRunEnv(lv), a=S.ab, scheduleF=(S.seasonContext&&S.seasonContext.scheduleF)||1,f=clamp(S.seasonFactor*scheduleF,0,1);
  const swing=seasonSwing(),tail=seasonOutlierProfile(lv),variance=currentSeasonVariance(),npbForeign=lv==='NPB1'&&npbRosterStatus().foreign,poach=activePoachEffect();
  const st={G:0,PA:0,AB:0,H:0,HR:0,RBI:0,SB:0,BB:0,W:0,L:0,SV:0,HLD:0,HP:0,IP:0,SO:0,ER:0,avg:0,era:0,d:0,luck:swing.luck,swing:+swing.total.toFixed(1),variance:+variance.shared.toFixed(2),varianceLabel:variance.label,varianceKind:variance.kind,scheduled:L.g,availability:Math.round(f*100),usageRole:'未定',role:S.pos==='P'?S.role:null,reliefStatus:S.pos==='P'&&S.role!=='SP'?reliefStatusKey():null};
  if(f<=0) return st;
  if(S.pos==='P'){
    /* 能力分工：球速／變化球主導揮空與被打品質，控球主導保送，體力主導角色與局數。 */
    const stuff=ratingGap(a.vel,par)*.52+ratingGap(a.brk,par)*.48;
    const prevention=ratingGap(a.vel,par)*.30+ratingGap(a.brk,par)*.35+ratingGap(a.ctl,par)*.35;
    const d=prevention+swing.total; st.d=d;
    st.avgVelo=pitcherAvgVelocityMph(swing.total);
    /* 出賽量按真實輪值／牛棚角色決定；能力與球季狀態影響名單地位，但健康本身不再把主力壓成半季球員。 */
    const starter=isSP(),roleVol=starter?.82:1.28,talent=ratingGap(ovr(),par),npcUsage=S.npcSeasonContext&&S.npcSeasonContext.year===S.year?(Number(S.npcSeasonContext.usageAdj)||0):0,formAdj=clamp(swing.total*.013+variance.workload*(starter?.055:.09)+(poach?poach.usageAdj/100:0)+npcUsage,-.24,.27);
    let perfF=1;
    if(starter){
      const maxStarts=lv==='MLB'?32:lv==='NPB1'?26:lv==='CPBL1'?25:Math.round(clamp(L.g/5.2,18,27));
      let roleShare;
      if(talent>=6){roleShare=.98;st.usageRole='王牌／前段輪值';}
      else if(talent>=-1){roleShare=.89;st.usageRole='固定先發輪值';}
      else if(talent>=-4){roleShare=.72;st.usageRole='後段輪值';}
      else{roleShare=.46;st.usageRole='臨時先發／長中繼';}
      const foreignPenalty=npbForeign?(talent>=6?.02:talent>=1?.07:.13):0;
      const workload=clamp(.93+ratingGap(a.sta,r99(52))*.009,.82,1.04),share=clamp(roleShare+formAdj-foreignPenalty,.28,1);
      perfF=share;const gs=Math.round(maxStarts*f*share*workload*(.93+R()*.14));
      st.G=clamp(gs,1,Math.round(maxStarts*f));
      /* IP/GS:聯盟平均~5.0、優質先發5.2-6.0、工作馬6.1-6.5;由 d 值(綜合實力)決定,控球差略減 */
      const ipg=clamp(5.0+d*0.05+ratingGap(a.sta,r99(50))*.012+ratingGap(a.ctl,par)*.006+variance.workload*.16+N0(0.18),4.45,6.65);
      st.IP=+(st.G*ipg).toFixed(1);
    }else{
      const fullLoad=lv==='MLB'?68:lv==='NPB1'?58:lv==='CPBL1'?55:Math.round(clamp(L.g*.46,38,60)),reliefKey=reliefStatusKey(st.reliefStatus,S.role)||'MIDDLE',statusShare={LONG:.62,MIDDLE:.80,SETUP:.94,CLOSER:.98}[reliefKey],talentAdj=talent>=5?.06:talent>=0?0:talent>=-4?-.10:-.22;
      let roleShare=clamp(statusShare+talentAdj,.32,1);st.usageRole=reliefStatusName(reliefKey,S.role);
      const foreignPenalty=npbForeign?(talent>=6?.02:talent>=1?.07:.13):0,share=clamp(roleShare+formAdj-foreignPenalty,.25,1);perfF=share;
      st.G=clamp(Math.round(fullLoad*f*share*(.89+R()*.22)),1,Math.round(fullLoad*f));
      const staGap=ratingGap(a.sta,r99(45)),ipg=S.role==='CL'?clamp(.94+staGap*.004,.88,1.08):reliefKey==='LONG'?clamp(1.42+staGap*.012,1.12,1.90):clamp(1.02+staGap*.008,.92,1.28);
      st.IP=+(st.G*clamp(ipg+variance.workload*.055,.82,1.38)).toFixed(1);
    }
    st.era=clamp(env.era-d*0.16-variance.stuff*.48*roleVol-variance.command*.14*roleVol+N0(0.38)+tail.era,tail.kind==='hot'?.70:.55,11.50);
    st.ER=Math.round(st.era*st.IP/9);
    const k9=clamp((env.k9+ratingGap(a.vel,par)*.105+ratingGap(a.brk,par)*.075+variance.stuff*.68*roleVol+N0(0.50))*tail.k,2.4,17.2);
    st.SO=Math.round(st.IP/9*k9);
    /* 保送由控球決定；被安打由球威、變化球與當季狀態決定；WHIP 再由 H+BB 計算。 */
    const bb9=clamp(env.bb9-ratingGap(a.ctl,par)*.14-variance.command*.39*roleVol+N0(0.38),.6,8.4);
    st.BB=Math.round(st.IP/9*bb9);
    const h9=clamp(env.h9-stuff*0.14-ratingGap(a.ctl,par)*.025-swing.total*.08-variance.stuff*.43*roleVol+N0(0.46),4.2,14.2);
    st.H=Math.round(st.IP/9*h9);
    st.WHIP=st.IP>0?+((st.H+st.BB)/st.IP).toFixed(2):0;
    if(isSP()){
      const dec=Math.round(st.G*0.72), wp=clamp(0.50+d*0.014+variance.support*.045+N0(0.06),0.12,0.88);
      st.W=Math.round(dec*wp); st.L=dec-st.W;
    }else if(S.role==='CL'){
      /* 勝敗隨出賽規模:滿季後援約 60-65 場,勝敗合計約 4-8 場,依 G 比例縮放 */
      const gFull=st.G/65, wl=Math.round(clamp(4+d*0.3,2,9)*gFull);
      st.W=Math.round(wl*clamp(0.45+d*0.02,0.3,0.7)); st.L=Math.max(0,wl-st.W);
      const leverageF=clamp(1+variance.leverage*.19,.48,1.58);
      st.SV=Math.round(clamp(17+d*2,2,48)*Math.min(1,st.G/55)*leverageF);
      st.HLD=Math.round(clamp(2+d*.28,0,9)*Math.min(1,st.G/55)*clamp(1+variance.leverage*.12,.62,1.42));
    }else{ /* 後援：地位決定勝利組機會；HLD 是唯一的中繼點欄位。 */
      const gFull=st.G/65, wl=Math.round(clamp(5+d*0.3,2,10)*gFull);
      st.W=Math.round(wl*clamp(0.5+d*0.015,0.35,0.7)); st.L=Math.max(0,wl-st.W);
      const reliefKey=reliefStatusKey(st.reliefStatus,S.role)||'MIDDLE',holdModel={LONG:{base:1,skill:.28,cap:10},MIDDLE:{base:6,skill:.65,cap:26},SETUP:{base:17,skill:1,cap:42}}[reliefKey]||{base:6,skill:.65,cap:26};
      st.HLD=Math.round(clamp(holdModel.base+d*holdModel.skill,0,holdModel.cap)*Math.min(1,st.G/55)*clamp(1+variance.leverage*.18,.48,1.55));
      st.SV=reliefKey==='SETUP'&&chance(24)?Math.round(ri(1,4)*Math.min(1,st.G/40)):chance(10)?1:0;
      st.HP=st.HLD;
    }
  }else{
    const q=a.con*0.6+a.eye*0.2+a.spd*0.2, d=ratingGap(q,par)+swing.total; st.d=d;
    /* 名單角色主導出賽：健康的核心／主力接近聯盟完整賽程，板凳球員則以代打、輪休與左右病出賽。 */
    const talent=ratingGap(ovr(),par),roleVol=talent>=8?.76:talent>=3?.90:talent>=0?1.04:talent>=-4?1.22:1.42,usageVol=S.dpos==='C'?.76:1,npcUsage=S.npcSeasonContext&&S.npcSeasonContext.year===S.year?(Number(S.npcSeasonContext.usageAdj)||0):0,formAdj=clamp(swing.total*.013+variance.workload*.075*roleVol*usageVol+(poach?poach.usageAdj/100:0)+npcUsage,-.24,.27);
    let roleShare,paPerGame;
    if(talent>=8){roleShare=.95;paPerGame=4.38;st.usageRole='核心先發';}
    else if(talent>=3){roleShare=.88;paPerGame=4.22;st.usageRole='主力先發';}
    else if(talent>=0){roleShare=.75;paPerGame=3.78;st.usageRole='輪替先發／左右輪換';}
    else if(talent>=-4){roleShare=.50;paPerGame=2.05;st.usageRole='板凳／工具人';}
    else{roleShare=.24;paPerGame=1.28;st.usageRole='邊緣名單';}
    let rest=clamp(-ratingGap(a.sta,r99(52))*.007,0,.14);if(S.dpos==='C')rest+=.055;else if(S.dpos==='DH')rest=Math.max(0,rest-.025);
    /* 明星級強打但體能不足時改站 DH，減少守備輪休而非憑空砍掉半季。 */
    let dhThisYear=false;
    if(d>=10&&rest>=.08&&S.dpos!=='DH'&&S.dpos!=='C'){
      rest=Math.max(.025,rest-.07);dhThisYear=true;paPerGame=4.3;st.usageRole='主力指定打擊';
    }
    const foreignPenalty=npbForeign?(talent>=7?.02:talent>=2?.08:.15):0,share=clamp(roleShare+formAdj-rest-foreignPenalty,.12,1);
    /* 捕手不是固定只能打 84% 賽程：體力與守備負荷共同決定合理上限，鐵人型捕手可接近全季。 */
    const catcherCeiling=clamp(.88+ratingGap(a.sta,r99(52))*.004,.80,.96),maxRoleGames=S.dpos==='C'?Math.round(L.g*f*catcherCeiling):Math.round(L.g*f);st.G=clamp(Math.round(L.g*f*share*(.94+R()*.12)),1,maxRoleGames);
    st.PA=Math.round(st.G*paPerGame*clamp(1+variance.workload*.025*roleVol,.88,1.10));
    st._dh=dhThisYear; /* 供 accStat 記 DH 年 */
    st.BB=Math.round(st.PA*clamp(env.bb+ratingGap(a.eye,par)*0.0034+variance.discipline*.0085*roleVol,0.025,0.22));
    st.AB=st.PA-st.BB;
    st.avg=clamp(env.avg+d*0.0058+ratingGap(a.sta,r99(50))*0.0003+ratingGap(a.spd,par)*0.0006+variance.contact*.0165*roleVol+N0(0.016)+tail.avg,0.085,0.430);
    st.H=Math.round(st.AB*st.avg); st.avg=st.AB?st.H/st.AB:0;
    const hrCap={MLB:75,NPB1:62,CPBL1:45,A3:48,A2:45,A1:42,R:25}[lv]||40,sbCap={MLB:95,NPB1:110,CPBL1:75,A3:80,A2:75,A1:70,R:45}[lv]||70;
    st.HR=clamp(binomialCount(st.AB,clamp(env.hr+ratingGap(a.pow,par)*0.0022,0.001,0.085)*clamp(1+variance.power*.17*roleVol,.42,1.72)*tail.power),0,Math.min(st.H,hrCap));
    const timesOnBase=st.H+st.BB,speedGap=ratingGap(a.spd,par),attemptRate=clamp(.055+speedGap*.0065,.012,.32),successRate=clamp(.69+speedGap*.0065,.48,.94);
    st.SB=Math.min(sbCap,Math.floor(timesOnBase*.45),Math.round(timesOnBase*attemptRate*successRate*(.78+R()*.44)*clamp(1+variance.running*.18*roleVol,.45,1.65)*tail.speed));
    st.RBI=Math.round((st.HR*2.1+(st.H-st.HR)*0.30)*clamp(1+variance.support*.11,.68,1.38));
  }
  /* 主場只占約半季：把公開球場指數折半套進整季，並直接改變 H／HR／ERA／WHIP。 */
  const park=S.seasonContext&&S.seasonContext.park;
  if(park&&f>0){
    if(S.pos==='P'){
      st.H=Math.max(0,Math.round(st.H*park.hitF));
      st.era=clamp(st.era*park.runF,.45,9.90);st.ER=Math.round(st.era*st.IP/9);
      st.WHIP=st.IP>0?+((st.H+st.BB)/st.IP).toFixed(2):0;
    }else{
      const oldH=st.H,oldHR=st.HR;
      st.H=clamp(Math.round(st.H*park.hitF),0,st.AB);st.HR=clamp(Math.round(st.HR*park.hrF),0,st.H);
      st.RBI=Math.max(0,Math.round(st.RBI+(st.HR-oldHR)*2.1+(st.H-oldH-(st.HR-oldHR))*.30));
      st.avg=st.AB?st.H/st.AB:0;
    }
  }
  /* 已形成的動態特性會反過來影響下一季數據，但幅度保持在可被運氣翻轉的範圍。 */
  st.traitImpact=[];const noteTrait=(name,text)=>st.traitImpact.push({name,text});
  if(S.pos==='P'&&S.traits.ace){const era0=st.era,so0=st.SO;st.era=clamp(st.era-.08,.45,9.90);st.SO=Math.round(st.SO*1.02);st.ER=Math.round(st.era*st.IP/9);noteTrait('王牌氣場',`ERA ${(st.era-era0).toFixed(2)}｜三振 +${st.SO-so0}`);}
  if(S.pos==='P'&&S.traits.fireball){const so0=st.SO;st.SO=Math.round(st.SO*1.02);noteTrait('火球製造機',`AVG FB +0.3 mph｜三振 +${st.SO-so0}`);}
  if(S.pos==='P'&&S.traits.command){const bb0=st.BB;st.BB=Math.max(0,Math.round(st.BB*.96));st.WHIP=st.IP>0?+((st.H+st.BB)/st.IP).toFixed(2):0;noteTrait('控球藝術家',`保送 ${st.BB-bb0}`);}
  if(S.pos==='P'&&S.traits.stopper&&!isSP()){const era0=st.era,count0=S.role==='CL'?st.SV:st.HLD;st.era=clamp(st.era-.08,.45,9.90);st.ER=Math.round(st.era*st.IP/9);if(S.role==='CL')st.SV=Math.round(st.SV*1.02);else{st.HLD=Math.round(st.HLD*1.02);st.HP=st.HLD;}noteTrait('牛棚拆彈手',`ERA ${(st.era-era0).toFixed(2)}｜${S.role==='CL'?'救援':'中繼'} +${(S.role==='CL'?st.SV:st.HLD)-count0}`);}
  if(S.pos!=='P'){
    if(S.traits.slugger){const hr0=st.HR,rbi0=st.RBI;if(st.HR>0)st.HR=Math.min(st.H,Math.max(st.HR+1,Math.round(st.HR*1.05)));if(st.RBI>0)st.RBI=Math.max(st.RBI+1,Math.round(st.RBI*1.03));noteTrait('重砲核心',`全壘打 +${st.HR-hr0}｜打點 +${st.RBI-rbi0}`);}
    if(S.traits.sparkplug){const bb0=st.BB,sb0=st.SB,extraBB=Math.max(1,Math.round(st.BB*.03));st.BB+=extraBB;st.PA+=extraBB;st.SB=Math.round(st.SB*1.05);noteTrait('上壘發動機',`保送 +${st.BB-bb0}｜盜壘 +${st.SB-sb0}`);}
    if(S.traits.patient){const bb0=st.BB,extraBB=Math.max(1,Math.round(st.BB*.04));st.BB+=extraBB;st.PA+=extraBB;noteTrait('好球帶獵人',`保送 +${st.BB-bb0}`);}
    if(S.traits.basethief){const sb0=st.SB;st.SB=Math.round(st.SB*1.06);noteTrait('盜壘威脅',`盜壘 +${st.SB-sb0}`);}
    const finalHrCap={MLB:78,NPB1:63,CPBL1:46,A3:50,A2:47,A1:44,R:27}[lv]||42,finalSbCap={MLB:100,NPB1:112,CPBL1:78,A3:84,A2:80,A1:75,R:48}[lv]||74;
    if(st.HR>finalHrCap){const cut=st.HR-finalHrCap;st.HR=finalHrCap;st.RBI=Math.max(st.HR,st.RBI-cut*2);}
    st.SB=Math.min(st.SB,finalSbCap);
  }
  if(S.pos!=='P'){assignHitTypes(st,lv);st._varianceDefense=variance.defense;applyDefenseStats(st,par);applyCatcherCalling(st,par);st.DEF=defRuns(lv,st)+(st.CALL_DEF||0)+Math.round(variance.defense*(S.dpos==='C'?1.35:1.8)*Math.sqrt((st.defG||0)/Math.max(1,L.g)));if(S.traits.defchief&&st.TC>0){const add=Math.max(1,Math.round((st.defG||0)/Math.max(1,L.g)*1.2));st.DEF+=add;noteTrait('守備指揮官',`守備貢獻 +${add}${st.STAFF_ERA_ADJ?`｜投手群 ERA ${st.STAFF_ERA_ADJ.toFixed(2)}`:''}`);}}
  else normalizeReliefLine(st);
  enforceSeasonInvariants(st,lv);
  st.rawD=st.d;st.d=seasonCorePerformance(st,lv,st.rawD);
  if(poach){st.poachRole=poach.rolePromise;st.poachUsage=poach.usageAdj;st.poachType=poach.label;}
  st.effectBreakdown={luck:+swing.luckAdj.toFixed(1),momentum:+swing.momentum.toFixed(1),choice:+swing.pending.toFixed(1),environment:+swing.contextAdj.toFixed(1),chemistry:+swing.chemistry.toFixed(1),traits:+swing.traits.toFixed(1),teammates:+swing.npc.toFixed(1),finance:+swing.finance.toFixed(1),transfer:+swing.poach.toFixed(1),total:+swing.total.toFixed(1)};
  st.outlierLabel=tail.label;st.outlierKind=tail.kind;
  return st;
}
/* 守備分(近似 defensive runs):守位難度權重 × 守備工具相對聯盟基準的幅度 × 出賽比重 */
function defRuns(lv,st){
  if(S.pos==='P'||!st||st._dh)return 0;
  const a=S.ab, par=LV[lv].par;
  const dp=S.dpos||(S.pos==='C'?'C':'2B');
  if(dp==='DH')return 0; /* DH 不產生守備分 */
  const posW={SS:1.25,CF:1.20,C:1.15,'2B':1.05,'3B':1.00,RF:0.95,'1B':0.75,LF:0.80}[dp]||1;
  const skill=dp==='C'?(a.fld*0.55+a.arm*0.30+a.cat*0.15)
    :(a.rng*0.45+a.fld*0.40+a.arm*0.15);
  const fullDefGames=Math.max(1,LV[lv].g*(dp==='C'?.82:.90)),gw=clamp((st.defG||0)/fullDefGames,0,1);
  return Math.round(ratingGap(skill,par)*posW*0.55*gw);
}
function normalizeReliefLine(st){
  if(S.pos!=='P'||!st)return st;
  const role=st.role||S.role;st.role=role;
  if(role==='SP')return st;
  let left=Math.max(0,st.G||0);
  const take=k=>{st[k]=clamp(Math.round(st[k]||0),0,left);left-=st[k];};
  if(role==='CL'){take('SV');take('HLD');take('W');take('L');}
  else{take('HLD');take('SV');take('W');take('L');}
  st.HP=role==='MR'?(st.HLD||0):0;return st;
}
function enforceSeasonInvariants(st,lv){
  if(!st)return st;const maxG=(LV[lv]&&LV[lv].g)||st.scheduled||200;
  st.G=clamp(Math.round(st.G||0),0,maxG);
  if(S.pos==='P'){setPitchingOuts(st,pitchingOuts(st));['W','L','SV','HLD','HP','SO','BB','H','ER'].forEach(k=>st[k]=Math.max(0,Math.round(st[k]||0)));normalizeReliefLine(st);st.era=st.IP?st.ER*9/st.IP:0;st.WHIP=st.IP?(st.H+st.BB)/st.IP:0;}
  else{
    st.PA=Math.max(0,Math.round(st.PA||0));st.BB=clamp(Math.round(st.BB||0),0,st.PA);st.AB=clamp(Math.round(st.AB||0),0,st.PA);st.H=clamp(Math.round(st.H||0),0,st.AB);st.HR=clamp(Math.round(st.HR||0),0,st.H);st.SB=clamp(Math.round(st.SB||0),0,Math.floor((st.H+st.BB)*.48));st.RBI=Math.max(0,Math.round(st.RBI||0));st.avg=st.AB?st.H/st.AB:0;
    if(st._dh||S.dpos==='DH'){st.defG=0;st.DEF=0;['TC','E','PO','A','DP','OFA','CS','SBA','CALL_RUNS','CALL_DEF'].forEach(k=>st[k]=0);st.CALL_SCORE=0;st.CALL_GRADE='—';st.STAFF_ERA_ADJ=0;}
    else{st.defG=clamp(Math.round(st.defG||0),0,st.G);st.TC=Math.max(0,Math.round(st.TC||0));st.E=clamp(Math.round(st.E||0),0,st.TC);st.FPCT=st.TC?+(Math.max(0,st.TC-st.E)/st.TC).toFixed(3):0;}
  }
  return st;
}
function seasonCorePerformance(st,lv,prior){
  if(!st||!st.G)return -8;
  const L=LV[lv]||{g:120},sampleTarget=S.pos==='P'?(isSP()?L.g*1.02:L.g*.38):L.g*3.25;
  const sample=S.pos==='P'?st.IP:st.PA,weight=clamp(sample/Math.max(1,sampleTarget),.12,1);
  let actual;
  if(S.pos==='P'){
    const era=st.IP?st.ER*9/st.IP:9.9,whip=st.IP?(st.H+st.BB)/st.IP:2,k9=st.IP?st.SO*9/st.IP:0;
    const baseEra=leagueRunEnv(lv).era;
    actual=(baseEra-era)*2.25+(1.36-whip)*4.2+(k9-7.2)*.24;
  }else{
    const obp=st.PA?(st.H+st.BB)/st.PA:0,ops=obp+slgOf(st),baseOps={MLB:.710,NPB1:.700,CPBL1:.720,A3:.735,A2:.720,A1:.710,R:.700,NPB2:.690,CPBL2:.700}[lv]||.710;
    actual=(ops-baseOps)*36;
  }
  return +clamp(actual*weight+(Number(prior)||0)*(1-weight)*.28,-14,22).toFixed(1);
}
function accStat(bucket,st,lvOverride,countRole){
  const statLv=lvOverride||S.lv;
  if(countRole==null)countRole=true;
  if(!S.stats[bucket]) S.stats[bucket]=blankStat();
  const t=S.stats[bucket]; t.yr++;
  if(LV[statLv]&&LV[statLv].top){
    let qualified=false,elite=false;
    if(S.pos==='P'){
      const era=st.IP?st.ER*9/st.IP:99,whip=st.IP?(st.H+st.BB)/st.IP:99,volume=isSP()?st.IP>=LV[statLv].g*.70:st.G>=38&&st.IP>=26;
      qualified=volume&&era<=4.60&&whip<=1.55;elite=volume&&era<=3.25&&whip<=1.30;
    }else{
      const obp=st.PA?(st.H+st.BB)/st.PA:0,ops=obp+slgOf(st),volume=st.PA>=LV[statLv].g*2.75;
      qualified=volume&&ops>=.680;elite=volume&&ops>=.840;
    }
    if(qualified)t.qualYrs=(t.qualYrs||0)+1;if(elite)t.eliteYrs=(t.eliteYrs||0)+1;
  }
  if(bucket!=='MINOR'&&S.orgTeam){ const tb=S.teamTally[bucket]||(S.teamTally[bucket]={});
    tb[S.orgTeam]=(tb[S.orgTeam]||0)+1; }
  if(countRole&&S.pos!=='P'){ const dp=(st&&st._dh)?'DH':(S.dpos||'—'); S.dposYears[dp]=(S.dposYears[dp]||0)+1; }
  else if(countRole&&S.role){S.roleYears[S.role]=(S.roleYears[S.role]||0)+1;if(S.role!=='SP'){const rs=reliefStatusKey(st&&st.reliefStatus,S.role)||'MIDDLE';S.reliefStatusYears=S.reliefStatusYears||{};S.reliefStatusYears[rs]=(S.reliefStatusYears[rs]||0)+1;}}
  ['G','PA','AB','H','_1B','_2B','_3B','HR','RBI','SB','BB','W','L','SV','HLD','HP','SO','ER','TC','E','PO','A','DP','OFA','CS','SBA'].forEach(k=>t[k]+=(st[k]||0));
  t.DEF+=(st.DEF||0);
  t.CALL_RUNS+=(st.CALL_RUNS||0);t.CALL_DEF+=(st.CALL_DEF||0);t.CALL_SCORE_G+=(st.CALL_SCORE||0)*(st.defG||0);t.CALL_G+=(st.defG||0);t.CALL_SCORE=t.CALL_G?+(t.CALL_SCORE_G/t.CALL_G).toFixed(1):0;
  t.FPCT=t.TC?+((t.TC-t.E)/t.TC).toFixed(3):0;
  t.VeloIP=(t.VeloIP||0)+(st.avgVelo||0)*(st.IP||0);
  setPitchingOuts(t,pitchingOuts(t)+pitchingOuts(st));
  t.avgVelo=t.IP>0?+(t.VeloIP/t.IP).toFixed(1):0;
}
function accSeasonSegments(segments){
  const grouped=[];for(const part of segments){const bucket=bucketOf(part.lv),row=grouped.find(x=>x.bucket===bucket);if(row)row.parts.push(part);else grouped.push({bucket,parts:[part]});}
  grouped.forEach((g,i)=>{const merged=mergeSeasonSegments(g.parts),last=g.parts[g.parts.length-1];accStat(g.bucket,merged,last.lv,i===grouped.length-1);});
}
function fieldingPct(st){return st.TC?Math.max(0,(st.TC-(st.E||0))/st.TC):0;}
function defenseExtra(st,short){
  if(S.pos==='P'||st._dh||S.dpos==='DH'||!(st.TC>0))return '';
  const dp=S.dpos||(S.pos==='C'?'C':'2B'),pct=fieldingPct(st).toFixed(3).replace(/^0/,''),drs=`${st.DEF>0?'+':''}${st.DEF||0}`;
  if(dp==='C'){
    const rate=st.SBA?Math.round((st.CS||0)/st.SBA*100):0,era=Number(st.STAFF_ERA_ADJ)||0,eraText=`${era>0?'+':''}${era.toFixed(2)}`,grade=st.CALL_GRADE||'—',expected=Number.isFinite(st.EXPECTED_E)?st.EXPECTED_E.toFixed(1):'—';
    return short?`FPCT ${pct}｜${st.E||0} E（預估 ${expected}）｜CS% ${rate}%｜配球 ${S.ab.cat}/99・${grade}｜投手群 ERA ${eraText}｜配球防失分 ${(st.CALL_RUNS||0)>0?'+':''}${st.CALL_RUNS||0}｜DEF ${drs}`:`守備率 ${pct}｜失誤 ${st.E||0}（能力預估 ${expected}）｜阻殺 ${st.CS||0}/${st.SBA||0}（${rate}%）｜配球 ${grade}（能力 ${S.ab.cat}/99）｜投手群 ERA 影響 ${eraText}｜配球防失分 ${(st.CALL_RUNS||0)>0?'+':''}${st.CALL_RUNS||0}｜守備貢獻 ${drs}`;
  }
  if(['LF','CF','RF'].includes(dp))return short?`FPCT ${pct}｜${st.E||0} E｜${st.OFA||0} OFA｜DEF ${drs}`:`守備率 ${pct}｜失誤 ${st.E||0}｜外野助殺 ${st.OFA||0}｜守備貢獻 ${drs}`;
  return short?`FPCT ${pct}｜${st.E||0} E｜${st.DP||0} DP｜DEF ${drs}`:`守備率 ${pct}｜失誤 ${st.E||0}｜參與雙殺 ${st.DP||0}｜守備貢獻 ${drs}`;
}
function statLine(st){
  if(S.pos==='P'){const r=st.role||S.role,relief=r==='CL'?`｜${st.SV||0}救援成功${st.HLD?`｜${st.HLD}中繼點`:''}`:r==='MR'?`｜${st.HLD||0}中繼點${st.SV?`｜${st.SV}救援成功`:''}`:'';return `出賽 ${st.G}｜局數 ${fmtIP(st.IP)}｜${st.W}勝${st.L}敗${relief}｜三振 ${st.SO}｜保送 ${st.BB||0}｜ERA ${st.era.toFixed(2)}｜WHIP ${(st.WHIP||0).toFixed(2)}｜平均球速 ${veloText(st)}`; }
  const obpN=st.PA>0?(st.H+st.BB)/st.PA:0;
  const slgN=slgOf(st);
  const obp=st.PA>0?obpN.toFixed(3).replace(/^0/,''):'-';
  const slg=st.AB>0?slgN.toFixed(3).replace(/^0/,''):'-';
  const ops=st.AB>0?(obpN+slgN).toFixed(3).replace(/^0/,''):'-';
  return `出賽 ${st.G}｜打席 ${st.PA}｜打擊率 ${st.avg.toFixed(3).replace(/^0/,'')}｜上壘率 ${obp}｜長打率 ${slg}｜OPS ${ops}｜安打 ${st.H}｜全壘打 ${st.HR}｜打點 ${st.RBI}｜保送 ${st.BB}｜盜壘 ${st.SB}${defenseExtra(st)?`｜${defenseExtra(st)}`:''}`;
}
function seasonTeamInfo(){
  const minor=['R','A1','A2','A3'].includes(S.lv);
  const status=S.org==='NPB'?`・${npbStatusText(S.lv)}`:'';
  const second=S.lv==='NPB2'||S.lv==='CPBL2',name=minor?`${S.orgTeam}體系`:second?`${S.orgTeam}二軍`:S.teamName();
  return {name,level:(LV[S.lv]?LV[S.lv].n:stageLabel())+status,minor,second};
}
function statDashboard(st){
  const box=(label,value,key)=>`<div class="stat-box${key?' key':''}"><span>${label}</span><b>${value}</b></div>`;
  if(S.pos==='P'){
    const r=st.role||S.role,roleLabel=r==='CL'?'救援成功':r==='MR'?'中繼點 HLD':'平均局數',roleValue=r==='CL'?(st.SV||0):r==='MR'?(st.HLD||0):(st.G?(st.IP/st.G).toFixed(1):'0.0'),k9=st.IP?((st.SO||0)/st.IP*9).toFixed(1):'0.0',bb9=st.IP?((st.BB||0)/st.IP*9).toFixed(1):'0.0';
    return box('出賽',st.G)+box('局數',fmtIP(st.IP))+box('勝敗',`${st.W}-${st.L}`)+box('球隊定位',roleN(r,st.reliefStatus),r!=='SP')+box(roleLabel,roleValue,r!=='SP')+box('平均球速',veloText(st),true)+box('三振',st.SO||0)+box('保送',st.BB||0)+box('K/9',k9)+box('BB/9',bb9)+box('ERA',(st.era||0).toFixed(2),true)+box('WHIP',(st.WHIP||0).toFixed(2),true);
  }
  const obp=st.PA?(st.H+st.BB)/st.PA:0,slg=slgOf(st),ops=obp+slg,pct=v=>v?v.toFixed(3).replace(/^0/,''):'—';
  let defense='';if(st.TC>0){const dp=S.dpos||(S.pos==='C'?'C':'2B'),special=dp==='C'?box('阻殺率',st.SBA?Math.round((st.CS||0)/st.SBA*100)+'%':'—'):['LF','CF','RF'].includes(dp)?box('外野助殺',st.OFA||0):box('參與雙殺',st.DP||0),expected=Number.isFinite(st.EXPECTED_E)?st.EXPECTED_E.toFixed(1):'—';defense=box('守備率',fieldingPct(st).toFixed(3).replace(/^0/,'')||'—',true)+box('失誤／能力預估',`${st.E||0}／${expected}`)+special+box('守備貢獻',`${st.DEF>0?'+':''}${st.DEF||0}`,true);if(dp==='C'){const era=Number(st.STAFF_ERA_ADJ)||0;defense+=box('配球能力',`${S.ab.cat}/99`,true)+box('配球評級',st.CALL_GRADE||'—')+box('投手群 ERA 影響',`${era>0?'+':''}${era.toFixed(2)}`,true)+box('配球防失分',`${(st.CALL_RUNS||0)>0?'+':''}${st.CALL_RUNS||0}`);}}
  return box('出賽',st.G)+box('打席',st.PA)+box('打擊率',pct(st.avg),true)+box('OPS',pct(ops),true)+box('安打',st.H)+box('全壘打',st.HR,true)+box('打點',st.RBI)+box('盜壘',st.SB)+defense;
}
function seasonVerdict(st){
  const injury=(S.injuryHistory||[]).slice().reverse().find(x=>x.year===S.year);
  const rehab=S._rehabReason&&S._rehabReason.year===S.year?S._rehabReason:null;
  const injuryNote=injury&&injury.loss?`傷病永久退化 ${injury.loss} 點（${(injury.changes||[]).join('、')}），並會提高未來受傷與老化風險。`:'';
  if(rehab)return {title:'復健年・全年報銷',text:`${rehab.originYear} 年的${rehab.site}${rehab.title}仍在復健，本季沒有進入比賽名單。`};
  if(injury&&/球季報銷|生涯威脅/.test(injury.title))return {title:`${injury.title}・球季提前結束`,text:`本季只留下 ${st.G||0} 場出賽；傷勢發生後已停止累積數據，後續月份全部列為傷病名單與復健。${injuryNote||'舊傷已寫入生涯紀錄，會影響未來受傷率與老化幅度。'}`};
  if(!st.G)return {title:'傷缺球季',text:'本季沒有留下正式出賽紀錄，重點轉向恢復與下一年的準備。'};
  if(S.pos==='P'){
    const r=st.role||S.role,era=st.era||9.99,role=r==='SP'?(st.IP>=150?'輪值支柱':'先發輪值'):roleN(r,st.reliefStatus);
    const grade=era<=2.50?'壓制級球季':era<=3.50?'優質球季':era<=4.40?'穩定球季':'艱難球季';
    return {title:`${role}・${grade}`,text:`出賽 ${st.G} 場、${fmtIP(st.IP)} 局，留下 ${st.W} 勝 ${st.L} 敗${r==='MR'?`、${st.HLD||0} 個中繼點${st.SV?`、${st.SV} 次救援成功`:''}`:r==='CL'?`、${st.SV||0} 次救援成功${st.HLD?`、${st.HLD} 個中繼點`:''}`:''}。平均球速 ${veloText(st)}、三振 ${st.SO||0}、ERA ${era.toFixed(2)}、WHIP ${(st.WHIP||0).toFixed(2)}。${injuryNote}`};
  }
  const obp=st.PA?(st.H+st.BB)/st.PA:0,ops=obp+slgOf(st),grade=ops>=.900?'明星級球季':ops>=.800?'主力級球季':ops>=.700?'穩定球季':ops>=.600?'低潮球季':ops>=.400?'崩盤球季':'災難級球季',def=defenseExtra(st);
  const warning=ops<.400&&st.PA>=50?'這種表現會直接觸發球團的降級或釋出審查。':ops<.600&&st.PA>=100?'名單位置與下一份合約都已受到明顯影響。':'';
  return {title:grade,text:`出賽 ${st.G} 場、${st.PA} 打席，打擊率 ${st.avg.toFixed(3).replace(/^0/,'')}、OPS ${ops.toFixed(3).replace(/^0/,'')}，另有 ${st.HR} 支全壘打、${st.RBI} 分打點與 ${st.SB||0} 次盜壘。${def?`守備端：${def}。`:''}${injuryNote}${warning}`};
}
function standingsGroupsFor(lv){
  if(lv==='MLB')return Object.entries(MLB_DIVISIONS).map(([name,teams])=>({name,teams:teams.slice()}));
  if(lv==='NPB1')return [{name:'中央聯盟',teams:NPB_TEAMS.slice(0,6)},{name:'太平洋聯盟',teams:NPB_TEAMS.slice(6)}];
  if(lv==='CPBL1')return [{name:'中華職棒',teams:CPBL_TEAMS.slice()}];
  if(lv==='NPB2')return [{name:'東部聯盟二軍',teams:NPB_TEAMS.slice(0,6)},{name:'西部聯盟二軍',teams:NPB_TEAMS.slice(6)}];
  if(lv==='CPBL2')return [{name:'中職二軍',teams:CPBL_TEAMS.slice()}];
  /* 小聯盟沒有硬塞不存在的三十隊戰績；以同層級十支體系球隊呈現。 */
  const pool=MLB_TEAMS.filter(t=>t!==S.orgTeam),teams=[S.orgTeam];
  while(teams.length<10&&pool.length)teams.push(pool.splice(Math.floor(R()*pool.length),1)[0]);
  return [{name:`${LV[lv]?LV[lv].n:'小聯盟'}同層級`,teams:teams.filter(Boolean)}];
}
function weightedTeamPick(rows){
  const weights=rows.map(r=>Math.max(1,(r.pct-.38)*120+(r.team===S.orgTeam?Math.max(-4,(S.lastD||0)*.7)+(S.traits.clutch?4:0):0))),sum=weights.reduce((a,b)=>a+b,0);
  let roll=R()*sum;for(let i=0;i<rows.length;i++){roll-=weights[i];if(roll<=0)return rows[i];}return rows[rows.length-1];
}
function balanceStandingsRows(rows,games){
  const target=Math.round(rows.length*games/2);let diff=target-rows.reduce((n,r)=>n+r.W,0),guard=0;
  while(diff!==0&&guard++<games*rows.length*2){
    const candidates=rows.filter(r=>!r.fixed&&(diff>0?r.W<games:r.W>0)).sort((a,b)=>diff>0?(b.rawPct-a.rawPct):(a.rawPct-b.rawPct));
    if(!candidates.length)break;const r=pick(candidates.slice(0,Math.min(4,candidates.length)));r.W+=diff>0?1:-1;r.L=games-r.W;diff+=diff>0?-1:1;
  }
  rows.forEach(r=>{r.pct=r.W/games;delete r.rawPct;});return rows;
}
function simulateSeries(label,a,b,bestOf,st,startA,startB){
  const target=Math.floor(bestOf/2)+1;let aw=startA||0,bw=startB||0,games=0;
  const market=seasonMarketEvaluation(st).total,share=playingTimeShare(st),disruption=S.tradeRefuse>0?.008*Math.min(3,S.tradeRefuse):0;
  const playerEdge=team=>team===S.orgTeam?clamp(market*.006*share,-.07,.09)+(S.traits.clutch&&share>=.45?.018:0)-disruption:0;
  const pA=clamp(.5+(a.pct-b.pct)*1.15+playerEdge(a.team)-playerEdge(b.team),.28,.72);
  while(aw<target&&bw<target&&games<bestOf){if(R()<pA)aw++;else bw++;games++;}
  const winner=aw>bw?a:b,loser=winner===a?b:a;
  return {label,a:a.team,b:b.team,aWins:aw,bWins:bw,winner:winner.team,loser:loser.team,games,advantage:(startA||startB)?`${startA||0}–${startB||0} 起始優勢`:''};
}
function postseasonPlayerLine(st,games){
  if(!games||!st||!st.G)return null;
  const ratio=games/Math.max(1,st.scheduled||LV[S.lv].g),p=portionOf(st,ratio);
  if(S.pos==='P'){
    if(isSP()&&p.G<1)p.G=1;else if(!isSP())p.G=Math.max(1,Math.round(games*Math.min(.72,st.G/Math.max(1,st.scheduled))));
    setPitchingOuts(p,outsFromIP(Math.max(isSP()?4.2:.2,st.IP*Math.max(ratio,p.G/Math.max(1,st.G)))*(0.90+R()*.20)));
    p.SO=Math.round(st.IP?p.IP*st.SO/st.IP*(.88+R()*.24):0);p.BB=Math.round(st.IP?p.IP*st.BB/st.IP*(.85+R()*.3):0);p.H=Math.round(st.IP?p.IP*st.H/st.IP*(.86+R()*.28):0);
    p.ER=Math.round(st.IP?p.IP*st.ER/st.IP*(.72+R()*.56):0);p.era=p.IP?p.ER*9/p.IP:0;p.WHIP=p.IP?(p.H+p.BB)/p.IP:0;
  }else{
    p.G=Math.max(1,Math.round(st.G/(st.scheduled||1)*games));p.PA=Math.max(p.G,Math.round(st.PA/(st.scheduled||1)*games));p.BB=Math.round(p.PA*(st.PA?st.BB/st.PA:0)*(.8+R()*.4));p.AB=Math.max(1,p.PA-p.BB);
    p.H=clamp(Math.round(p.AB*(st.avg||0)*(.78+R()*.44)),0,p.AB);p.HR=clamp(Math.round(st.PA?st.HR/st.PA*p.PA*(.65+R()*.7):0),0,p.H);p.RBI=Math.max(0,Math.round(st.PA?st.RBI/st.PA*p.PA*(.7+R()*.6):0));p.SB=Math.max(0,Math.round(st.PA?st.SB/st.PA*p.PA*(.7+R()*.6):0));p.avg=p.H/p.AB;
  }
  if(S.traits.october){
    if(S.pos==='P'){p.SO=p.IP?Math.max(p.SO+1,Math.round(p.SO*1.04)):p.SO;p.H=p.H>0?Math.max(0,Math.floor(p.H*.96)):0;p.ER=p.ER>0?Math.max(0,Math.floor(p.ER*.96)):0;p.era=p.IP?p.ER*9/p.IP:0;p.WHIP=p.IP?(p.H+p.BB)/p.IP:0;}
    else{p.H=clamp(Math.max(p.H+(p.AB>p.H?1:0),Math.round(p.H*1.04)),0,p.AB);if(p.RBI>0)p.RBI=Math.max(p.RBI+1,Math.round(p.RBI*1.04));p.avg=p.AB?p.H/p.AB:0;}
  }
  return p;
}
function simulateLeagueStandings(st){
  const groups=standingsGroupsFor(S.lv),games=LV[S.lv]?LV[S.lv].g:120;
  S.teamStrengths=S.teamStrengths||{};const activeRecruit=activePoachEffect();
  const reportGroups=groups.map(group=>{
    let rows=group.teams.map(team=>{
      const key=`${S.org}|${team}`,old=Number.isFinite(S.teamStrengths[key])?S.teamStrengths[key]:42+R()*16;
      /* 球隊強弱有延續性但會向平均回歸；休賽季補強與傷病每年再帶來變動。 */
      const budget=S.org==='MiLB'&&MLB_TEAM_META[team]?MLB_TEAM_META[team][1]:.88+(stableIndex(team,30)/100);
      const rosterAvg=S.stage==='PRO'?npcRosterStrength(S.org,team,S.lv):LV[S.lv].par,rosterTalent=50+ratingGap(rosterAvg,LV[S.lv].par)*.70;
      const talent=clamp(50+(old-50)*.48+(rosterTalent-50)*.42+(budget-1)*12+N0(3.8),34,68);S.teamStrengths[key]=talent;
      const share=playingTimeShare(st),market=seasonMarketEvaluation(st).total,refusalCost=S.tradeRefuse>0?Math.min(2.1,S.tradeRefuse*.7):0;
      const callingWins=team===S.orgTeam?clamp((st.CALL_RUNS||0)/10,-1.5,2.0):0;
      const recruitingFit=team===S.orgTeam&&activeRecruit?(Number(activeRecruit.teamWins)||0):0;
      const playerWins=team===S.orgTeam?clamp(market*.62*share+callingWins+recruitingFit-refusalCost,-5,9):0;
      const teamForm=team===S.orgTeam?(Number(S.teamSeasonMomentum)||0)*.006:0,winPct=clamp(.5+(talent-50)*.006+N0(.034)+playerWins/games+teamForm,.285,.715),locked=S._seasonTeamRecord&&S._seasonTeamRecord.year===S.year&&S._seasonTeamRecord.org===S.org&&S._seasonTeamRecord.team===team&&S._seasonTeamRecord.games===games;
      const W=locked?S._seasonTeamRecord.W:clamp(Math.round(games*winPct),0,games),L=games-W;
      return {team,W,L,pct:W/games,rawPct:locked?W/games:winPct,playerWins:+playerWins.toFixed(1),playoff:false,champion:false,fixed:!!locked};
    });
    rows=balanceStandingsRows(rows,games).sort((a,b)=>b.W-a.W||a.L-b.L);
    const leader=rows[0];rows.forEach((r,i)=>{r.rank=i+1;r.GB=i===0?0:+(((leader.W-r.W)+(r.L-leader.L))/2).toFixed(1);});
    return {name:group.name,rows};
  });
  let playoff=[],series=[],format='';const all=reportGroups.flatMap(g=>g.rows),byTeam=t=>all.find(r=>r.team===t);
  if(S.lv==='MLB'){
    format='12 隊制｜外卡系列賽 3 戰 2 勝、分區系列賽 5 戰 3 勝、聯盟冠軍賽與世界大賽 7 戰 4 勝';
    const leagueWinners=[];
    for(const league of ['美聯','國聯']){
      const gs=reportGroups.filter(g=>g.name.startsWith(league)),div=gs.map(g=>g.rows[0]).sort((a,b)=>b.W-a.W),wild=gs.flatMap(g=>g.rows.slice(1)).sort((a,b)=>b.W-a.W).slice(0,3),seed=[...div,...wild];
      seed.forEach((r,i)=>{r.playoff=true;r.seed=i+1;playoff.push(r);});
      const wc36=simulateSeries(`${league}外卡｜#3 vs #6`,seed[2],seed[5],3,st),wc45=simulateSeries(`${league}外卡｜#4 vs #5`,seed[3],seed[4],3,st);series.push(wc36,wc45);
      const ds1=simulateSeries(`${league}分區系列賽｜#1`,seed[0],byTeam(wc45.winner),5,st),ds2=simulateSeries(`${league}分區系列賽｜#2`,seed[1],byTeam(wc36.winner),5,st);series.push(ds1,ds2);
      const cs=simulateSeries(`${league}冠軍賽`,byTeam(ds1.winner),byTeam(ds2.winner),7,st);series.push(cs);leagueWinners.push(byTeam(cs.winner));
    }
    series.push(simulateSeries('世界大賽',leagueWinners[0],leagueWinners[1],7,st));
  }else if(S.lv==='NPB1'){
    format='兩聯盟各 3 隊｜高潮系列賽首輪 3 戰 2 勝；決勝輪聯盟第一先帶 1 勝、再搶 4 勝；日本大賽 7 戰 4 勝';const winners=[];
    reportGroups.forEach(g=>{const q=g.rows.slice(0,3);q.forEach((r,i)=>{r.playoff=true;r.seed=i+1;playoff.push(r);});const first=simulateSeries(`${g.name}高潮系列賽・首輪`,q[1],q[2],3,st),final=simulateSeries(`${g.name}高潮系列賽・決勝輪`,q[0],byTeam(first.winner),7,st,1,0);series.push(first,final);winners.push(byTeam(final.winner));});
    series.push(simulateSeries('日本大賽',winners[0],winners[1],7,st));
  }else if(S.lv==='CPBL1'){
    const q=reportGroups[0].rows.slice(0,3),sameHalf=chance(34);q.forEach((r,i)=>{r.playoff=true;r.seed=i+1;playoff.push(r);});
    if(sameHalf){format='同隊包辦上下半季｜年度第 2 對第 3 打 5 戰 3 勝；年度第 1 在台灣大賽先帶 1 勝';const first=simulateSeries('季後挑戰賽｜年度 #2 vs #3',q[1],q[2],5,st),final=simulateSeries('台灣大賽',q[0],byTeam(first.winner),7,st,1,0);series.push(first,final);}
    else{format='上下半季冠軍不同｜年度勝率較低的季冠軍在挑戰賽先帶 1 勝；台灣大賽 7 戰 4 勝';const first=simulateSeries('季後挑戰賽｜季冠軍 vs 外卡',q[1],q[2],5,st,1,0),final=simulateSeries('台灣大賽',q[0],byTeam(first.winner),7,st);series.push(first,final);}
  }else if(S.lv==='NPB2'){
    format='二軍東西聯盟優勝隊冠軍賽｜5 戰 3 勝';const q=reportGroups.map(g=>g.rows[0]);q.forEach(r=>{r.playoff=true;playoff.push(r);});series.push(simulateSeries('二軍總冠軍系列賽',q[0],q[1],5,st));
  }else{
    format=`${LV[S.lv]?LV[S.lv].n:'聯盟'}前兩名冠軍系列賽｜5 戰 3 勝`;const q=reportGroups[0].rows.slice(0,2);q.forEach(r=>{r.playoff=true;playoff.push(r);});series.push(simulateSeries('聯盟冠軍系列賽',q[0],q[1],5,st));
  }
  const champName=series.length?series[series.length-1].winner:null,champ=byTeam(champName);if(champ)champ.champion=true;
  const mine=reportGroups.flatMap(g=>g.rows.map(r=>({...r,group:g.name}))).find(r=>r.team===S.orgTeam)||null;
  const mineSeries=series.filter(x=>x.a===S.orgTeam||x.b===S.orgTeam),postGames=mineSeries.reduce((n,x)=>n+x.games,0),postseasonStat=mine&&mine.playoff?postseasonPlayerLine(st,postGames):null;
  const minePostseason=!mine||!mine.playoff?'未晉級季後賽':champName===S.orgTeam?'奪下總冠軍':mineSeries.length?`止步 ${mineSeries[mineSeries.length-1].label}`:'取得季後賽席位';
  const report={year:S.year,org:S.org,lv:S.lv,games,groups:reportGroups,champion:champName,mine,postseason:series,postseasonFormat:format,minePostseason,postseasonStat,postGames};
  S.currentStandings=report;S.standingsHistory=S.standingsHistory||[];S.standingsHistory.push(report);S.standingsHistory=S.standingsHistory.slice(-18);
  return report;
}
function latestTeamRecord(team,org){
  const current=S&&S.currentStandings;
  if(current&&(!org||current.org===org)){for(const g of current.groups||[]){const row=g.rows.find(r=>r.team===team);if(row)return {...row,year:current.year,group:g.name};}}
  const hist=(S&&S.standingsHistory)||[];
  for(let i=hist.length-1;i>=0;i--){const rep=hist[i];if(rep===current||(org&&rep.org!==org))continue;for(const g of rep.groups||[]){const row=g.rows.find(r=>r.team===team);if(row)return {...row,year:rep.year,group:g.name};}}
  return null;
}
function standingsHTML(rep){
  if(!rep||!rep.groups)return '';
  const mine=rep.mine,sub=mine?`${S.orgTeam} ${mine.W} 勝 ${mine.L} 敗・${mine.group}第 ${mine.rank}`:'聯盟最終排名';
  const post=(rep.postseason||[]).map(x=>`<div class="series-row ${(x.a===S.orgTeam||x.b===S.orgTeam)?'you':''}"><span>${x.label}</span><p><b class="${x.winner===x.a?'win':''}">${x.a}</b> ${x.aWins}–${x.bWins} <b class="${x.winner===x.b?'win':''}">${x.b}</b></p>${x.advantage?`<small>${x.advantage}</small>`:''}</div>`).join('');
  const player=rep.postseasonStat?`<div class="post-player"><b>你的季後賽成績｜${rep.minePostseason}</b><p>${statLine(rep.postseasonStat)}</p><small>共參與 ${rep.postGames} 場球隊季後賽；短期賽另有獨立臨場波動。</small></div>`:`<div class="post-player missed"><b>你的季後賽｜${rep.minePostseason}</b><p>本季沒有個人季後賽出賽紀錄。</p></div>`;
  const champion=rep.champion?`總冠軍｜${rep.champion}`:'本季無冠軍資料';
  return `<section class="standings-report compact-report"><div class="standings-head"><b>球隊戰績</b><span>${sub}</span></div><div class="team-season-result"><b>${rep.minePostseason}</b><span>${champion}</span></div><details class="report-details"><summary>完整戰績與季後賽</summary><div class="standings-grid">${rep.groups.map(g=>`<div class="standings-group"><h5>${g.name}</h5><table class="standings-table"><thead><tr><th>#</th><th>球隊</th><th>勝</th><th>敗</th><th>勝率</th><th>勝差</th></tr></thead><tbody>${g.rows.map(r=>`<tr class="${r.team===S.orgTeam?'you ':''}${r.playoff?'playoff':''}"><td class="rank">${r.rank}</td><td><i class="mark"></i>${r.team}${r.champion?' ★':''}</td><td>${r.W}</td><td>${r.L}</td><td>${r.pct.toFixed(3).replace(/^0/,'')}</td><td>${r.GB===0?'—':r.GB}</td></tr>`).join('')}</tbody></table></div>`).join('')}</div><div class="postseason-report"><div class="postseason-head"><b>季後賽</b></div>${player}${post}</div></details></section>`;
}
function seasonEffectHTML(st){
  const b=st.effectBreakdown||{},signed=v=>`${Number(v)>0?'+':''}${Number(v||0).toFixed(1)}`,rows=[['手感',signed(b.luck)],['事件',signed(b.momentum)],['選擇',signed(b.choice)],['環境',signed(b.environment)],['團隊',signed(b.chemistry)],['隊友',signed(b.teammates)],['特性',signed(b.traits)]];if(b.finance)rows.push(['財務壓力',signed(b.finance)]);
  if(b.transfer)rows.push(['交易／轉隊適應',signed(b.transfer)]);(st.traitImpact||[]).forEach(x=>rows.push([`特性｜${x.name}`,x.text]));if(st._promiseReview)rows.push([`角色承諾｜${st._promiseReview.status}`,`${st._promiseReview.actual}/${st._promiseReview.target} 場｜${st._promiseReview.consequence}`]);
  return `<div class="effect-ledger">${rows.map(([label,value])=>`<div class="effect-row ${String(value).startsWith('+')?'good':String(value).startsWith('-')?'bad':''}"><span>${label}</span><b>${value}</b></div>`).join('')}</div>`;
}
function showSeasonSummary(st,done){
  const info=seasonTeamInfo(),v=seasonVerdict(st);$('summary-title').textContent=`${S.year} 本季總結`;$('summary-sub').textContent=`${S.age} 歲・${st.usageRole||roleN(S.role)}`;
  const awards=(S.honors||[]).filter(x=>x.startsWith(String(S.year))).map(x=>x.slice(5)),watch=S.awardWatch||[],awardBox=$('summary-awards');awardBox.classList.toggle('show',awards.length>0||watch.length>0);awardBox.innerHTML=(awards.length?`<strong>本季獎項</strong>${awards.map(x=>`<span>🏆 ${x}</span>`).join('')}`:'')+(watch.length?`<strong>獎項競爭</strong>${watch.map(x=>`<span>◌ ${x}</span>`).join('')}`:'');
  const shortText=String(v.text||'').split('。').filter(Boolean).slice(0,1).join('。')+'。';
  $('summary-team').innerHTML=`<b>${info.name}</b><span>${info.level}${S.pos==='P'?'・'+roleN(S.role):S.dpos?'・'+DPN[S.dpos]:''}</span>`;$('summary-stats').innerHTML=statDashboard(st);$('summary-verdict').innerHTML=`<b>${v.title}</b><p>${shortText}</p><details class="report-details"><summary>影響明細</summary>${seasonEffectHTML(st)}</details>`;$('summary-standings').innerHTML=standingsHTML(S.currentStandings);
  $('summary-accept').onclick=()=>{closeFx('summary-overlay');playAchievementQueue(done);};openFx('summary-overlay');
}
/* 長打率優先使用模擬出的實際一、二、三壘安打；舊存檔才使用能力估算。 */
function slgOf(st){
  if(!st.AB)return 0;
  const hr=st.HR||0,nonHR=Math.max(0,(st.H||0)-hr),exact=Number.isFinite(st._2B)&&Number.isFinite(st._3B);
  const par=S&&S.stage==='PRO'&&S.lv&&LV[S.lv]?LV[S.lv].par:r99(50),powGap=S&&S.ab?ratingGap(S.ab.pow||par,par):0,spdGap=S&&S.ab?ratingGap(S.ab.spd||par,par):0;
  const doubles=exact?st._2B:nonHR*clamp(.205+powGap*.0017,.11,.36),triples=exact?st._3B:nonHR*clamp(.018+spdGap*.001,.003,.07),singles=exact?(Number.isFinite(st._1B)?st._1B:Math.max(0,nonHR-doubles-triples)):Math.max(0,nonHR-doubles-triples);
  const tb=singles + doubles*2 + triples*3 + hr*4;
  return tb/st.AB;
}
/* 年薪（萬台幣） */
function salaryFor(lv,d){
  switch(lv){
    case 'CPBL2':return 84; case 'NPB2':return 240;
    case 'R':return 60; case 'A1':return 95; case 'A2':return 135; case 'A3':return 270;
    case 'CPBL1':return Math.round(300+clamp(d,0,25)*120);
    case 'NPB1':return Math.round(1600+clamp(d,0,26)*560);
    case 'MLB':return Math.round(2400+clamp(d,0,26)*4300);
  } return 0;
}
const fmtMoney=w=>{ const sign=w<0?'−':'',n=Math.abs(Number(w)||0),y=Math.floor(n/10000),m=Math.round(n%10000); return sign+(y?y+'億':'')+(m?m.toLocaleString()+'萬':(y?'':'0萬')); };
/* 帳務內部統一以萬台幣累計；合約依所在聯盟顯示原幣。固定匯率只供遊戲換算。 */
const GAME_FX={USD_TWD:31.8,JPY_TWD:.214};
function fmtLocalMoney(w,org){
  const raw=Number(w)||0,sign=raw<0?'−':'',twd=Math.abs(raw)*10000;
  if(org==='MiLB'){
    const usd=twd/GAME_FX.USD_TWD;return sign+(usd>=1000000?`US$${(usd/1000000).toFixed(2)}M`:`US$${Math.round(usd).toLocaleString()}`);
  }
  if(org==='NPB'){
    const jpy=twd/GAME_FX.JPY_TWD;return sign+(jpy>=100000000?`¥${(jpy/100000000).toFixed(2)}億`:`¥${Math.round(jpy/10000).toLocaleString()}萬`);
  }
  return `${sign}NT$ ${Math.round(Math.abs(raw)).toLocaleString()}萬`;
}
function fmtContractMoney(w,org){const local=fmtLocalMoney(w,org);return org&&org!=='CPBL'?`${local}（約 ${fmtMoney(w)}台幣）`:local;}
/* 財務單位皆為「萬台幣」。稅負是遊戲用估算：台灣採 2026 級距、美國採 2026 聯邦級距加地方估算、日本採含住民稅的簡化有效率。 */
function taiwanTax(wan){
  const x=Math.max(0,wan*10000);let tax=0;
  if(x<=610000)tax=x*.05;else if(x<=1380000)tax=x*.12-42700;else if(x<=2770000)tax=x*.20-153100;else if(x<=5190000)tax=x*.30-430100;else tax=x*.40-949100;
  return Math.max(0,tax/10000);
}
function usFederalTax(wan){
  const usd=Math.max(0,wan*10000/GAME_FX.USD_TWD),br=[[12400,.10],[50400,.12],[105700,.22],[201775,.24],[256225,.32],[640600,.35],[Infinity,.37]];
  let prev=0,tax=0;for(const [top,rate] of br){const chunk=Math.max(0,Math.min(usd,top)-prev);tax+=chunk*rate;if(usd<=top)break;prev=top;}
  return tax*GAME_FX.USD_TWD/10000;
}
function estimatedTax(wan,org,team){
  if(org==='CPBL')return taiwanTax(wan);
  if(org==='NPB'){const rate=wan<500?0.16:wan<2000?0.24:wan<5000?0.32:wan<15000?0.38:0.45;return wan*rate;}
  const local=MLB_TEAM_META[team]?MLB_TEAM_META[team][2]:.045;
  return usFederalTax(wan)+wan*local;
}
function syncFinance(){
  const f=S.finance;if(!Number.isFinite(f.cash))f.cash=Math.max(0,Number(f.netWorth)||0);if(!Number.isFinite(f.investments))f.investments=0;if(!Number.isFinite(f.homeEquity))f.homeEquity=0;if(!Number.isFinite(f.debt))f.debt=Math.max(0,-(Number(f.netWorth)||0));
  f.cash=Math.max(0,Math.round(f.cash));f.investments=Math.max(0,Math.round(f.investments));f.homeEquity=Math.max(0,Math.round(f.homeEquity));f.debt=Math.max(0,Math.round(f.debt));f.netWorth=f.cash+f.investments+f.homeEquity-f.debt;return f;
}
function financeSnapshotText(org){const f=syncFinance();return `現金 ${fmtContractMoney(f.cash,org||S.org)}｜負債 ${fmtContractMoney(f.debt,org||S.org)}｜淨資產 ${fmtContractMoney(f.netWorth,org||S.org)}`;}
function bookIncome(amount,type,org,team){
  amount=Math.max(0,Math.round(amount));const f=S.finance,taxOrg=org||S.org,taxTeam=team||S.orgTeam;
  f.taxableByYear=f.taxableByYear||{};const key=`${S.year}|${taxOrg}|${taxTeam||''}`,before=Number(f.taxableByYear[key])||0,after=before+amount;
  /* 累進稅率按同一年度的累積收入計算，而不是每筆獎金各自從最低級距重算。 */
  const tax=Math.max(0,estimatedTax(after,taxOrg,taxTeam)-estimatedTax(before,taxOrg,taxTeam)),agent=amount*((type==='bonus'||S.lv&&LV[S.lv]&&LV[S.lv].top)?.045:.025),net=amount-tax-agent;f.taxableByYear[key]=after;
  syncFinance();S.salary+=amount;f.gross+=amount;f.tax+=tax;f.agent+=agent;f.cash+=net;syncFinance();
  const row={year:S.year,type:type||'salary',gross:amount,tax,agent,net};f.ledger.push(row);return row;
}
function spendMoney(amount,kind,label){
  const f=syncFinance();amount=Math.max(0,Math.round(amount));const cashUsed=Math.min(f.cash,amount),shortfall=amount-cashUsed,financeFee=shortfall?Math.max(1,Math.round(shortfall*(S.org==='MiLB'?.10:S.org==='NPB'?.07:.06))):0;
  f.cash-=cashUsed;if(shortfall)f.debt+=shortfall+financeFee;f[kind]=(f[kind]||0)+amount;syncFinance();f.ledger.push({year:S.year,type:kind,gross:0,tax:0,agent:0,net:-amount,label,cashUsed,borrowed:shortfall,financeFee});S.lastSpendResult={amount,cashUsed,borrowed:shortfall,financeFee};return amount;
}
function investCash(amount,label){const f=syncFinance(),m=Math.min(f.cash,Math.max(0,Math.round(amount)));f.cash-=m;f.investments+=m;syncFinance();f.ledger.push({year:S.year,type:'asset-transfer',gross:0,tax:0,agent:0,net:0,label:label||'投資本金',amount:m});return m;}
function buyHomeWithCash(amount){const f=syncFinance(),m=Math.min(f.cash,Math.max(0,Math.round(amount)));f.cash-=m;f.homeEquity+=m;f.homeOwned=true;syncFinance();return m;}
function repayDebt(amount){const f=syncFinance(),m=Math.min(f.cash,f.debt,Math.max(0,Math.round(amount)));f.cash-=m;f.debt-=m;syncFinance();f.ledger.push({year:S.year,type:'debt-payment',gross:0,tax:0,agent:0,net:0,label:'償還負債',amount:m});return m;}
function accrueDebtInterest(){const f=syncFinance();if(!f.debt)return 0;const rate=S.org==='MiLB'?.10:S.org==='NPB'?.07:.06,interest=Math.max(1,Math.round(f.debt*rate));f.debt+=interest;syncFinance();f.ledger.push({year:S.year,type:'interest',gross:0,tax:0,agent:0,net:-interest,label:'年度負債利息'});return interest;}
function randomizedSpend(amount,kind,label,spread){
  const budget=Math.max(0,Math.round(amount)),range=spread==null?.18:spread;
  let factor=1+(R()*2-1)*range,note='落在原估價範圍內';
  if(chance(9)){factor+=.16+R()*.20;note=pick(['臨時改期與追加服務提高費用','供應與交通成本突然上升','家人同行與住宿變更增加支出']);}
  else if(chance(10)){factor-=.08+R()*.10;note=pick(['球團補助吸收一部分費用','提早預訂取得較低價格','合作單位提供球員折扣']);}
  const cost=spendMoney(Math.max(0,budget*factor),kind,label),sr=S.lastSpendResult||{};if(sr.borrowed)note+=`；現金不足，借款 ${fmtMoney(sr.borrowed)}、融資成本 ${fmtMoney(sr.financeFee)}`;S.lastExpense={budget,cost,note,label,borrowed:sr.borrowed||0,financeFee:sr.financeFee||0};return cost;
}
function expenseRange(amount,org,spread){
  const n=Math.max(0,Number(amount)||0),r=spread==null?.18:spread;
  return `${fmtContractMoney(Math.round(n*(1-r)),org)}～${fmtContractMoney(Math.round(n*(1+r)),org)}`;
}
function financeIncident(done,profile,baseChance){
  const f=S.finance,complete=()=>{f.taxPrepared=false;f.insured=false;financialTraitAudit();done();};
  const incidentChance=clamp((baseChance==null?18:baseChance)-(f.taxPrepared?5:0)-(f.insured?5:0),2,35);
  if(!chance(incidentChance)){complete();return;}
  const base=Math.max(20,profile.base),org=S.org,costText=w=>fmtContractMoney(w,org);
  const incidents=[
    ['稅務文件要求補件','跨國收入、獎金與扣繳資料出現落差，期限只剩兩週。','聘請運動員稅務會計師','自己整理資料並申訴','先補繳再慢慢釐清','稅務顧問把各地扣繳重新對齊','漏掉一筆收入，補稅與滯納金一起寄到','帳務結清，但現金流被突然壓縮'],
    ['球隊臨時通知搬家','升降級、交易或春訓基地安排讓你必須在短時間內換住處。','交給搬遷公司處理','自己找房並搶在報到前完成','先住球團旅館','搬遷順利，訓練行程沒有中斷','押金、行李與交通同時超支','暫時安頓，但生活品質下降'],
    ['家人醫療支出','家中突然需要一筆檢查、照護與交通費。','安排完整醫療與照護','先比較方案再決定','只支付最急迫項目','家人的治療與照護都被妥善安排','時間拖延讓費用和壓力一起增加','急迫問題解決，但家庭關係略受影響'],
    ['球具在客場遺失','訂製手套、球棒與個人恢復器材沒有跟著行李抵達。','立刻重新訂製全套裝備','向品牌與航空公司求償','先借隊友備品應急','新裝備準時送達，沒有錯過比賽','求償流程拖延，最後仍得自費處理','省下部分費用，但本季準備略受影響'],
    ['住宅突然需要修繕','漏水、空調或結構問題在休賽季一次爆發。','直接完成全面修繕','先請專業人員議價','只修會影響生活的部分','居住與恢復環境一次處理完成','追加工程超出原估價','基本生活恢復，問題仍可能復發'],
    ['經紀合約法律費用','代言條款與肖像權授權出現爭議。','聘請專業律師完整審約','要求經紀公司負擔費用','終止爭議合作','權利與收入範圍被重新寫清楚','談判失敗，律師費與違約成本增加','風險結束，但也失去部分曝光'],
    ['匯率突然逆風','旅外收入匯回台灣時，市場波動讓原本預算失準。','分批換匯並建立多幣別帳戶','等待更好的匯率','立即換回生活所需','波動被分散，現金流恢復穩定','等待期間走勢繼續不利','接受本次損失，帳務立刻結清'],
    ['家人教育與搬遷選擇','伴侶工作或孩子教育需要重新安排居住城市。','負擔完整搬遷與教育規劃','和家人共同壓低預算','維持兩地生活','家庭安置完成，關係更加穩定','低估往返與臨時托育成本','保留彼此工作，但交通支出增加'],
    ['車輛與通勤事故','沒有嚴重人身傷害，但交通工具與保險自付額立刻到期。','使用原廠與完整保險處理','比較維修廠並申請理賠','改用大眾交通度過本季','處理快速，日常訓練沒有中斷','理賠不如預期，仍要負擔差額','成本較低，但通勤時間明顯增加'],
    ['贊助商臨時改約','品牌要求增加拍攝日，否則將調降合作金額。','請經紀與法律團隊重新談判','接受追加拍攝換取收入','退出合作保住休息時間','工作量與報酬重新取得平衡','拍攝拖進訓練期，恢復受到影響','沒有額外收入，但完整保住休賽季'],
    ['親友借款請求','熟人希望你出資創業，承諾很快就能回本。','先做完整盡職調查','只投入能承受損失的小額','明確拒絕','計畫風險被攤開，關係仍能維持','專案失敗，金錢與關係一起受損','保住資產，但親友情緒低落'],
    ['休賽季旅行取消','天候或賽程異動讓已付款的機票與住宿無法使用。','改期並保留完整行程','申請退款與保險理賠','取消休假直接回訓練基地','行程重新排定，家人與休息都被照顧','退款條款不利，額外支付差額','省下後續開銷，但家庭關係下降']
  ];
  /* 國家、聯盟層級、家庭與資產會決定事件是否有資格出現，避免所有球員抽到同一套帳單。 */
  const contextual=[
    {orgs:['CPBL'],scale:.55,relation:'family',row:['颱風造成家中損害','豪雨與強風讓老家屋頂、窗戶和電器同時需要處理。','委託合格廠商完整修復','自己分批找工班議價','先做防水與緊急清理','修繕趕在下一波雨勢前完成','工期延誤，臨時住宿與追加工程一起增加','住家先恢復安全，但仍留下待修項目']},
    {orgs:['CPBL'],scale:.42,relation:'none',row:['補充保費與扣繳差額','薪資、獎金和代言分屬不同扣繳來源，年末帳單比預期多。','交由會計師重算全年所得','逐筆核對扣繳憑單','先繳清無爭議部分','重複計入的收入成功排除','漏報資料讓補繳金額繼續增加','先把期限守住，之後再申請更正']},
    {orgs:['CPBL'],scale:.70,relation:'family',row:['父母住家無障礙改造','家中長輩開始需要扶手、浴室止滑與更安全的生活動線。','一次完成整屋安全改造','申請補助並分期施工','只先處理浴室和樓梯','家中環境變得安全，照護壓力下降','補助資格與工期不如預期','最危險的區域先完成改善']},
    {orgs:['CPBL'],scale:.38,relation:'fan',row:['地方代言臨時停拍','合作店家遇到營運問題，已預留的拍攝日和造型費無法退回。','讓經紀團隊重整合作案','改成球迷公益活動','直接取消並吸收損失','新合作保住收入和形象','替代企劃沒有成交，前置費用全數認列','支出結清，休息日也保留下來']},
    {orgs:['NPB'],scale:.72,relation:'none',row:['住民稅隔年到期','日本住民稅依前一年所得計算，旅日第二年的帳單突然大幅增加。','聘請跨國稅務師安排預繳','向球團確認扣繳後自行申報','先保留現金按期繳納','預繳與扣繳被完整對上','錯估前一年所得，資金缺口擴大','準時繳清，但休賽季預算被壓縮']},
    {orgs:['NPB'],scale:.58,relation:'none',row:['租屋更新料與禮金','日本租約到期，更新料、保證公司費用與新住處禮金同時出現。','請生活支援團隊重新找房','自己和房東談續約','搬進球團安排的短租','新租約與通勤路線一次穩定下來','低估初期費用，搬家成本超標','空間較小，但報到與訓練不受影響']},
    {orgs:['NPB'],scale:.85,relation:'family',row:['地震後臨時安置','住處沒有重大結構損害，但檢查期間家人必須暫住外地。','安排完整檢查與家庭住宿','申請保險並尋找較便宜短租','先由家人返台等待','檢查和安置迅速完成，家人安心留下','理賠進度落後，住宿費不斷累積','立即降低風險，但家庭分隔時間拉長']},
    {orgs:['NPB'],scale:.46,relation:'team',row:['翻譯與生活管理合約中斷','原本合作的翻譯臨時離職，球團只提供比賽日基本協助。','聘請熟悉棒球的私人翻譯','與隊友共用翻譯並加強日語','只使用球團基本支援','溝通重新穩定，戰術會議沒有漏接','共享時段衝突，重要安排仍然誤解','省下費用，但生活行政變得更耗神']},
    {orgs:['NPB'],when:()=>S.love.st==='married'||(S.love.kids||0)>0,scale:.78,relation:'family',row:['家屬簽證與國際學校續約','伴侶簽證、孩子學費和新學年押金集中在同一個月到期。','委託專業團隊一次辦妥','比較學校並自行準備文件','讓家人暫時留在台灣','簽證與入學順利銜接，家庭生活穩定','文件補件拖延，學費與短租都追加','現金壓力下降，但兩地生活再次開始']},
    {orgs:['MiLB'],scale:.82,relation:'none',row:['跨州出賽稅務申報','客場收入分散在多州，報稅資料出現十多個不同管轄區。','聘請熟悉運動員稅務的會計團隊','使用軟體自行拆分比賽日','先依最高估算預留稅款','各州收入與抵免被正確整理','漏掉一州申報，罰金和補件一起寄到','現金先留住，確定金額後再結清']},
    {orgs:['MiLB'],levels:['MLB'],scale:1.05,relation:'family',row:['春訓第二住處','二月就得報到，但家人和主要住處仍在球季城市。','租下完整春訓住宅並安排家人同行','與隊友合租後自行通勤','只住球團附近短租套房','家庭與訓練都能照原計畫運作','合租變動與租車費讓預算失控','生活空間有限，但完整撐過春訓']},
    {orgs:['MiLB'],levels:['R','A1','A2','A3'],scale:.48,relation:'team',row:['小聯盟臨時住宿缺口','升級通知只提前兩天，新城市的球員宿舍已經額滿。','由經紀人安排月租公寓','和剛認識的隊友合租','先住汽車旅館等待空房','新住處在首場比賽前確定','押金詐騙與臨時房價讓成本翻倍','每天通勤較遠，但沒有錯過報到']},
    {orgs:['MiLB'],scale:.64,relation:'none',row:['工作簽證與移民律師費','續約、升級或交易後，簽證文件必須重新確認。','聘請職業運動移民律師','請球團法務協助並自行補件','延後私人行程守住工作許可','文件提前核准，報到時程不受影響','補件要求反覆，急件費用一路增加','工作許可保住，但私人安排全部取消']},
    {orgs:['MiLB'],scale:.92,relation:'none',row:['醫療保險自付額','影像檢查與治療獲得理賠，但高額自付額仍須立即支付。','請球員工會與保險顧問審核','向醫院申請分期與費用複核','先支付最低必要治療','不合理費用被排除，療程也不中斷','申訴未通過，行政費與帳單一起增加','傷勢先處理，剩餘費用分期承擔']},
    {orgs:['MiLB'],scale:.44,relation:'team',row:['客場小費與球員會費','整季 clubhouse dues、行李搬運與客場服務費累積成一筆不小支出。','由會計統整並一次結清','自己逐張核對後支付','只先處理球隊共同費用','帳務清楚，隊內人情也顧到了','漏掉幾筆共同支出，關係和滯納金都受影響','必要費用結清，額外服務全部取消']},
    {orgs:['MiLB'],levels:['MLB'],scale:1.20,relation:'none',row:['經紀團隊更換與解約','舊經紀合約仍有尾款，新團隊又要求簽約與法律審查費。','由獨立律師完成交接','要求新團隊負擔部分成本','維持舊團隊到合約結束','權利、佣金與客戶資料乾淨移交','兩邊責任沒有切清，費用重複發生','避免立即解約，但市場操作暫時停滯']},
    {when:()=>f.netWorth>=300,scale:.58,relation:'none',row:['帳戶遭到網路詐騙','冒名聯絡與偽造付款指示讓一筆資金被暫時轉出。','聘請資安與法律團隊追款','立刻凍結帳戶並自行蒐證','認列損失後全面換帳戶','大部分款項追回，付款流程也加上雙重驗證','黃金時間被錯過，追回比例很低','損失確定，但後續帳戶安全提升']},
    {when:()=>f.netWorth>=1200,scale:.90,relation:'fan',row:['公益承諾需要兌現','你先前公開承諾依成績捐款，如今球季表現遠超原先預算。','完整履行並交由基金會執行','和公益單位調整為分年捐助','只完成最低承諾金額','承諾完整落地，球迷信任明顯提升','協議細節拖延，引發外界質疑','法律義務完成，但社群反應平淡']},
    {when:()=>S.love.st==='married',scale:1.05,relation:'family',row:['婚禮與家庭儀式追加','親友人數、跨國交通或場地變動讓原本預算失準。','保留完整儀式並交給團隊處理','和伴侶一起縮小規模','登記後延後大型宴會','重要家人都被照顧，儀式順利完成','臨時加桌與交通讓帳單失控','當下壓力降低，但家人仍在等待安排']},
    {when:()=>S.love.st==='married'&&(S.love.kids||0)>0,scale:.72,relation:'family',row:['孩子托育臨時中斷','球季移動期間原托育安排突然無法繼續。','聘請具證照的到府照護','和伴侶重新輪班並找短期托育','請家人暫時協助','照護穩定，家庭作息重新接上','臨時排班反覆變動，工作與費用一起增加','支出較少，但長輩負擔與家庭壓力上升']},
    {scale:.62,relation:'family',row:['緊急返鄉奔喪','近親離世，必須在極短時間內安排跨城或跨國交通。','負擔家人交通並完整返鄉','請經紀協調賽程後精簡行程','只短暫出席必要儀式','你陪家人把重要的告別走完','臨時票價與改期讓支出一路增加','趕回球隊較快，但心裡仍留下遺憾']},
    {when:()=>f.investmentYears>=1,scale:1.10,relation:'none',row:['投資標的要求追加資金','你持有的投資遇到資金缺口，管理方要求股東限期決定。','聘請顧問重做風險評估','只按原持股比例小額增資','拒絕增資並接受稀釋','問題資產被提早辨識，損失受到控制','資訊判讀錯誤，新增資金也被套住','不再投入現金，但原持股價值下降']},
    {when:()=>f.homeOwned,scale:.74,relation:'none',row:['房屋保險續保調漲','所在地風險與重置成本上升，續保報價突然增加。','請保險顧問重新比較保障','提高自付額換取較低保費','只保留基本災害保障','保障缺口補齊，保費也回到合理範圍','低價方案藏著除外條款，重新投保更昂貴','年度成本下降，但小型損害必須自行承擔']},
    {scale:.52,relation:'team',row:['私人訓練館突然歇業','已預付的休賽季場租和教練課程無法照原計畫執行。','由經紀團隊尋找替代場地','和隊友共同租用新的空間','改用球團設施完成訓練','替代方案無縫接軌，預付款也追回大半','新場地檔期衝突，退款進度又落後','額外支出最低，但可用時段較受限制']},
    {scale:.68,relation:'none',row:['訂製球具供應商延遲','新球季專用手套、鞋款或護具卡在生產與運輸。','支付急件並準備完整備品','要求品牌提供替代品與補償','沿用上季裝備到貨為止','裝備趕上報到，規格也完全合身','急件仍然延誤，最後又臨時採購','沒有多花大錢，但舊裝備磨耗加快']}
  ];
  const hasFamily=S.love.st==='married'||(S.love.kids||0)>0;
  const basePool=incidents.filter(row=>row[0]!=='家人教育與搬遷選擇'||hasFamily).map(row=>({row,scale:1,relation:null}));
  const eligible=contextual.filter(x=>(!x.orgs||x.orgs.includes(org))&&(!x.levels||x.levels.includes(S.lv))&&(!x.when||x.when()));
  const incident=pick(basePool.concat(eligible)),e=incident.row;
  const covered=(f.taxPrepared&&/稅務|住民稅|扣繳|經紀|簽證/.test(e[0]))||(f.insured&&/醫療|事故|住宅|颱風|地震|房屋|托育/.test(e[0]));
  const budget=Math.round(base*(.45+R()*.75)*(incident.scale||1)*(covered?.68:1)*(S.traits.moneywise ? .95 : 1));
  const applyRelation=(delta)=>{
    const relation=incident.relation||(/家人|教育|旅行|返鄉|婚禮|孩子|父母/.test(e[0])?'family':'team');
    if(relation==='family')S.love.affection=(S.love.affection||0)+delta;
    else if(relation==='fan'){const so=socialState();so.fanRep=clamp(so.fanRep+delta,-20,20);}
    else if(relation==='team')S.chemistry=clamp((S.chemistry||0)+delta,-5,5);
  };
  const finish=(tone,title,body)=>{card(tone,title,`${body}${covered?'<br><b class="up">保障已吸收部分費用。</b>':''}<div class="statline">支出 ${costText(S.lastExpense?S.lastExpense.cost:0)}｜${financeSnapshotText(org)}</div>`);board(2);continueAction('繼續 ▸',complete);};
  choose(`突發支出｜${e[0]}`,[
    {t:e[2],main:true,s:`預估 ${expenseRange(budget*1.05,org)}｜成本較高，成功率最高`,f:()=>{const c=randomizedSpend(budget*1.05,'living',e[0]+'・專業處理');f.crisesResolved=(f.crisesResolved||0)+1;applyRelation(1);finish('good',e[5],`${e[5]}。${S.lastExpense.note}，支付 ${costText(c)}。`);}},
    {t:e[3],risk:true,probability:58,s:`預估 ${expenseRange(budget*.45,org)}｜成功可省錢；失敗可能支付約 ${expenseRange(budget*1.35,org)}`,f:()=>quickRoll({sides:100,title:e[0],probability:58}).then(r=>{const c=randomizedSpend(budget*(r.success ? .45 : 1.35),'living',e[0]+'・自行處理');applyRelation(r.success?0:-1);finish(r.success?'good':'bad',r.success?e[5]:e[6],`${r.success?e[5]:e[6]}。${S.lastExpense.note}，支付 ${costText(c)}。`);})},
    {t:e[4],warn:true,s:`預估 ${expenseRange(budget*.72,org)}｜直接承擔可控代價，不進行成敗判定`,f:()=>{const c=randomizedSpend(budget*.72,'family',e[0]+'・直接承擔');applyRelation(-1);finish('info',e[7],`${e[7]}。${S.lastExpense.note}，支付 ${costText(c)}。`);}},
    {t:'延後處理，先保住眼前現金',warn:true,s:`現在只付約 ${expenseRange(budget*.24,org)}｜關係與下季狀態受損，剩餘問題可能形成負債`,f:()=>{const c=randomizedSpend(budget*.24,'living',e[0]+'・延後處理',.12);const deferred=Math.round(budget*.62);syncFinance().debt+=deferred;syncFinance();applyRelation(-2);addSeasonState(-1);finish('bad','帳單沒有消失',`先支付 ${costText(c)}，其餘 ${costText(deferred)} 轉成待處理負債；問題被推到下一年。`);}}
  ]);
}
function markFinanceDiscipline(){S.finance.discipline=(S.finance.discipline||0)+1;}
function financialTraitAudit(){
  const f=S.finance;if((f.discipline||0)>=4&&f.netWorth>=0)unlockDynamicTrait('moneywise','你連續多年把稅務、保險與現金流當成職業生涯的一部分，而不是帳單來了才處理——<b class="hl">突發財務事件成本約降低 5%</b>。');
}
function livingCostProfile(pay){
  const org=S.org||'CPBL',lv=S.lv||'CPBL2',team=S.orgTeam||'',top=LV[lv]&&LV[lv].top;
  let country='台灣',floor=52,share=.075,city=1;
  if(org==='NPB'){
    country='日本';floor=lv==='NPB1'?118:78;share=.085;
    city=/東京|神宮|橫濱|千葉|埼玉/.test(team)?1.16:/大阪|阪神|名古屋|福岡/.test(team)?1.07:.96;
  }else if(org==='MiLB'){
    country='美國';floor=top==='MLB'?225:112;share=top==='MLB'?.09:.08;
    city=MLB_TEAM_META[team]?clamp(MLB_TEAM_META[team][1],.86,1.32):1;
  }else{
    floor=lv==='CPBL1'?72:48;share=.07;
    city=/台北|新北/.test(team)?1.16:/桃園|台中/.test(team)?1.07:/高雄/.test(team)?1.01:.96;
  }
  const married=S.love.st==='married',kids=S.love.kids||0,family=1+(married?.26:0)+Math.min(4,kids)*.13;
  const star=(S.lastD||0)>=7?1.28:(S.lastD||0)>=4?1.15:1,home=S.finance.homeOwned?.78:1;
  const base=Math.round(Math.max(floor,Math.max(0,pay.net)*share)*city*family*star*home);
  const identity=top==='MLB'?'大聯盟球員':lv==='R'||lv==='A1'||lv==='A2'||lv==='A3'?'小聯盟球員':LV[lv]?LV[lv].n:'職業球員';
  return {country,identity,base,city,family,star,home,mult:city*family*star*home};
}
function financePlanningTrigger(pay){
  const f=syncFinance(),profile=livingCostProfile(pay),familySig=`${S.love.st}|${S.love.kids||0}`,gap=S.year-(f.lastPlanningYear||0),moved=!!f.lastTeam&&f.lastTeam!==S.orgTeam,familyChanged=!!f.lastFamilySig&&f.lastFamilySig!==familySig,incomeJump=Number.isFinite(f.lastAnnualGross)&&pay.gross>=f.lastAnnualGross*1.35,first=!f.lastTeam,reason=first?'第一份職業收入':moved?'轉隊／跨城市搬遷':familyChanged?'家庭結構改變':f.debt>profile.base*2?'負債需要重新安排':incomeJump?'合約收入明顯增加':pay.net>profile.base*9&&chance(18)?'高收入年度資產配置':gap>=4&&chance(22)?'多年未檢視財務':null;
  f.lastTeam=S.orgTeam;f.lastFamilySig=familySig;f.lastAnnualGross=pay.gross;return {reason,profile};
}
function settleRoutineFinance(pay,profile){
  const f=syncFinance(),interest=accrueDebtInterest(),cost=randomizedSpend(profile.base,'living','年度基本生活支出',.12);f.lastRoutineCost=cost;return {profile,interest,cost};
}
function annualFinanceChoice(pay,done,reason){
  const f=syncFinance(),interest=accrueDebtInterest(),take=Math.max(40,Math.min(Math.max(40,pay.net),Math.max(40,f.cash))),profile=livingCostProfile(pay),base=profile.base,familyBase=0,costText=w=>fmtContractMoney(w,S.org),rangeText=w=>expenseRange(w,S.org);S.lastExpense=null;
  f.lastPlanningYear=S.year;
  const summary=`稅後 ${costText(pay.net)}｜現金 ${costText(f.cash)}${interest?`｜利息 ${costText(interest)}`:''}`;
  const finish=(tone,title,body)=>{card(tone,title,`${body}<div class="statline">${financeSnapshotText(S.org)}</div>`);board(2);continueAction('繼續 ▸',()=>financeIncident(done,profile,10));};
  const plans=[
    {id:'training',t:'組建私人訓練與恢復團隊',s:`預估 ${rangeText(Math.max(base+familyBase,take*.22))}｜下一季訓練骰 +1、傷病風險 −3%`,f:()=>{
      const cost=randomizedSpend(Math.max(base+familyBase,take*.22),'living','私人訓練團隊');S.offseasonTrainingDice=clamp((S.offseasonTrainingDice||0)+1,0,3);S.injNext-=3;finish('good','把錢投資在訓練',`實際支付 ${costText(cost)} 聘請教練、防護員與營養師。永久能力仍要靠下一季訓練取得。`);}},
    {id:'medical',t:'安排完整醫療檢查與恢復期',s:`預估 ${rangeText(Math.max(base+familyBase,take*.18))}｜下季傷病風險 −7%`,f:()=>{
      const cost=randomizedSpend(Math.max(base+familyBase,take*.18),'living','醫療與恢復');S.injNext-=7;finish('good','先處理身體',`實際支付 ${costText(cost)} 完成影像檢查、物理治療與睡眠調整。`);}},
    {id:'family',t:S.love.st==='married'?'把時間與預算留給伴侶和孩子':'支援父母與家中生活',s:`預估 ${rangeText(Math.max(base+familyBase,take*.26))}｜家庭關係提升、傷病風險 −2%`,f:()=>{
      const cost=randomizedSpend(Math.max(base+familyBase,take*.26),'family','家庭與教育');S.love.affection=(S.love.affection||0)+2;S.injNext-=2;finish('good','家庭優先',`住房、旅行、長輩與教育實際支出 ${costText(cost)}。`);}},
    {id:'portfolio',t:'建立分散投資組合',s:`基本生活預估 ${rangeText(base)}｜另配置可支配收入 25%；市場可能上漲或虧損`,f:()=>{
      const living=randomizedSpend(base+familyBase,'living','基本生活');animatedRoll({sides:20,title:'年度投資結果',subtitle:'資產價格不會因為球場成績而配合你。',resolve:v=>({success:null,label:v<=3?'市場重挫':v<=8?'帳面虧損':v<=15?'穩健成長':v<20?'強勁上漲':'意外大漲',tone:v<=8?'bad':'good'}),resultText:r=>r.label}).then(r=>{
        const principal=investCash(Math.max(20,syncFinance().cash*.45),'分散投資本金'),rate=r.value<=3?-.18:r.value<=8?-.07:r.value<=15?.06:r.value<20?.14:.28,delta=Math.round(principal*rate);f.investments=Math.max(0,f.investments+delta);syncFinance();f.investmentYears=(f.investmentYears||0)+1;f.ledger.push({year:S.year,type:'investment',gross:0,tax:0,agent:0,net:delta,label:'投資組合損益'});finish(delta>=0?'good':'bad','年度投資結算',`基本生活支出 ${costText(living)}；另將現金 ${costText(principal)} 轉入投資，帳面 ${delta>=0?'增加':'減少'} <b class="${delta>=0?'up':'dn'}">${costText(Math.abs(delta))}</b>。`);});}},
    {id:'community',t:'在家鄉舉辦基層棒球計畫',s:`預估 ${rangeText(Math.max(base+familyBase,take*.16))}｜球迷聲望 +1、累積公益活動`,f:()=>{
      const cost=randomizedSpend(Math.max(base+familyBase,take*.16),'family','家鄉棒球計畫'),so=socialState();so.fanRep=clamp(so.fanRep+1,-20,20);so.communityActs++;finish('good','把資源帶回家鄉',`實際支付 ${costText(cost)} 支持場地、裝備與基層教練。`);}},
    {id:'media',t:'交給經紀團隊操作休賽季代言',s:`預估 ${rangeText(Math.max(base+familyBase,take*.14))}｜可能增加合作收入，也可能白忙一場`,f:()=>{
      const cost=randomizedSpend(Math.max(base+familyBase,take*.14),'living','代言與公關團隊');animatedRoll({sides:100,title:'休賽季商業合作',subtitle:'成績、形象與市場熱度一起接受品牌評估。',probability:clamp(48+(S.lastD||0)*3+socialState().fanRep,25,78),modifiers:['經紀團隊提案']}).then(r=>{
        if(r.success){const bonus=Math.round(take*(r.critical==='success'?.32:.18));bookIncome(bonus,'endorsement',S.org,S.orgTeam);finish('gold','品牌簽下合作',`企劃支出 ${costText(cost)}，取得 ${costText(bonus)} 代言收入。`);}else{socialState().fanRep=clamp(socialState().fanRep-1,-20,20);finish('bad','提案沒有成交',`支付 ${costText(cost)} 後仍沒有品牌正式簽約，曝光還消耗了休息時間。`);}});}},
    {id:'luxury',t:'明星生活：名車、派對與高額消費',warn:true,s:`可能花掉目前現金 55%～95%｜超支會形成負債，曝光與失控風險都很高`,f:()=>{
      const cost=randomizedSpend(Math.max(base+familyBase,syncFinance().cash*(.62+R()*.24)),'luxury','明星消費',.22);animatedRoll({sides:100,title:'高消費生活後果',subtitle:'鏡頭可能帶來合作，也可能只留下帳單。',probability:38,modifiers:['高調曝光']}).then(r=>{
        if(r.success){const bonus=Math.round(cost*.30);bookIncome(bonus,'endorsement',S.org,S.orgTeam);finish('gold','話題短暫變現',`消費 ${costText(cost)} 後換來 ${costText(bonus)} 合作收入。`);}else{S.injNext+=4;finish('bad','帳單與疲勞',`消費 ${costText(cost)}，沒有換到合約，失衡作息還提高下季傷病風險。`);}});}}
    ,{id:'taxpro',t:'聘請跨國稅務與合約會計師',s:`預估 ${rangeText(Math.max(base*.55,take*.07))}｜降低補稅與現金流失控風險`,f:()=>{const cost=randomizedSpend(Math.max(base*.55,take*.07),'living','稅務與合約會計');S.finance.taxPrepared=true;markFinanceDiscipline();finish('good','帳務先整理乾淨',`實際支付 ${costText(cost)}，把薪資、獎金、代言與跨國扣繳整理成同一份年度報表。`);}},
    {id:'insurance',t:'加保傷病、失能與家庭醫療保障',s:`預估 ${rangeText(Math.max(base*.65,take*.09))}｜下季傷病風險 −3%；重大支出波動降低`,f:()=>{const cost=randomizedSpend(Math.max(base*.65,take*.09),'living','球員保險');S.injNext-=3;S.finance.insured=true;markFinanceDiscipline();finish('good','先替最壞情況留後路',`實際支付 ${costText(cost)} 完成球員與家庭保障；保險不會讓你不受傷，但能降低場外衝擊。`);}},
    {id:'education',t:S.org==='NPB'?'進修日語、數據與媒體應對':'進修語言、數據與媒體應對',s:`預估 ${rangeText(Math.max(base*.5,take*.08))}｜團隊關係 +1；累積媒體事件履歷`,f:()=>{const cost=randomizedSpend(Math.max(base*.5,take*.08),'living','球員進修');S.chemistry=clamp((S.chemistry||0)+1,-5,5);eventProfile().mediaWins++;finish('good','把場外能力也當成專業',`實際支付 ${costText(cost)} 完成語言、訪談與數據閱讀課程。永久球場能力沒有直接增加。`);}},
    {id:'equipment',t:'更新個人數據設備與訓練器材',s:`預估 ${rangeText(Math.max(base*.7,take*.12))}｜下一季訓練骰 +1；傷病風險 +1%`,f:()=>{const cost=randomizedSpend(Math.max(base*.7,take*.12),'living','數據設備與器材');S.offseasonTrainingDice=clamp((S.offseasonTrainingDice||0)+1,0,3);S.injNext+=1;finish('good','設備只是工具',`實際支付 ${costText(cost)} 更新攝影、感測與訓練器材；成果仍要靠你下一季親自練出來。`);}},
    {id:'resttrip',t:S.love.st==='single'?'安排真正離開棒球的短期旅行':'和家人安排不碰棒球的休假',s:`預估 ${rangeText(Math.max(base*.75,take*.13))}｜家庭關係 +1、下季傷病風險 −3%；不增加訓練骰`,f:()=>{const cost=randomizedSpend(Math.max(base*.75,take*.13),'family','休賽季旅行');S.love.affection=(S.love.affection||0)+1;S.injNext-=3;finish('good','讓身體和腦袋一起休息',`實際支付 ${costText(cost)}；沒有能力加點，但恢復品質確實改善。`);}},
    {id:'business',t:'投入小額副業與個人品牌',risk:true,s:'投入約可支配收入 12%｜成功可能增加收入；失敗會損失本金並分散注意力',f:()=>{const cost=randomizedSpend(take*.12,'luxury','副業與個人品牌');quickRoll({sides:100,title:'副業年度結算',probability:45}).then(r=>{if(r.success){const income=Math.round(cost*(1.15+R()*.55));bookIncome(income,'endorsement',S.org,S.orgTeam);finish('gold','副業開始自我運轉',`投入 ${costText(cost)}，本年回收與收入共 ${costText(income)}。`);}else{S.injNext+=2;finish('bad','時間比資金更昂貴',`投入 ${costText(cost)} 沒有回收，額外行程還讓下季恢復變差。`);}});}}
  ];
  if(!f.homeOwned&&f.cash>=base*3)plans.push({id:'home',t:'購置自用住宅',s:`投入目前現金約 65% 作為房屋權益｜交易與裝修另計；可動用現金會大幅下降`,f:()=>{
    const purchase=buyHomeWithCash(Math.max(base*2,syncFinance().cash*.65)),expense=randomizedSpend(Math.round(purchase*.12),'living','購屋交易與裝修成本',.25);finish('good','有了自己的家',`把 ${costText(purchase)} 從現金轉成房屋權益，另支付交易、裝修及搬遷成本 ${costText(expense)}。房產計入淨資產，但不能直接拿來消費。`);}});
  if(f.debt>0)plans.push({id:'repay',t:'優先償還負債',main:true,s:`目前負債 ${costText(f.debt)}｜最多使用 70% 現金還款，停止利息繼續侵蝕淨資產`,f:()=>{const paid=repayDebt(syncFinance().cash*.70),living=randomizedSpend(base,'living','基本生活',.12);markFinanceDiscipline();finish('good','先把洞補起來',`償還 ${costText(paid)}，並支付基本生活 ${costText(living)}。剩餘負債仍會在下一年計息。`);}});
  if(S.org==='NPB'||S.org==='MiLB')plans.push({id:'culture',t:S.org==='NPB'?'聘請日語與生活支援團隊':'聘請英語與旅外生活支援團隊',s:`預估 ${rangeText(Math.max(base+familyBase,take*.14))}｜團隊關係 +1、本季狀態 +1`,f:()=>{
    const cost=randomizedSpend(Math.max(base+familyBase,take*.14),'living','旅外生活支援');S.chemistry=clamp((S.chemistry||0)+1,-5,5);addSeasonState(1);finish('good','生活不再只靠硬撐',`實際支付 ${costText(cost)} 處理語言、租屋、交通與家人安置。`);}});
  for(let i=plans.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[plans[i],plans[j]]=[plans[j],plans[i]];}
  const stable={t:f.homeOwned?'維持自住宅與穩健現金流':'穩健生活，保留現金',main:true,s:`${profile.country}生活、家庭與移動預估 ${rangeText(base+familyBase)}｜低波動但仍非固定金額`,f:()=>{
    const cost=randomizedSpend(base+familyBase,'living','穩健生活',.12);markFinanceDiscipline();finish('info','年度財務報表',`${summary}<br>本年生活與家庭實際支出 ${costText(cost)}。`);}};
  const choices=[stable,...plans];for(let i=choices.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
  choose(`休賽季財務｜${reason||profile.country}｜${summary}`,choices.slice(0,4).map(o=>({...o,modal:true})));
}
/* ================= UI 基礎 ================= */
const $=id=>document.getElementById(id);
function randomSubset(items,n){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,Math.min(n||4,a.length));}
function stableIndex(text,n){let h=0;for(const ch of String(text||''))h=(h*31+ch.charCodeAt(0))>>>0;return h%n;}
function teamMonogram(name){const clean=String(name||'—').replace(/[\s・|｜]/g,'');if(!clean)return '—';const latin=clean.match(/[A-Za-z0-9]+/g);return latin?latin.map(x=>x[0]).join('').slice(0,3).toUpperCase():clean.slice(0,2);}
function phaseName(){const now=$('broadcast-now')&&$('broadcast-now').textContent||'';return /季初/.test(now)?'季初':/賽季中/.test(now)?'賽季中':/季末/.test(now)?'季末':'生涯';}
function latestSeasonEntry(){return (S&&S.log||[]).filter(x=>x&&x.st).slice(-1)[0]||null;}
function currentParkContext(){
  const minor=['R','A1','A2','A3'].includes(S.lv);
  if(minor){
    const pool=[
      {n:'小聯盟投手型球場',d:'寬廣外野與較厚重空氣壓低長打',run:94,hit:97,hr:89},
      {n:'小聯盟中性球場',d:'場地尺寸與攻守條件接近該層級平均',run:100,hit:100,hr:100},
      {n:'小聯盟打者型球場',d:'較小腹地與乾燥空氣提高長打機會',run:106,hit:103,hr:112}];
    const raw=pool[stableIndex(`${S.orgTeam}-${S.lv}`,pool.length)],half=x=>1+(x/100-1)*.5;
    return {...raw,kind:'park',p:0,h:0,inj:0,runF:half(raw.run),hitF:half(raw.hit),hrF:half(raw.hr),impact:`整季換算：得分環境 ${raw.run>100?'+':''}${raw.run-100}%、安打 ${raw.hit>100?'+':''}${raw.hit-100}%、全壘打 ${raw.hr>100?'+':''}${raw.hr-100}%（主場場次折半套用）`};
  }
  const raw=TEAM_PARK_PROFILES[S.orgTeam];
  if(raw){
    const [venue,run,hit,hr]=raw,half=x=>1+(x/100-1)*.5;
    const type=run>=107?'打者明顯有利':run>=103?'偏打者':run<=93?'投手明顯有利':run<=97?'偏投手':'接近中性',signed=x=>(x>0?'+':'')+x+'%';
    return {kind:'park',n:`${venue}｜${type}`,d:`${S.lv==='MLB'?'Statcast 三年':'球場條件換算'}指數：得分 ${run}、安打 ${hit}、全壘打 ${hr}`,p:0,h:0,inj:0,runF:half(run),hitF:half(hit),hrF:half(hr),impact:`整季實際套用：得分 ${signed(Math.round((half(run)-1)*100))}、安打 ${signed(Math.round((half(hit)-1)*100))}、全壘打 ${signed(Math.round((half(hr)-1)*100))}`};
  }
  return {kind:'park',n:'中性主場',d:'目前沒有足夠球場資料，採聯盟平均環境',p:0,h:0,inj:0,runF:1,hitF:1,hrF:1,impact:'安打、全壘打與失分不做球場修正'};
}
function travelContext(){
  let x;
  if(S.stage!=='PRO')x=pick([{n:'區域賽程',d:'移動距離有限，主要負荷來自密集盃賽',p:0,h:0,inj:0,schedule:1},{n:'雨後補賽',d:'延賽把幾週行程壓得更密集',p:-.4,h:-.4,inj:3,schedule:.98}]);
  else if(['R','A1','A2','A3'].includes(S.lv))x=pick([{n:'小聯盟巴士移動',d:'長途巴士與早晚場壓縮睡眠恢復',p:-.7,h:-.7,inj:4,schedule:.96},{n:'同區連戰',d:'系列賽集中在同一區域，移動負荷正常',p:0,h:0,inj:0,schedule:1},{n:'密集客場週',d:'跨城連戰與臨時調度考驗恢復',p:-.5,h:-.5,inj:3,schedule:.98}]);
  else if(S.org==='CPBL')x=pick([{n:'島內標準賽程',d:'移動距離短，休息主要受晚場與補賽影響',p:.2,h:.2,inj:0,schedule:1},{n:'梅雨補賽期',d:'延賽集中補打，短期出賽變得密集',p:-.5,h:-.5,inj:3,schedule:.97}]);
  else if(S.org==='NPB')x=pick([{n:'標準聯盟賽程',d:'主客場與休息日按日職節奏分布',p:0,h:0,inj:0,schedule:1},{n:'交流戰移動',d:'跨聯盟與南北移動增加恢復難度',p:-.4,h:-.4,inj:2,schedule:.98},{n:'連續主場週',d:'移動減少，睡眠與訓練較規律',p:.5,h:.5,inj:-2,schedule:1}]);
  else x=pick([{n:'跨時區客場',d:'大聯盟長距離飛行與時差增加恢復負擔',p:-.6,h:-.6,inj:4,schedule:.97},{n:'標準大聯盟賽程',d:'移動與休息日接近正常分布',p:0,h:0,inj:0,schedule:1},{n:'長段主場',d:'連續主場讓睡眠與訓練更穩定',p:.5,h:.5,inj:-2,schedule:1}]);
  return {...x,kind:'schedule',impact:`可用出賽量 ×${(x.schedule||1).toFixed(2)}｜表現修正 ${(S.pos==='P'?x.p:x.h)>=0?'+':''}${S.pos==='P'?x.p:x.h}｜傷病風險 ${(x.inj||0)>=0?'+':''}${x.inj||0}%`};
}
function weatherContext(){
  const pool=S.org==='CPBL'?[SEASON_FACTORS.weather[0],SEASON_FACTORS.weather[2],SEASON_FACTORS.weather[1]]:
    S.org==='NPB'?[SEASON_FACTORS.weather[0],SEASON_FACTORS.weather[1],SEASON_FACTORS.weather[2],SEASON_FACTORS.weather[3]]:
    SEASON_FACTORS.weather;
  const base=pick(pool),schedule=base.n==='多雨賽季'?.97:base.n==='炎熱潮濕'?.99:1;
  return {...base,kind:'weather',schedule,impact:`可用出賽量 ×${schedule.toFixed(2)}｜表現修正 ${(S.pos==='P'?base.p:base.h)>=0?'+':''}${S.pos==='P'?base.p:base.h}｜傷病風險 ${(base.inj||0)>=0?'+':''}${base.inj||0}%`};
}
function staffContext(){
  const key=`${S.orgTeam||S.team}-${S.lv||S.stage}`;
  if(S.staffKey!==key||!S.staffProfile||chance(24)){S.staffKey=key;S.staffProfile=pick(SEASON_FACTORS.staff);}
  const base=S.staffProfile,trainingDice=base.n==='高壓教練團'?1:0;
  return {...base,kind:'staff',trainingDice,impact:`表現修正 ${(S.pos==='P'?base.p:base.h)>=0?'+':''}${S.pos==='P'?base.p:base.h}｜傷病風險 ${(base.inj||0)>=0?'+':''}${base.inj||0}%${trainingDice?'｜季初訓練骰 +1 顆':''}`};
}
function roomContext(){
  const prev=Number.isFinite(S.prevSeasonD)?S.prevSeasonD:0,chem=S.chemistry||0;
  const roomKey=S.stage==='PRO'?`${S.org}-${S.orgTeam}`:S.team;
  if(S.traits.cancer||S.demotionRefused||S.complainCount>=2||(prev<=-4&&S.stage==='PRO'))return {n:'交易流言升溫',d:'低潮或場外摩擦讓球團開始詢價',p:-.8,h:-.8,inj:1,trade:20};
  if(chem>=3)return {n:'更衣室團結',d:'長期累積的默契讓連敗時仍有人互相補位',p:.7,h:.7,inj:-1};
  if(chem<=-2||S.traits.island)return {n:'更衣室關係緊繃',d:'溝通與角色分配失衡，場上合作受到影響',p:-.8,h:-.8,inj:1};
  if(S.stage==='PRO'&&S.roomTeamKey!==roomKey){S.roomTeamKey=roomKey;return {n:'新環境磨合',d:'剛加入球隊，暗號、隊友與教練要求都要重新適應',p:-.3,h:-.3,inj:0};}
  if(prev>=3)return {n:'良性競爭',d:'上季好表現拉高隊內標準，位置競爭也更激烈',p:.6,h:.6,inj:2};
  return {n:'更衣室平穩',d:'目前沒有重大衝突，角色與溝通維持正常',p:0,h:0,inj:0};
}
function makeSeasonContext(){
  const items=[currentParkContext(),weatherContext(),travelContext(),staffContext(),roomContext()];
  const perf=items.reduce((n,x)=>n+(S.pos==='P'?x.p:x.h),0);
  const injury=clamp(items.reduce((n,x)=>n+x.inj,0),-5,10);
  const scheduleF=clamp(items.reduce((n,x)=>n*(x.schedule||1),1),.88,1),trainingDice=items.reduce((n,x)=>n+(x.trainingDice||0),0),trade=items.reduce((n,x)=>n+(x.trade||0),0);
  items.forEach(x=>{if(!x.impact)x.impact=`表現修正 ${(S.pos==='P'?x.p:x.h)>=0?'+':''}${S.pos==='P'?x.p:x.h}｜傷病風險 ${(x.inj||0)>=0?'+':''}${x.inj||0}%${x.trade?`｜交易機率 +${x.trade}%`:''}`;});
  return {items,perf:+perf.toFixed(1),injury,scheduleF:+scheduleF.toFixed(3),trainingDice,trade,park:items.find(x=>x.kind==='park')};
}
function makeSeasonPlan(){
  /* 場內事件與三條生活線獨立抽取；同一年最多兩條支線，避免固定套餐。 */
  const pro=S.stage==='PRO',mainQuiet=chance(pro?55:62),r=R(),events=mainQuiet?0:r<.84?1:r<.98?2:3;
  let team=chance(pro?14:11),family=S.age>=18&&chance(pro?18:12),fan=chance(pro?14:8);
  const sides=[['team',team],['family',family],['fan',fan]].filter(x=>x[1]);if(sides.length>2){const drop=pick(sides)[0];if(drop==='team')team=false;if(drop==='family')family=false;if(drop==='fan')fan=false;}
  return {events,team,family,fan,quiet:events===0&&!team&&!family&&!fan,mainQuiet};
}
function hsTeamImpact(value){
  const v=clamp(Math.round(Number(value)||0),-5,5);
  return {value:v,performance:+(v*.35).toFixed(1),usage:v*2,cup:Math.round(v*.8)};
}
function hsCupForecast(effect){
  effect=effect||{};const chem=clamp((S.chemistry||0)+(effect.chem||0),-5,5),relation=hsTeamImpact(chem),par=amateurSeasonConfig().par;
  const tB=({1:5,2:1,3:-2})[S.hsTier||2],teamBase=Math.round(tB*79/60),yearBonus=(S.stageYr-1)*2,cupBonus=(S.hsCupBonus||0)+(effect.cup||0),state=clamp((S.pendStat||0)+(effect.state||0),-4,4);
  const contextBonus=Math.round(((S.seasonContext&&S.seasonContext.perf)||0)*.7),stateBonus=Math.round(state*1.2),sw=seasonSwing(),adjustedSwing=clamp(sw.total-sw.chemistry-sw.pending+relation.performance+state*.45,-8,8);
  const core=S.pos==='P'?ratingGap(S.ab.vel,par)*.30+ratingGap(S.ab.brk,par)*.35+ratingGap(S.ab.ctl,par)*.35:ratingGap(S.ab.con*.58+S.ab.eye*.22+S.ab.spd*.20,par);
  const performanceBonus=Math.round(clamp((core+adjustedSwing)*.22,-3,4)),base=ovr()+teamBase+yearBonus+cupBonus+relation.cup+stateBonus+contextBonus+performanceBonus,cuts=[50,44,38,32,25].map(r99),diffs=[0,-1,-2];
  const odds=cut=>Math.round(diffs.reduce((sum,diff)=>{let hit=0,total=0;for(let shared=-5;shared<=5;shared++)for(let cup=-6;cup<=6;cup++){total++;if(base+diff+shared+cup>=cut)hit++;}return sum+hit/total;},0)/diffs.length*100);
  return {top8:odds(cuts[3]),top4:odds(cuts[2]),base,teamBase,yearBonus,cupBonus,relationCup:relation.cup,stateBonus,contextBonus,performanceBonus,relation};
}
function hsEffectText(e){
  const out=[],signed=v=>`${v>0?'+':''}${v}`;
  if(e.cup)out.push(`三項大賽晉級戰力 ${signed(e.cup)}`);
  if(e.chem)out.push(`團隊關係 ${signed(e.chem)}`);
  if(e.usage)out.push(`上場競爭 ${signed(e.usage)}%`);
  if(e.dice)out.push(`季初訓練骰 ${signed(e.dice)} 顆`);
  if(e.inj)out.push(`需要缺賽的傷病率 ${signed(e.inj)}%`);
  if(e.state)out.push(`當季表現與大賽狀態 ${signed(e.state)}`);
  return out.join('｜')||'不改變數值';
}
function applyHsPlanEffect(e){
  if(e.cup)S.hsCupBonus+=e.cup;if(e.chem)S.chemistry=clamp((S.chemistry||0)+e.chem,-5,5);if(e.usage)S.hsUsageBonus+=e.usage;if(e.dice)S.hsTrainingDiceMod+=e.dice;if(e.inj)S.tmpInj+=e.inj;if(e.state)addSeasonState(e.state);
}
function highSchoolSeasonChoice(done){
  const level=({1:'全國強權',2:'中堅校隊',3:'挑戰者'})[S.hsTier||2],plans=[
    {id:'steady',safe:true,t:'依身體回饋調整每週課表',e:{cup:1,inj:-2},summary:'穩定完成訓練，把健康與大賽狀態一起守住'},
    {id:'starter',risk:true,t:S.pos==='P'?'爭取王牌先發與關鍵局數':'爭取固定先發與中心棒次',e:{cup:3,usage:8,inj:4},summary:'用較高負荷直接競爭最重要的比賽角色'},
    {id:'team',t:'和隊友加練戰術與守備配合',e:{cup:2,chem:1,usage:3,dice:-1},summary:'把個人訓練時間轉投資在團隊執行力'},
    {id:'individual',t:'把課後時間集中投入個人技術',e:{dice:1,cup:-2,chem:-1},summary:'增加個人成長機會，但減少團隊合練'},
    {id:'showcase_game',min:2,risk:true,t:'參加高強度公開交流賽',e:{state:1,cup:-1,usage:3,inj:3},summary:'用更強的實戰檢驗自己，結果直接反映在本季成績與出賽競爭'},
    {id:'video',t:'負責研究下一輪對手影片',e:{cup:2,usage:2,dice:-1},summary:'用情蒐與賽前分工提高大賽執行力'},
    {id:'recovery',safe:true,t:'保護身體並兼顧課業',e:{inj:-6,dice:-1},summary:'犧牲部分訓練量，降低真正需要缺賽的傷病風險'},
    {id:'captain',min:2,t:'承擔隊長與賽前溝通',e:{cup:2,chem:1,usage:4,inj:2},summary:'扛起場上與休息室責任，角色上升但負荷也增加'},
    {id:'versatile',t:'接受多守位與替補調度',e:{cup:1,usage:7,inj:2},summary:'用角色彈性爭取更多實際出賽'},
    {id:'extra',risk:true,t:'每天加練到最後一班車',e:{dice:1,cup:1,inj:5},summary:'高負荷同時追求個人成長與大賽準備'},
    {id:'academic',safe:true,t:'先守住課業與睡眠品質',e:{inj:-4,cup:-1},summary:'避免課業壓力拖進球場，但縮短大賽備戰時間'},
    {id:'psych',t:'安排運動心理與壓力演練',e:{state:1,dice:-1},summary:'減少臨場失常，代價是一部分技術訓練量'},
    {id:'showcase',min:2,risk:true,t:'跨縣市參加高張力交流賽',e:{state:1,cup:1,usage:3,inj:4},summary:'把自己放進更強的對戰環境，表現好壞會直接寫進履歷'},
    {id:'nutrition',safe:true,t:'重做校隊飲食與補水紀錄',e:{inj:-3,cup:1},summary:'用每天可執行的恢復計畫維持大賽狀態'},
    {id:'pitch_lab',pos:'P',t:'選一顆決勝球重新打磨',e:{dice:1,cup:-1,inj:2},summary:'建立兩好球武器，但暫時減少團隊戰術準備'},
    {id:'innings',pos:'P',safe:true,t:'和教練訂出年度局數上限',e:{inj:-7,cup:-2,usage:-10},summary:'明確減少局數與大賽負擔，保護仍在成長的手臂'},
    {id:'catcher_meet',pos:'C',t:'每週主持投捕策略會議',e:{cup:2,chem:1,usage:4,dice:-1},summary:'用投捕準備提高整隊執行力與自己的先發順位'},
    {id:'catch_throw',pos:'C',risk:true,t:'強化阻殺與本壘攻防',e:{dice:1,usage:3,inj:5},summary:'用高負荷強化捕手最直接的武器與上場競爭'},
    {id:'if_pivot',pos:'IF',t:'和二游搭檔建立雙殺節奏',e:{cup:2,chem:1,usage:4},summary:'讓內野守備形成固定節拍並提升先發信任'},
    {id:'if_utility',pos:'IF',t:'練習二、游、三壘輪替',e:{dice:1,usage:7,cup:-1},summary:'用內野多功能性換取名單位置與更多實際打席'},
    {id:'of_route',pos:'OF',t:'逐場記錄飛球路線與風向',e:{cup:2,usage:4,dice:-1},summary:'用可重複的判讀提升大賽守備與先發信任'},
    {id:'of_arm',pos:'OF',risk:true,t:'強化長傳與全速牆前追球',e:{dice:1,usage:3,inj:5},summary:'挑戰外野手臂與守備範圍的上限'}
  ];
  const eligible=plans.filter(x=>(!x.min||S.stageYr>=x.min)&&(!x.pos||x.pos===S.pos)),safe=eligible.filter(x=>x.safe),shown=[];
  if(safe.length)shown.push(pick(safe));
  const pool=eligible.filter(x=>!shown.includes(x));for(let i=pool.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  shown.push(...pool.slice(0,5));shown[0].main=true;
  const title=`高中球季計畫｜${S.team}・高${['一','二','三'][S.stageYr-1]}・${level}`;
  choose(title,shown.map(p=>{const forecast=hsCupForecast(p.e);return {t:p.t,s:hsEffectText(p.e),main:p.main,warn:p.warn,risk:p.risk,modal:true,sideTitle:`八強 ${forecast.top8}%`,sideNote:`四強 ${forecast.top4}%｜目前估算`,f:()=>{
    applyHsPlanEffect(p.e);S.hsPlan=p.t;S.hsPlanEffect={...p.e};const after=hsCupForecast({});
    card('info','球季計畫確定',`${p.summary}。<div class="statline">八強機會 ${after.top8}%｜四強機會 ${after.top4}%</div>`);board(0);continueAction('進入訓練 ▸',done);
  }};}));
}
function seasonPlanLabels(p){
  const out=[p.quiet?'場內平靜：沒有額外棒球事件':p.events?`${p.events} 段場內外事件`:'無事件卡'];if(p.team)out.push('隊內互動');if(p.family)out.push('私生活／戀愛／家庭');if(p.fan)out.push('球迷活動');return out;
}
function seasonSwing(){
  const luck=Number.isFinite(S.seasonLuck)?S.seasonLuck:10;
  const rawLuckAdj=(luck-10.5)*0.52,luckAdj=Math.abs(rawLuckAdj)<.3?0:rawLuckAdj;
  const contextAdj=(S.seasonContext&&S.seasonContext.perf)||0;
  const momentum=S.seasonMomentum||0,pending=clamp(S.pendStat||0,-4,4)*.45,chemistry=clamp(S.chemistry||0,-5,5)*.35;
  const traits=(S.traits.ace ? .3 : 0)+(S.traits.steady ? .25 : 0)+(S.traits.leader ? .3 : 0)+(S.traits.mentor ? .15 : 0)+(S.traits.globetrotter ? .15 : 0)+(S.traits.familyanchor&&S.love.st==='married'&&(S.love.affection||0)>=4 ? .15 : 0)-(S.traits.island ? .45 : 0)-(S.traits.booed ? .3 : 0),poach=activePoachEffect(),poachAdj=poach?(Number(poach.perfAdj)||0):0,npc=S.npcSeasonContext&&S.npcSeasonContext.year===S.year?(Number(S.npcSeasonContext.supportAdj)||0):0,f=S.finance?syncFinance():{debt:0},income=Math.max(1,Number(S.ct&&S.ct.annual)||100),finance=f.debt>income*3?-.65:f.debt>income*1.5?-.3:0;
  return {luck,luckAdj,contextAdj,momentum,pending,chemistry,traits,poach:poachAdj,npc,finance,total:clamp(luckAdj+contextAdj+momentum+pending+chemistry+traits+poachAdj+npc+finance,-8,8)};
}
function rollTone(r){
  if(r.success===null&&r.label)return {label:r.label,tone:r.tone||''};
  if(r.critical==='success')return r.risk?{label:'意外重傷',tone:'bad critical'}:{label:'意外大成功',tone:'good critical'};
  if(r.critical==='failure')return r.risk?{label:'驚險避過',tone:'good critical'}:{label:'意外大失敗',tone:'bad critical'};
  if(r.success===true)return {label:r.risk?'風險觸發':'判定成功',tone:r.risk?'bad':'good'};
  if(r.success===false)return {label:r.risk?'安全通過':'判定失敗',tone:r.risk?'good':'bad'};
  return {label:r.label||'骰點完成',tone:r.tone||''};
}
function recordRoll(entry){
  if(!S)return;
  S.lastRoll=entry; S.rolls=S.rolls||[]; S.rolls.unshift(entry); S.rolls=S.rolls.slice(0,8);
  renderRails();
}
function renderRails(){
  if(!S)return;
  const overall=ovr(), ring=$('scout-ring');
  if(ring)ring.style.setProperty('--ovr-angle',(overall/RATING_MAX*100)+'%');
  if($('rail-ovr'))$('rail-ovr').textContent=overall;
  if($('rail-type'))$('rail-type').textContent=playerType();
  if($('rail-role'))$('rail-role').textContent=`${S.dpos?DPN[S.dpos]:POSN[S.pos]}${S.role?' · '+roleN(S.role):''}｜${S.age} 歲`;
  { const latest=latestSeasonEntry(),team=S.stage==='PRO'?(S.orgTeam||S.teamName()):(S.team||stageLabel()),level=S.stage==='PRO'&&S.lv&&LV[S.lv]?LV[S.lv].n:stageLabel(),mine=S.currentStandings&&S.currentStandings.mine;
    if($('rail-season-team'))$('rail-season-team').innerHTML=`<strong>${team||'尚未加入球隊'}</strong><span>${level}${S.role?'・'+roleN(S.role):S.dpos?'・'+DPN[S.dpos]:''}｜${S.year} 年</span>`;
    if($('rail-season-stats')){const el=$('rail-season-stats');el.textContent=latest?`${latest.y}｜${latest.line}`:'完成第一個球季後，這裡會固定顯示最近正式成績。';el.classList.toggle('empty',!latest);}
    if($('rail-season-record'))$('rail-season-record').innerHTML=`<span>球隊戰績</span><b>${mine?`${mine.W}-${mine.L}｜${mine.pct.toFixed(3).replace(/^0/,'')}`:'尚未產生'}</b>`;
    if($('rail-npc-depth')){$('rail-npc-depth').innerHTML=S.stage==='PRO'?npcDepthHTML():'<span>位置競爭</span><b>進入職業後建立</b>';}
  }
  if($('rail-abilities'))$('rail-abilities').innerHTML=POS_AB[S.pos].map(k=>{
    const v=S.ab[k],rawPot=(S.pot&&S.pot[k])||r99(62),pot=Math.max(v,rawPot);
    return `<div class="ability-row" title="目前 ${v}／球探預估上限 ${pot}／滿分 99"><span>${ABL[k]}</span><span class="track"><i style="width:${v/RATING_MAX*100}%"></i><em style="left:${pot/RATING_MAX*100}%"></em></span><b>${v}<small>/${pot}</small></b></div>`;
  }).join('');
  if($('rail-injury'))$('rail-injury').textContent=injuryProb()+'%';
  if($('rail-big-inj'))$('rail-big-inj').textContent=S.bigInj||0;
  if($('rail-mode'))$('rail-mode').textContent=S.rngMode==='destiny'?'同種子':'完全隨機';
  const lk=S.seasonLuck||10,form=lk>=18?'生涯年':lk>=14?'火燙':lk>=8?'正常':lk>=4?'低潮':'崩盤',mom=S.seasonMomentum||0,sw=seasonSwing(),stateAdj=sw.luckAdj;
  if($('rail-form')){const el=$('rail-form'),signed=v=>(v>0?'+':'')+v.toFixed(1),momentumLabel=mom>.05?'上升':mom<-.05?'下滑':'平穩';el.textContent=`手感：${form}（${signed(stateAdj)}）｜事件氣勢：${momentumLabel}（${signed(mom)}）｜總修正 ${signed(sw.total)}`;el.title='總修正會直接套入當季出賽角色、投打成績與年度獎項競爭；正數是加成，負數是減益。';}
  { const so=socialState(),fan=clamp(so.fanRep||0,-20,20),player=clamp(so.playerRep||0,-20,20),team=teamRelationView();
    if($('rail-fan-rep'))$('rail-fan-rep').textContent=(fan>=0?'+':'')+fan;
    if($('rail-player-rep'))$('rail-player-rep').textContent=(player>=0?'+':'')+player;
    if($('rail-fan-bar'))$('rail-fan-bar').style.width=((fan+20)/40*100)+'%';
    if($('rail-player-bar'))$('rail-player-bar').style.width=((player+20)/40*100)+'%';
    if($('rail-team-bar'))$('rail-team-bar').style.width=((team.value+5)/10*100)+'%';
    if($('rail-team-rel'))$('rail-team-rel').textContent=`${team.value>0?'+':''}${team.value} ${team.label}`;
    if($('rail-traits')){
      const labels={...STATIC_TRAIT_LABELS,...DYNAMIC_TRAIT_LABELS};
      if(S.traits.mrteam)labels.mrteam=(teamNick(S.mrTeamName||'')||'球隊')+'先生';
      if(S.traits.legend)labels.legend=(S.legendLeague||'')+'歷史級球星';
      const tags=Object.keys(labels).filter(k=>S.traits[k]).map(k=>traitTagHTML(k,labels[k]));$('rail-traits').innerHTML=tags.join('')||'<span class="tag">尚未形成特性</span>';
    }
    if($('rail-trait-path')){const ep=eventProfile(),tp=traitProgress(),labels={...STATIC_TRAIT_LABELS,...DYNAMIC_TRAIT_LABELS},unlocked=Object.keys(labels).filter(k=>S.traits[k]).length,parts=[`特性 ${unlocked}/${Object.keys(labels).length}`,`事件 ${ep.wins}/${ep.total} 成功`];if(S.pos==='P')parts.push(`投手任務 ${ep.positionWins}/2`);else parts.push(`${POSN[S.pos]}事件 ${ep.positionWins}/2`);if(S.pos!=='P')parts.push(`守備好季 ${tp.defense||0}/2`);else parts.push(`王牌好季 ${tp.elite||0}/2`);parts.push('點特性可看已套用加成');$('rail-trait-path').textContent=parts.join('｜');}
  }
  const env=$('rail-environment');
  if(env&&S.seasonContext){let chips=S.seasonContext.items.map(x=>`<div class="env-chip"><i></i><div><b>${x.n}</b><small>${x.d}</small></div></div>`).join('');
    if(S.seasonPlan)chips+=`<div class="env-chip"><i style="background:var(--good)"></i><div><b>本季隨機行程</b><small>${seasonPlanLabels(S.seasonPlan).join('・')}</small></div></div>`;
    if(S.teammate)chips+=`<div class="env-chip"><i style="background:var(--amber)"></i><div><b>${S.teammate.name} · ${S.teammate.role}</b><small>隊友默契 ${S.chemistry>=0?'+':''}${S.chemistry}</small></div></div>`;env.innerHTML=chips;}
  const lr=S.lastRoll;
  if(lr){
    $('rail-roll-num').textContent=lr.display;
    $('rail-roll-kind').textContent=lr.title;
    $('rail-roll-outcome').textContent=lr.outcome;
    $('rail-roll-outcome').style.color=lr.good?'var(--good)':lr.bad?'var(--bad)':'var(--chalk)';
  }
  if($('rail-roll-history')&&S.rolls&&S.rolls.length)$('rail-roll-history').innerHTML=S.rolls.slice(0,5).map(r=>`<div><span>${r.title}</span><b>${r.display}</b></div>`).join('');
  if(S.finance){
    const f=syncFinance();
    if($('rail-cash'))$('rail-cash').textContent=fmtMoney(f.cash);
    if($('rail-net')){$('rail-net').textContent=fmtMoney(f.netWorth);$('rail-net').style.color=f.netWorth<0?'var(--bad)':'';}
    if($('rail-assets'))$('rail-assets').textContent=fmtMoney((f.investments||0)+(f.homeEquity||0));
    if($('rail-debt')){$('rail-debt').textContent=fmtMoney(f.debt);$('rail-debt').style.color=f.debt>0?'var(--bad)':'';}
    if($('rail-gross'))$('rail-gross').textContent=fmtMoney(f.gross);
    if($('rail-tax'))$('rail-tax').textContent=fmtMoney(f.tax);
    if($('rail-spend'))$('rail-spend').textContent=fmtMoney((f.living||0)+(f.luxury||0)+(f.family||0));
    if($('rail-contract'))$('rail-contract').textContent=S.stage==='PRO'&&S.ct?`${S.ct.yrs} 年剩餘｜年薪 ${fmtLocalMoney(S.ct.annual||0,S.org)}｜保障 ${Math.round((S.ct.guaranteed||0)*100)}%`:'尚未進入職業';
    if($('rail-roster-box'))$('rail-roster-box').style.display=S.stage==='PRO'&&S.org==='MiLB'?'':'none';
    if($('rail-roster')&&S.org==='MiLB'){const rs=mlbRosterStatus(),mr=mlbRosterState();$('rail-roster').textContent=`${rs.label}｜本季 option ${rs.assignments}/5 次${mr.outrightCount?`｜生涯 outright ${mr.outrightCount} 次`:''}`;}
  }
}
let modalReturnFocus=null;
function openFx(id){ const el=$(id);modalReturnFocus=document.activeElement;el.classList.remove('finalizing','reveal-good','reveal-bad');el.classList.add('open');el.setAttribute('aria-hidden','false');const machine=el.querySelector('.roll-machine,.season-machine,.summary-machine,.career-machine,.save-machine');if(machine)machine.scrollTop=0;document.body.style.overflow='hidden';requestAnimationFrame(()=>{const focus=el.querySelector('button:not([disabled]),[tabindex="0"]');if(focus)focus.focus({preventScroll:true});}); }
function closeFx(id){ const el=$(id),returnFocus=modalReturnFocus;modalReturnFocus=null;el.classList.remove('open','finalizing','reveal-good','reveal-bad');el.setAttribute('aria-hidden','true');if(id==='roll-overlay'&&$('roll-stop'))$('roll-stop').style.display='none';document.body.style.overflow='';if(returnFocus&&document.contains(returnFocus))requestAnimationFrame(()=>{if(document.contains(returnFocus)&&typeof returnFocus.focus==='function')returnFocus.focus({preventScroll:true});}); }
let rollAudio=null;
function playRollSound(kind){
  try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;rollAudio=rollAudio||new AC();const o=rollAudio.createOscillator(),g=rollAudio.createGain(),now=rollAudio.currentTime;o.connect(g);g.connect(rollAudio.destination);o.type=kind==='bad'?'sawtooth':'sine';o.frequency.setValueAtTime(kind==='stop'?180:kind==='good'?520:120,now);if(kind==='good')o.frequency.exponentialRampToValueAtTime(780,now+.16);if(kind==='bad')o.frequency.exponentialRampToValueAtTime(70,now+.2);g.gain.setValueAtTime(.045,now);g.gain.exponentialRampToValueAtTime(.001,now+(kind==='stop'?.08:.22));o.start(now);o.stop(now+(kind==='stop'?.09:.23));}catch(_){ }
}
function manualReels(els,values,spinValue,onStep,onDone){
  let next=0,locked=false;const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches,unit=els[0]&&els[0].classList.contains('pool-die')?'顆':'格',stopBtn=$('roll-stop'),slotArea=$('roll-slots');
  const timer=reduced?null:setInterval(()=>els.forEach((e,i)=>{if(i>=next)e.textContent=spinValue();}),70);
  const sync=()=>{els.forEach((e,i)=>{e.classList.toggle('ready',!locked&&i===next);e.tabIndex=!locked&&i===next?0:-1;e.setAttribute('aria-label',i===next?`停下第 ${i+1} ${unit}`:`第 ${i+1} ${unit}`);});if(stopBtn){stopBtn.style.display=next<els.length?'block':'none';stopBtn.disabled=locked;stopBtn.textContent=locked?`第 ${next+1} ${unit}減速中…`:`停下第 ${next+1} ${unit}`;}};
  const stop=i=>{
    if(i!==next||locked||i>=els.length)return;locked=true;const e=els[i];e.classList.remove('ready');e.classList.add('braking');sync();onStep(next,els.length,true);playRollSound('stop');
    setTimeout(()=>{e.textContent=values[i];e.classList.remove('spinning','ready','braking');e.classList.add('stopped');next++;locked=false;
      if(next>=els.length){if(timer)clearInterval(timer);sync();$('roll-overlay').classList.add('finalizing');onStep(next,els.length,false,true);if(navigator.vibrate)navigator.vibrate([25,45,35]);setTimeout(()=>{$('roll-overlay').classList.remove('finalizing');onDone();},reduced?120:650);return;}
      onStep(next,els.length);sync();els[next].focus({preventScroll:true});
    },reduced?80:260+i*55);
  };
  els.forEach((e,i)=>{e.setAttribute('role','button');e.onpointerdown=ev=>{ev.preventDefault();stop(i);};e.onclick=null;e.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();stop(i);}};});
  if(stopBtn)stopBtn.onclick=()=>stop(next);
  if(slotArea)slotArea.onpointerdown=ev=>{if(!ev.target.closest('.slot-digit,.pool-die')){ev.preventDefault();stop(next);}};
  sync();onStep(0,els.length);
}
function visualRi(a,b){return a+Math.floor(Math.random()*(b-a+1));}
function rollResult(cfg){
  const sides=cfg.sides||100, value=ri(1,sides), probability=cfg.probability==null?null:clamp(Math.round(cfg.probability),0,100);
  const threshold=probability==null?null:Math.max(1,Math.ceil((sides+1)-(probability/100*sides)));
  let success=threshold==null?null:value>=threshold,critical=null;
  if(sides===100){ if(value<=3){critical='failure';if(success!==null)success=false;} else if(value>=98){critical='success';if(success!==null)success=true;} }
  const result={sides,value,probability,threshold,success,critical,risk:!!cfg.risk};
  if(cfg.resolve){ const x=cfg.resolve(value,result)||{}; Object.assign(result,x); }
  return result;
}
function quickRoll(cfg){return Promise.resolve(rollResult(cfg));}
function animatedRoll(cfg){
  const result=rollResult(cfg),{sides,value,probability}=result,useThree=cfg.three===true||/重大|傷勢|手術|買斷|簽約|轉隊|選秀|升格|大聯盟|DFA|季後測試/.test(String(cfg.title||''));
  return new Promise(resolve=>{
    $('roll-overlay').classList.toggle('compact-roll',!useThree);
    $('roll-kicker').textContent=cfg.kicker||'拉霸判定';
    $('roll-title').textContent=cfg.title||'停下每一格';
    $('roll-sub').textContent=cfg.subtitle||'依序點擊亮起的格子，親手揭曉結果。';
    const digits=Math.max(1,String(sides).length,String(value).length);
    $('roll-slots').innerHTML=Array.from({length:digits},()=>'<div class="slot-digit spinning">0</div>').join('');
    const formula=[];
    if(probability!=null){
      formula.push(`<span>${cfg.risk?'健康風險':'局勢評估'} <b>${chanceBand(cfg.risk?100-probability:probability)}</b></span>`);
      formula.push(`<span>${cfg.risk?'安全範圍':'通過門檻'} <b>${cfg.risk?Math.max(0,result.threshold-1)+' 以下':result.threshold+' 以上'}</b></span>`);
    }
    (cfg.modifiers||[]).slice(0,4).forEach(x=>formula.push(`<span>${x}</span>`));
    $('roll-formula').innerHTML=formula.join('');
    $('roll-result').className='roll-result';$('roll-result').innerHTML='<small>點擊亮起的格子</small>';
    $('roll-stop').style.display='block';$('roll-accept').style.display='none';
    openFx('roll-overlay');
    if(useThree&&window.DiceFX)window.DiceFX.begin(Math.min(2,digits));
    const els=Array.from(document.querySelectorAll('#roll-slots .slot-digit'));
    const text=String(value).padStart(digits,'0').split('');
    manualReels(els,text,()=>visualRi(0,9),(stopped,total,braking,final)=>{$('roll-result').innerHTML=`<small>${final?'結果鎖定中…':braking?`第 ${stopped+1} 格正在減速…`:stopped?`${stopped}/${total} 格已停下${stopped===total-1?'｜最後一格':''}`:'點擊第一格開始'}</small>`;},()=>{
      if(useThree&&window.DiceFX)window.DiceFX.settle(value);
      const tone=rollTone(result),custom=cfg.resultText?cfg.resultText(result):tone.label;
      $('roll-result').className='roll-result '+tone.tone;
      const thresholdText=probability==null?'本次結果已結算':cfg.risk?`本次 ${value}｜安全需 ${Math.max(0,result.threshold-1)} 以下`:`本次 ${value}｜通過需 ${result.threshold} 以上`;
      $('roll-result').innerHTML=`<strong>${custom}</strong><small>${thresholdText}</small>`;
      const good=tone.tone.includes('good'),bad=tone.tone.includes('bad');
      $('roll-overlay').classList.add(good?'reveal-good':bad?'reveal-bad':'reveal-good');playRollSound(good?'good':bad?'bad':'stop');
      recordRoll({title:cfg.title||'隨機結果',display:String(value),outcome:custom,probability,good,bad});
      $('roll-accept').style.display='block';
      $('roll-accept').onclick=()=>{closeFx('roll-overlay');resolve(result);};
    });
  });
}
function animatedDicePool(n,min,title){
  const dice=Array.from({length:n},()=>trainingRoll(min||1));
  return new Promise(resolve=>{
    $('roll-overlay').classList.remove('compact-roll');
    $('roll-kicker').textContent='訓練拉霸';$('roll-title').textContent=title||'季初訓練';
    $('roll-sub').textContent='依序點亮起的骰子，或按下方按鈕，一顆一顆停下。';
    $('roll-slots').innerHTML=`<div class="pool-dice">${dice.map(()=>'<div class="pool-die spinning">?</div>').join('')}</div>`;
    $('roll-formula').innerHTML=`<span><b>${n}</b> 顆獨立訓練骰</span><span>1～6 各 <b>1/6</b></span>${(min||1)>1?`<span>特性保底 <b>${min}</b> 點</span>`:''}`;
    $('roll-result').className='roll-result';$('roll-result').innerHTML='<small>點第一顆，或按「停下第 1 顆」開始</small>';$('roll-stop').style.display='block';$('roll-accept').style.display='none';
    openFx('roll-overlay');if(window.DiceFX)window.DiceFX.begin(Math.min(2,n));
    const els=Array.from(document.querySelectorAll('#roll-slots .pool-die'));
    manualReels(els,dice,()=>Math.max(min||1,visualRi(1,6)),(stopped,total,braking,final)=>{$('roll-result').innerHTML=`<small>${final?'訓練成果鎖定中…':braking?`第 ${stopped+1} 顆正在減速…`:stopped?`${stopped}/${total} 顆已停下${stopped===total-1?'｜最後一顆':''}`:'點第一顆，或按下方按鈕開始'}</small>`;},()=>{
      if(window.DiceFX)window.DiceFX.settle(dice[0]);
      const sixes=dice.filter(v=>v===6).length,total=dice.reduce((a,b)=>a+b,0);
      $('roll-result').className='roll-result '+(sixes?'good':'');$('roll-result').innerHTML=`<strong>${dice.join(' · ')}</strong><small>合計 ${total} 點</small>`;
      $('roll-overlay').classList.add('reveal-good');playRollSound('good');
      recordRoll({title:title||'季初訓練',display:String(total),outcome:`${n} 顆共 ${total} 點`,probability:null,good:sixes>0,bad:false});
      $('roll-accept').style.display='block';$('roll-accept').onclick=()=>{closeFx('roll-overlay');resolve(dice);};
    });
  });
}
function queueAchievement(item){if(!S)return;S.achievementQueue=S.achievementQueue||[];S.achievementQueue.push(item);}
function achievementFX(item){
  return new Promise(resolve=>{
    $('roll-overlay').classList.remove('compact-roll');
    $('roll-kicker').textContent=item.kicker||'生涯里程碑';$('roll-title').textContent=item.title||'重大成就';$('roll-sub').textContent=item.subtitle||'這段生涯紀錄已被正式寫下。';
    const mark=item.kind==='breakthrough'?'99':item.kind==='streak'?'連霸':item.kind==='mlb'?'MLB':item.kind==='promotion'?'一軍':'★',markLabel=item.kind==='breakthrough'?'上限突破':item.kind==='streak'?'連續獎項':item.kind==='mlb'?'大聯盟初登錄':item.kind==='promotion'?'層級升格':'新特性';
    $('roll-slots').innerHTML=`<div class="achievement-mark"><span>${mark}</span><small>${markLabel}</small></div>`;
    $('roll-formula').innerHTML=`<span>${item.detail||'生涯條件達標'}</span>${item.progress?`<span>目前進度 <b>${item.progress}</b></span>`:''}`;
    $('roll-result').className='roll-result good';$('roll-result').innerHTML=`<strong>${item.result||item.title}</strong><small>${item.note||'已加入生涯履歷'}</small>`;$('roll-stop').style.display='none';$('roll-accept').style.display='block';
    openFx('roll-overlay');if(window.DiceFX&&window.DiceFX.award)window.DiceFX.award(item.kind);
    $('roll-accept').onclick=()=>{$('roll-stop').style.display='';closeFx('roll-overlay');resolve();};
  });
}
function playAchievementQueue(done){
  const q=S.achievementQueue||(S.achievementQueue=[]);if(!q.length){done();return;}const item=q.shift();achievementFX(item).then(()=>playAchievementQueue(done));
}
/* 公平六面訓練骰：每顆獨立，1/2/3/4/5/6 各為 1/6；天賦只在擲出後抬高下限。 */
function trainingRoll(min){
  return Math.max(min||1,ri(1,6));
}
function applySeasonAdjustments(st){
  /* 本季狀態已在 seasonSwing 進入原始模擬；不再事後固定加減安打，避免板凳球員的小樣本被扣成不合理的 .029。 */
  if(S.pos==='P'&&S.seasonFactor>0){const em={'全力投':1,'普通投':0,'養生球':-1}[S.effort]||0;if(em!==0){st.d+=em;st.era=clamp(st.era-em*.25,.45,9.90);st.ER=Math.round(st.era*st.IP/9);st.SO=Math.round(st.SO*(1+em*.06));st.WHIP=st.IP>0?+((st.H+st.BB)/st.IP).toFixed(2):0;}}
  if(S.traits.onetool&&S.seasonFactor>0){const oldG=Math.max(1,st.G),maxG=Math.round(LV[S.lv].g*S.seasonFactor),newG=Math.min(maxG,Math.round(oldG*1.25)),boost=newG/oldG;st.G=newG;['PA','AB','H','HR','RBI','SB','BB'].forEach(k=>{if(typeof st[k]==='number')st[k]=Math.round(st[k]*boost);});st.avg=st.AB>0?st.H/st.AB:0;}
  return enforceSeasonInvariants(st,S.lv);
}
function compactSeasonLine(st){
  if(S.pos==='P'){const r=st.role||S.role,relief=r==='CL'?`｜SV ${st.SV||0}${st.HLD?`｜HLD ${st.HLD}`:''}`:r==='MR'?`｜HLD ${st.HLD||0}${st.SV?`｜SV ${st.SV}`:''}`:'';return `${st.G} G｜${fmtIP(st.IP)} IP｜${st.W}-${st.L}${relief}｜${st.SO||0} K｜ERA ${(st.era||0).toFixed(2)}｜WHIP ${(st.WHIP||0).toFixed(2)}｜AVG FB ${veloText(st)}`;}
  const obp=st.PA?(st.H+st.BB)/st.PA:0,ops=obp+slgOf(st),pct=v=>v?v.toFixed(3).replace(/^0/,''):'—',def=defenseExtra(st,true);return `${st.G} G｜${st.PA} PA｜${st.H} H｜${st.HR} HR｜${st.RBI} RBI｜盜壘 ${st.SB||0}｜AVG ${pct(st.avg)}｜OPS ${pct(ops)}${def?`｜${def}`:''}`;
}
function compactSeasonGridHTML(st){
  const cell=(label,value)=>`<span>${label}<strong>${value}</strong></span>`,pct=v=>Number.isFinite(v)?v.toFixed(3).replace(/^0/,''):'—';
  if(S.pos==='P'){const r=st.role||S.role,items=[['定位',roleN(r,st.reliefStatus)],['出賽',st.G||0],['局數',fmtIP(st.IP||0)],['勝敗',`${st.W||0}-${st.L||0}`]];if(r==='CL')items.push(['救援',st.SV||0]);else if(r==='MR')items.push(['中繼點',st.HLD||0]);items.push(['三振',st.SO||0],['ERA',(st.era||0).toFixed(2)],['WHIP',(st.WHIP||0).toFixed(2)],['平均球速',veloText(st)]);return `<span class="season-stat-grid">${items.map(x=>cell(x[0],x[1])).join('')}</span>`;}
  const obp=st.PA?(st.H+st.BB)/st.PA:0,ops=obp+slgOf(st),items=[['出賽',st.G||0],['打席',st.PA||0],['安打',st.H||0],['全壘打',st.HR||0],['打點',st.RBI||0],['盜壘',st.SB||0],['AVG',pct(st.avg)],['OPS',pct(ops)],['守備',Number.isFinite(st.FPCT)?pct(st.FPCT):'—']];return `<span class="season-stat-grid">${items.map(x=>cell(x[0],x[1])).join('')}</span>`;
}
function promotionPerformance(st,lv,progress){
  if(!st)return {strong:false,elite:false,score:-10,label:'沒有有效樣本'};
  progress=clamp(Number(progress)||1,.12,1);
  if(S.pos==='P'){
    const era=st.IP?st.ER*9/st.IP:99,whip=st.IP?(st.H+st.BB)/st.IP:99,k9=st.IP?(st.SO||0)*9/st.IP:0,sample=isSP()?st.IP>=Math.max(16,45*progress):st.G>=Math.max(7,24*progress)&&st.IP>=Math.max(6,18*progress),score=(4.25-era)*2.4+(1.42-whip)*4+(k9-7)*.2;
    return {strong:sample&&(era<=3.60&&whip<=1.38||score>=2.5),elite:sample&&(era<=2.80&&whip<=1.22||score>=5),score:+score.toFixed(1),label:`ERA ${era.toFixed(2)}｜WHIP ${whip.toFixed(2)}｜K/9 ${k9.toFixed(1)}`};
  }
  const obp=st.PA?(st.H+st.BB)/st.PA:0,ops=obp+slgOf(st),sample=st.PA>=Math.max(42,130*progress),score=(ops-.690)*30+(st.DEF||0)*.12;
  return {strong:sample&&(ops>=.760||score>=2.5),elite:sample&&(ops>=.850||score>=5),score:+score.toFixed(1),label:`${st.PA} PA｜OPS ${ops.toFixed(3).replace(/^0/,'')}｜DEF ${(st.DEF||0)>=0?'+':''}${st.DEF||0}`};
}
function recordDemotion(from,to,effectiveYear,reason){
  S.lastDemotion={year:Number(effectiveYear)||S.year+1,org:S.org,team:S.orgTeam,from,to,reason:reason||'performance'};
}
function endSeasonPromotionProfile(st,fromLv,toLv,o){
  const perf=promotionPerformance(st,fromLv),margin=ratingGap(Number.isFinite(o)?o:ovr(),LV[toLv].min),recent=S.lastDemotion;
  const comeback=!!(recent&&recent.year===S.year&&recent.org===S.org&&recent.team===S.orgTeam&&recent.to===fromLv);
  const alreadyPromoted=!!(S._callupReview&&S._callupReview.year===S.year&&S._callupReview.success);
  const eligible=!alreadyPromoted&&margin>=0&&(comeback?perf.elite:perf.strong);
  return {perf,margin,comeback,alreadyPromoted,eligible};
}
function simulateAtLevel(lv){const old=S.lv;S.lv=lv;const st=applySeasonAdjustments(simSeason(lv));S.lv=old;return st;}
function mergeSeasonSegments(parts){
  if(!parts||!parts.length)return {G:0,PA:0,AB:0,H:0,HR:0,RBI:0,SB:0,BB:0,W:0,L:0,SV:0,HLD:0,HP:0,IP:0,OUTS:0,SO:0,ER:0,avg:0,era:0,WHIP:0,scheduled:0,availability:0,d:0};
  const st={...parts[parts.length-1].st},sum=['G','PA','AB','H','_1B','_2B','_3B','HR','RBI','SB','BB','W','L','SV','HLD','HP','SO','ER','defG','TC','E','PO','A','DP','OFA','CS','SBA','DEF','CALL_RUNS','CALL_DEF'];
  sum.forEach(k=>st[k]=parts.reduce((n,p)=>n+(p.st[k]||0),0));setPitchingOuts(st,parts.reduce((n,p)=>n+pitchingOuts(p.st),0));st.scheduled=Math.max(...parts.map(p=>p.st.scheduled||0));st.avg=st.AB?st.H/st.AB:0;st.era=st.IP?st.ER*9/st.IP:0;st.WHIP=st.IP?(st.H+st.BB)/st.IP:0;st.FPCT=st.TC?+((st.TC-st.E)/st.TC).toFixed(3):0;
  st.EXPECTED_E=+parts.reduce((n,p)=>n+(p.st.EXPECTED_E||0),0).toFixed(1);st.calendarShare=+parts.reduce((n,p)=>n+(p.st.calendarShare||0),0).toFixed(4);st.statShare=+parts.reduce((n,p)=>n+(p.st.statShare||0),0).toFixed(4);st.availability=Math.round(clamp(st.statShare,0,1)*100);
  const callG=parts.reduce((n,p)=>n+(p.st.defG||0),0),lastLv=parts[parts.length-1].lv,callingPar=LV[lastLv]?LV[lastLv].par:amateurSeasonConfig().par;st.CALL_SCORE=callG?+(parts.reduce((n,p)=>n+(p.st.CALL_SCORE||0)*(p.st.defG||0),0)/callG).toFixed(1):0;st.STAFF_ERA_ADJ=callG?+(parts.reduce((n,p)=>n+(p.st.STAFF_ERA_ADJ||0)*(p.st.defG||0),0)/callG).toFixed(2):0;st.CALL_GRADE=callG?catcherCallingGrade(st.CALL_SCORE,callingPar):'—';
  const weight=p=>Math.max(1,S.pos==='P'?(p.st.IP||0):(p.st.PA||0)),weightSum=parts.reduce((n,p)=>n+weight(p),0);st.avgVelo=st.IP?+(parts.reduce((n,p)=>n+(p.st.avgVelo||0)*(p.st.IP||0),0)/st.IP).toFixed(1):0;st.d=+(parts.reduce((n,p)=>n+(p.st.d||0)*weight(p),0)/Math.max(1,weightSum)).toFixed(1);
  const effectKeys=['luck','momentum','choice','environment','chemistry','traits','teammates','finance','transfer','total'];st.effectBreakdown={};effectKeys.forEach(k=>st.effectBreakdown[k]=+(parts.reduce((n,p)=>n+(Number(p.st.effectBreakdown&&p.st.effectBreakdown[k])||0)*weight(p),0)/Math.max(1,weightSum)).toFixed(1));
  st.variance=+(parts.reduce((n,p)=>n+(Number(p.st.variance)||0)*weight(p),0)/Math.max(1,weightSum)).toFixed(2);st.varianceLabel=parts.map(p=>p.st.varianceLabel).filter(Boolean).slice(-1)[0]||'';st.varianceKind=parts.map(p=>p.st.varianceKind).filter(Boolean).slice(-1)[0]||'';st.outlierLabel=parts.map(p=>p.st.outlierLabel).filter(Boolean).slice(-1)[0]||'';st.outlierKind=parts.map(p=>p.st.outlierKind).filter(Boolean).slice(-1)[0]||'';st.traitImpact=parts.flatMap(p=>p.st.traitImpact||[]);
  if(S.pos==='P')normalizeReliefLine(st);return st;
}
function groupedSeasonSegments(parts){
  const groups=[];for(const part of parts){const key=`${part.org||S.org}|${part.team||S.orgTeam}|${part.lv||''}`,last=groups[groups.length-1];if(last&&last.key===key)last.parts.push(part);else groups.push({key,org:part.org||S.org,team:part.team||S.orgTeam,lv:part.lv,parts:[part]});}
  return groups.map(g=>({org:g.org,team:g.team,lv:g.lv,st:mergeSeasonSegments(g.parts)}));
}
function monthlyVarianceProfile(base,pulse){
  const out={...base},axes=['workload','contact','power','discipline','running','stuff','command','leverage','support','defense'];
  out.shared=clamp((base.shared||0)*.48+normalZ()*.88+(Number(pulse)||0)*.18,-2.9,2.9);axes.forEach(k=>out[k]=clamp((base[k]||0)*.42+normalZ()*.74+(Number(pulse)||0)*.16,-3,3));
  out.label=out.shared>=1.65?'單月爆發':out.shared<=-1.65?'單月低潮':'';out.kind=out.shared>=1.65?'hot':out.shared<=-1.65?'cold':'';return out;
}
function midSeasonPromotionReview(cumulative,startLv,monthIndex,totalMonths){
  if(S.stage!=='PRO'||S.seasonFactor<.45)return null;const path=PATHS[S.org]||[],idx=path.indexOf(startLv);if(idx<0||idx>=path.length-1)return null;const to=path[idx+1],progress=monthIndex/Math.max(1,totalMonths),perf=promotionPerformance(cumulative,startLv,progress),margin=ratingGap(ovr(),LV[to].min),eligible=margin>=0&&perf.strong||margin>=-3&&perf.elite;
  const foreignPenalty=S.org==='NPB'&&to==='NPB1'&&npbRosterStatus().foreign?8:0,prior=(S.standingsHistory||[]).slice(-1)[0],mine=prior&&prior.mine,teamNeed=mine?(mine.pct<.47?8:mine.pct>.56?5:0):0,base=clamp(Math.round(43+margin*7+perf.score*7+(perf.elite?15:0)+teamNeed-foreignPenalty+(monthIndex>=4?10:0)),18,94);
  S._callupReview={year:S.year,from:startLv,to,p:eligible?base:0,perf,margin,foreignPenalty,teamNeed,reason:eligible?'本次名單檢討仍取決於同位置缺額與登錄限制':perf.strong?'實績出色，但目前能力評估仍離下一層級過遠':'截至本次檢討的實績或有效樣本尚未達升格線'};
  if(!eligible||!chance(base))return null;S._callupReview={...S._callupReview,success:true,monthIndex};return {from:startLv,to,monthIndex,p:base,perf};
}
function midSeasonPromotionPlan(lowerFull,startLv){
  if(S.stage!=='PRO'||S.seasonFactor<.8)return null;const path=PATHS[S.org]||[],idx=path.indexOf(startLv);if(idx<0||idx>=path.length-1)return null;const to=path[idx+1],perf=promotionPerformance(lowerFull,startLv),margin=ratingGap(ovr(),LV[to].min),eligible=margin>=0&&perf.strong||margin>=-3&&perf.elite;if(!eligible){S._callupReview={year:S.year,from:startLv,to,p:0,perf,margin,reason:perf.strong?'實績出色，但目前能力評估仍離下一層級過遠':'二軍實績或有效樣本尚未達升格線'};return null;}
  const foreignPenalty=S.org==='NPB'&&to==='NPB1'&&npbRosterStatus().foreign?8:0,prior=S.currentStandings&&S.currentStandings.mine,teamNeed=prior?(prior.pct<.47?8:prior.pct>.56?5:0):0,base=clamp(Math.round(48+margin*7+perf.score*7+(perf.elite?18:0)+teamNeed-foreignPenalty),22,96),june=chance(base),august=!june&&chance(clamp(base+10,32,98));if(!june&&!august){S._callupReview={year:S.year,from:startLv,to,p:base,perf,margin,foreignPenalty,teamNeed,reason:foreignPenalty?'一軍外籍登錄與同位置名額在兩次檢討都沒有騰出':'一軍同位置名單在六月與八月兩次檢討都沒有空缺'};return null;}
  const monthIndex=june?2:4,ratio=june?.42:.68,lower=portionOf(lowerFull,ratio),upperFull=simulateAtLevel(to),upper=portionOf(upperFull,1-ratio),parts=[{lv:startLv,st:lower},{lv:to,st:upper}],total=mergeSeasonSegments(parts);S.lv=to;if(to==='MLB')mlbAddToFortyMan('季中升上大聯盟');S._callupReview={year:S.year,from:startLv,to,p:base,perf,margin,foreignPenalty,success:true,monthIndex};return {from:startLv,to,monthIndex,parts,total,p:base,perf};
}
function playingTimeShare(st){
  if(!st)return 0;const games=(LV[S.lv]&&LV[S.lv].g)||120;
  return S.pos==='P'?clamp((st.IP||0)/(isSP()?games*1.02:games*.38),0,1):clamp((st.PA||0)/(games*3.7),0,1);
}
/* 市場以當季實際產出為核心；長打、跑壘與守備各自有上限，小樣本不再被外推成明星身價。 */
function seasonMarketEvaluation(st){
  const base=Number(st&&st.d)||0,games=(LV[S.lv]&&LV[S.lv].g)||Math.max(1,st.G||1),share=playingTimeShare(st);
  if(S.pos==='P'){
    const leverage=!isSP()?clamp(((st.SV||0)+(st.HLD||0)-8)/22,0,1.4)*share:0,bonus=leverage;
    return {base:+base.toFixed(1),power:0,running:0,defense:0,calling:0,leverage:+leverage.toFixed(1),bonus:+bonus.toFixed(1),total:+clamp(base+bonus,-12,26).toFixed(1),sbPace:0,hrPace:0};
  }
  const fullPA=Math.max(1,games*4.05),hrPace=st.PA?(st.HR||0)/st.PA*fullPA:0,sbPace=st.PA?(st.SB||0)/st.PA*fullPA:0;
  const power=clamp((hrPace-10)/16,0,1.8)*share,running=clamp((sbPace-8)/24,0,1.5)*share,defense=clamp((st.DEF||0)/9,-1.2,1.6),calling=clamp((st.CALL_RUNS||0)/18,-.7,.9),bonus=clamp(power+running+defense+calling,-1.4,4.2);
  return {base:+base.toFixed(1),power:+power.toFixed(1),running:+running.toFixed(1),defense:+defense.toFixed(1),calling:+calling.toFixed(1),leverage:0,bonus:+bonus.toFixed(1),total:+clamp(base+bonus,-12,26).toFixed(1),sbPace:Math.round(sbPace),hrPace:Math.round(hrPace)};
}
function contractPerformanceD(){return Number.isFinite(S.lastMarketD)?S.lastMarketD:(S.lastD||0);}
function contractMarketResume(){
  return '';
}
function distributedCumulative(total,weights){
  const sign=(Number(total)||0)<0?-1:1,n=Math.abs(Math.round(Number(total)||0)),bins=weights.map(()=>0),cumulative=[];
  if(!weights.length)return cumulative;
  const safe=weights.map(w=>Math.max(.001,Number(w)||0)),sum=safe.reduce((a,b)=>a+b,0);
  for(let unit=0;unit<n;unit++){
    let roll=R()*sum,index=safe.length-1;
    for(let i=0;i<safe.length;i++){roll-=safe[i];if(roll<=0){index=i;break;}}
    bins[index]+=sign;
  }
  bins.reduce((running,value,i)=>cumulative[i]=running+value,0);return cumulative;
}
function monthlySeasonSlices(finalStats,timeline,activeMonths){
  const months=timeline.length,par=S.stage==='PRO'&&S.lv&&LV[S.lv]?LV[S.lv].par:amateurSeasonConfig().par,strong=ratingGap(ovr(),par)>=7||S.traits.ace||S.traits.slugger;
  const active=timeline.slice(0,activeMonths),pulseOf=x=>Number.isFinite(x.personalPulse)?x.personalPulse:x.pulse,usage=active.map(x=>clamp(1+pulseOf(x)*(strong?.10:.24)+(x.n==='角色遭到壓縮'?(strong?-.08:-.22):0),.32,1.72));
  const positive=active.map((x,i)=>usage[i]*clamp(1+pulseOf(x)*(strong?.10:.20),.46,1.65)),negative=active.map((x,i)=>usage[i]*clamp(1-pulseOf(x)*(strong?.09:.18),.48,1.62));
  const ratio=(weights,i)=>{const total=Math.max(.001,weights.reduce((a,b)=>a+b,0));return weights.slice(0,i+1).reduce((a,b)=>a+b,0)/total;};
  const count=(v,w,i)=>Math.round((v||0)*ratio(w,i)),decimal=(v,w,i)=>+((v||0)*ratio(w,i)).toFixed(1),out=[];
  const sparse={HR:distributedCumulative(finalStats.HR||0,positive),SB:distributedCumulative(finalStats.SB||0,positive),E:distributedCumulative(finalStats.E||0,negative),CALL_RUNS:distributedCumulative(finalStats.CALL_RUNS||0,usage),CALL_DEF:distributedCumulative(finalStats.CALL_DEF||0,usage)};
  for(let i=0;i<months;i++){
    if(i>=activeMonths){out.push({...finalStats});continue;}
    let p={...finalStats};
    ['G','PA','AB','W','L','SV'].forEach(k=>p[k]=count(finalStats[k],usage,i));if(S.pos==='P')setPitchingOuts(p,Math.round(pitchingOuts(finalStats)*ratio(usage,i)));
    if(S.pos==='P'){
      p.SO=count(finalStats.SO,positive,i);['H','BB','ER'].forEach(k=>p[k]=count(finalStats[k],negative,i));p.HLD=count(finalStats.HLD,usage,i);p.HP=S.role==='MR'?p.HLD:0;
      p.era=p.IP>0?p.ER*9/p.IP:0;p.WHIP=p.IP>0?(p.H+p.BB)/p.IP:0;
    }else{
      ['H','RBI'].forEach(k=>p[k]=count(finalStats[k],positive,i));p.HR=sparse.HR[i]||0;p.SB=sparse.SB[i]||0;['TC','PO','A','DP','OFA','CS','SBA'].forEach(k=>p[k]=count(finalStats[k],usage,i));p.E=sparse.E[i]||0;p.EXPECTED_E=decimal(finalStats.EXPECTED_E,usage,i);p.CALL_RUNS=sparse.CALL_RUNS[i]||0;p.CALL_DEF=sparse.CALL_DEF[i]||0;p.DEF=count(finalStats.DEF,usage,i);p.FPCT=p.TC?+((p.TC-p.E)/p.TC).toFixed(3):0;p.BB=count(finalStats.BB,positive,i);p.avg=p.AB>0?p.H/p.AB:0;
    }
    if(i===activeMonths-1)p={...finalStats};
    if(S.pos==='P')p.monthVelo=+clamp((finalStats.avgVelo||0)+(timeline[i].pulse||0)*.22+N0(.16),70,105).toFixed(1);
    out.push(p);
  }
  return out;
}
function monthlyDeltaLine(current,previous){
  previous=previous||{G:0,PA:0,AB:0,H:0,HR:0,RBI:0,SB:0,BB:0,W:0,L:0,SV:0,HLD:0,HP:0,IP:0,SO:0,ER:0};
  if(S.pos==='P'){
    const r=current.role||S.role,dh=Math.max(0,(current.HLD||0)-(previous.HLD||0)),ip=Math.max(0,pitchingOuts(current)-pitchingOuts(previous))/3,er=Math.max(0,(current.ER||0)-(previous.ER||0)),h=Math.max(0,(current.H||0)-(previous.H||0)),bb=Math.max(0,(current.BB||0)-(previous.BB||0)),era=ip>0?er*9/ip:0,whip=ip>0?(h+bb)/ip:0,rel=r==='MR'?`｜${dh} HLD`:r==='CL'?`｜${Math.max(0,(current.SV||0)-(previous.SV||0))} SV`:'';
    return `${Math.max(0,current.G-previous.G)} G｜${fmtIP(ip)} IP｜${Math.max(0,(current.SO||0)-(previous.SO||0))} K${rel}｜ERA ${era.toFixed(2)}｜WHIP ${whip.toFixed(2)}｜AVG FB ${current.monthVelo?current.monthVelo.toFixed(1)+' mph':'—'}`;
  }
  const pa=Math.max(0,current.PA-previous.PA),ab=Math.max(0,current.AB-previous.AB),h=Math.max(0,current.H-previous.H),avg=ab?h/ab:0,tc=Math.max(0,(current.TC||0)-(previous.TC||0)),e=Math.max(0,(current.E||0)-(previous.E||0)),expected=Math.max(0,(current.EXPECTED_E||0)-(previous.EXPECTED_E||0)),sb=Math.max(0,(current.SB||0)-(previous.SB||0)),fp=tc?((tc-e)/tc).toFixed(3).replace(/^0/,''):'—',dp=S.dpos||(S.pos==='C'?'C':'2B'),catcher=dp==='C'&&tc?`｜配球防失分 ${((current.CALL_RUNS||0)-(previous.CALL_RUNS||0))>0?'+':''}${(current.CALL_RUNS||0)-(previous.CALL_RUNS||0)}`:'';return `${Math.max(0,current.G-previous.G)} G｜${pa} PA｜${h} H｜${Math.max(0,current.HR-previous.HR)} HR｜${Math.max(0,current.RBI-previous.RBI)} RBI｜盜壘 ${sb}｜AVG ${ab?avg.toFixed(3).replace(/^0/,''):'—'}${tc?`｜FPCT ${fp}｜${e} E（預估 ${expected.toFixed(1)}）${catcher}`:''}`;
}
function seasonBeatPersonalPulse(beat){
  const pulse=Number(beat&&beat.pulse)||0,name=String(beat&&beat.n||'');
  if(/打線熄火/.test(name))return S.pos==='P'?pulse*.55:pulse*.25;
  if(/牛棚吃緊/.test(name))return S.pos==='C'?pulse*.45:S.pos==='P'?pulse*.65:0;
  if(/輪值穩定|守備救援/.test(name))return S.pos==='P'||S.pos==='C'?pulse*.55:pulse*.15;
  if(/連勝氣勢|隊友關鍵支援/.test(name))return pulse*.55;
  if(/新秀竄起/.test(name))return pulse*.35;
  return pulse;
}
function seasonBeatView(beat){
  const name=String(beat&&beat.n||''),p=Number(beat&&beat.personalPulse)||0;
  const scope=/客場低潮|角色遭到壓縮/.test(name)?'個人狀況':/雨後補賽|跨區長征|主場長段賽程/.test(name)?'賽程環境':'球隊狀況';
  let impact=p>.35?'你的出賽與臨場表現受到正向影響':p<-.35?'你的出賽與臨場表現受到負向影響':'不直接判定你的個人成績';
  if(/打線熄火/.test(name))impact=S.pos==='P'?'勝投支援減少；不直接改變你的投球內容':'打點機會減少；不直接把你的打擊判成低潮';
  if(/牛棚吃緊/.test(name)&&S.pos==='C')impact='接捕與配球負荷提高，影響小於投手本身的狀態';
  if(/輪值穩定|守備救援/.test(name))impact=S.pos==='P'||S.pos==='C'?'投捕與守備支援獲得小幅正面影響':'屬於球隊防守端，不直接替你的打擊加分';
  return {scope,impact};
}
function simulateTeamMonth(st,beat,games,lv){
  games=Math.max(0,Math.round(games));if(!games)return {W:0,L:0,games:0};
  const key=`${S.org}|${S.orgTeam}`,old=Number.isFinite(S.teamStrengths&&S.teamStrengths[key])?S.teamStrengths[key]:50,roster=S.stage==='PRO'?npcRosterStrength(S.org,S.orgTeam,lv):(amateurSeasonConfig().par||50),par=LV[lv]?LV[lv].par:(amateurSeasonConfig().par||50),talent=clamp(old+(ratingGap(roster,par))*.22,36,66),share=playingTimeShare(st),player=clamp((Number(st.d)||0)*.006*share,-.055,.065),teamPulse=clamp(Number(beat&&beat.pulse)||0,-3,3)*.014,park=(S.seasonContext&&S.seasonContext.perf||0)*.004,p=clamp(.5+(talent-50)*.006+player+teamPulse+park,.28,.72);let W=0;
  for(let i=0;i<games;i++)if(R()<p)W++;
  return {W,L:games-W,games,p:+p.toFixed(3)};
}
function runSeasonAnimation(done){
  const pro=S.stage==='PRO',amCfg=pro?null:amateurSeasonConfig(),months=pro?['開季','五月','六月','七月','八月','九月']:['春季','夏季','秋季'];
  const startLv=S.lv,seasonOrg=S.org,originalSeasonFactor=clamp(Number(S.seasonFactor)||0,0,1);let currentLv=startLv,totalGames=pro&&S.lv&&LV[S.lv]?LV[S.lv].g:amCfg.games,seasonIdentity=pro?seasonTeamInfo():{name:S.team||stageLabel(),level:amCfg.name};
  if(pro)seasonIdentity.level+=S.pos==='P'&&S.role?`・${roleN(S.role)}`:S.dpos?`・${DPN[S.dpos]}`:'';
  const beats=[
    {n:'連勝氣勢',d:'打線與投手群同時進入狀態',m:2},{n:'客場低潮',d:'長途移動讓反應慢了半拍',m:-2},{n:'關鍵系列賽',d:'面對排名競爭對手，壓力與機會同時升高',m:0},
    {n:'牛棚吃緊',d:'連續延長賽讓整隊負荷升高',m:-2},{n:'新秀竄起',d:'年輕隊友帶來競爭與新的活力',m:1},{n:'雨後補賽',d:'延賽把行程壓縮成密集連戰',m:-1},
    {n:'教練調整奏效',d:'影像會議後找到新的攻防策略',m:2},{n:'媒體熱潮',d:'連續好表現讓每次上場都成為焦點',m:1},{n:'安靜前進',d:'沒有大事件，靠日常維持表現',m:0},
    {n:'角色遭到壓縮',d:'同位置競爭者搶走一部分重要局面',m:-1},{n:'隊友關鍵支援',d:'隊友在低潮時補上了最需要的一球',m:1},
    {n:'守備救援',d:'隊友連續化解可能失分的強勁擊球',m:1},{n:'打線熄火',d:'得點圈長時間沒有支援，勝負壓力增加',m:-1},{n:'輪值穩定',d:'先發與牛棚分工清楚，整隊消耗受控',m:1},
    {n:'跨區長征',d:'長途客場讓睡眠與恢復出現落差',m:-1},{n:'戰術重新分工',d:'教練依對戰資料調整角色與使用方式',m:0},{n:'主場長段賽程',d:'熟悉的作息讓日常準備更規律',m:1}];
  const routine=[{n:'正常賽程',d:'沒有額外插曲，表現由能力、對手與日常狀態累積',m:0},{n:'例行調整',d:'訓練、休息與比賽照球隊計畫推進',m:0},{n:'小幅波動',d:'幾場好壞互相抵銷，整體沒有明顯轉折',m:0}];
  const available=beats.slice(),timeline=months.map(()=>{if(chance(38))return {...pick(routine),pulse:ri(-1,1)};const bi=ri(0,available.length-1),b=available.splice(bi,1)[0];return {...b,pulse:clamp(b.m+ri(-1,1),-3,3)};});timeline.forEach(x=>x.personalPulse=seasonBeatPersonalPulse(x));
  let injured=originalSeasonFactor<.9;const targetActive=originalSeasonFactor<=0?0:clamp(Math.round(months.length*originalSeasonFactor),1,months.length),activeMask=months.map(()=>true),injuryPlan=buildMidseasonInjuryPlan(months.length);let injuryNotice=null;
  if(targetActive<months.length){const missed=months.length-targetActive,start=originalSeasonFactor<=.22?targetActive:ri(0,Math.max(0,months.length-missed));for(let i=start;i<start+missed;i++)activeMask[i]=false;}
  activeMask.forEach((active,i)=>{if(!active)timeline[i]={n:'傷病名單／復健',d:'本月沒有出賽，個人成績停在受傷前的數字',m:0,pulse:0,personalPulse:0,injured:true};});
  const baseVariance=makeSeasonVarianceProfile(),statShare=targetActive?originalSeasonFactor/targetActive:0,monthParts=[],monthlyStats=[],teamMonths=[];let finalStats=mergeSeasonSegments([]),promotion=null,idx=0,paused=false,speed=1,skip=false,timer=null,finished=false,eventBusy=false;
  S._seasonVariance=baseVariance;S._pendingSeasonSegments=null;S._seasonServiceParts=[];
  $('month-feed').innerHTML='<div class="month-table-head"><span>月份</span><span>球隊／個人狀況</span><span>當月數據</span></div>';$('sim-progress').style.width='0%';$('sim-schedule-label').textContent=promotion?'球季進度':'球隊賽程';$('sim-games').textContent=promotion?`0/${months.length} 月`:`0/${totalGames}`;$('sim-player-games').textContent='0 場';$('sim-momentum').textContent='0.0';$('sim-form').textContent='準備開季';$('sim-impact').innerHTML=`<span class="season-club">${seasonIdentity.name}<small>${seasonIdentity.level}</small></span>準備開季`;
  if($('sim-cumulative'))$('sim-cumulative').innerHTML='<span style="color:#91a79a;font:700 11px var(--sans)">等待第一個月份完成</span>';
  $('season-sim-title').textContent=`${S.year}｜${seasonIdentity.name}｜${seasonIdentity.level}`;
  $('season-sim-sub').textContent=S.seasonContext?S.seasonContext.items.slice(0,3).map(x=>x.n).join(' · '):'賽程準備完成';
  $('season-accept').style.display='none';['season-pause','season-speed','season-skip'].forEach(id=>{$(id).disabled=false;});$('season-pause').textContent='暫停';$('season-speed').textContent='速度 1×';$('season-skip').textContent='直接完成';openFx('season-overlay');
  const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const schedule=(first=false)=>{if(finished||paused)return;clearTimeout(timer);timer=setTimeout(tick,first?180:skip?24:reduced?55:Math.round(520/speed));};
  $('season-pause').onclick=()=>{if(finished)return;paused=!paused;$('season-pause').textContent=paused?'繼續':'暫停';if(paused)clearTimeout(timer);else schedule();};
  $('season-speed').onclick=()=>{if(finished)return;speed=speed===1?2:speed===2?4:1;$('season-speed').textContent=`速度 ${speed}×`;if(!paused)schedule();};
  $('season-skip').onclick=()=>{if(finished)return;skip=true;paused=false;$('season-pause').textContent='暫停';$('season-skip').textContent='整理完整月份…';$('season-skip').disabled=true;clearTimeout(timer);schedule();};
  const zeroMonth=lv=>({G:0,PA:0,AB:0,H:0,_1B:0,_2B:0,_3B:0,HR:0,RBI:0,SB:0,BB:0,W:0,L:0,SV:0,HLD:0,HP:0,IP:0,SO:0,ER:0,avg:0,era:0,WHIP:0,DEF:0,scheduled:pro&&LV[lv]?LV[lv].g:amCfg.games,availability:0,usageRole:'傷病名單',role:S.pos==='P'?S.role:null,reliefStatus:S.pos==='P'&&S.role!=='SP'?reliefStatusKey():null,effectBreakdown:{luck:0,momentum:0,choice:0,environment:0,chemistry:0,traits:0,teammates:0,transfer:0,total:0}});
  const simulateMonth=()=>{
    const beat=timeline[idx],active=activeMask[idx],oldFactor=S.seasonFactor,oldMomentum=S.seasonMomentum,oldVariance=S._seasonVariance,oldLv=S.lv;let st;
    S.lv=currentLv;S.seasonFactor=active?statShare:0;S.seasonMomentum=active?(Number(beat.personalPulse)||0):0;S._seasonVariance=monthlyVarianceProfile(baseVariance,S.seasonMomentum);
    st=active?(pro?applySeasonAdjustments(simSeason(currentLv)):simAmateurSeason()):zeroMonth(currentLv);st.monthVelo=st.avgVelo||0;st.calendarShare=1/months.length;st.statShare=active?statShare:0;st.monthIndex=idx;st.team=S.orgTeam;st.lv=currentLv;
    monthParts.push({org:seasonOrg,team:S.orgTeam,lv:currentLv,st});finalStats=mergeSeasonSegments(monthParts);monthlyStats.push(finalStats);S._seasonServiceParts.push({org:seasonOrg,team:S.orgTeam,lv:currentLv,calendarShare:st.calendarShare,statShare:st.statShare,st});
    S.seasonFactor=oldFactor;S.seasonMomentum=oldMomentum;S._seasonVariance=oldVariance;S.lv=currentLv||oldLv;return st;
  };
  const maybePromotion=()=>{
    if(!pro||promotion||currentLv!==startLv||![2,4].includes(idx)||!monthParts.length)return;
    const lower=mergeSeasonSegments(monthParts.filter(p=>p.lv===startLv)),review=midSeasonPromotionReview(lower,startLv,idx,months.length);if(!review)return;
    promotion=review;currentLv=review.to;S.lv=currentLv;if(currentLv==='MLB')mlbAddToFortyMan('季中升上大聯盟');prepareNpcSeason();const from=LV[review.from].n,to=LV[review.to].n,role=S.pos==='P'&&S.role?roleN(S.role):S.dpos?DPN[S.dpos]:'';seasonIdentity={name:S.orgTeam,level:`${from} → ${to}${role?'・'+role:''}`};const old=timeline[idx];timeline[idx]={n:'一軍升格通知',d:`截至本次檢討的 ${from} 實績通過名單審查，球團正式把你升上 ${to}`,m:old.m,pulse:old.pulse,personalPulse:old.personalPulse,callup:true};$('sim-schedule-label').textContent='球季進度';$('season-sim-title').textContent=`${S.year}｜${seasonIdentity.name}｜${seasonIdentity.level}`;
  };
  const maybeRoleChange=()=>{
    if(!pro||![2,4].includes(idx)||!monthParts.length||S._roleReviewMonth===idx)return;const cumulative=mergeSeasonSegments(monthParts),d=Number(cumulative.d)||0,npc=S.npcSeasonContext;
    if(S.pos==='P'&&S.role!=='SP'){
      const order=['LONG','MIDDLE','SETUP','CLOSER'],old=reliefStatusKey()||'MIDDLE',rank=order.indexOf(old),perf=relieverPerformanceScore(cumulative);let next=rank;
      if(perf>=3.2&&rank<3)next++;else if(perf<=-2&&rank>0)next--;
      if(next!==rank){S.reliefStatus=order[next];S.role=S.reliefStatus==='CLOSER'?'CL':'MR';timeline[idx]={n:'牛棚角色調整',d:`${reliefStatusName(old,'MR')} → ${reliefStatusName(S.reliefStatus,S.role)}`,m:next>rank?1:-1,pulse:next>rank?1:-1,personalPulse:next>rank?.6:-.6};S._roleReviewMonth=idx;}
    }else if(npc&&S.pos!=='P'){
      const delta=d>=4?6:d<=-3?-7:0;if(delta){npc.usageAdj=clamp((Number(npc.usageAdj)||0)+delta,-18,20);timeline[idx]={n:delta>0?'出賽角色擴大':'出賽角色縮減',d:delta>0?'近期表現換來更多先發機會':'近期表現讓先發機會減少',m:delta>0?1:-1,pulse:delta>0?1:-1,personalPulse:delta>0?.6:-.6};S._roleReviewMonth=idx;}
    }
  };
  const maybeScheduledEvent=()=>{
    const eventMonths=S._seasonEventMonths||[];if(eventBusy||!eventMonths.includes(idx))return false;S._seasonEventMonths=eventMonths.filter(x=>x!==idx);eventBusy=true;paused=true;clearTimeout(timer);closeFx('season-overlay');drawEvents(1,()=>{eventBusy=false;paused=false;openFx('season-overlay');schedule(true);});return true;
  };
  const tick=()=>{
    if(idx>=months.length){
      finished=true;clearTimeout(timer);['season-pause','season-speed','season-skip'].forEach(id=>{$(id).disabled=true;});
      const activeBeats=timeline.filter((x,i)=>activeMask[i]),momentum=activeBeats.reduce((n,x)=>n+(Number(x.personalPulse)||0),0),teamMomentum=activeBeats.reduce((n,x)=>n+(Number(x.pulse)||0),0),availabilityFactor=+(activeMask.filter(Boolean).length/months.length).toFixed(3);S.seasonMomentum=clamp(+(momentum/Math.max(1,activeBeats.length)).toFixed(1),-3,3);S.teamSeasonMomentum=clamp(+(teamMomentum/Math.max(1,activeBeats.length)).toFixed(1),-3,3);S.seasonFactor=Math.min(originalSeasonFactor,availabilityFactor);S._seasonVariance=baseVariance;S.lv=currentLv;finalStats.availability=Math.round(S.seasonFactor*100);
      const grouped=groupedSeasonSegments(monthParts),teamW=teamMonths.reduce((n,x)=>n+x.W,0),teamL=teamMonths.reduce((n,x)=>n+x.L,0);S._seasonTeamRecord={year:S.year,org:S.org,team:S.orgTeam,lv:currentLv,W:teamW,L:teamL,games:teamW+teamL,months:teamMonths};if(pro){S._pendingSeasonStats=finalStats;S._pendingSeasonSegments=promotion?grouped:null;}else S._pendingAmateurStats=finalStats;
      const finishState=S.seasonFactor<=0?'整季傷缺':S.seasonFactor<=.25?'重大傷病離場':S.seasonFactor<=.55?'傷病中斷球季':S.seasonFactor<.9?'缺席部分賽程':S.seasonMomentum>=1.2?'火燙收官':S.seasonMomentum<=-1.2?'艱難收官':'完成例行賽';
      $('sim-form').textContent=finishState;
      $('sim-player-games').textContent=`${finalStats.G||0} 場`;
      $('sim-momentum').textContent=(S.seasonMomentum>0?'+':'')+S.seasonMomentum.toFixed(1);
      const injuryText=injured?`｜${injuryNotice?injuryNotice.grade:'傷病影響'}，出賽 ${finalStats.G||0} 場。`:'';
      if($('sim-cumulative'))$('sim-cumulative').innerHTML=compactSeasonGridHTML(finalStats);
      $('sim-impact').innerHTML=`<span class="season-club">${seasonIdentity.name}<small>${seasonIdentity.level}</small></span>${pro?'例行賽':amCfg.name}完成${finalStats.varianceLabel?`｜${finalStats.varianceLabel}`:''}${injuryText}`;
      $('season-accept').style.display='block';$('season-accept').onclick=()=>{closeFx('season-overlay');done();};return;
    }
    if(maybeScheduledEvent())return;maybePromotion();maybeRoleChange();if(injuryPlan&&injuryPlan.month===idx&&!injuryPlan.applied){injuryNotice=applyMidseasonInjury(injuryPlan,activeMask,timeline);injured=!!injuryNotice;board(1);}const beat=timeline[idx],pulse=Number.isFinite(beat.personalPulse)?beat.personalPulse:beat.pulse,inactive=!activeMask[idx],games=Math.round(totalGames*(idx+1)/months.length),prevGames=idx?Math.round(totalGames*idx/months.length):0,monthStat=simulateMonth(),teamMonth=simulateTeamMonth(monthStat,beat,games-prevGames,currentLv);teamMonths.push(teamMonth);const current=monthlyStats[idx],previous=idx?monthlyStats[idx-1]:null,seen=timeline.slice(0,idx+1).filter((x,i)=>activeMask[i]),avg=seen.length?seen.reduce((n,x)=>n+(Number.isFinite(x.personalPulse)?x.personalPulse:x.pulse),0)/seen.length:0,view=seasonBeatView(beat);
    const row=document.createElement('div'),monthLine=inactive?'0 場出賽｜傷病名單':monthlyDeltaLine(current,previous),monthPartsHTML=monthLine.split('｜').map(x=>`<span>${escapeHTML(x.trim())}</span>`).join('');row.className='month-row';row.innerHTML=`<span class="month-label">${months[idx]}</span><div class="month-event"><span class="event-scope">${view.scope}</span><b>${beat.n}</b><small>${beat.d}</small><small class="team-month-line">球隊 ${teamMonth.W}-${teamMonth.L}</small></div><code class="month-current month-stat-parts">${monthPartsHTML}</code>`;
    $('month-feed').appendChild(row);$('month-feed').scrollTop=$('month-feed').scrollHeight;$('sim-progress').style.width=((idx+1)/months.length*100)+'%';$('sim-games').textContent=promotion?`${idx+1}/${months.length} 月`:`${games}/${totalGames}`;
    $('sim-player-games').textContent=`${current.G||0} 場`;$('sim-momentum').textContent=(avg>0?'+':'')+avg.toFixed(1);if($('sim-cumulative'))$('sim-cumulative').innerHTML=compactSeasonGridHTML(current);$('sim-impact').innerHTML=`<span class="season-club">${seasonIdentity.name}<small>${seasonIdentity.level}</small></span>${months[idx]}｜${beat.n}`;$('sim-form').textContent=inactive?'傷停復健':pulse>=2?'狀態火燙':pulse<=-2?'陷入低潮':'正常推進';idx++;
    schedule();
  };
  schedule(true);
}
var _curYearBody=null; /* 當前年度的內容容器 */
var MAX_YEARS=8;         /* DOM 最多保留幾個年度區塊 */
function logTarget(){ return _curYearBody || $('log'); }
let _choiceResultCapture=null;
function choiceStateSnapshot(){
  if(!S)return null;const so=S.social||{},f=syncFinance(),L=S.love||{};
  return {ab:{...(S.ab||{})},ovr:ovr(),pend:S.pendStat||0,tmpInj:S.tmpInj||0,injNext:S.injNext||0,chem:S.chemistry||0,fan:so.fanRep||0,player:so.playerRep||0,money:f.netWorth||0,cash:f.cash||0,debt:f.debt||0,pool:S.pool||0,training:S.offseasonTrainingDice||0,hsDice:S.hsTrainingDiceMod||0,hsUsage:S.hsUsageBonus||0,hsCup:S.hsCupBonus||0,aff:L.affection||0,team:S.orgTeam||S.team||'',stage:S.stage,lv:S.lv||'',role:S.role||'',dpos:S.dpos||'',effort:S.effort||'',seasonFactor:S.seasonFactor,mlbRoster:S.org==='MiLB'?mlbRosterStatus().label:'',ct:S.ct?{yrs:S.ct.yrs,annual:S.ct.annual,option:S.ct.option||''}:null};
}
function choiceStateDiff(before){
  if(!before||!S)return '';
  const after=choiceStateSnapshot(),lines=[],delta=(label,a,b,fmt)=>{if(a===b)return;lines.push(`${label} ${fmt?fmt(a):a} → <b>${fmt?fmt(b):b}</b>`);};
  Object.keys(before.ab||{}).forEach(k=>delta(ABL[k]||k,before.ab[k],S.ab[k]));delta('綜合能力',before.ovr,ovr(),x=>x+'/99');
  delta('本季狀態',before.pend,after.pend,x=>(x>0?'+':'')+x);delta('本季傷病負荷',before.tmpInj,after.tmpInj,x=>(x>0?'+':'')+x+'%');delta('下季傷病負荷',before.injNext,after.injNext,x=>(x>0?'+':'')+x+'%');
  delta('團隊關係',before.chem,after.chem,x=>(x>0?'+':'')+x);delta('球迷聲望',before.fan,after.fan,x=>(x>0?'+':'')+x);delta('球員聲望',before.player,after.player,x=>(x>0?'+':'')+x);delta('家庭關係',before.aff,after.aff,x=>(x>0?'+':'')+x);
  delta('可動用現金',before.cash,after.cash,fmtMoney);delta('負債',before.debt,after.debt,fmtMoney);delta('淨資產',before.money,after.money,fmtMoney);delta('待分配能力點',before.pool,after.pool);delta('下季訓練骰加成',before.training,after.training,x=>(x>0?'+':'')+x+' 顆');delta('本季訓練骰',before.hsDice,after.hsDice,x=>(x>0?'+':'')+x+' 顆');delta('上場競爭',before.hsUsage,after.hsUsage,x=>(x>0?'+':'')+x+'%');delta('大賽晉級戰力',before.hsCup,after.hsCup,x=>(x>0?'+':'')+x);
  delta('所屬球隊',before.team,after.team);delta('生涯階段',before.stage,after.stage);delta('競賽層級',before.lv,after.lv);delta('投手角色',before.role,after.role,roleN);delta('守備位置',before.dpos,after.dpos,x=>DPN[x]||x||'未定');delta('投球策略',before.effort,after.effort);
  delta('MLB 名單',before.mlbRoster,after.mlbRoster);
  if(JSON.stringify(before.ct)!==JSON.stringify(after.ct)){const ct=x=>x?`${x.yrs} 年・年薪 ${fmtContractMoney(x.annual||0,S.org)}${x.option?'・'+x.option:''}`:'無合約';lines.push(`合約 ${ct(before.ct)} → <b>${ct(after.ct)}</b>`);}
  if(before.seasonFactor!==after.seasonFactor)lines.push(`可出賽比例 ${Math.round((before.seasonFactor||0)*100)}% → <b>${Math.round((after.seasonFactor||0)*100)}%</b>`);
  if(!lines.length)return '';
  const visible=lines.slice(0,4),extra=lines.slice(4);
  return `<div class="choice-state-diff"><b>結果</b>${visible.map(x=>`<span>${x}</span>`).join('')}${extra.length?`<details><summary>其他 ${extra.length} 項變動</summary>${extra.map(x=>`<span>${x}</span>`).join('')}</details>`:''}</div>`;
}
function broadcastCategory(cls,title){const t=String(title||'');if(/交易|DFA|下放|升上|升格|釋出|簽約|合約|自由球員|選秀/.test(t))return '名單／合約';if(/傷|復健|手術|健康/.test(t))return '健康';if(/獎|冠軍|明星|紀錄|名人堂|突破|稱號/.test(t))return '榮譽';if(/家庭|戀|約會|婚|孩子|球迷|公益|場外/.test(t))return '場外人生';if(/球季|大賽|比賽|成績/.test(t))return '賽事';return cls==='bad'?'重大轉折':cls==='good'?'正向進展':cls==='gold'?'生涯里程碑':'生涯動態';}
function card(cls,title,html){
  const d=document.createElement('article'),capture=_choiceResultCapture&&!_choiceResultCapture.hasResult?_choiceResultCapture:null,diff=capture?choiceStateDiff(capture.before):'',category=broadcastCategory(cls,title),when=S?`${S.year}｜${S.age} 歲｜${phaseName()}`:'生涯紀錄';
  d.className='card '+cls;d.setAttribute('data-category',category);
  const recap=capture?`<div class="choice-recap">你的選擇｜<b>${capture.choice}</b></div>`:'';
  d.innerHTML=`<div class="timeline-meta"><span>${when}</span><b>${category}</b></div>`+(title?`<h4>${title}</h4>`:'')+recap+html+diff;
  logTarget().appendChild(d);if(capture)capture.hasResult=true;
  const live=$('ui-live');if(live)live.textContent=`${category}：${String(title||'新消息').replace(/<[^>]+>/g,'')}`;
  scrollBottom();
}
function divider(t){ /* 每個 divider 開啟新的年度摺疊區塊 */ const log=$('log'); const blocks=log.querySelectorAll('.yr-block'); /* 替剛結束的「上一年」加上下拉箭頭標記，但保留展開（不加上 collapsed） */ const prev = blocks[blocks.length - 1]; if(prev){ const h = prev.querySelector('.yr-head'); if(h && prev.querySelector('.yr-body').children.length) h.classList.add('has-body'); } /* 找到「前年」（倒數第二個區塊）並將其摺疊起來 */ const prevPrev = blocks[blocks.length - 2]; if(prevPrev){ prevPrev.classList.add('collapsed'); } /* 建新區塊 */ const block=document.createElement('div'); block.className='yr-block'; const head=document.createElement('div'); head.className='yr-head'; head.textContent=t; const body=document.createElement('div'); body.className='yr-body'; head.onclick=()=>block.classList.toggle('collapsed'); block.appendChild(head); block.appendChild(body); log.appendChild(block); _curYearBody=body; /* 超過上限:移除最舊的年度區塊(釋放 DOM) */ const newBlocks=log.querySelectorAll('.yr-block'); if(newBlocks.length>MAX_YEARS){ for(let i=0;i<newBlocks.length-MAX_YEARS;i++)newBlocks[i].remove(); } }
function board(phase){
  $('bd-name').innerHTML=`<b>${S.name}</b><small>${S.dpos?DPN[S.dpos]:POSN[S.pos]}${S.role?'・'+roleN(S.role):''}<i>${playerType()}${S.traits.genius?' ★':''}</i></small>`;
  let t,level,roster='';
  if(S.stage==='HS'){t=S.team;level='高'+['一','二','三'][S.stageYr-1];}
  else if(S.stage==='U'){t=S.team;level='大'+['一','二','三','四'][S.stageYr-1];}
  else if(S.stage==='AMA'){t=S.team;level='業餘成棒';}
  else {t=S.orgTeam||S.teamName();level=`${LV[S.lv]?LV[S.lv].n:'職業'}${S.pos==='P'&&S.role?'・'+roleN(S.role):S.dpos?'・'+DPN[S.dpos]:''}${S.org==='NPB'?(npbRosterStatus().foreign?'・外籍':'・視同本土'):''}`;if(S.org==='MiLB')roster=mlbRosterStatus().short;}
  { const tc=(S.orgTeam&&TEAM_COLOR[S.orgTeam])||'var(--amber)';
    $('bd-team').style.setProperty('--team-color',tc);
    const rosterHTML=roster?`<span class="team-roster-chip">${roster}</span>`:'';
    $('bd-team').innerHTML=`<span class="team-monogram" aria-hidden="true">${teamMonogram(t)}</span><small>目前所屬球隊</small><b>${t||'尚未簽約'}</b><em>${level||stageLabel()}</em>${rosterHTML}`;
    const bt=$('broadcast-team');if(bt){bt.style.setProperty('--team-color',tc);bt.innerHTML=`<span class="team-monogram" aria-hidden="true">${teamMonogram(t)}</span><small>目前所屬</small><strong>${t||'尚未簽約'}</strong><em>${level||stageLabel()}</em>${rosterHTML}`;} }
  if($('broadcast-now'))$('broadcast-now').textContent=`${S.year}｜${['季初','賽季中','季末'][phase]||'生涯進行中'}`;
  $('bd-age').textContent=S.age; $('bd-year').textContent=S.year;
  $('bd-ovr').textContent=ovr(); if(S.pos==='P'){const el=$('bd-tj'); if(el)el.textContent='';} $('bd-sal').textContent=Math.round(S.finance?syncFinance().cash:S.salary).toLocaleString();
  [0,1,2].forEach(i=>$('lp'+i).classList.toggle('on',i===phase));
  renderRails();
}
function actClear(){ const a=$('act'); a.innerHTML=''; a.classList.remove('collapsed');
  a.classList.remove('event-actions','decision-modal','decision-docked','decision-major','result-continue','allocation-complete','allocation-modal');a.removeAttribute('role');a.removeAttribute('aria-modal');a.removeAttribute('aria-label');
  const career=$('career-main'),backdrop=$('decision-backdrop');if(career)career.classList.remove('decision-open');if(backdrop){backdrop.classList.remove('open');backdrop.setAttribute('aria-hidden','true');}
  const t=$('act-toggle'); if(t)t.style.display='none'; }
function continueAction(label,next){
  _choiceResultCapture=null;actClear();const a=$('act');a.classList.add('result-continue');const b=document.createElement('button');b.className='btn main';b.type='button';b.textContent=label||'看完結果，繼續 ▸';b.onclick=()=>{actClear();next();};a.appendChild(b);requestAnimationFrame(()=>b.focus({preventScroll:true}));scrollBottom();
}
function choiceImpactText(o){
  if(o.s)return o.s;
  const t=String(o.t||'');
  if(/引退|高掛球鞋|結束球員/.test(t))return '結束選手生涯，進入生涯總結';
  if(/離開談判桌|拒絕/.test(t))return '放棄目前方案；後續去向依合約或市場狀態處理';
  if(/維持現狀|留守|再戰一年|繼續磨練/.test(t))return '維持目前身分或設定，不取得額外數值加成';
  if(/選秀/.test(t))return '進入選秀流程；結果會影響職業起點與簽約機會';
  return '結果會寫進生涯播報';
}
function compactChoiceImpact(value){
  const text=String(value||'').replace(/<br\s*\/?>/gi,'｜').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
  const parts=text.split('｜').map(x=>x.trim()).filter(Boolean);
  if(/年薪|總值|簽約金/.test(text)){
    const money=parts.filter(x=>/年薪|總值|簽約金|\d+ 年/.test(x));
    if(money.length)return money.slice(0,2).join('｜');
  }
  return parts.slice(0,2).join('｜')||'立即結算';
}
function ensureChoiceOutcome(capture,tries){
  if(!capture||_choiceResultCapture!==capture||capture.hasResult)return;tries=tries||0;
  const waiting=['roll-overlay','season-overlay','summary-overlay','draft-overlay'].some(id=>$(id)&&$(id).classList.contains('open'));
  if(waiting&&tries<120){setTimeout(()=>ensureChoiceOutcome(capture,tries+1),200);return;}
  card('info','選擇結果','沒有額外變動。');
}
function actToggleSync(){
  const a=$('act'), t=$('act-toggle'); if(!t)return;
  const has=a.innerHTML.trim()!=='' && a.style.display!=='none';
  t.style.display=has?'block':'none';
  t.textContent=a.classList.contains('collapsed')?'⌃ 展開選項':'⌄ 收合選項';
}
function choose(title,opts){
  if(_choiceResultCapture&&_choiceResultCapture.hasResult){continueAction('看完選擇結果，再看下一步 ▸',()=>choose(title,opts));return;}
  actClear(); const a=$('act');
  a.classList.remove('collapsed'); /* 新選項出現時自動展開 */
  const richDecision=opts.some(o=>o.event||o.modal||Number.isFinite(o.probability)),majorDecision=/選秀|簽約|合約|自由球員|DFA|指定讓渡|交易|買斷|升上|升格|降至|下放|重大傷病|手術|引退|婚姻|求婚/.test(String(title||''))||opts.some(o=>o.major);
  a.classList.toggle('event-actions',richDecision);a.classList.toggle('decision-major',majorDecision);a.classList.add(majorDecision?'decision-modal':'decision-docked');
  if(majorDecision){a.setAttribute('role','dialog');a.setAttribute('aria-modal','true');a.setAttribute('aria-label','重大生涯決策');}
  const career=$('career-main'),backdrop=$('decision-backdrop');if(majorDecision&&career)career.classList.add('decision-open');if(backdrop){backdrop.classList.toggle('open',majorDecision);backdrop.setAttribute('aria-hidden',majorDecision?'false':'true');}
  const tools=majorDecision?'<div class="decision-tools"><button class="decision-dock" type="button">先看生涯播報</button></div>':'';
  if(title)a.innerHTML=tools+`<div class="title">${title}</div>`;
  else a.innerHTML=tools+'<div class="title decision-heading"><span>下一步</span><b>選擇你的行動</b></div>';
  {const dock=a.querySelector('.decision-dock');if(dock)dock.onclick=()=>{a.classList.remove('decision-modal','decision-major');a.classList.add('decision-docked');a.removeAttribute('role');a.removeAttribute('aria-modal');if(career)career.classList.remove('decision-open');if(backdrop){backdrop.classList.remove('open');backdrop.setAttribute('aria-hidden','true');}dock.remove();};}
  opts.forEach((o,idx)=>{ const b=document.createElement('button');
    const eventStyle=richDecision,bounded=Number.isFinite(o.probability),direct=o.direct||!bounded;
    b.className='btn'+(o.main?' main':'')+(o.risk?' risk':'')+(o.warn?' warn':'')+(eventStyle?' event-choice':' choice-card');
    const impact=compactChoiceImpact(choiceImpactText(o));
    const badge=o.risk?'<em class="choice-risk-badge">高風險・高報酬</em>':o.warn?'<em class="choice-cost-badge">重大代價</em>':'';
    const chanceTitle=o.sideTitle||`成功 ${Math.round(o.probability)}%`,chanceNote=o.sideNote||(o.risk?'高風險・高報酬':chanceBand(o.probability));
    b.innerHTML=eventStyle?`<span class="event-key">${String.fromCharCode(65+idx)}</span><span class="event-copy"><b>${o.t}</b><small>${impact}${badge}</small></span>${bounded?`<span class="chance-num${o.risk?' risk':''}">${chanceTitle}<small>${chanceNote}</small></span>`:'<span class="choice-arrow">›</span>'}`:`<span class="choice-key">${String.fromCharCode(65+idx)}</span><span class="choice-content"><b>${o.t}</b><small>${impact}${badge}</small></span><span class="choice-arrow">›</span>`;
    b.onclick=()=>{const capture={choice:o.t,before:choiceStateSnapshot(),entries:[]};_choiceResultCapture=capture;actClear();o.f();setTimeout(()=>ensureChoiceOutcome(capture,0),160);};a.appendChild(b); });
  actToggleSync(); scrollBottom();requestAnimationFrame(()=>{const first=a.querySelector('button');if(first)first.focus({preventScroll:true});});
}
function potentialBreakthroughRules(){
  if(S.pos==='P')return [
    {id:'power_pitch',name:'聯盟宰制',match:/三振王/,need:3,targets:['vel','brk'],condition:'連續 3 年三振王'},
    {id:'ace_pitch',name:'王牌進化',match:/防禦率王|賽揚獎|澤村賞/,need:3,targets:['ctl','brk'],condition:'連續 3 年防禦率王／最高投手獎'},
    {id:'workhorse',name:'工作馬進化',match:/勝投王/,need:3,targets:['sta'],condition:'連續 3 年勝投王'},
    {id:'relief_peak',name:'牛棚極限',match:/救援王|中繼王/,need:3,targets:['ctl','vel','sta'],condition:'連續 3 年救援王／中繼王'}];
  return [
    {id:'home_run',name:'長打極限',match:/全壘打王/,need:3,targets:['pow'],condition:'連續 3 年全壘打王'},
    {id:'batting',name:'打擊極限',match:/打擊王|安打王/,need:3,targets:['con'],condition:'連續 3 年打擊王／安打王'},
    {id:'discipline',name:'選球極限',match:/上壘王/,need:3,targets:['eye'],condition:'連續 3 年上壘王'},
    {id:'speed',name:'速度極限',match:/盜壘王/,need:3,targets:['spd'],condition:'連續 3 年盜壘王'},
    {id:'defense',name:'守備極限',match:/金手套/,need:4,targets:['rng','fld','arm'],condition:'連續 4 年金手套'}];
}
function potentialBreakthroughState(){return S.potentialBreakthrough||(S.potentialBreakthrough={streaks:{},successes:{},history:[]});}
function potentialProgressHTML(){
  const ps=potentialBreakthroughState(),rules=potentialBreakthroughRules(),active=rules.filter(r=>(ps.streaks[r.id]||0)>0).sort((a,b)=>(ps.streaks[b.id]||0)-(ps.streaks[a.id]||0)),r=active[0];
  if(!r)return '';
  return `<div class="potential-breakthrough"><b>連霸進度</b><span>${r.name} ${Math.min(ps.streaks[r.id],r.need)}/${r.need}</span></div>`;
}
function potentialBreakthroughAudit(awards){
  const ps=potentialBreakthroughState(),rules=potentialBreakthroughRules();let streakAward=null;
  rules.forEach(rule=>{
    const won=awards.some(x=>rule.match.test(x));ps.streaks[rule.id]=won?(ps.streaks[rule.id]||0)+1:0;
    const streak=ps.streaks[rule.id],eligible=rule.targets.filter(k=>k in S.ab&&Math.max(S.ab[k],S.pot[k]||0)<RATING_MAX);
    if(won&&streak>=2&&(!streakAward||streak>streakAward.streak))streakAward={rule,streak};
    if(won&&streak>=2&&streak<rule.need)queueAchievement({kind:'streak',kicker:'連續年度獎項',title:rule.name,subtitle:rule.condition,progress:`${streak}/${rule.need}`,detail:`連霸已延續 ${streak} 年`,result:`距離突破資格還差 ${rule.need-streak} 年`,note:'連霸本身不直接增加能力；達標後才取得低機率上限突破挑戰。'});
    if(!won||streak<rule.need||(ps.successes[rule.id]||0)>=2||!eligible.length)return;
    const p=clamp(10+(streak-rule.need)*3,10,22);
    if(chance(p)){
      const k=pick(eligible),before=Math.max(S.ab[k],S.pot[k]||0),after=clamp(before+2,1,RATING_MAX);S.pot[k]=after;ps.successes[rule.id]=(ps.successes[rule.id]||0)+1;ps.streaks[rule.id]=0;ps.history.push({year:S.year,id:rule.id,key:k,before,after});
      card('gold','實績突破｜個人上限鬆動',`${rule.condition}後，球探與教練重新評估了你的身體與技術天花板。<b class="hl">${ABL[k]} 潛力上限 ${before} → ${after}/99</b>。這不是免費能力，仍要在往後訓練中把它練出來。`);board(2);
      queueAchievement({kind:'breakthrough',kicker:'超稀有實績突破',title:`${ABL[k]} 上限突破`,subtitle:rule.condition,progress:`${before} → ${after}/99`,detail:`突破機會 ${p}%`,result:'個人潛力上限重新評估',note:'只提高潛力上限 2 點，實際能力仍須靠訓練取得。'});
    }else{
      card('info','極限仍未鬆動',`${rule.condition}讓你取得突破資格，但這次身體與技術沒有產生新的適應。<div class="statline">本次突破機會 ${p}%｜連霸維持 ${streak} 年；若明年再次奪冠，機會提高 3%。</div>`);
      queueAchievement({kind:'streak',kicker:'連霸突破挑戰',title:rule.name,subtitle:rule.condition,progress:`${streak} 年連霸`,detail:`本次突破機會 ${p}%`,result:'連霸仍在，上限尚未鬆動',note:'明年再次奪冠，突破機會提高 3%。'});
    }
  });
  if(streakAward&&S.awardStreakBonusYear!==S.year){
    S.awardStreakBonusYear=S.year;S.offseasonTrainingDice=clamp((S.offseasonTrainingDice||0)+1,0,3);S.awardLeverage=clamp(Math.max(S.awardLeverage||0,streakAward.streak),0,4);S.awardLeverageUntil=S.year+1;
    card('gold','連霸紅利已生效',`${streakAward.rule.name}連續 ${streakAward.streak} 年成立。球團與市場不只留下獎盃：<b class="hl">下季訓練骰 +1、合約行情 +${S.awardLeverage*3}%、跨聯盟關注提高</b>。沒有直接送能力點，實際成長仍要靠下一次訓練。`);
    queueAchievement({kind:'streak',kicker:'連續年度獎項',title:`${streakAward.rule.name} ×${streakAward.streak}`,subtitle:'連霸紅利正式生效',progress:`${streakAward.streak} 年連霸`,detail:'下季訓練骰 +1',result:`合約行情 +${S.awardLeverage*3}%・跨聯盟關注提高`,note:'紅利不直接增加能力；訓練骰仍須親自分配。'});
  }
}
/* 加點介面：mode {dice:[..]} 或 {pool:n} */
function allocUI(mode,label,done){
  actClear(); const a=$('act'); const keys=POS_AB[S.pos];
  a.classList.add('decision-modal','allocation-modal');a.setAttribute('role','dialog');a.setAttribute('aria-modal','true');a.setAttribute('aria-label','能力分配');
  const career=$('career-main'),backdrop=$('decision-backdrop');if(career)career.classList.add('decision-open');if(backdrop){backdrop.classList.add('open');backdrop.setAttribute('aria-hidden','false');}
  let dice=mode.dice?mode.dice.slice():null, pool=mode.pool||0, idx=0, hist=[];
  const before=Object.fromEntries(keys.map(k=>[k,S.ab[k]])),beforeOvr=ovr(),offered=dice?dice.reduce((n,v)=>n+v,0):pool;
  a.innerHTML=`<div class="title">${label}</div><div id="al-top"></div><div id="al-rows"></div><div class="row2" id="al-btm"></div>`;
  const touchedKeys={};
  const top=$('al-top'),rows=$('al-rows'),btm=$('al-btm');
  function remaining(){ return dice?dice.length-idx:pool; }
  function render(){
    const allCap=keys.every(k=>S.ab[k]>=RATING_MAX||ageGrowthLocked(k)),finished=remaining()===0||allCap;
    a.classList.toggle('allocation-complete',finished);
    const status=finished?`<div class="alloc-status done"><b>✓ 已分配完成</b><span>${allCap&&remaining()>0?'能力皆達上限':'請按下方確認'}</span></div>`:`<div class="alloc-status"><b>點選要提升的能力</b><span>${dice?`剩餘 ${remaining()} 顆骰子`:`剩餘 ${pool} 點`}</span></div>`;
    if(dice){ top.innerHTML=status+'<div id="dice">'+dice.map((v,i)=>`<div class="die ${i<idx?'used':''} ${i===idx?'active':''} ${v===6?'six':''}">${v}</div>`).join('')+'</div>'+potentialProgressHTML(); }
    else top.innerHTML=status+potentialProgressHTML();
    rows.innerHTML='';
    keys.forEach(k=>{ const v=S.ab[k],ageLock=ageGrowthLocked(k),ageLimit=ageGrowthLimit(k),ageRemain=Math.max(0,ageLimit-ageGrowthUsed(k)),cap=v>=RATING_MAX||ageLock;
      const r=document.createElement('button');r.type='button';r.disabled=cap||finished;r.className='abrow'+(cap?' capped':'')+(finished&&!cap?' locked':'');
      const rawPk=(S.pot&&S.pot[k])||r99(62),pk=Math.max(v,rawPk),cst=abCost(k), cr=(S.carry&&S.carry[k])||0;
      const addText=ageLock?'維持':cap?'MAX':finished?'完成':'+';
      const ageNote=ageLock?'<small style="display:block;color:var(--dim)">本季無法再提升</small>':ageLimit<99?`<small style="display:block;color:var(--dim)">老將成長成本 ×${ageGrowthCost(k)}・本季最多再 +${ageRemain}</small>`:'';
      r.innerHTML=`<span class="nm">${ABL[k]}${ageNote}</span><span class="bar"><i style="width:${v/RATING_MAX*100}%"></i><em style="left:${pk/RATING_MAX*100}%"></em></span><span class="val" style="line-height:1.1">${v}<small style="opacity:.65">/${pk} 潛力</small>${cst>1&&!ageLock?`<span style="display:block;opacity:.5;font-size:10.5px;letter-spacing:1px;margin-top:-2px">${cr}/${cst}</span>`:''}</span><span class="alloc-add">${addText}</span>`;
      if(!cap&&!finished)r.onclick=()=>{ const amt=dice?dice[idx]:1;
        const pc=(S.carry&&S.carry[k])||0,pg=ageGrowthUsed(k);
        const got=addAb(k,amt); touchedKeys[k]=(touchedKeys[k]||0)+amt; hist.push([k,got,pc,pg]); if(dice)idx++; else pool--;
        render(); board(0); };
      rows.appendChild(r); });
    btm.innerHTML='';
    /* 復原鈕固定佔位:無可復原時 disabled 而非消失,避免版面跳動誤觸 */
    const u=document.createElement('button'); u.className='btn'; u.style.textAlign='center';
    u.textContent='↩ 復原'; u.disabled=!hist.length;
    u.style.opacity=hist.length?'1':'0.35'; u.style.cursor=hist.length?'pointer':'default';
    if(hist.length)u.onclick=()=>{ const [k,got,pc,pg]=hist.pop(); S.ab[k]-=got; if(S.carry)S.carry[k]=pc;S._seasonAgeGains=S._seasonAgeGains||{};S._seasonAgeGains[k]=pg||0;if(dice)idx--; else pool++; render(); board(0); };
    btm.appendChild(u);
    if(remaining()===0||allCap){ const c=document.createElement('button'); c.className='btn main';
      c.textContent=(remaining()>0&&allCap)?'能力已達上限，捨棄剩餘骰子 ▸':'確認 ▸';
      c.onclick=()=>{
        actClear();allocDone(touchedKeys,dice?true:false);board(0);
        const changes=keys.filter(k=>S.ab[k]!==before[k]).map(k=>`${ABL[k]} <b class="up">${before[k]} → ${S.ab[k]}</b>`),spent=dice?dice.length:offered-pool;
        const source=dice?`${dice.length} 顆骰子・點數 ${dice.join('、')}・合計 ${offered} 點`:`大賽／國際賽能力點 ${offered} 點`;
        card(changes.length?'good':'info',dice?'訓練成果已套用':'能力分配完成',`<div class="training-result"><b>${source}</b><span>${changes.join('｜')||'所有可用能力都已達上限，本次沒有實際提升'}</span></div><div class="statline">綜合能力 ${beforeOvr} → <b class="hl">${ovr()}/99</b>｜已使用 ${spent}${dice?' 顆訓練骰':' 點'}｜新的能力值會直接進入本季出賽與成績模擬。</div>`);
        continueAction(dice?'看完訓練結果，進入球季 ▸':'看完分配結果，繼續 ▸',done);
      }; btm.appendChild(c); }
    actToggleSync();
  }
  render();
}
/* ================= 年度流程 ================= */
function nextStep(){if(_choiceResultCapture&&_choiceResultCapture.hasResult){continueAction('看完選擇結果，繼續生涯 ▸',nextStep);return;}const f=stepQ.shift(); if(f)f(); }
function stageLabel(){
  if(S.stage==='HS')return '高'+['一','二','三'][S.stageYr-1];
  if(S.stage==='U')return '大'+['一','二','三','四'][S.stageYr-1];
  if(S.stage==='AMA')return '業餘成棒';
  return LV[S.lv].n;
}
function startYear(){ S.awardWatch=[];S.achievementQueue=[];stepQ=[phasePre,phaseMid,phaseEnd];captureYearCheckpoint();divider(`${S.year} 年 · ${S.age} 歲 · ${stageLabel()}`); nextStep(); }
/* ---------- 季初 ---------- */
function agingRiskProfile(){
  const effectiveAge=S.age-(S.traits.disc?2:0);
  const trauma=(S.bigInj||0)*4+(S.tjCount||0)*5;if(effectiveAge<28||(effectiveAge<30&&!trauma))return {effectiveAge,base:0,p:0,mods:[],trauma:0};
  /* 30 歲後逐年上升，但避免 38→40 歲突然從正常主力崩成全能力斷崖。重大傷病仍會額外推高風險。 */
  const base=effectiveAge<30?3+trauma:effectiveAge===30?6:effectiveAge===31?8:effectiveAge===32?11:effectiveAge===33?15:effectiveAge===34?20:effectiveAge===35?27:effectiveAge===36?34:effectiveAge===37?42:effectiveAge===38?50:effectiveAge===39?58:effectiveAge===40?66:effectiveAge===41?73:effectiveAge===42?79:Math.min(94,83+(effectiveAge-43)*2);
  let mod=0;const mods=[`身體年齡 ${effectiveAge}｜基準 ${base}%`],add=(label,v)=>{if(!v)return;mod+=v;mods.push(`${label} ${v>0?'+':''}${v}%`);};
  add('生涯大傷',(S.bigInj||0)*7);if(S.pos==='P')add('投手手臂',3+(S.tjCount||0)*5);else if(S.pos==='C')add('捕手負荷',5);
  if(S.traits.iron)add('鐵人體質',-10);if(S.ab.sta>=r99(65))add('體能儲備',-6);else if(S.ab.sta<=r99(42))add('體能不足',6);
  const last=S.lastSt;let workload=0;
  if(last){
    if(S.pos==='P')workload=isSP()&&last.IP>=180?7:isSP()&&last.IP>=155?4:!isSP()&&last.G>=65?5:0;
    else if(last.scheduled&&last.G>=last.scheduled*.95)workload=4;
  }
  add('上季高負荷',workload);if(S.traits.disc)mods.push('自律狂：曲線延後 2 年');
  const recentDamage=S.lastSt&&S.lastSt.availability<60?6:0,severityTrauma=(S.bigInj||0)*3+(S.tjCount||0)*3+recentDamage;
  return {effectiveAge,base,p:clamp(base+mod,2,97),mods,trauma:severityTrauma};
}
function agingPhysicalSet(){return new Set(S.pos==='P'?['sta','vel','brk']:S.pos==='C'?['sta','spd','arm','rng','cat']:['sta','spd','rng','arm']);}
function agingStatProfile(k,ageBand){
  const value=clamp(Number(S.ab[k])||1,1,RATING_MAX),physical=agingPhysicalSet().has(k);
  /* 已經偏低的身體工具更容易再次成為弱點，但絕對扣點設軟上限，避免 18 體力一年再掉 10。 */
  const weakness=value<=20?1.75:value<=30?1.55:value<=45?1.30:value<=65?1.05:value<=84?.86:.68;
  const baseCap=value<=20?2:value<=30?4:value<=40?6:value<=60?8:value<=80?10:12;
  const cap=Math.min(value-1,physical?baseCap+Math.min(2,Math.floor(ageBand/2)):Math.min(baseCap,3+Math.floor(ageBand/2)));
  return {value,physical,weakness,cap:Math.max(0,cap),weight:(physical?2.65:.62)*weakness};
}
function weightedAgingKey(keys,weight){
  const rows=keys.map(k=>({k,w:Math.max(.001,Number(weight(k))||0)})),total=rows.reduce((n,x)=>n+x.w,0);let roll=R()*total;
  for(const row of rows){roll-=row.w;if(roll<=0)return row.k;}return rows[rows.length-1].k;
}
function agingLossAllocation(plan){
  const all=POS_AB[S.pos].filter(k=>agingStatProfile(k,plan.ageBand).cap>0),selected=[],losses={};
  while(selected.length<Math.min(plan.count,all.length)){
    const pool=all.filter(k=>!selected.includes(k)),k=weightedAgingKey(pool,x=>agingStatProfile(x,plan.ageBand).weight);selected.push(k);losses[k]=0;
  }
  let left=plan.planned;
  /* 每個被波及項目先承受 1 點，再依能力類型、目前弱點與剩餘承受空間分配。 */
  selected.forEach(k=>{if(left>0&&agingStatProfile(k,plan.ageBand).cap>0){losses[k]++;left--;}});
  while(left>0){
    const pool=selected.filter(k=>losses[k]<agingStatProfile(k,plan.ageBand).cap);if(!pool.length)break;
    const k=weightedAgingKey(pool,x=>{const p=agingStatProfile(x,plan.ageBand),room=1-losses[x]/Math.max(1,p.cap);return p.weight*(.35+room*.65);});losses[k]++;left--;
  }
  return {keys:selected,losses,unallocated:left};
}
function trainingDicePlan(){
  if(S._seasonTrainingPlan&&S._seasonTrainingPlan.year===S.year)return S._seasonTrainingPlan;
  const r=R();let base=S.skipMid?2:S.stage==='PRO'?(r<.25?2:r<.72?3:r<.94?4:5):(r<.35?3:r<.78?4:r<.96?5:6),n=base,mods=[];
  if(S.stage==='HS'&&!S.skipMid){const v=S.hsTrainingDiceMod||0;n+=v;if(v)mods.push(`高中計畫 ${v>0?'+':''}${v}`);}
  if(S.stage==='PRO'&&!S.skipMid){
    const agePenalty=S.age<33?0:S.age<36?1:S.age<39?2:S.age<42?3:4,ageCap=S.age<30?6:S.age<33?5:S.age<36?4:S.age<39?3:S.age<42?2:1;
    n-=agePenalty;if(agePenalty)mods.push(`年齡 ${S.age} 歲 −${agePenalty}`);
    const off=S.offseasonTrainingDice||0;if(off){n+=off;mods.push(`休賽季投入 +${off}`);}
    const staff=S.seasonContext&&S.seasonContext.trainingDice?S.seasonContext.trainingDice:0;if(staff){n+=staff;mods.push(`教練團 +${staff}`);}
    if(S.traits.distract){n--;mods.push('外務纏身 −1');}
    const finance=syncFinance(),income=Math.max(1,Number(S.ct&&S.ct.annual)||100);if(finance.debt>income*1.5){n--;mods.push('財務壓力 −1');}
    if(S.traits.academy&&chance(35)){n++;mods.push('學院派 +1');}
    if(S.samePickBonus&&chance(45)){n++;mods.push('專精訓練 +1');}
    n=clamp(n,1,ageCap);mods.push(`年齡上限 ${ageCap} 顆`);
    S._seasonTrainingPlan={year:S.year,n,base,mods,offseasonBonus:off,agePenalty,ageCap};return S._seasonTrainingPlan;
  }
  if(S.traits.distract&&!S.skipMid){n--;mods.push('外務纏身 −1');}
  if(S.traits.academy&&!S.skipMid&&chance(35)){n++;mods.push('學院派 +1');}
  if(S.samePickBonus&&!S.skipMid&&chance(45)){n++;mods.push('專精訓練 +1');}
  S._seasonTrainingPlan={year:S.year,n:clamp(n,2,6),base,mods,offseasonBonus:0,agePenalty:0,ageCap:6};return S._seasonTrainingPlan;
}
function agingDecisionSummary(){
  const last=S.aging&&S.aging.last&&S.aging.last.year===S.year?S.aging.last:null,plan=trainingDicePlan(),decline=last&&last.loss?`本年退化 −${last.loss}（${(last.changes||[]).join('、')||'多項能力'}）`:'本年沒有能力退化';
  return `${decline}｜目前綜合 ${ovr()}/99｜下一次季初訓練 ${plan.n} 顆（${plan.mods.join('｜')||'無年齡扣減'}）`;
}
function retirementAgeLimit(){
  if(Number.isFinite(S.retirementAgeLimit))return S.retirementAgeLimit;
  const durability=(S.traits.iron?1:0)+(S.traits.disc?1:0)+(S.traits.workhorse?1:0),trauma=Math.min(3,Math.floor(((S.bigInj||0)+(S.tjCount||0))/2));
  S.retirementAgeLimit=clamp(ri(45,49)+durability-trauma,43,50);return S.retirementAgeLimit;
}
function retirementReviewEligible(){return S.stage==='PRO'&&S.rehab===0&&(S.age>=35||S.age>=32&&((S.bigInj||0)+(S.tjCount||0)>=2));}
function agingLossPlan(info,roll){
  const ageBand=info.effectiveAge<33?0:info.effectiveAge<36?1:info.effectiveAge<39?2:info.effectiveAge<42?3:Math.min(6,4+Math.floor((info.effectiveAge-42)/2));
  const margin=Math.max(0,info.p-roll),critical=roll<=2||margin>=48,bandLoss=[2,4,7,10,14,18,22][ageBand]||22,trauma=Math.min(10,info.trauma||0);
  return {ageBand,margin,critical,planned:clamp(bandLoss+Math.floor(margin/14)+trauma+(critical?4:0),2,34),count:Math.min(POS_AB[S.pos].length,clamp(2+Math.floor(ageBand/2)+(margin>=30?1:0)+(trauma>=5?1:0),2,POS_AB[S.pos].length))};
}
function agingCheck(done){
  const info=agingRiskProfile();if(!info.p){done();return;}
  S.aging=S.aging||{checks:0,declines:0,totalLoss:0,last:null};S.aging.checks++;
  const safeChance=100-info.p,beforeOvr=ovr(),finish=()=>{board(0);if(S.stage==='PRO'&&S.age>=36)continueAction('看完體能與退化結算，再決定是否續戰 ▸',done);else done();};
  animatedRoll({sides:100,kicker:'春訓體能評估',title:`${S.age} 歲｜身體狀態`,subtitle:'揭曉今年的退化結果。',probability:safeChance,modifiers:info.mods,resultText:r=>r.success?'身體撐住了':'退化觸發'}).then(r=>{
    if(r.success){
      S.aging.last={year:S.year,roll:r.value,risk:info.p,loss:0,changes:[],beforeOvr,afterOvr:ovr()};
      card('good','身體維持住了',`今年沒有能力退化。<div class="statline">綜合能力 ${ovr()}/99</div>`);finish();return;
    }
    const plan=agingLossPlan(info,r.value),{ageBand,margin,critical}=plan,allocation=agingLossAllocation(plan),keys=allocation.keys,losses=allocation.losses;
    const changes=[],plainChanges=[];let total=0;
    keys.forEach(k=>{const before=S.ab[k];S.ab[k]=clamp(before-losses[k],1,RATING_MAX);const loss=before-S.ab[k];if(loss){total+=loss;changes.push(`${ABL[k]} <b class="dn">${before} → ${S.ab[k]}（−${loss}）</b>`);plainChanges.push(`${ABL[k]} −${loss}`);}});
    S.aging.declines++;S.aging.totalLoss+=total;if(total>=14)S.aging.major=(S.aging.major||0)+1;S.aging.last={year:S.year,roll:r.value,risk:info.p,severity:ageBand,loss:total,critical,changes:plainChanges,beforeOvr,afterOvr:ovr()};
    const grade=total<=3?'輕微退化':total<=7?'局部衰退':total<=13?'明顯退化':'重大退化';
    card(total>=8?'bad':'info',grade,`${changes.join('｜')}<div class="statline">綜合能力 ${beforeOvr} → <b class="dn">${ovr()}/99</b>｜合計 −${total}</div>`);finish();
  });
}
function phasePre(){
  S.prevSeasonD=Number.isFinite(S.lastD)?S.lastD:0;
  S.tmpInj=0; S.seasonFactor=1; S.skipMid=false; S.lastD=0;S.lastMarketD=0;S.lastMarketBreakdown=null;S.seasonLuck=10;S.seasonMomentum=0;S.teamSeasonMomentum=0;S._seasonVariance=null;S._pendingSeasonStats=null;S._pendingSeasonSegments=null;S._seasonServiceParts=[];S._seasonEventMonths=[];S._seasonTeamRecord=null;S._roleReviewMonth=null;S._callupReview=null;S._pendingAmateurStats=null;S._seasonTrainingPlan=null;S._seasonAgeGains={};S._seasonInjuryDecline=null;S._rehabReason=null;S.drawnEvents=S.drawnEvents||[];S.hsCupBonus=0;S.hsTrainingDiceMod=0;S.hsUsageBonus=0;S.hsPlan=null;S.hsPlanEffect=null;
  S.npcSeasonContext=null;if(S.stage==='PRO')prepareNpcSeason();S.seasonPlan=makeSeasonPlan();S.seasonContext=makeSeasonContext();board(0);
  const poach=activePoachEffect(),names=S.seasonContext.items.map(x=>x.n);if(poach)names.unshift(poach.label);
  const tone=S.seasonContext.perf>=1?'有利':S.seasonContext.perf<=-1?'艱難':'中性';
  card('info','本季環境',`<p class="season-context-line">${names.join('・')}</p><div class="season-context-result"><b>${tone}</b><span>已套用</span></div>`);
  if(S.age>=43&&S.age>=retirementAgeLimit()){endGame(`多年傷勢、體能與恢復報告都已到達負荷極限，${S.year} 年春訓後宣布引退。`);return;}
  if(S.age-(S.traits.disc?2:0)>=30||((S.bigInj||0)+(S.tjCount||0)>0&&S.age>=28)){agingCheck(phasePreContinue);return;}
  phasePreContinue();
}
function phasePreContinue(){
  if(S.rehab>0){ S.rehab--; S.skipMid=true; S.seasonFactor=0;
    const prior=(S.injuryHistory||[]).slice().reverse().find(x=>x.year<S.year&&/球季報銷|生涯威脅/.test(x.title||'')),site=prior&&prior.site?prior.site:'重大傷勢',title=prior&&prior.title?prior.title:'長期傷勢',originYear=prior&&prior.year?prior.year:S.year-1;S._rehabReason={year:S.year,originYear,site,title};
    card('bad',`復健年｜${site}`,`${originYear} 年的${title}仍未恢復，本季確定<b class="dn">全年報銷</b>。`);
    const dummySt = {G:0,PA:0,AB:0,H:0,HR:0,RBI:0,SB:0,BB:0,W:0,L:0,SV:0,HLD:0,HP:0,IP:0,SO:0,ER:0,avg:0,era:0,WHIP:0,DEF:0,role:S.pos==='P'?S.role:null,reliefStatus:S.pos==='P'&&S.role!=='SP'?reliefStatusKey():null};
    S.log.push({y:S.year,age:S.age,tm:S.stage==='PRO'?S.teamName():(S.team||stageLabel()),line:`${site}${title}復健・全年報銷`, inj:true,injury:{site,title,originYear},st:S.stage==='PRO'?dummySt:null}); }
  let afterAsk=()=>{
    const plan=trainingDicePlan(),n=plan.n;if(S.stage==='PRO'&&!S.skipMid&&plan.offseasonBonus)S.offseasonTrainingDice=0;
    const floor=S.traits.genius?3:S.traits.late?2:1;
    choose('季初自主訓練',[{t:`開始 ${n} 顆訓練拉霸`,main:true,s:`${n} 顆｜每顆 1～6`,f:()=>{
      animatedDicePool(n,floor,`${S.year} 季初訓練骰`).then(dice=>{
        let newSix=0;
        dice.forEach(v=>{if(v===6&&S.age<22&&!S.traits.genius){S.six++;newSix++;}});
        let msg=`結果｜<b class="hl">${dice.join('、')}</b>`;
        if(newSix&&!S.traits.genius)msg+=` 高標值「6」累計 <b class="hl">${S.six}/6</b> 次。`;
        card('','季初特訓',msg);
        if(S.six>=6&&!S.traits.genius&&S.age<22){ S.traits.genius=true;
          const exDef=S.pos==='C'?['rng','fld','arm','cat']:[];
          const cands=POS_AB[S.pos].filter(k=>S.ab[k]<r99(70)&&!exDef.includes(k));
          for(let i=cands.length-1;i>0;i--){const j=Math.floor(R()*(i+1));const t=cands[i];cands[i]=cands[j];cands[j]=t;}
          const boost=cands.slice(0,2),bl=[];
          boost.forEach(k=>{S.pot[k]=Math.min(RATING_MAX,(S.pot[k]||r99(62))+10);S.ab[k]=clamp(S.ab[k]+5,1,RATING_MAX);bl.push(`${ABL[k]} <b class="up">+5</b>（潛力上限 +10 → ${S.pot[k]}/99）`);});
          card('gold','特性解鎖｜天才',`訓練最低 3 點。${bl.length?` ${bl.join('、')}`:''}`);
          queueAchievement({kind:'trait',kicker:'隱藏素質覺醒',title:'天才',subtitle:'22 歲前累積 6 次最高訓練點數',progress:'6/6',detail:'公平訓練骰成就達標',result:'訓練成果保底提高',note:'往後每顆訓練骰最低 3 點；成功仍取決於選擇、能力與臨場結果。'});
          board(1);
        }
        dposReview(()=>allocUI({dice},'分配訓練成果｜能力上限 99',()=>nextStep()));
      });
    }}]);
  };
  /* 投手開季：投球強度(續航+TJ 量表) */
  const preAsk=afterAsk;
  if(S.pos==='P'&&S.stage==='PRO'&&!S.skipMid){
    afterAsk=()=>{
      const arm=armConditionProfile(),healthP=injuryProb(),full=pitchingPlanProjection('全力投'),normal=pitchingPlanProjection('普通投'),care=pitchingPlanProjection('養生球');
      const lock=(effort,p)=>{S.effort=effort;S.pitchPlan={year:S.year,effort,armBefore:arm.pct,projected:p.pct,added:+p.added.toFixed(1)};
        card(p.tone,`投球規劃｜${effort}`,`<div class="statline">AVG FB ${p.velo}｜ERA ${p.era}｜K ${p.so}｜手肘 ${arm.pct}% → ${p.pct}%</div>`);preAsk();};
      choose(`開季投球規劃｜${arm.label}・手肘負荷 ${arm.pct}%`,[
        {t:'全力投',risk:true,s:`球速 ${full.velo}｜手肘 ${full.pct}%`,f:()=>lock('全力投',full)},
        {t:'普通投',main:true,s:`表現平衡｜手肘 ${normal.pct}%`,f:()=>lock('普通投',normal)},
        {t:'養生球',s:`降低壓制｜手肘 ${care.pct}%`,f:()=>lock('養生球',care)}]);
    };
  }
  /* 大學季前：是否投入選秀與旅外（大二～大四） */
  if(S.stage==='U'&&S.stageYr>=2){
    const o=ovr();
    const opts=[
      {t:'投入本年度中華職棒選秀',s:`目前綜合 ${o}｜只參加一次；落榜後不會在季末被重複送進選秀`,f:()=>{
        S.draftDecision={year:S.year,status:'entered'};
        runDraft(true,r=>{if(r==='fail')S.draftDecision={year:S.year,status:'undrafted'};afterAsk();});}},
      {t:'本年度不投入選秀',main:true,s:'留在大學完成本季；系統會記住這個決定，不會在季末強制參選',f:()=>{
        S.draftDecision={year:S.year,status:'declined'};
        card('info','本年度不參加選秀',`你已正式決定不參加 ${S.year} 年中華職棒選秀，繼續代表 <b class="hl">${S.team}</b> 完成本季。季末不會再次替你報名。`);
        afterAsk();}}
    ];
    /* 年齡懲罰：每長一歲，門檻微調，但簽約金大幅縮水 */
    const agePenalty = Math.max(0, S.age - 18);
    const reqNPB = r99(44 + Math.floor(agePenalty / 2));
    const reqMiLB = r99(50 + Math.floor(agePenalty / 2));
    const bonusNPB = Math.max(100, 800 - agePenalty * 180);   // 日職簽約金逐年大減
    const bonusMiLB = Math.max(150, 1500 - agePenalty * 350); // 美職簽約金逐年大減
    if(o>=reqNPB)opts.push({t:'洽談旅日合約',s:`休學挑戰日職｜大齡影響簽約金`,f:()=>{
      S.proEntry=S.proEntry||'U';S.stage='PRO'; S.team=''; S.svc=0; S.faElig=false;
      pickOfferUI('日職球團報價','NPB',makeOffers('NPB',2,bonusNPB,2,3,'NPB2',null),afterAsk);}});
    if(o>=reqMiLB)opts.push({t:'洽談旅美合約',s:`休學挑戰小聯盟｜大齡影響簽約金`,f:()=>{
      S.proEntry=S.proEntry||'U';S.stage='PRO'; S.team=''; S.svc=0; S.faElig=false;
      pickOfferUI('大聯盟球團報價','MiLB',makeOffers('MiLB',2,bonusMiLB,3,4,o>=r99(55)?'A1':'R',null),afterAsk);}});
    choose(`大${['一','二','三','四'][S.stageYr-1]}季前 · 升學與職棒的十字路口`,opts);
    return;
  }
  if(retirementReviewEligible()){
    const review=agingDecisionSummary();
    const opts=[{t:'再戰一年',main:true,s:review,f:afterAsk}];
    if(S.age>=38&&!S.farewellYear)opts.push({t:'宣布本季為告別球季',modal:true,s:'完整打完本季後引退｜球隊會依能力安排角色，不保證固定先發',f:()=>{S.farewellYear=S.year;card('gold','告別球季',`${S.name} 宣布將在本季結束後退休。這不是表演賽：出賽與成績仍按能力、健康和球隊競爭決定。`);afterAsk();}});
    opts.push({t:'召開引退記者會',warn:true,s:'現在結束生涯；自願退休會放棄尚未履行的合約保障',f:()=>{voluntaryRetirementSettlement();daibaFarewell(()=>endGame('功成身退，於 '+S.year+' 年宣布引退。'));}});
    choose(`續戰評估｜${S.age} 歲・綜合 ${ovr()}/99`,opts);
    return;
  }
  if(S.stage==='HS'&&!S.skipMid){highSchoolSeasonChoice(afterAsk);return;}
  if(S.stage==='PRO'&&!S.skipMid&&S.seasonPlan&&S.seasonPlan.team){teammateChoice(afterAsk);return;}
  afterAsk();
}
/* ---------- 賽季中 ---------- */
function phaseMid(){
  board(1);
  if(S.skipMid){ S.ironStreak=0; nextStep(); return; }
  const nEv=S.seasonPlan?S.seasonPlan.events:(S.stage==='PRO'?3:2),scheduled=S.stage==='PRO'?Math.min(2,nEv):0,preEvents=Math.max(0,nEv-scheduled),startSeason=()=>{if(S.stage==='PRO')proSeason();else runSeasonAnimation(()=>amateurSeason());},runEvents=()=>{S._seasonEventMonths=scheduled===2?[2,4]:scheduled===1?[ri(2,4)]:[];drawEvents(preEvents,startSeason);};
  if(S.seasonPlan&&S.seasonPlan.family)loveEvent(runEvents);else runEvents();
}
function drawEvents(n,done,total){
  total=total||n;
  if(n<=0){ done(); return; }
  const drawn=S.drawnEvents||(S.drawnEvents=[]),pool=EVENTS.filter(e=>eventCareerEligible(e,drawn));
  if(!pool.length){done();return;}const ev=pick(pool);drawn.push(ev.n);
  const meta=eventMeta(ev);
  const after=()=>{board(1);continueAction(n>1?'看完結果，進入下一事件 ▸':'看完結果，進入球季模擬 ▸',()=>drawEvents(n-1,done,total));};
  const relation=meta.kind==='團隊關係'?teamRelationView():null;
  const relationHTML=relation?`<div class="team-relation-status ${relation.tone}"><span>目前團隊關係</span><b>${relation.value>0?'+':''}${relation.value}</b><em>${relation.label}</em></div>`:'';
  const title=`<div class="event-stage" style="--event-color:${meta.color}"><div class="event-top"><span class="event-kind">${meta.kind}</span><span class="event-count">${total-n+1}/${total}</span></div><div class="event-name">${ev.n}</div><div class="event-summary">${meta.scene}</div>${relationHTML}</div>`;
  choose(title,eventChoices(ev,meta,after));
}
function eventCareerEligible(e,drawn){
  if(!e||drawn.includes(e.n))return false;
  if(e.orgs&&!e.orgs.includes(S.org))return false;
  if(e.minAge&&S.age<e.minAge||e.maxAge&&S.age>e.maxAge)return false;
  if(e.levels&&!e.levels.includes(S.lv))return false;
  const roleOK=e.for==='*'||e.for===S.pos||((e.for==='A'||e.for==='B')&&S.pos!=='P')||(e.for==='PRO'&&S.stage==='PRO');
  if(!roleOK)return false;
  const n=e.n||'',top=S.stage==='PRO'&&LV[S.lv]&&LV[S.lv].top;
  if(/日本大賽|總冠軍|季後賽/.test(n)&&!top)return false;
  if(/交易截止|球員工會|代言|品牌|記者會|紀錄片|播客/.test(n)&&S.stage!=='PRO')return false;
  if(/終結者休兵代班|跨局中繼|長中繼|牛棚告急/.test(n)&&S.pos==='P'&&S.role==='SP')return false;
  return true;
}
function eventMeta(ev){
  const n=ev.n;
  if(ev.case)return {kind:ev.kind||'真實案例',icon:'📰',color:'#ff9d5c',scene:ev.basis,source:ev.source,url:ev.url};
  if(ev.kind){const styled={
    '捕手指揮':['捕手指揮','▣','#6db4d7','每一個暗號都同時影響投手信任、跑者壓力與下一球的執行。'],
    '內野協防':['內野協防','◇','#82c89a','責任區、腳步與隊友默契必須在一瞬間接起來。'],
    '外野判讀':['外野判讀','△','#72b8d9','飛球軌跡、牆面與隊友喊聲正在同時考驗第一步。'],
    '投手職責':['投手職責','●','#e0b85c','登板角色與手臂負荷突然改變，你得決定如何完成今天的局數。']
  }[ev.kind];if(styled)return {kind:styled[0],icon:styled[1],color:styled[2],scene:styled[3]};}
  if(/媒體|社群|代言|工會/.test(n))return {kind:'場外焦點',icon:'📣',color:'#dd784f',scene:'鏡頭與輿論突然靠近，你得決定要投入多少心力。'};
  if(/睡眠|伙食|營養|防護|心理|宵夜|低潮/.test(n))return {kind:'身心狀態',icon:'🫀',color:'#76d49a',scene:'漫長球季正在消耗身體，這次處理方式會留下後續影響。'};
  if(/守備|跑壘|長傳|草皮|球具/.test(n))return {kind:'球場技術',icon:'🧤',color:'#68b7e8',scene:'比賽細節出現新的考驗，臨場選擇可能改變你的角色。'};
  if(/教練|老將|更衣室|捕手|語言/.test(n))return {kind:'團隊關係',icon:'◆',color:'#72c69a',scene:'球隊裡的人正在觀察你的反應，這次處理會直接改變團隊關係。'};
  if(ev.for==='P'||/投球|牛棚|球速|配球/.test(n))return {kind:'投球調整',icon:'⚾',color:'#ffc857',scene:'動作與負荷來到分岔點，選擇投入程度後再揭曉結果。'};
  return {kind:'訓練挑戰',icon:'📈',color:'#ffc857',scene:'新的訓練安排擺在眼前，你可以決定要冒多少風險。'};
}
function eventImpacts(ev){
  const keys=new Set(),fx=[ev.g||{},ev.b||{}];let injury=false;
  fx.forEach(o=>Object.keys(o).forEach(k=>{if(k==='inj')injury=true;else if(k==='rand')keys.add('隨機能力');else if(k==='team')keys.add('團隊關係');else if(k==='fan')keys.add('球迷聲望');else if(k==='season')keys.add('本季狀態');else if(ABL[k])keys.add(ABL[k]);}));
  const out=Array.from(keys).slice(0,3).map(x=>'可能影響 '+x);if(injury)out.push('包含傷病風險');return out;
}
function eventChoices(ev,meta,after){
  const sets={
    '場外焦點':{norm:['先和經紀人確認內容','📋','控制曝光，也保留可能的回報'],bold:['直接面對鏡頭與輿論','🎙️','聲量最大，失言代價也最高'],safe:['只談球場，不碰敏感問題','🧱','較容易過關，但回報有限'],alt:['婉拒活動，回去準備比賽','球迷聲望可能下降；換得一點球季專注']},
    '身心狀態':{norm:['照防護團隊的調整執行','🫀','維持訓練與恢復的平衡'],bold:['不減量，照原強度硬撐','🔥','可能突破，也可能累積傷勢'],safe:['主動減量並增加恢復','🧊','成功較容易，能力收穫較少'],alt:['自費安排完整檢查與恢復','支出金錢並犧牲部分狀態，直接降低傷病負荷']},
    '球場技術':{norm:['先看影片，再分段實作','🎞️','用正常進度修正比賽細節'],bold:['直接在比賽中測試新做法','⚡','最快看見成果，失敗也最明顯'],safe:['從基本動作慢慢重建','🧤','風險較低，成長幅度有限'],alt:['暫停改動，守住現有手感','本季不變強也不倒退，並稍微減少額外負荷']},
    '團隊關係':{norm:['私下把話說清楚','🤝','兼顧關係與球場準備'],bold:['在全隊會議上直接表態','📣','可能成為領袖，也可能撕裂關係'],safe:['請隊長或教練居中協調','🕊️','降低正面衝突，但效果有限'],alt:['退出討論，專注自己的工作','短期增加專注，代價是更衣室默契下降']},
    '投球調整':{norm:['牛棚分段測試後再使用','⚾','逐步把新調整帶進比賽'],bold:['關鍵局直接使用新武器','💥','回報與手臂風險同時放大'],safe:['限制球數，只測一個重點','🎯','降低失控機率，收穫較小'],alt:['取消本次調整，先讓手臂恢復','不增加能力，直接減少一點累積負荷']},
    '投手職責':{norm:['和投手教練確認可用局數','●','把登板需求與手臂狀態一起算進去'],bold:['主動接下最難的局面','▲','可能建立信任，也可能透支手臂'],safe:['限定打者或局數後交棒','▰','保住執行品質，回報較有限'],alt:['據實回報疲勞並退出任務','降低負荷，但可能失去本次角色機會']},
    '捕手指揮':{norm:['先和投手逐局對暗號','▣','用準備建立投捕信任'],bold:['臨場主導整套配球','◆','成功能掌控比賽，失敗會放大歧見'],safe:['讓教練團提供主要配球框架','▤','減少判讀責任，收穫較小'],alt:['只完成基本接捕，不主導決策','守住身體與基本工作，但不累積指揮經驗']},
    '內野協防':{norm:['和搭檔重走每個責任區','◇','用溝通與腳步建立穩定出局'],bold:['要求自己接管關鍵球','◆','高報酬，也可能造成補位衝突'],safe:['採用最熟悉的標準站位','▦','降低失誤，但不追求額外守備範圍'],alt:['交由隊長決定，不主動改位','沒有技術成長，避免額外混亂']},
    '外野判讀':{norm:['先確認風向、牆面與喊聲順位','△','把環境資訊帶進第一步'],bold:['主動擴大自己的責任區','▲','可能救下一球，也可能和隊友相撞'],safe:['縮小範圍並優先安全接球','▽','失誤風險較低，守備影響有限'],alt:['維持原本站位，不做臨場調整','保留穩定感，但放棄這次成長機會']},
    '訓練挑戰':{norm:['依訓練師排程完整執行','📈','正常風險與正常回報'],bold:['加量衝擊個人最佳','🔥','回報最高，失敗代價也最大'],safe:['縮小範圍，只練最熟的部分','🛡️','成功較容易，但進步有限'],alt:['今天收操，不勉強完成課表','放棄這次成長，換取少量恢復']}
  },variants={
    '場外焦點':[['要求先看完整訪綱','不設禁題，現場直接回答','改成書面回覆','把通告留到休賽季'],['和球團公關一起上場','自己掌握麥克風','只回應棒球內容','關閉通知一天'],['先處理爭議再談近況','利用聲量說出真心話','縮短訪問時間','拒絕追逐話題']],
    '身心狀態':[['照監測數據調整負荷','隱瞞疲勞照常出賽','主動休一個系列賽','安排第二醫療意見'],['接受輪休與恢復課表','要求教練不要把你換下','只保留最低訓練量','暫停所有額外行程'],['和防護員逐項排查','靠意志力撐過去','先處理最明顯的不適','自費升級恢復設備']],
    '球場技術':[['先在練習場拆解動作','比賽第一球就試新解法','只改一個最小細節','延後到休賽季處理'],['請教專項教練後實作','把最難版本直接帶上場','回到最熟悉的基本功','維持原本打法'],['用影像和數據交叉確認','在關鍵局驗證調整','先從低壓情境試起','不讓短期雜音改動作']],
    '團隊關係':[['先找當事人單獨溝通','在全隊面前把話講開','請隊長安排會談','不介入這次紛爭'],['主動承擔一部分責任','公開挑戰教練決定','用球場表現回應','和所有人保持距離'],['約隊友吃飯釐清誤會','要求球團立即表態','先聽完雙方說法','只完成自己的份內工作']],
    '投球調整':[['先用十球短牛棚測試','滿球數直接拿來決勝','只保留一個進壘點','本週完全不用新球'],['和捕手設計安全情境','連續投到找到感覺為止','限制使用次數','把手臂恢復放第一'],['先比對高速攝影數據','對中心打者正面測試','從低張力局數開始','等放球點穩定再說']],
    '投手職責':[['照今日可用球數準備','告訴教練任何局面都能上','只接一段明確任務','主動回報今天不能硬撐'],['先確認熱身次數','連兩天也接下關鍵局','只面對指定打者','要求完整休息日'],['按角色完成正常準備','用這次登板搶下更大角色','限制跨局續投','把下一次登板放在第一位']],
    '捕手指揮':[['逐局和投手確認計畫','自己接管關鍵球暗號','沿用教練團配球表','只守基本接捕任務'],['先聽投手說今天手感','強勢要求照你的節奏','減少臨場改變','不介入投手的選擇'],['和內野一起重走暗號','在滿場噪音中臨場改配','只使用最熟悉的手勢','把決策留給板凳']],
    '內野協防':[['先和搭檔確認責任區','主動把關鍵球都喊給自己','維持標準站位','讓隊長決定所有改位'],['逐球重走補位路線','擴大守備範圍搶出局','縮短傳球距離求穩','不在比賽中改動'],['先確認跑者與暗號','高壓局接管內野指揮','採最保守的出局選擇','照原本默契處理']],
    '外野判讀':[['賽前測完風與牆面','主動追進隊友責任區','優先把球擋在面前','維持原本站位'],['先和兩側外野手定喊聲','關鍵飛球全部喊給自己','縮小追球路線','不做臨場輪轉'],['把接力位置逐次確認','挑戰牆前最困難的一球','先確保安全回傳','等下一場再調整']],
    '訓練挑戰':[['照週期完成今天份量','追加一組衝擊紀錄','只練最穩定的環節','提早收操保留體力'],['先完成品質再追求數量','跟同組最強的人加碼競爭','降低重量專注動作','取消今天的高強度課表'],['接受教練原訂課表','把休息時間也拿來加練','縮短課表避免代償','停在手感還好的地方']]
  };
  let s=sets[meta.kind]||sets['訓練挑戰'];const titles=(variants[meta.kind]||variants['訓練挑戰'])[stableIndex(ev.n,3)];
  s={norm:[titles[0],s.norm[1],s.norm[2]],bold:[titles[1],s.bold[1],s.bold[2]],safe:[titles[2],s.safe[1],s.safe[2]],alt:[titles[3],s.alt[1]]};
  const normalP=eventChance('norm'),boldP=eventChance('bold'),safeP=eventChance('safe');
  return [
    {t:s.norm[0],icon:s.norm[1],event:true,main:true,mode:'norm',probability:normalP,s:`${s.norm[2]}｜成功與失敗皆為標準效果`,f:()=>resolveEvent(ev,'norm',after)},
    {t:s.bold[0],icon:s.bold[1],event:true,risk:true,mode:'bold',probability:boldP,s:`${s.bold[2]}｜成功效果 ×3；失敗代價 ×2`,f:()=>resolveEvent(ev,'bold',after)},
    {t:s.safe[0],icon:s.safe[1],event:true,mode:'safe',probability:safeP,s:`${s.safe[2]}｜只影響本季狀態，不直接升降永久能力`,f:()=>resolveEvent(ev,'safe',after)},
    {t:s.alt[0],s:s.alt[1],event:true,direct:true,f:()=>eventAlternative(meta,after)}
  ];
}
function eventAlternative(meta,done){
  const so=socialState();
  if(meta.kind==='場外焦點'){so.fanRep=clamp(so.fanRep-1,-20,20);addSeasonState(1);card('info','把鏡頭留在身後','你婉拒活動，把時間交回比賽準備。球季專注小幅上升，但部分球迷覺得你太有距離。');}
  else if(meta.kind==='身心狀態'){
    const cost=S.stage==='PRO'?Math.round(clamp((S.ct&&S.ct.annual||120)*.015,15,180)):0;if(cost)spendMoney(cost,'living','私人檢查與恢復');
    S.tmpInj-=6;addSeasonState(-1);card('info','先把身體處理好',`${cost?`支付 ${fmtMoney(cost)} 安排額外檢查。`:''}你犧牲部分球季準備，把傷病負荷往下壓。`);
  }
  else if(meta.kind==='團隊關係'){S.chemistry=clamp((S.chemistry||0)-1,-5,5);addSeasonState(1);so.playerRep=clamp(so.playerRep-1,-20,20);card('info','保持距離','你把時間留給自己的準備，短期更專注，但隊友也開始少把你算進集體行動。');}
  else{S.tmpInj-=2;card('info','守住現況','你沒有強行追求這次改變。能力沒有增加，但身體與手感避免了額外負荷。');}
  dynamicSocialTraitAudit();board(1);done();
}
/* 多元社交圈：關係不再只從啦啦隊開始。 */
const PARTNER_POOL=[
  {name:'林曉晴',job:'運動防護員',meet:'復健中心的評估室'},{name:'陳若彤',job:'體育記者',meet:'一場賽後專訪'},{name:'張沛慈',job:'建築設計師',meet:'共同朋友的聚餐'},
  {name:'王詠恩',job:'球團翻譯',meet:'第一次旅外春訓'},{name:'許昀熙',job:'營養師',meet:'球隊飲食講座'},{name:'蘇采蓁',job:'軟體工程師',meet:'休賽季的同學會'},
  {name:'周依潔',job:'航空地勤',meet:'一次客場班機延誤'},{name:'郭芷萱',job:'小學老師',meet:'公益棒球教室'},{name:'高橋美咲',job:'攝影師',meet:'日職球場的拍攝工作'},
  {name:'佐藤葵',job:'物理治療師',meet:'肩肘檢查門診'},{name:'Emily Chen',job:'資料分析師',meet:'球團數據部門交流'},{name:'Sofia Martinez',job:'活動企劃',meet:'社區棒球活動'},
  {name:'田中玲奈',job:'餐廳經營者',meet:'客場常去的家庭餐館'},{name:'吳安琪',job:'職能治療師',meet:'朋友的婚禮'},{name:'李佳穎',job:'啦啦隊成員',meet:'球隊宣傳拍攝'},
  {name:'林妍希',job:'啦啦隊舞者',meet:'主場開幕系列賽的聯合排練'},{name:'山本結衣',job:'球團表演團成員',meet:'日職球迷感謝祭的後台'}];
function socialCandidate(exclude){const pool=PARTNER_POOL.filter(x=>x.name!==exclude),performers=pool.filter(x=>/啦啦隊|表演團/.test(x.job));return pick((S.org==='CPBL'&&performers.length&&chance(28))?performers:(pool.length?pool:PARTNER_POOL));}
const TEAMMATE_TYPES=[
  {role:'明星主將',desc:'媒體與球迷都繞著他轉，跟上他的標準會成長，也可能永遠活在影子裡。'},
  {role:'老將領袖',desc:'知道如何熬過低潮、客場與合約年，願不願意開口請教看你。'},
  {role:'同位置新秀',desc:'球團把你們放在同一張深度表，良性競爭或內耗只有一線之隔。'},
  {role:'更衣室開心果',desc:'連敗時仍能讓大家說話的人，對漫長球季比數據看起來更重要。'},
  {role:'沉默的訓練狂',desc:'每天最早到、最晚走，不太說話但所有人都看得到。'}];
function teammateChoice(done){
  const so=socialState();
  if(!S.teammate||S.teammateTeam!==S.orgTeam||chance(30)){
    const roster=S.stage==='PRO'&&S.orgTeam?ensureNpcRoster(S.org,S.orgTeam,S.lv):[],candidate=roster.length?pick(roster):null,type=pick(TEAMMATE_TYPES),used=new Set([S.teammate&&S.teammate.name].filter(Boolean));
    S.teammate=candidate?{name:candidate.name,age:candidate.age,overall:candidate.overall,role:`${candidate.role}・${type.role}`,desc:`${type.desc}｜能力 ${candidate.overall}/99，已在球隊 ${candidate.years} 季。`}:{name:randomNpcName(S.org,used),role:type.role,desc:type.desc};S.teammateTeam=S.orgTeam;
  }
  const t=S.teammate,p=clamp(62+(S.chemistry||0)*3+(S.traits.leader?5:0)+(S.traits.mentor?4:0)-(S.traits.island?8:0),30,92),canMentor=S.age>=27||(S.svc||0)>=6,opts=[
    {t:'主動請教並一起訓練',main:true,s:`${chanceBand(p)}｜成功提升能力與默契`,f:()=>quickRoll({sides:100,title:`隊友互動｜${t.name}`,probability:p,modifiers:['主動建立關係']}).then(r=>{
      so.playerActs++;if(r.success){const k=pick(POS_AB[S.pos]),g=addAb(k,1);S.chemistry=clamp((S.chemistry||0)+1,-5,5);so.playerRep=clamp(so.playerRep+1,-20,20);card('good','隊友連線',`${t.name} 願意分享自己的準備流程——<b class="up">${ABL[k]} +${g||1}</b>，更衣室默契與球員聲望小幅提升。`);}
      else{S.chemistry=clamp((S.chemistry||0)-1,-5,5);so.playerRep=clamp(so.playerRep-1,-20,20);card('bad','頻率不合',`你們的訓練節奏完全不同，勉強湊在一起反而互相干擾。`);}dynamicSocialTraitAudit();board(0);continueAction('看完隊友互動結果，繼續 ▸',done);})},
    {t:'正面競爭先發位置',risk:true,probability:50,s:'成功機會 50%｜成功＝球季狀態加成；失敗＝疲勞與關係惡化',f:()=>animatedRoll({sides:100,title:'隊內競爭',probability:50,modifiers:[t.role]}).then(r=>{
      so.playerActs++;if(r.success){addSeasonState(r.critical?2:1);S.chemistry=clamp((S.chemistry||0)+1,-5,5);so.playerRep=clamp(so.playerRep+1,-20,20);card('good','競爭讓人變強','你們把彼此的標準往上推，教練說這是他想看到的競爭。');}
      else{S.injNext+=3;S.chemistry=clamp((S.chemistry||0)-2,-5,5);so.playerRep=clamp(so.playerRep-2,-20,20);card('bad','競爭失控','加練變成消耗，彼此開始不說話，下季負荷也被墊高。');}dynamicSocialTraitAudit();board(0);continueAction('看完隊友互動結果，繼續 ▸',done);})},
    {t:'保持專業，當可靠的隊友',s:'不冒險｜默契與球員聲望小幅提升，但不增加能力',f:()=>{so.playerActs++;so.playerRep=clamp(so.playerRep+1,-20,20);S.chemistry=clamp((S.chemistry||0)+1,-5,5);card('info','穩定關係','不必成為摯友，準時補位、坦白溝通就足以建立信任；這能改善團隊氣氛，但不能代替場上的訓練。');dynamicSocialTraitAudit();board(0);continueAction('看完隊友互動結果，繼續 ▸',done);}},
    {t:canMentor?'帶著年輕隊友準備':'和同梯一起做賽前情蒐',s:canMentor?`${chanceBand(clamp(p-5,30,88))}｜累積導師經驗與球員聲望`:`${chanceBand(clamp(p-5,30,88))}｜累積合作與球員聲望`,f:()=>quickRoll({sides:100,title:canMentor?`帶領隊友｜${t.name}`:`賽前情蒐｜${t.name}`,probability:clamp(p-5,30,88),modifiers:[canMentor?'分享經驗與時間':'同梯合作']}).then(r=>{
      so.playerActs++;if(r.success){if(canMentor)so.mentorActs++;else addSeasonState(1);so.playerRep=clamp(so.playerRep+1,-20,20);S.chemistry=clamp((S.chemistry||0)+1,-5,5);card('good',canMentor?'把經驗傳下去':'一起找到突破口',canMentor?`${t.name} 把你分享的準備筆記留在置物櫃裡。這份尊重需要一季一季累積。`:`你和 ${t.name} 分工整理對手影片，找到下一個系列賽可以利用的細節。`);}
      else{so.playerRep=clamp(so.playerRep-1,-20,20);card('bad',canMentor?'好意沒有對上頻率':'情蒐方向分歧',canMentor?`${t.name} 想用自己的方式證明自己；你越想教，他越覺得被控制。`:`你和 ${t.name} 對同一段影片得出完全不同的結論，會議最後沒有共識。`);}dynamicSocialTraitAudit();board(0);continueAction('看完隊友互動結果，繼續 ▸',done);})},
    {t:'拒絕交流，獨自照表訓練',warn:true,s:'下季狀態 +1｜默契與球員聲望下降',f:()=>{so.ignoredPlayers++;so.playerRep=clamp(so.playerRep-2,-20,20);S.chemistry=clamp((S.chemistry||0)-1,-5,5);addSeasonState(1);card('bad','把門關上',`你拒絕了 ${t.name} 的邀請。短期多出自己的訓練時間，但更衣室開始習慣不把你算進去。`);dynamicSocialTraitAudit();board(0);continueAction('看完隊友互動結果，繼續 ▸',done);}}
  ];
  choose(`隊友關係｜${t.name} · ${t.role}`,opts);
}
function dynamicSocialTraitAudit(st){
  const so=socialState(),ep=eventProfile(),perf=st&&Number.isFinite(st.d)?st.d:(Number.isFinite(S.lastD)?S.lastD:(S.prevSeasonD||0));
  if(so.playerRep>=6&&(S.chemistry||0)>=2&&ep.teamWins>=3&&perf>=1)unlockDynamicTrait('leader',`你不只交出成績，還在 ${ep.teamWins} 次團隊事件中做出被隊友信服的處理——<b class="hl">球季穩定度提升、交易風險下降、隊友互動成功率提高</b>。`);
  if(S.age>=27&&so.mentorActs>=3&&so.playerRep>=6)unlockDynamicTrait('mentor','年輕球員開始主動坐到你旁邊問問題——<b class="hl">隊友互動成功率與球季化學效應提高</b>。');
  if(so.fanRep>=7&&(ep.mediaWins+so.fanActs)>=3&&perf>=2)unlockDynamicTrait('fanhero','看台上的球衣背號越來越整齊。你的球季成績與一次次正確互動一起累積成信任——<b class="hl">明星票選、代言與下一張合約小幅提升</b>。');
  if(so.communityActs>=3&&so.fanRep>=6)unlockDynamicTrait('community','你持續把休息日交給社區與孩子，不是只在合約年出現——<b class="hl">球迷聲望更穩定，並增加公益代言</b>。');
  if(S.love.st==='married'&&(S.love.affection||0)>=10&&(S.finance.family||0)>=120)unlockDynamicTrait('familyanchor','你不只在鏡頭前談家人，也長期投入時間與實際支出處理照護、教育和搬遷——<b class="hl">家庭關係良好時提供微幅球季穩定</b>；關係轉差時加成會暫停。');
  if((so.playerRep<=-6||so.ignoredPlayers>=3||ep.positionFails>=5)&&!S.traits.leader)unlockDynamicTrait('island','你把所有人隔絕在自己的準備流程之外，守位事件的失敗也不再有人願意補位——<b class="dn">球季化學效應下降、交易風險提高</b>。','bad');
  if(so.fanRep<=-6&&(S.lastD||0)<=-2)unlockDynamicTrait('booed','低潮加上一次次冷落，主場廣播念到你的名字時已先響起噓聲——<b class="dn">球季壓力、明星票選與合約市場受到影響</b>。','bad');
  if(S.traits.island&&so.playerRep>=1&&(S.chemistry||0)>=1)clearDynamicTrait('island','你重新加入團隊會議，也開始在失誤後第一個走向隊友。');
  if(S.traits.booed&&so.fanRep>=1&&(S.lastD||0)>=1)clearDynamicTrait('booed','你用表現與一次次留下來簽名，把噓聲慢慢換回掌聲。');
  if(S.traits.leader&&so.playerRep<=-3)clearDynamicTrait('leader','隊友不再願意跟著你的方向走，領袖地位已經失去。');
}
function seasonTraitAudit(bucket,st){
  if(bucket==='MINOR'||S.seasonFactor<=0)return;
  const tp=traitProgress(),obp=st.PA?((st.H+st.BB)/st.PA):0;
  const hrNeed={CPBL:18,NPB:25,MLB:30}[bucket]||24,ipNeed={CPBL:105,NPB:125,MLB:150}[bucket]||120;
  const elite=S.pos==='P'?(st.d>=5&&((isSP()&&st.IP>=ipNeed)||(!isSP()&&st.G>=42&&st.era<=2.70))):false;
  const power=S.pos!=='P'&&st.HR>=hrNeed&&st.PA>=LV[S.lv].g*2.7;
  const spark=S.pos!=='P'&&st.PA>=LV[S.lv].g*2.7&&obp>=.355&&(st.SB>=15||st.H>=Math.round(LV[S.lv].g*.95));
  const defense=S.pos!=='P'&&(st.DEF||0)>=8&&st.G>=LV[S.lv].g*.60;
  const steady=st.d>=2&&st.G>=Math.max(25,LV[S.lv].g*.45),cold=st.d<=-3;
  const ipFloor=isSP()?Math.round(ipNeed*.64):30,k9=st.IP?st.SO/st.IP*9:0,bb9=st.IP?st.BB/st.IP*9:99;
  const velocity=S.pos==='P'&&st.IP>=ipFloor&&(st.avgVelo||0)>=98&&k9>=9;
  const command=S.pos==='P'&&st.IP>=ipFloor&&bb9<=2.2;
  const workhorse=S.pos==='P'&&isSP()&&st.IP>=ipNeed;
  const stopper=S.pos==='P'&&!isSP()&&st.G>=42&&st.era<=2.75&&((st.HLD||0)+(st.SV||0))>=25;
  const patience=S.pos!=='P'&&st.PA>=LV[S.lv].g*2.7&&st.BB/Math.max(1,st.PA)>=.10;
  const speedNeed={CPBL:30,NPB:35,MLB:40}[bucket]||35,speed=S.pos!=='P'&&st.PA>=LV[S.lv].g*2.5&&st.SB>=speedNeed;
  const ps=S.currentStandings&&S.currentStandings.postseasonStat;
  const postseason=!!ps&&(S.pos==='P'?(ps.IP>=5&&(ps.era||99)<=2.75):(ps.PA>=10&&(((ps.H+ps.BB)/Math.max(1,ps.PA))+slgOf(ps))>=.850));
  [['elite',elite],['power',power],['spark',spark],['defense',defense]].forEach(([k,ok])=>{tp[k]=ok?(tp[k]||0)+1:0;tp[k+'Cold']=ok?0:(tp[k+'Cold']||0)+1;});
  tp.steady=steady?(tp.steady||0)+1:0;tp.cold=cold?(tp.cold||0)+1:0;
  [['velocity',velocity],['command',command],['workhorse',workhorse],['stopper',stopper],['patience',patience],['speed',speed]].forEach(([k,ok])=>tp[k]=ok?(tp[k]||0)+1:0);
  if(postseason)tp.postseason=(tp.postseason||0)+1;
  if(tp.elite>=2&&eventProfile().positionWins>=2)unlockDynamicTrait('ace','連續兩季同時扛住頂級局數與壓制力，且多次正確處理臨時登板與投捕任務，球隊開始把系列賽第一戰交給你——<b class="hl">球季表現修正、三振與合約評價提升</b>。');
  if(tp.power>=2)unlockDynamicTrait('slugger',`連續兩季跨過 ${hrNeed} 轟級門檻，投手不再願意把球丟進你的熱區——<b class="hl">全壘打產量、票房與合約評價提升</b>。`);
  if(tp.spark>=2)unlockDynamicTrait('sparkplug','連續兩季大量上壘並製造壘間壓力——<b class="hl">保送與盜壘產量提升，也更容易成為球迷焦點</b>。');
  if(tp.defense>=2&&eventProfile().positionWins>=2)unlockDynamicTrait('defchief','兩季守備數據與守位專屬事件都證明你能替投手群多拿出局數——<b class="hl">守備貢獻與隊友聲望提升</b>。');
  if(tp.steady>=3)unlockDynamicTrait('steady','連續三季沒有大起大落，教練知道每天把名字寫進先發名單會得到什麼——<b class="hl">球季波動獲得穩定加成</b>。');
  if(tp.velocity>=2)unlockDynamicTrait('fireball','連續兩季平均球速站上 98.0 mph，三振率也證明這不是雷達槍灌水——<b class="hl">平均球速與三振小幅提升</b>，但高速投球的手臂負荷不會消失。');
  if(tp.command>=3)unlockDynamicTrait('command','連續三季把 BB/9 壓在 2.2 以下，打者只能靠揮棒上壘——<b class="hl">保送小幅下降，WHIP 依真實結果重算</b>。');
  if(tp.workhorse>=3)unlockDynamicTrait('workhorse','連續三年越過聯盟吃局數門檻，靠的是完整準備而不是無限體力——<b class="hl">基礎傷病風險 −2%</b>，仍可能遭遇意外大傷。');
  if(tp.stopper>=2)unlockDynamicTrait('stopper','連續兩季在最擁擠的壘包與最短的準備時間中守住牛棚——<b class="hl">後援 ERA 與中繼／救援產量小幅改善</b>。');
  if(tp.patience>=3)unlockDynamicTrait('patient','連續三季超過一成打席選到保送，你開始迫使投手把球送進自己的區域——<b class="hl">保送與上壘機會小幅提升</b>。');
  if(tp.speed>=2)unlockDynamicTrait('basethief',`連續兩季至少 ${speedNeed} 次盜壘，投手一壘有人時已經無法專心看暗號——<b class="hl">盜壘產量小幅提升</b>。`);
  if(tp.postseason>=2)unlockDynamicTrait('october','兩次在真實季後賽出賽中頂住短期賽壓力——<b class="hl">往後季後賽個人成績獲得小幅加成</b>，例行賽不因此變簡單。');
  {const countries=['CPBL','NPB','MLB'].filter(k=>S.stats[k]&&S.stats[k].yr>0).length;if(countries>=2&&(S.chemistry||0)>=0)unlockDynamicTrait('globetrotter','你已在兩個國家的頂級聯盟留下正式球季，也學會在語言、移動與更衣室規則之間切換——<b class="hl">跨國適應帶來微幅球季穩定加成</b>。');}
  if(S.traits.ace&&tp.eliteCold>=2)clearDynamicTrait('ace','連續兩季的負荷與壓制力已不再符合王牌標準。');
  if(S.traits.slugger&&tp.powerCold>=2)clearDynamicTrait('slugger','連續兩季長打產量滑落，對手不再為你的力量改變佈陣。');
  if(S.traits.sparkplug&&tp.sparkCold>=2)clearDynamicTrait('sparkplug','上壘與跑壘威脅連續兩季下降，球風已經改變。');
  if(S.traits.defchief&&tp.defenseCold>=2)clearDynamicTrait('defchief','守備影響力連續兩季未達原本標準。');
  if(S.traits.steady&&tp.cold>=2)clearDynamicTrait('steady','連續低潮打破了原本的穩定節奏。');
  if(S.traits.defchief){const so=socialState();so.playerRep=clamp(so.playerRep+1,-20,20);}
  dynamicSocialTraitAudit(st);board(1);
}
function fanPlayerInteraction(st,done){
  const so=socialState(),fan=randomNpcName(S.org),scene=pick([
    `小球迷 ${fan} 抱著你的球衣，在球員通道等到最後`,
    `${fan} 從客場看台遞來一面寫滿隊友名字的旗子`,
    `社區棒球隊的 ${fan} 問你，低潮時怎麼還願意上場`,
    `${fan} 在社群整理了你整季每一次全力跑壘的影片`
  ]),perf=Math.round(st.d||0),fanP=clamp(67+perf*2+Math.round(so.fanRep*.35)+(S.traits.fanhero?5:0)-(S.traits.booed?6:0),28,92),communityCost=Math.round(clamp(Math.max(0,syncFinance().cash)*.008,10,320)),liveP=clamp(55+perf*2+(S.traits.fanhero?6:0),25,92),teamP=clamp(65+(S.chemistry||0)*4+(S.traits.leader?8:0),35,92),options=[
    {t:'留下來替每一位球迷簽名',main:true,probability:fanP,s:`成功機會 ${fanP}%｜球迷聲望提升；下季傷病風險 +1%`,f:()=>quickRoll({sides:100,title:'球員與球迷｜簽名到最後',probability:fanP,modifiers:[`本季表現 ${perf>=0?'+':''}${perf}`]}).then(r=>{
      so.fanActs++;S.injNext+=1;if(r.success){const g=r.critical?2:1;so.fanRep=clamp(so.fanRep+g,-20,20);card('good','最後一筆簽名',`最後一位球迷 <b class="hl">${fan}</b> 拿到簽名後滿足離開。你留下來協助工作人員收拾場地，球迷聲望 <b class="up">+${g}</b>。`);}
      else{so.fanRep=clamp(so.fanRep+1,-20,20);card('info','疲憊寫在臉上','你留下了，但漫長球季後的疲憊讓互動有些倉促。球迷仍記得你願意停下腳步。');}dynamicSocialTraitAudit(st);board(2);continueAction('看完球迷互動結果，繼續 ▸',done);})},
    {t:'邀隊友一起辦社區棒球日',probability:teamP,s:`成功機會 ${teamP}%｜支出 ${fmtMoney(communityCost)}；同時影響球迷與球員聲望`,f:()=>quickRoll({sides:100,title:'社區棒球日',probability:teamP,modifiers:['球迷＋隊友共同事件']}).then(r=>{
      spendMoney(communityCost,'family','社區棒球公益日');so.fanActs++;so.playerActs++;if(r.success){so.communityActs++;so.fanRep=clamp(so.fanRep+(r.critical?2:1),-20,20);so.playerRep=clamp(so.playerRep+1,-20,20);S.chemistry=clamp((S.chemistry||0)+1,-5,5);card('good','一整隊走進社區',`${S.teammate?S.teammate.name:'隊友'} 幫忙餵球，${fan} 第一次把球打過內野。活動支出 ${fmtMoney(communityCost)}，兩種聲望各小幅累積。`);}
      else{so.fanRep=clamp(so.fanRep+1,-20,20);so.playerRep=clamp(so.playerRep-1,-20,20);card('bad','安排失控','交通、媒體與隊友行程撞在一起；球迷仍然開心，休息室卻有人覺得自己被迫出席。');}dynamicSocialTraitAudit(st);board(2);continueAction('看完球迷互動結果，繼續 ▸',done);})},
    {t:'開直播，直接回答球迷問題',risk:true,probability:liveP,s:`成功機會 ${liveP}%｜成功＝聲望、合作收入；失敗＝球迷與球員聲望下降`,f:()=>animatedRoll({sides:100,title:'球迷直播｜沒有公關稿',probability:liveP,modifiers:['高波動公開互動']}).then(r=>{
      so.fanActs++;if(r.success){const g=r.critical?2:1,bonus=Math.round(clamp((S.ct&&S.ct.annual||100)*.025,20,500));so.fanRep=clamp(so.fanRep+g,-20,20);so.viral++;bookIncome(bonus,'endorsement',S.org,S.orgTeam);card('gold','真誠變成熱搜',`你不迴避低潮，也把功勞分給隊友。球迷聲望 <b class="up">+${g}</b>，直播帶來 ${fmtMoney(bonus)} 合作收入。`);}
      else{so.fanRep=clamp(so.fanRep-2,-20,20);so.playerRep=clamp(so.playerRep-1,-20,20);card('bad','一句話被剪成十五秒','你對角色安排的抱怨在社群瘋傳，球迷與隊友都覺得被你拿來當藉口。');}dynamicSocialTraitAudit(st);board(2);continueAction('看完球迷互動結果，繼續 ▸',done);})},
    {t:'婉拒所有活動，立刻投入訓練',warn:true,s:'下季狀態 +1｜球迷聲望 −2；累積冷落紀錄',f:()=>{so.ignoredFans++;so.fanRep=clamp(so.fanRep-2,-20,20);addSeasonState(1);card('bad','沒有停下腳步',`${fan} 最後把球衣折回袋子。你多得到一段訓練時間，但球迷記得的也是一種數據。`);dynamicSocialTraitAudit(st);board(2);continueAction('看完球迷互動結果，繼續 ▸',done);}},
    {t:'安排小規模球迷座談，不開直播',probability:78,s:'成功機會 78%｜低曝光、球迷聲望小幅提升；需要支付場地與維安',f:()=>quickRoll({sides:100,title:'小型球迷座談',probability:78,modifiers:['不開直播','人數受控']}).then(r=>{const cost=randomizedSpend(Math.max(12,communityCost*.55),'living','球迷座談');so.fanActs++;so.fanRep=clamp(so.fanRep+(r.success?1:-1),-20,20);card(r.success?'good':'bad',r.success?'把時間留給真正到場的人':'流程仍然出錯',`實際支出 ${fmtMoney(cost)}。${r.success?'你完整聽完問題，也記住幾位一路支持你的老球迷。':'票務與動線安排失誤，原本想降低風險的活動仍引發抱怨。'}`);dynamicSocialTraitAudit(st);board(2);continueAction('看完球迷互動結果，繼續 ▸',done);})},
    {t:'捐出實戰裝備進行公益拍賣',s:`不增加永久能力｜公益活動 +1；另支付整理與配送約 ${fmtMoney(Math.max(10,communityCost*.35))}`,f:()=>{const cost=randomizedSpend(Math.max(10,communityCost*.35),'family','公益拍賣');so.communityActs++;so.fanActs++;so.fanRep=clamp(so.fanRep+1,-20,20);card('good','裝備去了下一個球場',`手套、球鞋與簽名球拍賣所得投入基層棒球，行政與配送實際支出 ${fmtMoney(cost)}。`);dynamicSocialTraitAudit(st);board(2);continueAction('看完球迷互動結果，繼續 ▸',done);}}
  ];
  choose(`球季後互動｜${scene}`,randomSubset(options,4).map(o=>({...o,modal:true})));
}
function familyCrossroad(next){
  const L=S.love,job=L.partnerJob||'自己的工作',situations=[
    {title:`${L.partner} 得到重要的職涯機會`,body:`${job}的工作出現升遷／外派機會，但時間正好撞上你的完整客場月。`},
    {title:'長輩健康需要安排',body:'家中長輩需要固定回診與照護，金錢可以解決一部分，時間卻不能外包。'},
    {title:'孩子的教育與搬家',body:`孩子即將進入新的學習階段；留在原本生活圈，或跟著你的球隊移動，都有代價。`},
    {title:'休賽季到底屬於誰',body:'球團希望你提早報到，家人則已經等了整整一個球季。兩邊都不是無理要求。'}],sc=pick(situations);
  const base=Math.round(clamp(Math.max(120,syncFinance().cash)*.07,40,1800)),options=[
    {t:'家庭優先，花錢也花時間處理',main:true,s:`支出約 ${fmtMoney(base)}｜關係提升、球季準備略受影響`,f:()=>{
      spendMoney(base,'family',sc.title);L.affection=(L.affection||0)+2;addSeasonState(-1);S.tmpInj-=2;
       card('good','把人放在數據之前',`${sc.body}<br>你選擇在場。支出 ${fmtMoney(base)}，家庭關係與恢復品質提升；但少掉的準備時間讓本季狀態 <b class="dn">−1</b>。`);board(1);continueAction('看完家庭抉擇結果，繼續 ▸',next);}},
    {t:'嘗試兩邊兼顧',probability:62,s:'成功機會 62%｜成功只付一半代價；失敗兩邊都受傷',f:()=>quickRoll({sides:100,title:'工作與家庭平衡',probability:62,modifiers:[`伴侶：${job}`]}).then(r=>{
      if(r.success){spendMoney(base*.5,'family','折衷安排');L.affection=(L.affection||0)+1;card('good','勉強找到平衡','遠端安排、家人支援與幾次紅眼班機讓兩邊都沒有被放棄。');}
       else{L.affection=(L.affection||0)-2;const k=pick(POS_AB[S.pos]);addAb(k,-1);card('bad','兩頭落空','你不斷改時間，最後球隊覺得你分心，家人也覺得自己永遠排在第二。');}board(1);continueAction('看完家庭抉擇結果，繼續 ▸',next);})},
    {t:'球季優先，請家人理解',warn:true,s:'保留金錢與訓練狀態｜家庭關係下降',f:()=>{L.affection=(L.affection||0)-2;addSeasonState(1);card('bad','缺席的代價',`${sc.body}<br>你把完整時間交給球季，短期狀態更集中，但家裡少了一個本來應該在場的人。`);board(1);continueAction('看完家庭抉擇結果，繼續 ▸',next);}},
    {t:'聘請專業照護與生活支援',s:`支出約 ${fmtMoney(base*1.25)}｜家庭關係 +1、維持球季準備；可能耗盡現金`,f:()=>{const cost=randomizedSpend(base*1.25,'family','家庭專業支援');L.affection=(L.affection||0)+1;S.tmpInj-=1;card('good','把專業的人找進來',`${sc.body}<br>實際支付 ${fmtMoney(cost)}，時間衝突獲得緩衝，但這筆服務確實從現金帳戶扣除。`);board(1);continueAction('看完家庭抉擇結果，繼續 ▸',next);}},
    {t:'向球團申請家庭假與角色調整',risk:true,probability:54,s:'成功機會 54%｜成功保住兩邊；失敗會降低團隊關係與出賽角色',f:()=>quickRoll({sides:100,title:'家庭假協商',probability:54,modifiers:['球團戰力需求','隊內角色']}).then(r=>{if(r.success){L.affection=(L.affection||0)+1;card('good','球團批准調整','球團協助調整報到與移動日，家庭和訓練都保住大半。');}else{S.chemistry=clamp((S.chemistry||0)-2,-5,5);addSeasonState(-1);card('bad','協商破局','球團認為你沒有把競爭放在第一位，角色與休息室信任都受影響。');}board(1);continueAction('看完家庭抉擇結果，繼續 ▸',next);})},
    {t:'安排家人搬到球隊城市',s:`支出約 ${fmtMoney(base*1.65)}｜家庭關係 +2、旅外適應提升；現金壓力很高`,f:()=>{const cost=randomizedSpend(base*1.65,'family','家庭搬遷與安置',.25);L.affection=(L.affection||0)+2;S.chemistry=clamp((S.chemistry||0)+1,-5,5);card('good','把兩個生活圈合在一起',`搬遷、押金與安置實際支付 ${fmtMoney(cost)}；家人終於不用只在視訊裡陪你過球季。`);board(1);continueAction('看完家庭抉擇結果，繼續 ▸',next);}}
  ];
  choose(`家庭抉擇｜${sc.title}`,randomSubset(options,4).map(o=>({...o,modal:true})));
}
function loveEvent(next){
  const L=S.love;
  if(S.stage!=='PRO'||S.age<20){ next(); return; }
  if(L.st==='married'&&chance(20)){familyCrossroad(next);return;}
  /* 感情會延續，但只有真正的轉折才打斷生涯播報。 */
  if(L.st==='dating'){
    L.dyrs=(L.dyrs||0)+1;
    const y=L.dyrs;
    /* 交往太久不結婚 → 分手風險逐年升高 */
    const cheatPen=(L.cheatYr===S.year-1||L.cheatYr===S.year)?30:0; /* 劈腿當年分手率+30% */
    const bkP=(y>=4?20+(y-4)*15:0)+cheatPen;
    if(bkP>0&&chance(bkP)){
      const k1=pick(POS_AB[S.pos]),k2=pick(POS_AB[S.pos]);
      const g1=addAb(k1,-3),g2=addAb(k2,-3); board(1);
      const ex=L.partner; L.st=L.exes.length?'divorced':'single'; L.partner=null;L.partnerJob=null; L.dyrs=0;
      card('bad','分手',`${cheatPen?'那晚的事她其實都知道。':''}交往 ${y} 年，婚期一延再延。<b class="hl">${ex}</b> 最後留下一句：「我等不到了。」轉身離開。整個休賽季你魂不守舍——<b class="dn">${ABL[k1]} ${g1}、${ABL[k2]} ${g2}</b>。`);
      next(); return; }
    if(!chance(clamp(18+y*9,24,58))){next();return;}
    const ask=()=>proposalAsk(next);
    if(chance(30)){ /* 三成機率先來一段插曲,結束後照樣問婚 */
      const r=R()*100;
      if(r<40){ const t=socialCandidate(L.partner).name;
        choose(`聚餐散場，${t} 說順路想搭你的車`,[
          {t:'讓她上車（賭一把）',warn:true,s:'沒被拍到也不會變強｜曝光＝狀態下跌、當年分手率 +30%',f:()=>{
            L.affairs++;
            if(chance(55)){S.injNext+=1;board(1);
              card('bad','深夜兜風',`沒有人拍到，但你也沒有因此變成更好的球員。少掉的睡眠讓下季負荷 <b class="dn">+1%</b>。（這條路不會有好結局）`);continueAction('看完私生活結果，再決定下一步 ▸',ask);}
            else loveCaughtDating(next); }},
          {t:`「不順路。」直接載 ${L.partner} 回家`,main:true,s:'感情穩固，絕對不虧',f:()=>{
            L.affection=(L.affection||0)+1;addSeasonState(1);board(1);
            card('good','正確答案',`你傳訊息給 ${L.partner}：「馬上到。」關係更穩定，本季狀態 <b class="up">+1</b>；永久能力不變。`);continueAction('看完私生活結果，再決定下一步 ▸',ask);}}]);return;}
      if(r<70){L.affection=(L.affection||0)+1;addSeasonState(1);board(1);
        card('good','明星賽放閃',`明星賽表演賽，鏡頭掃到看台上的 <b class="hl">${L.partner}</b>，你隔著全場比了一個手勢。這段支持讓本季狀態 <b class="up">+1</b>；永久能力不變。`);ask();return;}
      L.affection=(L.affection||0)+1;board(1);
      card('good','愛情長跑',`交往邁入第 ${y} 年。沒有大新聞，只有每個客場系列賽結束後，機場出口那杯她替你買好的熱美式。關係增加，不直接改變球場能力。`);ask();return;}
    ask(); return;
  }
  const fire=(L.st==='married'&&L.kids===0)?24:(L.st==='single'||L.st==='divorced')?32:22;
  if(!chance(fire)){ next(); return; }
  /* ---------- 未婚/離婚:緋聞 → 雙重關卡 → 交往 ---------- */
  if(L.st==='single'||L.st==='divorced'){
    const cand=socialCandidate(),p=cand.name;
    card('info','人生圈外的相遇',`你在<b class="hl">${cand.meet}</b>認識了 <b class="hl">${p}</b>（${cand.job}）。幾次訊息往來後，記者也開始注意到你們。${L.exes.length?'（評論區：「離過婚還這麼搶手」）':''}`);
    choose('記者把麥克風遞到你面前：「兩位是在交往嗎？」',[
      {t:'大方承認：「請大家祝福我們」',s:'還要看她那邊敢不敢承認（球團有禁愛令傳聞）',f:()=>{
        if(chance(65)){ L.st='dating'; L.partner=p;L.partnerJob=cand.job; L.dyrs=0; L.datedTimes=(L.datedTimes||0)+1;
          addSeasonState(1);board(1);
          card('gold','戀情公開',`<b class="hl">${p}</b> 在社群發出十指緊扣的照片：「謝謝大家的祝福。」你們正式交往，本季狀態 <b class="up">+1</b>；永久能力仍要靠訓練。`);
          if(L.datedTimes>=3&&L.kids===0&&!S.traits.married&&!S.traits.confidante){ S.traits.confidante=true;
            card('gold','隱藏稱號：閨中密友',`第三段戀情，還是走到了同樣的結局。「我愛上了你，你卻只把我當好姊妹。」——有些人註定是別人生命裡的過客。`); board(1); }
        }
        else{ card('bad','單方面承認',`她隔天回應：「我們只是普通朋友。」你一個人把關係說得太快，尷尬成了隔天的標題。`); }
        continueAction('看完戀愛結果，繼續生涯 ▸',next); }},
      {t:'笑而不答，快步走過',main:true,s:'不承認就沒有下文',f:()=>{
        card('info','未完待續','緋聞燒了三天就退燒。也許時機還沒到。'); continueAction('看完戀愛結果，繼續生涯 ▸',next); }}]); return;
  }
  /* ---------- 已婚 ---------- */
  if(L.kids<4&&chance([65,45,30,20][L.kids])){ /* 生子:第一胎最優先,越生越少 */
    L.kids++;L.affection=(L.affection||0)+2;addSeasonState(-1);board(1);
    card('gold','新生命',`${L.partner} 平安生下你們的第 <b class="hl">${L.kids}</b> 個孩子。家庭關係大幅提升；睡眠與生活重整讓本季狀態 <b class="dn">−1</b>，不再無條件增加能力。`);
    next(); return;
  }
  const r=R()*100;
  if(r<40){ /* 外遇誘惑:唯一可以賭的婚內事件 */
    const t=socialCandidate(L.partner).name;
    choose(`客場飯店酒吧，${t} 傳來訊息：「睡了嗎？」`,[
      {t:'赴約（賭一把）',warn:true,s:'沒被拍到也不會變強｜曝光＝狀態重挫、婚姻危機',f:()=>{
        L.affairs++;
        if(chance(55)){S.injNext+=1;board(1);
          card('bad','深夜行程',`你僥倖沒被拍到，但少掉的睡眠讓下季負荷 <b class="dn">+1%</b>；這不會變成任何能力加成。`);
          continueAction('看完私生活結果，繼續生涯 ▸',next); }
        else loveCaught(next); }},
      {t:'回訊息：「陪小孩讀完故事書了，晚安」',main:true,s:'家庭和睦，絕對不虧',f:()=>{
        L.affection=(L.affection||0)+1;addSeasonState(1);board(1);
        card('good','家的方向',`你把手機扣在桌上，撥了視訊回家。${L.partner} 和孩子在鏡頭那頭揮手。本季狀態 <b class="up">+1</b>；永久能力不變。`);continueAction('看完家庭結果，繼續生涯 ▸',next);}}]);return;}
  if(r<70&&L.kids>0){ /* 愛小孩新聞 */
    L.affection=(L.affection||0)+1;board(1);
    card('good','球場邊的父親',`你被拍到賽前隔著護網教孩子怎麼戴手套，影片配文「最強棒球教室」瘋傳。家庭關係提升，但不直接增加能力。`);next();return;}
  /* 結婚紀念日 */
  L.affection=(L.affection||0)+1;addSeasonState(-1);board(1);
  card('good','結婚紀念日',`結婚紀念日，你推掉了自主訓練，陪 <b class="hl">${L.partner}</b> 回到當年辦婚禮的場地。關係提升，少一次訓練使本季狀態 <b class="dn">−1</b>。`);next();
}
function divorceRec(){ const L=S.love;
  L.exes.push({name:L.partner,job:L.partnerJob,kids:L.kids});
  L.st='divorced'; L.partner=null;L.partnerJob=null; L.kids=0; /* 再婚後小孩重新計算 */ }
function loveCaught(next){
  const L=S.love; L.caught++;
  const kk=pick(POS_AB[S.pos]); const g=addAb(kk,-3);
  let extra='';
  if(L.caught>=2){
    if(!S.traits.scum){ S.traits.scum=true;
      card('bad','隱藏屬性解鎖：渣男','第二次被逮個正著。從今以後你在球迷心中的形象定型了——<b class="dn">每次外遇被抓到，全能力 −5</b>。'); }
    POS_AB[S.pos].forEach(k=>{ S.ab[k]=clamp(S.ab[k]-5,1,RATING_MAX); });
    extra='<b class="dn">全能力 −5</b>（渣男的代價）。'; }
  board(1);
  card('bad','頭版醜聞',`狗仔的鏡頭比你想的更快，照片鋪滿版面。贊助商緊急撤圖，你在鏡頭前鞠躬 90 度。<b class="dn">${ABL[kk]} ${g}</b>。${extra}`);
  choose(`${L.partner} 把離婚協議書放在餐桌上`,[
    {t:'跪著道歉，求她再給一次機會',s:'成功保住婚姻｜失敗＝再扣能力並離婚',f:()=>{
      if(chance(40)){
        card('info','低谷之後',`長談了一整夜。<b class="hl">${L.partner}</b> 最後說：「為了孩子，也為了那個我認識的你——最後一次。」婚姻保住了，但有些東西回不去了。`); continueAction('看完婚姻結果，繼續生涯 ▸',next); }
      else{ const k2=pick(POS_AB[S.pos]); const g2=addAb(k2,-2);
        const ex=L.partner; divorceRec(); board(1);
        card('bad','道歉無效',`她聽完只是搖頭，隔天律師的存證信函就到了。<b class="hl">${ex}</b> 正式與你離婚，輿論二次發酵——<b class="dn">${ABL[k2]} ${g2}</b>。`); continueAction('看完婚姻結果，繼續生涯 ▸',next); } }},
    {t:'簽字離婚',f:()=>{ const ex=L.partner; divorceRec();
      card('bad','離婚',`你在協議書上簽了名。<b class="hl">${ex}</b> 的聲明只有一句：「祝彼此安好。」`); continueAction('看完婚姻結果，繼續生涯 ▸',next); }}]);
}
function proposalAsk(next){
  const L=S.love; if(L.st!=='dating'){ next(); return; }
  choose(`交往第 ${L.dyrs} 年——${L.partner} 看著別人的婚禮影片看了很久`,[
    {t:'就是現在——求婚',s:'家庭關係提升｜本季狀態 +1、傷病負荷下降',f:()=>{
      L.st='married'; L.kids=0; L.dyrs=0;
      L.affection=(L.affection||0)+2;addSeasonState(1);S.tmpInj-=3;board(1);
      card('gold','婚禮',`你在主場本壘板後方單膝跪地，大螢幕打出「Marry Me」。<b class="hl">${L.partner}</b> 哭著點頭。休賽季完婚，紅毯用壘包排成——本季狀態 <b class="up">+1</b>、傷病負荷 <b class="up">−3%</b>；永久能力不變。`);continueAction('看完求婚結果，繼續生涯 ▸',next);}},
    {t:'再存一點錢吧',main:true,s:'她沒說什麼,但交往越久分手風險越高',f:()=>{
      card('info','再等等','她關掉影片，笑著說沒事。你假裝沒看到她眼裡的東西。'); continueAction('看完求婚結果，繼續生涯 ▸',next); }}]);
}
function loveCaughtDating(next){
  const L=S.love; L.caught++; L.cheatYr=S.year; /* 被抓到才觸發當年分手率+30% */
  const kk=pick(POS_AB[S.pos]); const g=addAb(kk,-3);
  let extra='';
  if(L.caught>=2){
    if(!S.traits.scum){ S.traits.scum=true;
      card('bad','隱藏屬性解鎖：渣男','第二次被逮個正著。從今以後你在球迷心中的形象定型了——<b class="dn">每次劈腿/外遇被抓到，全能力 −5</b>。'); }
    POS_AB[S.pos].forEach(k=>{ S.ab[k]=clamp(S.ab[k]-5,1,RATING_MAX); });
    extra='<b class="dn">全能力 −5</b>（渣男的代價）。'; }
  board(1);
  card('bad','劈腿曝光',`行車紀錄器畫面流出，時間軸對得整整齊齊。<b class="dn">${ABL[kk]} ${g}</b>。${extra}`);
  choose(`${L.partner} 已讀不回三天後，終於答應見面`,[
    {t:'道歉，求她再給一次機會',s:'成功保住感情｜失敗＝再扣能力並分手',f:()=>{
      if(chance(40)){
        card('info','低谷之後',`她哭著罵完，最後說：「最後一次。」感情保住了，但信任的裂痕補不回來。`); continueAction('看完戀愛結果，繼續生涯 ▸',next); }
      else{ const k2=pick(POS_AB[S.pos]); const g2=addAb(k2,-2);
        const ex=L.partner; L.st=L.exes.length?'divorced':'single'; L.partner=null; L.dyrs=0; board(1);
        card('bad','道歉無效',`她把你送的東西整箱寄回。<b class="hl">${ex}</b> 封鎖了所有聯絡方式——<b class="dn">${ABL[k2]} ${g2}</b>。`); continueAction('看完戀愛結果，繼續生涯 ▸',next); } }},
    {t:'坦然分手',f:()=>{ const ex=L.partner;
      L.st=L.exes.length?'divorced':'single'; L.partner=null; L.dyrs=0;
      card('bad','分手',`<b class="hl">${ex}</b> 的限時動態只有一片黑。粉絲全都知道是誰的錯。`); continueAction('看完戀愛結果，繼續生涯 ▸',next); }}]);
}
function statBonus(pts,out){ /* 能力已達潛力上限,獎勵轉成當季成績加成(下次結算套用) */
  addSeasonState(pts);
  out.push(`<span class="up">本季表現修正 +${pts}</span>`);
}
function eventChance(mode){
  let base=47+(S.traits.genius||S.traits.late?6:0);
  if(S.traits.thief)base-=6; /* 聲譽只微調機會，不蓋過準備與骰運。 */
  const boldPen=S.traits.clutch?0:8;
  return clamp(mode==='safe'?base+15:mode==='bold'?base-boldPen:base,3,92);
}
function chanceBand(p){p=Number(p)||0;return p>=75?'把握很高':p>=60?'略有把握':p>=42?'勝負難料':p>=25?'風險偏高':'機會渺茫';}
function teamRelationView(){
  const value=clamp(Math.round((S&&S.chemistry)||0),-5,5);
  const label=value>=4?'高度凝聚':value>=2?'互相信任':value>=0?'平穩':value>=-2?'有些疏離':'關係緊繃';
  return {value,label,tone:value>=2?'good':value<0?'bad':'neutral'};
}
function resolveEvent(ev,mode,done){
  done=done||function(){};
  const p=eventChance(mode),tag=mode==='safe'?'降低風險':mode==='bold'?'全力挑戰':'照計畫執行';
  const mods=[`選擇：${tag}`];
  if(S.traits.genius||S.traits.late)mods.push('天賦小幅加成');
  if(S.traits.thief)mods.push('負面輿論');
  if(mode==='bold'&&S.traits.clutch)mods.push('大心臟：免除豪賭懲罰');
  (mode==='bold'?animatedRoll:quickRoll)({sides:100,title:ev.n,probability:p,modifiers:mods}).then(rr=>{
    let good=rr.success;
    const meta=eventMeta(ev),ep=eventProfile();ep.total++;good?ep.wins++:ep.fails++;if(good&&mode==='bold')ep.boldWins++;
    if(meta.kind==='團隊關係'||['捕手指揮','內野協防','外野判讀','投手職責'].includes(meta.kind)){if(good)ep.teamWins++;}
    if(meta.kind==='場外焦點'&&good)ep.mediaWins++;
    if(['捕手指揮','內野協防','外野判讀','投手職責'].includes(meta.kind)){good?ep.positionWins++:ep.positionFails++;}
    if(meta.kind==='身心狀態'&&good)ep.healthWins++;
    if(mode==='safe')S.cntSave++;
    if(mode==='bold'){ if(good)S.cntBoldWin++; else S.cntBoldFail++; }
    if(mode==='safe'&&good)S.cntSaveWin=(S.cntSaveWin||0)+1;
    if((ev.n==='宵夜文化'||ev.n==='場外代言邀約')&&mode!=='safe'&&!good)S.cntSnack++;
    /* 永久能力以訓練為主：一般事件最多動一項，其他效果轉成本季狀態。 */
    /* 三條路線各有定位：保守只動當季狀態；一般效果 ×1；冒險成功 ×3、失敗 ×2。 */
    const mag=mode==='bold'?(good?3:2):1;
    const fx=good?ev.g:ev.b; let out=[],touched=false,abilityApplied=false;
    const applyAbil=(k,dir)=>{ const step=dir*mag;
      if(dir>0){ let gained=0,overflow=0;
        for(let i=0;i<mag;i++){const g=addAb(k,1);if(g>0)gained+=g;else overflow++;}
        if(gained>0)out.push(`${ABL[k]} <span class="up">+${gained}</span>`);
        if(overflow>0)statBonus(overflow,out);touched=true;
      }else{const g=addAb(k,step);touched=true;out.push(`${ABL[k]} <span class="dn">${g}</span>`);}
    };
    for(const k in fx){const dir=fx[k]>0?1:-1;
      if(k==='inj'){const v=({1:4,2:7,3:10})[mag]||10;S.tmpInj+=v;out.push(`本季傷病負荷 <span class="dn">+${v}%</span>`);}
      else if(k==='team'){const v=dir*(mode==='bold'?2:1),before=S.chemistry||0;S.chemistry=clamp(before+v,-5,5);const delta=S.chemistry-before;out.push(`團隊關係 <span class="${delta>=0?'up':'dn'}">${delta>0?'+':''}${delta}</span>`);touched=true;}
      else if(k==='fan'){const so=socialState(),before=so.fanRep;so.fanRep=clamp(before+dir*(mode==='bold'?2:1),-20,20);const delta=so.fanRep-before;out.push(`球迷聲望 <span class="${delta>=0?'up':'dn'}">${delta>0?'+':''}${delta}</span>`);touched=true;}
      else if(k==='season'){const shift=addSeasonState(dir*(mode==='bold'?2:1));out.push(`本季狀態 <span class="${shift>=0?'up':'dn'}">${shift>0?'+':''}${shift}</span>`);touched=true;}
      else if(k==='rand'||k in S.ab){
        const key=k==='rand'?pick(POS_AB[S.pos]):k;
        if(mode==='safe'){
          if(!abilityApplied){const shift=addSeasonState(dir);out.push(`本季狀態 <span class="${shift>=0?'up':'dn'}">${shift>0?'+':''}${shift}</span>`);abilityApplied=true;touched=true;}
        }else if(!abilityApplied){applyAbil(key,dir);abilityApplied=true;}
        else{const shift=addSeasonState(dir*mag);out.push(`本季狀態 <span class="${shift>=0?'up':'dn'}">${shift>0?'+':''}${shift}</span>`);}
      }}
    if(!touched&&!abilityApplied){const shift=good?1:-1;S.pendStat=clamp((S.pendStat||0)+shift,-4,4);out.push(`本季狀態 <span class="${shift>0?'up':'dn'}">${shift>0?'+':''}${shift}</span>`);}
    const resultTitle=good?(mode==='bold'?'挑戰成功':mode==='safe'?'穩穩過關':'計畫奏效'):(mode==='bold'?'風險爆發':mode==='safe'?'仍有意外':'判斷失準');
    card(good?'good':'bad',`${eventMeta(ev).icon} ${ev.n}｜${resultTitle}`,
      `<div class="event-outcome">${good?ev.gt:ev.bt}。</div><span class="tag">${resultTitle}</span><div class="statline">${out.join('｜')||'沒有數值變動'}</div>`);
    board(1);checkTraitsMid();dynamicSocialTraitAudit();done();
  });
}
/* 賽季中即時可解鎖的特性 */
function allocDone(touched,isDice){
  const keys=Object.keys(touched);
  if(isDice&&S.stage!=='HS'&&keys.length){ /* 只計職業/大學季初骰的專注度 */
    const tot=Object.values(touched).reduce((a,b)=>a+b,0);
    let mk=keys[0]; keys.forEach(k=>{ if(touched[k]>touched[mk])mk=k; });
    const focused=(touched[mk]/tot>=0.75)?mk:null; /* 七成五以上灌同一項 */
    if(focused&&focused===S.samePickKey)S.samePick++;
    else if(focused){ S.samePickKey=focused; S.samePick=1; }
    else { S.samePickKey=null; S.samePick=0; }
    if(S.samePick>=3&&!S.traits.combo){ S.traits.combo=true; S.samePickBonus=true;
      traitCard('combo','無巧不工',`連續三年，你把所有汗水都澆在同一個工具上——往後季初有 <b class="hl">45% 機會多一次專精訓練</b>，但不會年年自動發生。`); }
  }
  /* 大器晚成:25 歲後單季加點總幅度 >=8 */
  const gain=Object.values(touched).reduce((a,b)=>a+b,0);
  if(!S.traits.late&&!S.traits.genius&&ovr()<r99(47)&&S.age>=25&&S.age<32&&isDice&&gain>=16){
    S.traits.late=true;
    const exDef=S.pos==='C'?['rng','fld','arm','cat']:[];
    const cands=POS_AB[S.pos].filter(k=>S.ab[k]<r99(70)&&!exDef.includes(k));
    for(let i=cands.length-1;i>0;i--){const j=Math.floor(R()*(i+1));const t=cands[i];cands[i]=cands[j];cands[j]=t;}
    const boost=cands.slice(0,2), bl=[];
    boost.forEach(k=>{ S.pot[k]=Math.min(RATING_MAX,(S.pot[k]||r99(62))+10); S.ab[k]=clamp(S.ab[k]+5,1,RATING_MAX);
      bl.push(`${ABL[k]} <b class="up">+5</b>（潛力上限 +10 → ${S.pot[k]}/99）`); });
    card('gold','隱藏素質解鎖：大器晚成',`別人都以為你到頂了，你卻在這一年脫胎換骨——從今以後，每次訓練結果<b class="hl">至少 2 點</b>，事件處理得到小幅優勢。`+(bl.length?`潛能重新被評估：${bl.join('、')}。`:'')+'你只是得到第二次機會，不是直接保證成功。');
    board(1); }
}
function checkTraitsMid(){
  /* 自律狂:25 歲前累積保守「成功」15 次 + 從未外遇被抓 + 宵夜 <5 次 */
  if(!S.traits.disc&&S.age<25&&(S.cntSaveWin||0)>=15&&S.love.caught===0&&S.cntSnack<5){
    traitCard('disc','自律狂','你見過凌晨四點的洛杉磯嗎？——年紀輕輕就把身體當成聖殿經營，沒有派對、沒有酒精，只有重訓室的鐵片聲：<b class="hl">整條衰退曲線延後兩年</b>，你的巔峰比同梯更長。'); }
  /* 大心臟：冒險成功還必須有正式球季成績驗證，不能只靠刷事件取得。 */
  if(!S.traits.clutch&&S.age<25&&(S.cntBoldWin||0)>=6&&((S.lastD||0)>=2||(traitProgress().steady||0)>=1)){
    traitCard('clutch','大心臟','高風險選擇一次次成功，正式球季成績也證明那不是逞強——<b class="hl">高風險事件不再承受成功率懲罰</b>，總冠軍與國際賽 MVP 機率提升。'); }
  /* 外務纏身:宵夜/代言/緋聞累計(以宵夜次數 + 感情事件觸發次數估) */
  if(!S.traits.distract&&!S.traits.disc&&(S.love.affairs+S.love.caught+S.cntSnack)>=4&&(S.love.affairs+S.love.caught)>=1){
    traitCard('distract','外務纏身','通告、代言、社群媒體佔據了你太多心神，休賽季很久沒有完整專注在棒球上——<b class="dn">季初擲骰永久 −1 顆</b>（最低 2 顆）。','bad'); }
  /* 更衣室毒瘤:豪賭失敗 4+ 次,或渣男 */
  if(!S.traits.cancer&&!S.traits.franchise&&!S.traits.intlace&&(S.cntBoldFail>=10||S.traits.scum)){
    traitCard('cancer','更衣室毒瘤','教練受夠了你的不可控，隊友對你的新聞指指點點。比起成績，球團現在更想清理休息室的氣氛——<b class="dn">季中被交易機率大增、續約條件惡化</b>。','bad'); }
}
function teamNick(team){ /* ◯◯先生的◯◯:取隊名代表詞 */
  const map={'台中猛瑪':'猛瑪','府城雄獅':'雄獅','桃園金剛':'金剛','新北騎士':'騎士','台北恐龍':'恐龍','高雄神鵰':'神鵰'};
  return map[team]||(team||'').slice(-2);
}
function faYears(d,cap){ /* FA 年限:成績穩定+傷病少→年限長;上限 cap(野手15/投手7) */
  const perf=Math.max(0,Math.min(1,(d+2)/8)); /* d=-2→0, d=6→1 */
  const injPenalty=(S.bigInj||0)*0.12+(S.tjCount||0)*0.15;
  let yrs=Math.round(2+perf*(cap-2)-injPenalty*cap);
  /* 年齡上限:球團不會賭老將的長約(考慮引退年齡與衰退) */
  let ageCap=cap;
  if(S.age>=41)ageCap=1;else if(S.age>=38)ageCap=2;else if(S.age>=36)ageCap=3;else if(S.age>=34)ageCap=4;else if(S.age>=32)ageCap=5;else if(S.age>=30)ageCap=8;
  yrs=Math.min(yrs,ageCap);
  return Math.max(1,Math.min(cap,yrs));
}
function contractTermCap(lv){
  const top=lv&&LV[lv]&&LV[lv].top,positionCap=S.pos==='P'?7:10,levelCap=top?positionCap:3,careerCap=S.age>=42?1:S.age>=39?2:S.age>=36?3:S.age>=34?4:positionCap;return Math.max(1,Math.min(levelCap,careerCap));
}
function demotionAudit(cont){
  if(!S.demotionRefused){ cont(); return; }
  S.demotionRefused=false;
  /* 打回身價:d >= 該合約薪資係數應有的水準(mult 越高要求越高) */
  const need=Math.round((S.ct&&S.ct.mult?S.ct.mult:1)*2)-1; /* mult1→1, mult1.2→1.4→1, mult2→3 */
  if((S.lastD||0)>=need){
    if(S.traits.cancer){ removeTrait('cancer','更衣室毒瘤');
      card('good','用成績說話','你用一整季的表現堵住了所有人的嘴——<b class="hl">更衣室毒瘤洗刷</b>。當初拒絕下放的決定，被證明是對的。'); board(1); }
    else card('good','守住身價','你證明了自己還配得上這份合約。');
  } else {
    if(!S.traits.thief){ S.traits.thief=true;
      card('bad','隱藏屬性解鎖：薪水小倫','拒絕下放後，你的成績依然沒有起色。球迷開始在社群叫你「薪水小倫」——<b class="dn">事件卡失敗率永久 +10%</b>，這個名聲跟著你到退休。'); board(1); }
    else card('bad','薪水小倫','又是虛擲的一年。看台上的噓聲更大了。');
  }
  cont();
}
function leagueTradeBaseRate(){
  if(S.org==='MiLB')return S.lv==='MLB'?7:4;
  if(S.org==='NPB')return S.lv==='NPB1'?2.5:1.5;
  return 2; /* 中職球員交易長期明顯少於 MLB，不能套用美職交易大限的頻率。 */
}
function leagueTradeProbability(){
  const base=leagueTradeBaseRate(),star=ratingGap(ovr(),LV[S.lv].par)>=4,rec=S.currentStandings&&S.currentStandings.mine,last=(S.tradeHistory||[]).slice(-1)[0];
  let p=base+(S.tradeHeat||0)+Math.round(((S.seasonContext&&S.seasonContext.trade)||0)*.55);
  if(rec&&rec.pct<.47&&star&&S.age>=29)p+=10;
  else if(rec&&rec.pct>.55&&!star)p+=5;
  else if(rec&&rec.pct>.55&&star)p-=3;
  if(rec&&rec.pct<.47&&S.ct&&S.ct.yrs<=1&&S.age>=27)p+=5; /* 賣方在合約年處理即將失去控制權的球員。 */
  if(S.traits.cancer)p+=25;if(S.traits.ambience)p+=20;
  if(S.traits.leader)p-=5;if(S.traits.island)p+=10;
  /* 現實仍可能連兩年被交易，但屬極少數；不再用絕對 0% 鎖死。 */
  if(last&&S.year-last.year<=1&&!(S.traits.cancer||S.traits.ambience))p=Math.min(p,base>=4?1:.5);
  else if(last&&S.year-last.year===2)p-=2;
  return {p:+clamp(p,.5,58).toFixed(1),base,star,record:rec};
}
function tradeCheck(cont){
  if(S.stage!=='PRO'||!LV[S.lv]||S.seasonFactor<=0||!S.ct||S.ct.yrs<=1){ cont(); return; }
  if(S._poachedYear===S.year){cont();return;}
  const market=leagueTradeProbability(),p=market.p,star=market.star,rec=market.record;
  if(!chance(p)){ cont(); return; }
  const offers=sameLeagueTradeOffers(seasonMarketEvaluation(S.lastSt||{}).total,star),current=rec&&rec.pct<.47&&star?'contender':rec&&rec.pct>.55&&!star?'rebuild':null,offer=offers.find(x=>x.marketType===current)||pick(offers);
  if(!offer){cont();return;}
  const rights=S.org==='MiLB'&&S.lv==='MLB'?mlbDfaRights():null,hasVeto=!!(S.ct&&S.ct.option==='完整不可交易條款')||!!(rights&&rights.tenAndFive);
  if(hasVeto){
    choose(`正式交易提案｜${S.orgTeam} 與 ${offer.team} 已談妥`,[
      {t:`批准交易至 ${offer.team}`,main:true,modal:true,s:`${offer.label}｜新隊角色：${offer.rolePromise}｜原合約由新球隊承接`,f:()=>{executeLeagueTrade(offer,'gold','球員行使同意權後交易生效');cont();}},
      {t:'行使不可交易權，留在原隊',warn:true,modal:true,s:'交易取消｜團隊關係 −1；合約與球隊不變',f:()=>{S.chemistry=clamp((S.chemistry||0)-1,-5,5);S.tradeHeat=0;card('info','交易遭球員否決',`你依合約或年資權利否決交易。${offer.team} 撤回報價，你仍留在 ${S.orgTeam}；球團尊重白紙黑字，但團隊關係 −1。`);board(1);cont();}}
    ]);return;
  }
  executeLeagueTrade(offer,S.traits.cancer?'bad':'gold',S.traits.cancer?'球團在季後為處理更衣室問題完成交易':'球團在季後名單會議完成正式交易');cont();
}
function executeLeagueTrade(offer,tone,reason){
  const old=S.orgTeam,oldRecord=S.currentStandings&&S.currentStandings.mine?`${S.currentStandings.mine.W}-${S.currentStandings.mine.L}`:'未建立',contract=S.ct?`剩餘 ${S.ct.yrs} 年、年薪 ${fmtContractMoney(S.ct.annual||0,S.org)}、保障 ${Math.round((S.ct.guaranteed==null?1:S.ct.guaranteed)*100)}% 由新球隊承接`:'季末另談新約';
  S.pendingTrade={year:S.year,from:old,to:offer.team,offer:{...offer},reason,tone:tone||'gold'};S.tradeHeat=0;
  card(tone||'gold',`休賽季交易達成｜${old} → ${offer.team}`,`${reason}。本季戰績、季後賽與薪資仍歸在 ${old}；交易會在年度結算後生效，不會回頭改寫已完成的球季。<div class="statline">交易方向｜${offer.label}<br>原隊戰績｜${oldRecord}<br>新隊戰績｜${offer.record.W}-${offer.record.L}<br>合約｜${contract}<br>新隊角色｜${offer.rolePromise}<br>新隊戰力基準｜${offer.strengthBefore.toFixed(1)} → ${offer.strengthTarget.toFixed(1)}</div>`);board(1);
}
function applyPendingTrade(){
  const p=S.pendingTrade;if(!p)return null;S.pendingTrade=null;S._tradedYear=S.year;S.orgTeam=p.to;const effect=activatePoachAgreement(p.offer,p.from),contractAdmin=S.org==='CPBL'?'新球團依交易程序重新簽發標準球員契約，年薪與剩餘年限沿用交易約定。':'新隊承接剩餘合約。';S.tradeHistory=S.tradeHistory||[];S.tradeHistory.push({year:S.year,from:p.from,to:p.to,reason:p.reason,type:p.offer.marketType});card(p.tone,'交易正式生效',`${S.name} 完成本季所有結算後向 <b class="hl">${p.to}</b> 報到。原球隊的年度戰績與冠軍紀錄沒有被改寫；${contractAdmin}<div class="statline">${poachEffectLine(effect)}</div>`);board(2);return effect;
}
function crossLeaguePoachOffers(d,major){
  const o=ovr(),out=[],add=(org,lv,n,bonus,lo,hi)=>makeFaOffers(org,n,bonus,lo,hi,lv,null,d).forEach(of=>out.push({...of,org,cross:true}));
  if(S.org==='CPBL'){
    if(S.age<=33&&(o>=r99(51)||d>=7||major))add('NPB',o>=LV.NPB1.min||d>=7?'NPB1':'NPB2',d>=7||major?2:1,1500,2,5);
    if(S.age<=29&&(o>=r99(57)||d>=9||major&&d>=6))add('MiLB',o>=LV.MLB.min&&d>=8?'MLB':'A3',1,3200,2,5);
  }else if(S.org==='NPB'){
    if(S.age<=32&&(o>=r99(57)||d>=7||major))add('MiLB',o>=LV.MLB.min&&d>=7?'MLB':'A3',d>=8||major?2:1,4200,2,6);
  }else if(S.org==='MiLB'){
    /* 美職體系球員也可能被日職球團鎖定；MLB 合約仍須原球團同意讓渡或釋出。 */
    if(S.age<=35&&(S.lv==='MLB'||S.lv==='A3')&&(o>=r99(55)||d>=5||major))add('NPB','NPB1',d>=7||major?2:1,1900,2,5);
  }
  return out;
}
function tradeGroupOf(team,org){
  if(org==='MiLB')return MLB_TEAM_META[team]?MLB_TEAM_META[team][0]:'美職體系';
  if(org==='NPB')return NPB_TEAMS.indexOf(team)<6?'中央聯盟':'太平洋聯盟';
  return '中華職棒';
}
function tradeTeamStrength(team,org){
  S.teamStrengths=S.teamStrengths||{};const key=`${org}|${team}`;
  const rec=latestTeamRecord(team,org);
  if(rec&&Number.isFinite(rec.pct)){const actual=clamp(50+(rec.pct-.5)/.006,34,68),carry=Number.isFinite(S.teamStrengths[key])?S.teamStrengths[key]:actual;return clamp(actual*.72+carry*.28,34,68);}
  if(Number.isFinite(S.teamStrengths[key]))return S.teamStrengths[key];
  return clamp(43+stableIndex(`${org}|${team}|交易戰力`,17),34,68);
}
function tradeRolePromise(type){
  const role=S.pos==='P'?(isSP()?'先發輪值':S.role==='CL'?'終結者':'牛棚'):(S.dpos==='C'?'先發捕手與配球主導權':S.dpos==='DH'?'中心打線指定打擊':'先發打線');
  if(type==='contender')return `${role}的季後賽優先席次；低潮時仍會縮短觀察期`;
  if(type==='rival')return `${role}的固定競爭順位；宿敵戰與媒體壓力會放大成敗`;
  if(type==='rebuild')return `${role}的核心養成席次；上場最多，但短期勝場支援較少`;
  return `${role}的高曝光補強席次；上場增加，但大市場容錯較低`;
}
const TRADE_ARCHETYPES={
  contender:{label:'爭冠隊交易補強',usageAdj:5,perfAdj:-.10,teamWins:1.5,chemistry:1,fan:1,leverage:1,approvalAdj:-3},
  rival:{label:'聯盟對手完成交易',usageAdj:9,perfAdj:-.20,teamWins:.8,chemistry:-1,fan:0,leverage:2,approvalAdj:2},
  rebuild:{label:'重建隊接手核心角色',usageAdj:14,perfAdj:-.25,teamWins:-.8,chemistry:1,fan:1,leverage:2,approvalAdj:8},
  market:{label:'大市場交易補強',usageAdj:7,perfAdj:-.30,teamWins:.4,chemistry:0,fan:2,leverage:2,approvalAdj:0}
};
function sameLeagueTradeOffers(d,major){
  const org=S.org,lv=S.lv,currentGroup=tradeGroupOf(S.orgTeam,org),pool=teamListOf(org).filter(t=>t!==S.orgTeam).map(team=>{
    const profile=teamMarketProfile(team,org,d),strength=tradeTeamStrength(team,org),group=tradeGroupOf(team,org);
    return {team,profile,strength,group};
  }),chosen=[],used=new Set(),add=(row,type)=>{if(!row||used.has(row.team))return;used.add(row.team);chosen.push({row,type});};
  add(pool.slice().sort((a,b)=>b.strength-a.strength)[0],'contender');
  const rivals=pool.filter(x=>x.group===currentGroup&&!used.has(x.team)).sort((a,b)=>b.profile.need-a.profile.need||Math.abs(b.strength-50)-Math.abs(a.strength-50));
  add(rivals[0]||pool.find(x=>!used.has(x.team)),'rival');
  add(pool.slice().sort((a,b)=>a.strength-b.strength).find(x=>!used.has(x.team)),'rebuild');
  if(major&&pool.length>=4){const market=pool.filter(x=>!used.has(x.team)).sort((a,b)=>b.profile.budget-a.profile.budget)[0];add(market,'market');}
  return chosen.map(({row,type})=>{
    const spec=TRADE_ARCHETYPES[type],rec=row.profile.record,before=+row.strength.toFixed(1),strengthTarget=type==='contender'?clamp(Math.max(57,row.strength)+1,34,68):type==='rival'?clamp(Math.max(52,row.strength)+2,34,68):type==='rebuild'?clamp(row.strength+3,40,50):clamp(Math.max(54,row.strength)+1,34,68);
    return {team:row.team,org,lv,cross:false,sameTier:true,marketType:type,label:spec.label,rolePromise:tradeRolePromise(type),usageAdj:spec.usageAdj,perfAdj:spec.perfAdj,teamWins:spec.teamWins,chemistryStart:spec.chemistry,fanDelta:spec.fan,leverage:spec.leverage,approvalAdj:spec.approvalAdj,strengthBefore:before,strengthTarget:+strengthTarget.toFixed(1),record:rec,fit:`${rec.W}-${rec.L}・${spec.label}`,need:row.profile.roleNeed};
  }).slice(0,major?4:3);
}
function normalizedPoachEffect(of){
  if(!of.cross)return of;
  return {...of,label:'跨聯盟即戰力補強',rolePromise:'新聯盟即戰力名單競爭權；必須重新適應球速、語言與洋將名額',usageAdj:4,perfAdj:-.20,teamWins:0,chemistryStart:0,fanDelta:1,leverage:2,approvalAdj:0};
}
function activatePoachAgreement(raw,fromTeam){
  const of=normalizedPoachEffect(raw),so=socialState();
  S.teamYears=0;S.champThisTeam=false;S.champTeam=null;S.chemistry=clamp(Number(of.chemistryStart)||0,-5,5);so.fanRep=clamp(so.fanRep+(Number(of.fanDelta)||0),-20,20);
  if(!of.cross){S.teamStrengths=S.teamStrengths||{};S.teamStrengths[`${S.org}|${S.orgTeam}`]=of.strengthTarget;}
  S.poachLeverage=Math.max(S.poachLeverage||0,Number(of.leverage)||0);S.poachLeverageUntil=S.year+1;
  S.poachEffect={year:S.year+1,org:S.org,lv:S.lv,team:S.orgTeam,type:of.marketType||(of.cross?'overseas':'market'),label:of.label,rolePromise:of.rolePromise,usageAdj:Number(of.usageAdj)||0,perfAdj:Number(of.perfAdj)||0,teamWins:Number(of.teamWins)||0,chemistryStart:Number(of.chemistryStart)||0,fanDelta:Number(of.fanDelta)||0,leverage:Number(of.leverage)||0,cross:!!of.cross,fromTeam};
  S.poachHistory=S.poachHistory||[];S.poachHistory.push({year:S.year,from:fromTeam,to:S.orgTeam,org:S.org,lv:S.lv,type:S.poachEffect.type,label:S.poachEffect.label,role:S.poachEffect.rolePromise,usage:S.poachEffect.usageAdj});
  return S.poachEffect;
}
function activePoachEffect(){
  const e=S&&S.poachEffect;return e&&e.year===S.year&&e.org===S.org&&e.lv===S.lv&&e.team===S.orgTeam?e:null;
}
function rolePromiseTarget(st,e){
  const L=LV[S.lv],boost=clamp((Number(e.usageAdj)||0)/100,0,.20);if(S.pos==='P'){if(isSP()){const max=S.lv==='MLB'?32:S.lv==='NPB1'?26:S.lv==='CPBL1'?25:Math.round(clamp(L.g/5.2,18,27));return Math.round(max*clamp(.66+boost,.66,.86));}const full=S.lv==='MLB'?68:S.lv==='NPB1'?58:S.lv==='CPBL1'?55:Math.round(clamp(L.g*.46,38,60));return Math.round(full*clamp(.62+boost,.62,.82));}return Math.round(L.g*clamp((S.dpos==='C'?.62:.68)+boost,.62,S.dpos==='C'?.82:.90));
}
function evaluateRolePromise(st){
  const e=activePoachEffect();if(!e||S._promiseReviewYear===S.year)return st&&st._promiseReview||null;S._promiseReviewYear=S.year;const target=rolePromiseTarget(st,e),injuryExcused=(st.availability||0)<75,fulfilled=!injuryExcused&&(st.G||0)>=target,status=injuryExcused?'傷病豁免':fulfilled?'承諾兌現':'承諾未兌現',so=socialState();
  if(fulfilled){S.poachLeverage=Math.max(S.poachLeverage||0,(Number(e.leverage)||0)+1);S.poachLeverageUntil=S.year+1;S.chemistry=clamp((S.chemistry||0)+1,-5,5);so.playerRep=clamp(so.playerRep+1,-20,20);}
  else if(!injuryExcused){S.tradeHeat=clamp((S.tradeHeat||0)+12,0,60);S.chemistry=clamp((S.chemistry||0)-1,-5,5);S.promiseBreachCount=(S.promiseBreachCount||0)+1;}
  const review={year:S.year,team:S.orgTeam,label:e.label,role:e.rolePromise,target,actual:st.G||0,status,fulfilled,injuryExcused,consequence:fulfilled?'下次談薪籌碼 +2%、團隊關係 +1':injuryExcused?'因傷病不追究球團承諾':'交易熱度 +12、團隊關係 −1，可在休賽季提出角色異議'};S.promiseHistory=S.promiseHistory||[];S.promiseHistory.push(review);S.promiseHistory=S.promiseHistory.slice(-20);st._promiseReview=review;return review;
}
function poachEffectLine(of){
  of=normalizedPoachEffect(of);const team=of.teamWins>=0?`球隊勝場環境 +${of.teamWins}`:`球隊勝場環境 ${of.teamWins}`,pressure=of.perfAdj>=0?`臨場修正 +${of.perfAdj}`:`適應／壓力 ${of.perfAdj}`;
  return `角色：${of.rolePromise}<br>下季出賽競爭 +${of.usageAdj}%｜${team}｜${pressure}<br>新隊團隊關係 ${of.chemistryStart>=0?'+':''}${of.chemistryStart}｜下次談薪籌碼 +${of.leverage*2}%`;
}
function presentPoachingMarket(offers,d,leverage,major,baseBonus,cont){
  const finish=()=>{S._poachedYear=S.year;S.poachCount=(S.poachCount||0)+1;board(1);cont();};
  const opts=offers.map(raw=>{
    const of=normalizedPoachEffect(raw),remaining=S.ct?Math.max(0,S.ct.yrs):0,approval=clamp(Math.round((of.cross?34:52)+d*3+leverage*4+(of.approvalAdj||0)-(remaining>=3?8:0)+(major?7:0)),22,94),dealM=+(1.04+d*.025+leverage*.025+(of.cross?.05:0)).toFixed(2),country=of.org==='NPB'?'日本':of.org==='MiLB'?'美國':'台灣',record=of.record&&Number.isFinite(of.record.W)?`${of.record.W}-${of.record.L}`:'季前評估';
    return {t:`跨聯盟｜${of.team}`,risk:true,probability:approval,modal:true,sideTitle:'跨聯盟正式接觸',sideNote:`角色承諾｜出賽 +${of.usageAdj}%`,s:`${country}・${LV[of.lv].n}｜球隊 ${record}｜${of.need||'補強需求'}｜母隊同意協商 ${approval}%<br>${poachEffectLine(of)}`,f:()=>animatedRoll({sides:100,title:'跨聯盟轉隊協商',subtitle:`${of.team} 提出具體角色方案；有約在身仍需母隊同意入札、合約讓渡或提前解約。`,probability:approval,modifiers:[`本季市場評價 +${d.toFixed(1)}`,of.label,`下季出賽競爭 +${of.usageAdj}%`]}).then(r=>{
      if(r.success){const old=S.orgTeam,bonus=Math.round((of.bonus||baseBonus)*(r.critical==='success'?1.25:1));bookIncome(bonus,'bonus',of.org,of.team);signTo(of.org,of.lv,of.team,of.yrs||ri(2,4),dealM);const effect=activatePoachAgreement(of,old);card('gold','跨聯盟挖角成局',`${old} 同意轉隊／入札安排，你與 <b class="hl">${of.team}</b> 完成新約。簽約金 ${fmtContractMoney(bonus,of.org)} 已依當地稅費入帳。<div class="statline">${poachEffectLine(effect)}</div>`);finish();}
      else{S.tradeHeat=clamp((S.tradeHeat||0)+6,0,60);S.chemistry=clamp((S.chemistry||0)-1,-5,5);card('bad','母隊拒絕放人',`${S.orgTeam} 拒絕 ${of.team} 的協商。你仍留在原隊，但公開提出轉隊意願讓團隊關係 −1、後續交易熱度 +6；該隊的角色承諾不會生效。`);finish();}
    })};
  });
  opts.push({t:`留在 ${S.orgTeam}，不授權跨聯盟協商`,main:true,modal:true,sideTitle:'繼續履約',sideNote:'拒絕本輪海外接觸',s:'團隊關係 +1｜球迷聲望 +1｜下一次談薪籌碼 +2%；沒有免費出賽保證',f:()=>{S.chemistry=clamp((S.chemistry||0)+1,-5,5);const so=socialState();so.fanRep=clamp(so.fanRep+1,-20,20);S.poachLeverage=Math.max(S.poachLeverage||0,1);S.poachLeverageUntil=S.year+1;card('good','選擇留隊｜忠誠成為籌碼',`你拒絕海外球隊接觸。${S.orgTeam} 的團隊關係 +1、球迷聲望 +1；下一次談薪係數實際增加 2%，但下季角色仍要靠成績競爭。`);finish();}});
  choose(`跨聯盟挖角｜${offers.length} 隊正式接觸`,opts);
}
function poachingCheck(st,cont){
  if(S.stage!=='PRO'||!(LV[S.lv].top||S.lv==='A3')||S.seasonFactor<.72||!st||S.skipMid||S._tradedYear===S.year){cont();return;}
  const d=seasonMarketEvaluation(st).total;if(d<3){cont();return;}const leverage=(S.awardLeverageUntil||0)>=S.year?(S.awardLeverage||0):0,major=(S.honors||[]).some(x=>x.startsWith(String(S.year))&&/MVP|王|賽揚|澤村|金手套|銀棒|最佳九人|最佳十人|All-MLB/.test(x));
  const pool=crossLeaguePoachOffers(d,major);if(!pool.length){cont();return;}
  const trigger=clamp(Math.round(10+d*3+leverage*4+(major?8:0)+(S.traits.franchise?3:0)),12,58);if(!chance(trigger)){cont();return;}
  const baseBonus={CPBL:220,NPB:900,MiLB:2600}[S.org]||220,offers=randomSubset(pool,major&&pool.length>1?2:1);
  presentPoachingMarket(offers,d,leverage,major,baseBonus,cont);
}
function portionOf(st,r){
  const p={...st};
  ['G','PA','AB','H','HR','RBI','SB','BB','W','L','SV','HLD','HP','SO','ER','TC','E','PO','A','DP','OFA','CS','SBA','DEF','CALL_RUNS','CALL_DEF'].forEach(k=>p[k]=Math.round((st[k]||0)*r));
  if(S.pos==='P'){setPitchingOuts(p,Math.round(pitchingOuts(st)*r));normalizeReliefLine(p);}
  p.E=Math.min(p.TC||0,p.E||0);p.avg=p.AB>0?p.H/p.AB:0;p.era=p.IP>0?p.ER*9/p.IP:0;p.WHIP=p.IP>0?(p.H+p.BB)/p.IP:0;p.FPCT=p.TC?+((p.TC-p.E)/p.TC).toFixed(3):0;
  return p;
}
function injuryTraitAudit(){
  if(S.bigInj>=2&&!S.traits.glass&&S.age<32){
    S.traits.glass=true;card('bad','隱藏素質解鎖：玻璃人','生涯第二次大傷。從此傷病如影隨形，未來每季需要缺席比賽的傷病風險<b class="dn">不低於 30%</b>。');
  }else if(S.bigInj>=2&&!S.traits.glass&&S.age>=32){
    card('info','醫療團隊評估','「這是歲月的損耗，不是體質問題。」——老將的傷，球團看得比誰都開。');
  }
}
function injuryDeclineProfile(){
  const profiles=S.pos==='P'?[{name:'肩肘與前臂',keys:['vel','brk','ctl','sta']},{name:'下肢與核心',keys:['sta','vel','ctl']},{name:'背部與軀幹',keys:['sta','brk','ctl']}]
    :S.pos==='C'?[{name:'膝部與下肢',keys:['sta','spd','rng']},{name:'肩肘與傳球側',keys:['arm','fld','cat']},{name:'手腕與接捕側',keys:['con','pow','fld','cat']}]
    :[{name:'下肢肌群',keys:['sta','spd','rng']},{name:'肩肘與傳球側',keys:['arm','fld','pow']},{name:'手腕與核心',keys:['con','pow','fld']}];
  const profile=pick(profiles);return {...profile,keys:profile.keys.filter(k=>k in S.ab)};
}
function buildMidseasonInjuryPlan(monthCount){
  if(S.skipMid||S.rehab>0||S.seasonFactor<=0)return null;
  const annual=injuryProb(),monthly=(1-Math.pow(1-clamp(annual,0,95)/100,1/Math.max(1,monthCount)))*100;let month=-1;
  for(let i=0;i<monthCount;i++){if(chance(monthly)){month=i;break;}}
  S.injNext=0;if(month<0)return null;
  const age=S.age>=40?12:S.age>=36?8:S.age>=32?4:0,history=(S.bigInj||0)*4+(S.tjCount||0)*3,body=S.ab.sta<=r99(42)?5:S.ab.sta>=r99(65)?-3:0,load=Math.max(0,Math.round(((S.seasonContext&&S.seasonContext.injury)||0)/2)),score=clamp(ri(1,100)+age+history+body+load,1,100);
  const grade=score<=60?'小傷':score<=82?'中度傷勢':score<=97?'球季報銷':'生涯威脅傷勢';
  return {month,score,grade,annual,months:score<=60?1:score<=82?ri(1,2):monthCount-month,applied:false};
}
function applyMidseasonInjury(plan,activeMask,timeline){
  if(!plan||plan.applied)return null;plan.applied=true;const site=injuryDeclineProfile(),before={...S.ab},start=plan.month,end=Math.min(activeMask.length,start+plan.months);
  for(let i=start;i<end;i++)activeMask[i]=false;
  if(plan.score<=60){if(chance(35)){const k=pick(site.keys);addAb(k,-1);}}
  else if(plan.score<=82){const keys=randomSubset(site.keys,Math.min(site.keys.length,ri(1,2)));keys.forEach(k=>addAb(k,-ri(1,2)-(S.age>=36?1:0)));}
  else if(plan.score<=97){const keys=randomSubset(site.keys,Math.min(site.keys.length,ri(2,3)));keys.forEach(k=>addAb(k,-ri(2,5)-(S.age>=36?1:0)));S.bigInj++;S.seasonEndingInjuries=(S.seasonEndingInjuries||0)+1;}
  else{POS_AB[S.pos].forEach(k=>addAb(k,-ri(3,6)));S.bigInj++;S.seasonEndingInjuries=(S.seasonEndingInjuries||0)+1;S.rehab=1;}
  const changes=POS_AB[S.pos].map(k=>({k,loss:(before[k]||0)-(S.ab[k]||0)})).filter(x=>x.loss>0),loss=changes.reduce((n,x)=>n+x.loss,0),changeText=changes.map(x=>`${ABL[x.k]} −${x.loss}`);
  S._seasonInjuryDecline={year:S.year,title:plan.grade,site:site.name,totalLoss:loss,changes:changeText};S.injuryHistory=S.injuryHistory||[];S.injuryHistory.push({year:S.year,age:S.age,severity:plan.score,title:plan.grade,site:site.name,seasonFactor:(activeMask.filter(Boolean).length/activeMask.length),loss,changes:changeText});
  timeline[start]={n:plan.grade,d:`${site.name}受傷，離開名單 ${end-start} 個月`,m:-2,pulse:-2,personalPulse:-2,injured:true};for(let i=start+1;i<end;i++)timeline[i]={n:'傷病名單／復健',d:'本月沒有出賽',m:0,pulse:0,personalPulse:0,injured:true};
  injuryTraitAudit();return {grade:plan.grade,site:site.name,loss,changes:changeText,major:plan.score>82};
}
function rollInjury(done){
  done=done||function(){};const p=injuryProb();
  const mods=[];
  if(S.seasonContext&&S.seasonContext.injury)mods.push(`環境 ${S.seasonContext.injury>=0?'+':''}${S.seasonContext.injury}%`);
  if(S.tmpInj)mods.push(`事件負荷 +${S.tmpInj}%`);if(S.injNext)mods.push(`額外賽事 +${S.injNext}%`);
  quickRoll({sides:100,title:'本季健康判定',probability:p,risk:true,modifiers:mods,
    resultText:r=>r.critical==='success'?'重大傷病警報':r.success?'傷病發生':r.critical==='failure'?'完美健康季':'安全通過'}).then(hit=>{
    S.injNext=0;
    if(!hit.success){card('good','健康回報','醫療團隊確認沒有需要缺席比賽的傷勢，本季平安出賽。');board(1);done();return;}
    const staminaPenalty=S.ab.sta<=r99(42)?5:S.ab.sta>=r99(65)?-3:0,agePenalty=S.age>=40?12:S.age>=36?8:S.age>=32?4:0,historyPenalty=(S.bigInj||0)*4+(S.tjCount||0)*3,workloadPenalty=Math.max(0,Math.round(((S.seasonContext&&S.seasonContext.injury)||0)/2)),severityMod=agePenalty+historyPenalty+staminaPenalty+workloadPenalty,severityScore=v=>clamp(v+severityMod,1,100),severityLabel=v=>{const x=severityScore(v);return {label:x<=55?'小傷':x<=78?'中度傷勢':x<=96?'球季報銷':'生涯威脅',tone:x<=55?'':x<=78?'bad':'bad critical'};};
    animatedRoll({sides:100,title:'傷勢嚴重度',subtitle:`年齡、舊傷、體力與負荷修正 ${severityMod>=0?'+':''}${severityMod}`,
      resolve:severityLabel,resultText:r=>r.label}).then(sevRoll=>{
      const sev=severityScore(sevRoll.value);
      const finish=recovery=>{
        S.ironStreak=0;const beforeInjury={...S.ab},site=injuryDeclineProfile();let title='',txt='',loss='';
        if(sev<=55){const cut=ri(8,20);S.seasonFactor=1-cut/100;title='小傷';loss=injStatLoss(false);txt=`短期肌肉與關節不適，預估缺席 <b class="dn">${cut}%</b> 賽程。`;}
        else if(sev<=78){const cut=ri(25,52),k=pick(site.keys),amt=ri(1,2)+(S.age>=35?1:0);S.seasonFactor=1-cut/100;addAb(k,-amt);title='中度傷勢';loss=`<b class="dn">${ABL[k]} −${amt}</b>。`;txt=`${site.name}需要完整復健，本季出賽量減少 <b class="dn">${cut}%</b>。`;}
        else if(sev<=96){const played=ri(0,12),hitKeys=randomSubset(site.keys,Math.min(site.keys.length,ri(2,3))),ageExtra=S.age>=35?1:0;S.seasonFactor=played/100;S.bigInj++;S.seasonEndingInjuries=(S.seasonEndingInjuries||0)+1;hitKeys.forEach(k=>addAb(k,-ri(3,6)-ageExtra));title='球季報銷';loss=`<b class="dn">${site.name}重創：${hitKeys.map(k=>ABL[k]).join('、')} 永久下降</b>。`;txt=`傷勢需要手術與長期復健，本季正式報銷，只可能留下 ${played}% 的出賽紀錄。`;}
        else{const played=ri(0,5),amt=S.age>=35?7:6;S.seasonFactor=played/100;S.bigInj++;S.seasonEndingInjuries=(S.seasonEndingInjuries||0)+1;S.rehab=1;POS_AB[S.pos].forEach(k=>{S.ab[k]=clamp(S.ab[k]-amt,1,RATING_MAX);S.pot[k]=Math.max(S.ab[k],(S.pot[k]||r99(62))-3);});title='生涯威脅傷勢';loss=`<b class="dn">全能力 −${amt}、潛力上限下修</b>。`;txt=`最壞級別的傷勢，本季完全報銷，下一年也將從復健開始。`;}
        let rec='';
        if(recovery){const v=recovery.value;
          if(v<=4){S.rehab=1;const k=pick(POS_AB[S.pos]);addAb(k,-1);rec=`復健反覆，明年恐怕也無法正常開季，${ABL[k]} 再 −1。`;}
          else if(v<=14)rec='恢復進度符合醫療團隊原訂時程。';
          else if(v<20){if(sev<=78)S.seasonFactor=clamp(S.seasonFactor+.10,0,1);else S.injNext=Math.max(-4,(S.injNext||0)-4);if(sev<=96)S.rehab=0;rec=sev<=78?'恢復速度優於預期，搶回約一成賽程。':'復健進度良好，但球團仍不允許本季復出；下季風險小幅下降。';}
          else{if(sev<=78)S.seasonFactor=clamp(S.seasonFactor+.20,0,1);else S.injNext=Math.max(-7,(S.injNext||0)-7);if(sev<=96)S.rehab=0;const k=pick(POS_AB[S.pos].filter(x=>!ageGrowthLocked(x)));if(k)addAb(k,1);rec=sev<=78?`恢復遠超預期，搶回兩成賽程${k?`，${ABL[k]} +1`:''}。`:'恢復品質極佳，但報銷決定不變；醫療團隊替下一季保住更多身體狀態。';}
        }
        const changes=POS_AB[S.pos].map(k=>({k,loss:(beforeInjury[k]||0)-(S.ab[k]||0)})).filter(x=>x.loss>0),totalLoss=changes.reduce((n,x)=>n+x.loss,0);S._seasonInjuryDecline={year:S.year,title,site:site.name,totalLoss,changes:changes.map(x=>`${ABL[x.k]} −${x.loss}`)};S.injuryHistory=S.injuryHistory||[];S.injuryHistory.push({year:S.year,age:S.age,severity:sev,title,site:site.name,seasonFactor:S.seasonFactor,loss:totalLoss,changes:S._seasonInjuryDecline.changes});
        card('bad',title,`${txt}${loss}<div class="statline">傷病永久退化合計 ${totalLoss} 點${changes.length?`｜${S._seasonInjuryDecline.changes.join('｜')}`:''}<br>${rec||'短期傷勢不需復健判定。'}</div>`);
        injuryTraitAudit();board(1);done();
      };
      if(sev>55)quickRoll({sides:20,title:'復健與恢復',resolve:v=>({label:v<=4?'復健反覆':v<=14?'正常恢復':v<20?'快速恢復':'奇蹟恢復',tone:v<=4?'bad':v>=15?'good':''}),resultText:r=>r.label}).then(finish);
      else finish(null);
    });
  });
}
function injStatLoss(big){
  if(big){ /* 每一次大傷:全能力 −5,身體被實質性摧毀 */
    POS_AB[S.pos].forEach(k=>{ S.ab[k]=clamp(S.ab[k]-5,1,RATING_MAX); }); board(1);
    return `重大傷勢重創身體素質：<b class="dn">全能力 −5</b>。`;
  }
  if(!chance(40))return '';
  const keys=POS_AB[S.pos];
  let k=pick(keys); if(!(k in S.ab))k=pick(keys);
  const amt=ri(1,2);
  S.ab[k]=clamp(S.ab[k]-amt,1,RATING_MAX); board(1);
  return `傷勢留下後遺症：<b class="dn">${ABL[k]} −${amt}</b>。`;
}
function amateurSeason(){
  if(S.seasonFactor===0){ card('bad','','整季只能在場邊看著隊友比賽。');
    S.log.push({y:S.year,age:S.age,tm:S.team||stageLabel(),line:'傷缺全季', inj:true}); nextStep(); return; }
  const amSt=S._pendingAmateurStats||simAmateurSeason();S._pendingAmateurStats=null;S.lastAmateurSt=amSt;
  card(amSt.varianceKind==='hot'?'gold':amSt.varianceKind==='cold'?'bad':'','本季個人成績',`<div class="season-team-head"><b>${S.team||stageLabel()}</b><span>${amateurSeasonConfig().name}・${amSt.usageRole}</span></div><div class="stat-dashboard">${statDashboard(amSt)}</div>`);
  const cups=S.stage==='HS'?HS_CUPS:S.stage==='U'?U_CUPS:['成棒甲組春季聯賽','成棒甲組秋季聯賽'];
  const thr=S.stage==='HS'?[50,44,38,32,25]:[60,54,48,42,36];
  let gain=0,lines=[],plain=[];
  const tB=S.stage==='HS'?({1:5,2:1,3:-2})[S.hsTier||2]:0; /* 校隊底蘊會影響結果，但不再讓弱校長期鎖死於預賽。 */
  const teamBase=Math.round(tB*79/60),yearBonus=S.stage==='HS'?(S.stageYr-1)*2:0,stateBonus=Math.round((S.pendStat||0)*1.2),contextBonus=Math.round(((S.seasonContext&&S.seasonContext.perf)||0)*.7),performanceBonus=Math.round(clamp((amSt.d||0)*.22,-3,4)),relationBonus=S.stage==='HS'?hsTeamImpact(S.chemistry||0).cup:0;
  const sharedForm=ri(-5,5),cupDifficulty={'木棒聯賽':0,'黑豹旗':-1,'玉山盃':-2};
  cups.forEach(c=>{ const cupRoll=ri(-6,6),difficulty=cupDifficulty[c]||0,pw=ovr()+teamBase+yearBonus+(S.stage==='HS'?(S.hsCupBonus||0):0)+relationBonus+stateBonus+contextBonus+performanceBonus+sharedForm+difficulty+cupRoll,cut=thr.map(r99);
    const i=pw>=cut[0]?0:pw>=cut[1]?1:pw>=cut[2]?2:pw>=cut[3]?3:pw>=cut[4]?4:5;
    const rk=['冠軍','亞軍','四強','八強','十六強','預賽出局'][i];
    /* 大賽獎勵看名次，不再因為能力高而額外送點，避免強者滾雪球。 */
    const pts=[5,4,3,2,1,0][i];
    gain+=pts; lines.push({cup:c,rank:rk,pts,tier:i,power:pw,cupRoll,difficulty}); plain.push(`${c}${rk}`);
    if(S.stage==='U'&&rk==='冠軍'&&!S.traits.academy){ S.traits.academy=true;
      card('gold','隱藏屬性解鎖：學院派','大學殿堂的科學化訓練與防護打下扎實基礎——<b class="hl">25 歲前受傷率 −5%、季初擲骰期望值提升</b>。'); }
    if(i===0)S.honors.push(`${S.year} ${c}冠軍`); });
  S.pool+=gain;
  if(S.stage==='HS'){S.hsCupHistory=S.hsCupHistory||[];S.hsCupHistory.push({year:S.year,plan:S.hsPlan,tier:S.hsTier,breakdown:{ability:ovr(),teamBase,yearBonus,plan:S.hsCupBonus||0,relation:relationBonus,state:stateBonus,context:contextBonus,performance:performanceBonus,sharedForm},results:lines.map(x=>({cup:x.cup,rank:x.rank,tier:x.tier,pts:x.pts,power:x.power,cupRoll:x.cupRoll,difficulty:x.difficulty}))});}
  S.log.push({y:S.year,age:S.age,tm:S.team||stageLabel(),line:`${statLine(amSt)}｜${plain.join('、')}`,inj:false,st:amSt});
  {const best=lines.slice().sort((a,b)=>a.tier-b.tier)[0],headline=best.tier===0?'冠軍球季':best.tier===1?'站上決賽舞台':best.tier<=3?'闖進全國後段賽程':'累積大賽經驗';
    card(best.tier<=1?'gold':best.tier<=3?'good':'info',`年度大賽｜${headline}`,
      `<div class="tourney-list">${lines.map(x=>`<div class="tourney-row"><span>${x.cup}</span><b>${x.rank}</b><em>${x.pts?`+${x.pts} 點`:'無加點'}</em></div>`).join('')}</div><div class="statline">本季獲得 <b class="hl">${gain} 點</b></div>`);}
  S.pendStat=0;
  maybeIntl(()=>nextStep());
}
function proSeason(){
  if(!S._seasonPrepared){
    quickRoll({sides:20,title:`${S.year} 球季狀態`,
      resolve:v=>({label:v===20?'CAREER YEAR':v>=16?'狀態火燙':v>=7?'正常波動':v>=2?'漫長低潮':'崩盤球季',tone:v>=16?'good':v<=5?'bad':''}),
      resultText:r=>r.label}).then(rr=>{
        S.seasonLuck=rr.value;renderRails();runSeasonAnimation(()=>{S._seasonPrepared=true;proSeason();});
      });
    return;
  }
  S._seasonPrepared=false;
  const seasonAll=S._pendingSeasonStats||applySeasonAdjustments(simSeason(S.lv)),segments=S._pendingSeasonSegments||null;S._pendingSeasonStats=null;S._pendingSeasonSegments=null;const st=segments?segments[segments.length-1].st:seasonAll;S.lastSeasonSegments=segments;S.lastCombinedSt=seasonAll;S.lastSt=st;S.lastD=st.d;S.lastMarketBreakdown=seasonMarketEvaluation(st);S.lastMarketD=S.lastMarketBreakdown.total;
  S.pendStat=0;
  const bucket=bucketOf(S.lv);if(segments)accSeasonSegments(segments);else accStat(bucket,st);simulateLeagueStandings(st);const promiseReview=evaluateRolePromise(st);
  if(S.seasonFactor===0){const currentInjury=(S.injuryHistory||[]).slice().reverse().find(x=>x.year===S.year),absence=S._rehabReason&&S._rehabReason.year===S.year?`${S._rehabReason.originYear} 年 ${S._rehabReason.site}${S._rehabReason.title}復健`:currentInjury?`${currentInjury.site||''}${currentInjury.title||'傷勢'}`:'未進入正式比賽名單';card('bad','本季無出賽',`${seasonTeamInfo().name}｜${absence}`); }
  else if(segments){
    const review=S._callupReview,month=review&&review.monthIndex===2?'六月':'八月',from=LV[segments[0].lv].n,to=LV[segments[segments.length-1].lv].n,isMLB=segments[segments.length-1].lv==='MLB';
    card('gold','球季數據（季中升格）',segments.map((x,i)=>`<div class="season-team-head"><b>${x.lv==='NPB2'||x.lv==='CPBL2'?S.orgTeam+'二軍':S.orgTeam}</b><span>${LV[x.lv].n}${S.pos==='P'?'・'+roleN(S.role):S.dpos?'・'+DPN[S.dpos]:''}</span></div><div class="statline">${statLine(x.st)}</div>`).join('')+`<div class="statline"><b>跨層級合計</b>｜${statLine(seasonAll)}<br>一軍獎項、季後名單與下一季角色只採升格後的一軍成績；二軍數據已獨立計入發展聯盟生涯。</div>`);
    queueAchievement({kind:isMLB?'mlb':'promotion',kicker:isMLB?'生涯最高舞台':'球團正式升格',title:isMLB?'升上大聯盟！':`升上${to}！`,subtitle:`${S.orgTeam}｜${month}｜${from} → ${to}`,detail:`升格前實績：${review&&review.perf?review.perf.label:statLine(segments[0].st)}｜名單通過機會 ${review&&review.p?review.p:'—'}%`,result:isMLB?'MLB 名單正式登錄':`${to} 名單正式登錄`,note:`升格後成績將獨立列入 ${to} 生涯紀錄。`});
  }
  else {const ti=seasonTeamInfo(),tone=st.outlierKind||st.varianceKind;card(tone==='hot'?'gold':tone==='cold'?'bad':'','球季數據',`<div class="season-team-head"><b>${ti.name}</b><span>${ti.level}${S.pos==='P'?'・'+roleN(S.role):S.dpos?'・'+DPN[S.dpos]:''}</span></div>${st.varianceLabel?`<span class="tag">單季型態：${st.varianceLabel}</span>`:''}${st.outlierLabel?`<span class="tag">極端紀錄：${st.outlierLabel}</span>`:''}<div class="stat-dashboard">${statDashboard(st)}</div>`);}
  if(!segments&&S._callupReview&&S._callupReview.year===S.year&&(S._callupReview.p>0||S._callupReview.perf&&S._callupReview.perf.strong)){
    const r=S._callupReview;card('info','一軍升格檢討｜本季未升格',`球團在六月與八月都重新檢查名單，但本季沒有完成升格。<div class="statline">${LV[r.from].n}實績｜${r.perf.label}<br>能力與下一層級門檻差距｜${r.margin>=0?'+':''}${r.margin}<br>${r.p?`每次名單檢討的基準機會｜${r.p}%<br>`:''}最終原因｜${r.reason}</div><small>成績是主要條件，但同位置名額、登錄身分與一軍需求仍會改變結果；符合資格後每年重新判定。</small>`);
  }
  { const b=st.effectBreakdown||{},luckText=S.seasonLuck===20?'生涯年':S.seasonLuck>=16?'火燙':S.seasonLuck>=7?'正常':S.seasonLuck>=2?'低潮':'崩盤',signed=v=>`${Number(v)>0?'+':''}${Number(v||0).toFixed(1)}`;
    card(b.total>=2?'good':b.total<=-2?'bad':'info','球季變數拆解',
      `<span class="tag">${st.usageRole}</span><span class="tag">健康 ${st.availability}%</span><span class="tag">出賽 ${st.G}/${st.scheduled}</span><span class="tag">狀態 ${S.seasonLuck}/20・${luckText}</span>${st.varianceLabel?`<span class="tag">單季型態：${st.varianceLabel}</span>`:''}${st.outlierLabel?`<span class="tag">極端紀錄：${st.outlierLabel}</span>`:''}<div class="statline">最終表現評價 <b>${signed(st.d)}</b>｜年度共同波動 <b class="${(st.variance||0)>=0?'up':'dn'}">${signed(st.variance)}</b><br>手感 ${signed(b.luck)}｜事件氣勢 ${signed(b.momentum)}｜選擇狀態 ${signed(b.choice)}｜環境 ${signed(b.environment)}｜更衣室 ${signed(b.chemistry)}｜具名隊友 ${signed(b.teammates)}｜特性 ${signed(b.traits)}${b.transfer?`｜轉隊 ${signed(b.transfer)}`:''}</div>${seasonEffectHTML(st)}<small>這裡使用模擬當下已鎖定的數值，不會因季末清空狀態而改寫。打擊、長打、選球、跑壘、守備或投球品質仍各自獨立波動。</small>${S.pos!=='P'?contractMarketResume():''}`); }
  if(promiseReview)card(promiseReview.fulfilled?'good':promiseReview.injuryExcused?'info':'bad',`球團角色承諾｜${promiseReview.status}`,`${promiseReview.label}：${st.poachRole||'名單競爭安排'}<div class="statline">承諾出賽目標 ${promiseReview.target} 場｜實際 ${promiseReview.actual} 場<br>${promiseReview.consequence}</div>`);
  const isInj = S.seasonFactor <= 0.45; /* 判斷是否為大傷報廢年 */
  S.log.push({y:S.year,age:S.age,tm:segments?segments.map(x=>`${x.team||S.orgTeam}・${LV[x.lv].n}`).join('→'):S.teamName(),p:S.dpos||'',line:S.seasonFactor===0?'傷缺全季':statLine(seasonAll), inj: isInj, st: seasonAll});
  /* 鐵人累計 */
  const healthy=qualifiesIronSeason(seasonAll,S.lv);
  if(healthy){ S.ironStreak++;
    if(S.ironStreak>=5&&!S.traits.iron){ S.traits.iron=true;
      card('gold','隱藏素質解鎖：鐵人','連續五年全勤級出賽！鋼鐵般的身體，未來每季基礎傷病風險<b class="hl">不高於 6%</b>。'); } }
  else S.ironStreak=0; /* 健康但沒有達到全勤級使用量，也不算連續全勤。 */
  /* 只會這個:先看夠不夠格當主力,夠格絕不判工具人;不夠格才看有無突出工具 */
  if(S.pos!=='P'){ const tg=toolGap();
    /* 主力判定:本季出賽達聯盟場次 60% → 每日球員以上,絕不是工具人 */
    const isRegular = S.seasonFactor>0 && st.G >= LV[S.lv].g*0.60;
    if(!S.traits.onetool && !isRegular && ratingGap(tg.gap,0)>=22 && tg.val>=r99(58) && careerAllStars()<4){ S.traits.onetool=true;
      const wasBefore=S.removed.includes('只會這個');
      S.removed=S.removed.filter(x=>x!=='只會這個'); /* 重新觸發:清掉刪除線記錄 */
      const role=tg.role;
      S.toolRole=role;
      if(wasBefore||S.age>=33)
        traitCard('onetool','只會這個',`歲月帶走了你的其他工具，只剩<b class="hl">${role}</b>那一項本領還在。教練把你當成板凳上的秘密武器——關鍵時刻，你仍然可靠。`,'bad');
      else
        traitCard('onetool','只會這個',`你只有一項武器強得誇張，其餘全是破洞。教練不敢讓你先發，只在關鍵時刻派你上去做一件事——你成了球隊的<b class="hl">${role}</b>。出賽數銳減，但那一項本領無人能及。`,'bad'); }
    else if(S.traits.onetool && (tg.gap<18 || (S.seasonFactor>0 && st.G>=LV[S.lv].g*0.60))){ /* 補起來 或 打回主力 → 解除 */
      removeTrait('onetool','只會這個'); S.toolRole=null;
      card('good','不再是工具人','教練終於敢把你放進先發打線——你證明了自己不只是板凳上的一招鮮。<b class="hl">「只會這個」解除</b>，你是個完整的球員了。'); board(1); } }
  awards(bucket,st);seasonTraitAudit(bucket,st);
  showSeasonSummary(st,()=>{
    if(S.pos==='P'&&S.seasonFactor>0)tjAccrue();
    const afterFan=()=>demotionAudit(()=>tradeCheck(()=>maybeIntl(()=>nextStep())));
    tjGamble(()=>S.seasonPlan&&S.seasonPlan.fan?fanPlayerInteraction(st,afterFan):afterFan());
  });
}
function winsStatTitle(qualified,value,line,lower){return !!qualified&&(lower?value<=line:value>=line);}
function clearVoteLead(value,line,margin){return value>=line+(margin||0);}
/* 個人與 NPC 共用同一套正式規定樣本：野手約每隊賽事 3.1 PA，投手每隊賽事 1 IP。 */
function officialAwardQualification(lv){
  const games=(LV[lv]&&LV[lv].g)||0;
  return {pa:Math.round(games*3.1),ip:games};
}
function npcAwardCompetition(bucket){
  S.npcAwardCompetitions=S.npcAwardCompetitions||{};const key=`${S.year}|${bucket}`;if(S.npcAwardCompetitions[key])return S.npcAwardCompetitions[key];
  const org={CPBL:'CPBL',NPB:'NPB',MLB:'MiLB'}[bucket],lv={CPBL:'CPBL1',NPB:'NPB1',MLB:'MLB'}[bucket],L=LV[lv],env=leagueRunEnv(lv),hitters=[],pitchers=[];evolveNpcLeague(org,lv);
  npcTeamsForOrg(org).forEach(team=>ensureNpcRoster(org,team,lv).forEach(p=>{
    const gap=ratingGap(p.overall,L.par),starNoise=normalZ(),role=p.role;
    if(['SP','RP','SU','CL'].includes(role)){
      const starter=role==='SP',G=starter?clamp(Math.round((L.g/(bucket==='MLB'?5.1:5.5))*(.82+R()*.22)),12,bucket==='MLB'?34:28):clamp(Math.round(L.g*.40*(.76+R()*.42)),20,bucket==='MLB'?75:65),IP=starter?G*clamp(5.0+gap*.045+normalZ()*.28,4.1,6.6):G*clamp(.94+normalZ()*.11,.65,1.35),era=clamp(env.era-gap*.12-starNoise*.38,.65,8.5),k9=clamp(env.k9+gap*.075+normalZ()*.62,3,15.5),winP=clamp(.5+gap*.012+normalZ()*.045,.2,.8),dec=Math.round(G*(starter?.68:.10)),W=Math.round(dec*winP),SO=Math.round(IP/9*k9),SV=starter?0:role==='CL'?Math.round(clamp(22+gap*1.45+normalZ()*6,4,48)):role==='SU'?Math.max(0,Math.round(normalZ()*1.2+1)):chance(16)?ri(1,3):0,HLD=starter?0:role==='SU'?Math.round(clamp(20+gap*1.15+normalZ()*6,4,42)):role==='RP'?Math.round(clamp(8+gap*.7+normalZ()*5,0,25)):Math.round(clamp(3+gap*.3+normalZ()*3,0,12));const row={name:p.name,team,role,G,IP,W,SO,era,sv:SV,hld:HLD};p.season={year:S.year,lv,...row};pitchers.push(row);
    }else{
      const share=clamp(.64+gap*.025+normalZ()*.08,.20,.98),G=Math.round(L.g*share),PA=Math.max(60,Math.round(G*clamp(3.75+gap*.018+normalZ()*.16,2.2,4.55))),AB=Math.round(PA*.91),avg=clamp(env.avg+gap*.0042+starNoise*.017,.145,.390),H=Math.round(AB*avg),HR=Math.min(H,Math.max(0,Math.round(AB*clamp(env.hr+gap*.00165+.002+normalZ()*.0035,.001,.095)))),BB=PA-AB,obp=(H+BB)/PA,powerGap=gap+normalZ()*2.5,doubles=Math.round(Math.max(0,H-HR)*clamp(.21+powerGap*.003,.12,.36)),triples=Math.round(Math.max(0,H-HR-doubles)*clamp(.018+normalZ()*.008,.002,.065)),slg=(Math.max(0,H-HR-doubles-triples)+doubles*2+triples*3+HR*4)/AB,ops=obp+slg,RBI=Math.round(HR*2.05+(H-HR)*.31),SB=Math.round(clamp((8+gap*1.3+normalZ()*9)*share,0,bucket==='MLB'?75:65)),def=Math.round(clamp(gap*.55+normalZ()*4,-15,24)),cs=Math.round(clamp(29+gap*.7+normalZ()*5,12,52));const row={name:p.name,team,role,G,PA,AB,H,HR,RBI,SB,avg,obp,ops,def,cs};p.season={year:S.year,lv,...row};hitters.push(row);
    }
  }));
  const official=officialAwardQualification(lv),max=(rows,k)=>rows.slice().sort((a,b)=>(b[k]||0)-(a[k]||0))[0],min=(rows,k)=>rows.slice().sort((a,b)=>(a[k]||99)-(b[k]||99))[0],qualifiedH=hitters.filter(x=>x.PA>=official.pa),qualifiedP=pitchers.filter(x=>x.role==='SP'&&x.IP>=official.ip),relievers=pitchers.filter(x=>x.role!=='SP');
  const leaders={avg:max(qualifiedH,'avg'),h:max(qualifiedH,'H'),hr:max(hitters,'HR'),rbi:max(hitters,'RBI'),sb:max(hitters,'SB'),obp:max(qualifiedH,'obp'),ops:max(qualifiedH,'ops'),def:max(hitters,'def'),cs:max(hitters.filter(x=>x.role==='C'),'cs'),era:min(qualifiedP,'era'),w:max(pitchers,'W'),so:max(pitchers,'SO'),sv:max(relievers,'sv'),hld:max(relievers,'hld')},fallback=(k,v)=>leaders[k]||{name:'聯盟領先者',[k]:v};
  const comp={avg:fallback('avg',.310).avg,h:fallback('h',150).H||150,hr:fallback('hr',25).HR||25,rbi:fallback('rbi',90).RBI||90,sb:fallback('sb',28).SB||28,obp:fallback('obp',.390).obp,ops:fallback('ops',.800).ops,def:fallback('def',8).def||8,cs:fallback('cs',31).cs||31,era:fallback('era',3).era,w:fallback('w',12).W||12,so:fallback('so',150).SO||150,sv:fallback('sv',28).sv||28,hld:fallback('hld',25).hld||25,_leaders:leaders};S.npcAwardCompetitions[key]=comp;return comp;
}
function awards(bucket,st,competitionOverride){
  S.awardWatch=[];
  if(!LV[S.lv].top||S.seasonFactor===0)return;
  const y=S.year,h=S.honors,lgN={CPBL:'中職',NPB:'日職',MLB:'大聯盟'}[bucket],add=n=>{const row=`${y} ${n}`;if(!h.includes(row))h.push(row);};
  const official=officialAwardQualification(S.lv);
  const P_RULE={CPBL:{ip:official.ip,w:11,so:120,era:3.05,sv:25,hld:22},NPB:{ip:official.ip,w:12,so:150,era:2.75,sv:30,hld:28},MLB:{ip:official.ip,w:14,so:190,era:3.20,sv:34,hld:30}}[bucket];
  const H_RULE={CPBL:{pa:official.pa,h:125,avg:.310,hr:22,rbi:82,sb:25,obp:.385},NPB:{pa:official.pa,h:145,avg:.310,hr:28,rbi:92,sb:28,obp:.390},MLB:{pa:official.pa,h:165,avg:.310,hr:34,rbi:102,sb:30,obp:.395}}[bucket];
  const COMP=competitionOverride||npcAwardCompetition(bucket);
  const lead=k=>COMP._leaders&&COMP._leaders[k]?`（${COMP._leaders[k].name}）`:'';
  st._awardCompetition={...COMP};
  const AN={
    CPBL:{rookie:'中職年度新人王',month:'中職單月MVP',progress:'中職年度最佳進步獎',pitcher:null,first:'中職最佳十人',second:null,defense:'中職金手套',defPlayer:null,bat:'中職最佳十人',relief:'中職年度後援貢獻獎',comeback:'中職東山再起獎'},
    NPB:{rookie:'日職新人王',month:'日職月間MVP',progress:'日職復活賞',pitcher:'日職澤村賞',first:'日職最佳九人',second:null,defense:'日職金手套',defPlayer:null,bat:'日職最佳九人',relief:'日職年度最佳後援投手',comeback:'日職復活賞'},
    MLB:{rookie:'大聯盟年度新人王',month:'大聯盟單月最佳球員',week:'大聯盟單週最佳球員',progress:'大聯盟東山再起獎',pitcher:'大聯盟賽揚獎',first:'All-MLB 年度第一隊',second:'All-MLB 年度第二隊',defense:'大聯盟金手套',defPlayer:'大聯盟白金手套',bat:'大聯盟銀棒獎',relief:'大聯盟年度最佳後援投手',comeback:'大聯盟東山再起獎'}
  }[bucket];
  const obpNow=S.pos==='P'?0:(st.PA?(st.H+st.BB)/st.PA:0),opsNow=S.pos==='P'?0:obpNow+slgOf(st);
  const eraNow=S.pos==='P'&&st.IP>0?st.ER*9/st.IP:99,whipNow=S.pos==='P'&&st.IP>0?(st.H+st.BB)/st.IP:99;
  const enoughSample=S.pos==='P'?(isSP()?st.IP>=P_RULE.ip*.3:st.G>=20&&st.IP>=15):st.PA>=H_RULE.pa*.28;
  const qualitySeason=S.pos==='P'?(eraNow<=4.50&&whipNow<=1.55):opsNow>=.690;
  const awardEligible=enoughSample&&qualitySeason;
  const monthEligible=S.pos==='P'?(isSP()?st.IP>=P_RULE.ip*.3&&eraNow<=3.55:st.G>=24&&eraNow<=3.25):st.PA>=H_RULE.pa*.35&&opsNow>=.780;
  const weekEligible=S.pos==='P'?(st.G>=14&&eraNow<=4.00):st.PA>=H_RULE.pa*.22&&opsNow>=.740;
  /* 明星賽先看實際出賽量與成績；人氣只能在已達競爭線時加分。 */
  if(awardEligible){ const d=st.d,actual=S.pos==='P'?clamp((4.2-eraNow)*4+(1.4-whipNow)*5,-5,12):clamp((opsNow-.690)*38+(st.SB||0)/Math.max(1,H_RULE.sb),-5,12);
    let asP=clamp(18+d*3+actual*4,4,88);
    if(bucket==='CPBL'&&S.orgTeam==='台中猛瑪')asP=clamp(asP+12,4,94); /* 人氣只影響邊緣席次 */
    if(S.traits.fanhero)asP+=7;if(S.traits.community)asP+=3;if(S.traits.booed)asP-=8;
    asP=clamp(asP,2,95);
    if(chance(asP)){ S.stats[bucket].AS++;
      add(`${lgN}明星賽`+((bucket==='CPBL'&&S.orgTeam==='台中猛瑪'&&d<2)?'（人氣入選）':'')); } }
  const rookieOK=bucket!=='CPBL'||!(S.stats.NPB||S.stats.MLB||S.stats.MINOR); /* 旅外歸國無新人資格 */
  if(awardEligible&&S.stats[bucket].yr===1&&rookieOK&&st.d>=4&&chance(clamp(42+st.d*3,45,78)))add(AN.rookie);
  if(monthEligible&&st.d>=2&&chance(clamp(14+st.d*3,18,62))){const n=st.d>=10?ri(1,3):1;add(`${AN.month}${n>1?` ×${n}`:''}`);}
  if(AN.week&&weekEligible&&st.d>=1&&chance(clamp(18+st.d*3,20,58))){const n=st.d>=9?ri(2,4):st.d>=5?ri(1,2):1;add(`${AN.week}${n>1?` ×${n}`:''}`);}
  if(awardEligible&&S.stats[bucket].yr===1&&rookieOK&&st.d>=2&&chance(clamp(45+st.d*4,48,78)))add(`${S.orgTeam} 球團年度最佳新秀`);
  if(awardEligible&&st.d-(S.prevSeasonD||0)>=4&&chance(clamp(42+(st.d-(S.prevSeasonD||0))*5,48,82)))add(AN.progress);
  {const prior=S.log&&S.log.length>1?S.log[S.log.length-2]:null;if(awardEligible&&prior&&prior.inj&&st.d>=2&&S.seasonFactor>=.9&&chance(62))add(AN.comeback);}
  if(S.pos==='P'){
    if(winsStatTitle(isSP()&&st.IP>=P_RULE.ip,st.era,COMP.era,true))add(`${lgN}防禦率王`);
    if(winsStatTitle(isSP()&&st.IP>=P_RULE.ip*.72,st.W,COMP.w))add(`${lgN}勝投王`);
    if(winsStatTitle(st.IP>=P_RULE.ip*.42,st.SO,COMP.so))add(`${lgN}三振王`);
    if(winsStatTitle(S.role==='CL'&&st.G>=38,st.SV||0,COMP.sv))add(`${lgN}救援王`);
    if(winsStatTitle(S.role==='MR'&&bucket==='NPB'&&st.G>=38,st.HLD||0,COMP.hld))add('日職最優秀中繼投手');
    if(winsStatTitle(S.role==='MR'&&bucket==='CPBL'&&st.G>=38,st.HLD||0,COMP.hld))add('中職中繼王');
    if(AN.pitcher&&isSP()&&st.d>=6&&st.era<=P_RULE.era+.2&&st.IP>=P_RULE.ip&&chance(clamp(20+st.d*3,28,65)))add(AN.pitcher);
    let firstTeam=false;
    if(st.d>=4&&((isSP()&&st.IP>=P_RULE.ip*.82)||(!isSP()&&st.G>=42))&&chance(clamp(25+st.d*3,30,68))){add(`${AN.first}・${roleN(S.role)}`);firstTeam=true;}
    if(AN.second&&!firstTeam&&st.d>=2&&((isSP()&&st.IP>=P_RULE.ip*.72)||(!isSP()&&st.G>=38))&&chance(clamp(32+st.d*3,35,65)))add(`${AN.second}・${roleN(S.role)}`);
    if(!isSP()&&st.G>=45&&st.era<=2.85&&chance(clamp(28+st.d*4,30,72)))add(AN.relief);
    if(S.role==='MR'&&st.G>=42&&(st.HLD||0)>=Math.round(P_RULE.hld*.6)&&chance(48))add(`${lgN}球團無名英雄`);
  }else{
    const obp=st.PA?(st.H+st.BB)/st.PA:0;
    if(winsStatTitle(st.PA>=H_RULE.pa,st.avg,COMP.avg))add(`${lgN}打擊王`);
    if(winsStatTitle(st.PA>=H_RULE.pa*.78,st.H,COMP.h))add(`${lgN}安打王`);
    if(winsStatTitle(st.PA>=H_RULE.pa*.78,st.HR,COMP.hr))add(`${lgN}全壘打王`);
    if(winsStatTitle(st.PA>=H_RULE.pa*.78,st.RBI,COMP.rbi))add(`${lgN}打點王`);
    if(winsStatTitle(st.PA>=H_RULE.pa*.55,st.SB,COMP.sb))add(`${lgN}盜壘王`);
    if(winsStatTitle(st.PA>=H_RULE.pa,obp,COMP.obp))add(`${lgN}上壘王`);
    const def1=st.DEF||0;
    let wonGlove=false;
    const gloveGames=Math.ceil(LV[S.lv].g*(S.dpos==='C'?.52:.62)),gloveEligible=!st._dh&&S.dpos!=='DH'&&(st.defG||0)>=gloveGames&&(st.TC||0)>=gloveGames*2;
    const catcherRate=S.dpos==='C'&&st.SBA?Math.round((st.CS||0)/st.SBA*100):0,gloveScore=def1+(S.dpos==='C'?clamp((catcherRate-COMP.cs)/5,-2,3)+clamp((st.CALL_RUNS||0)/8,-2,3):0);
    if(gloveEligible&&gloveScore>=COMP.def&&S.seasonFactor>=0.7&&chance(clamp(24+gloveScore*2.7,30,72))){add(`${AN.defense}・${DPN[S.dpos]||'守位'}`);wonGlove=true;}
    if(AN.defPlayer&&wonGlove&&def1>=11&&chance(clamp(12+def1*2,20,48)))add(AN.defPlayer);
    const ops=obp+slgOf(st),batAward=`${AN.bat}・${DPN[S.dpos]||'指定打擊'}`,batVoteEligible=st.PA>=H_RULE.pa*.78&&ops>=COMP.ops-.035,batVoteP=clamp(Math.round(40+(ops-COMP.ops)*260+(st.d||0)*1.5),18,94),batClear=st.PA>=H_RULE.pa*.9&&clearVoteLead(ops,COMP.ops,.06),wonBatVote=batVoteEligible&&(batClear||chance(batVoteP));
    if(wonBatVote)add(batAward);
    let firstTeam=false;
    if(bucket==='MLB'&&st.d>=4&&st.PA>=H_RULE.pa*.9&&chance(clamp(25+st.d*3,30,66))){add(`${AN.first}・${DPN[S.dpos]||'指定打擊'}`);firstTeam=true;}
    if(AN.second&&!firstTeam&&st.d>=2&&st.PA>=H_RULE.pa*.76&&chance(clamp(30+st.d*3,34,64)))add(`${AN.second}・${DPN[S.dpos]||'指定打擊'}`);
    let dhVoteP=batVoteP,wonDhVote=wonBatVote;
    if(S.dpos==='DH'&&bucket==='MLB'){dhVoteP=clamp(Math.round(48+(ops-COMP.ops)*250+(st.d||0)*1.5),24,96);wonDhVote=batVoteEligible&&(batClear||chance(dhVoteP));if(wonDhVote)add('大聯盟年度最佳指定打擊獎');}
    st._batVote={line:COMP.ops,p:Math.max(batVoteP,dhVoteP),won:S.dpos==='DH'?wonDhVote:wonBatVote,clear:batClear,award:S.dpos==='DH'?'最佳指定打擊':`${DPN[S.dpos]||'守位'}年度打擊獎`};
    if(gloveEligible&&def1>=5&&chance(clamp(38+def1*3,42,76)))add(`${S.orgTeam} 球團最佳防守球員`);
  }
  const mvpQual = S.pos==='P'
    ? (isSP()?st.IP>=120:st.G>=45)
    : st.PA>=LV[S.lv].g*3.4; /* 野手需規則性出賽(約 3.4 PA/場×場次),代打量不具 MVP 資格 */
  const teamVote=S.currentStandings&&S.currentStandings.mine?Math.round((S.currentStandings.mine.pct-.5)*45):0;
  if(awardEligible&&st.d>=8&&mvpQual&&S.seasonFactor>=0.9&&chance(S.pos==='P'&&S.role!=='SP'?clamp(3+st.d*1.2+teamVote,5,20):clamp(10+st.d*2+teamVote,20,52)))add(`${lgN}年度MVP`);
  if(awardEligible&&S.traits.clutch&&st.d>=3&&chance(clamp(38+st.d*4,42,76)))add(`${lgN}年度關鍵時刻獎`);
  const so=socialState();if(S.traits.community&&so.communityActs>=3&&chance(55))add(`${lgN}年度公益獎`);if(S.traits.leader&&so.playerRep>=8&&chance(45))add(`${lgN}隊友票選領袖獎`);
  const awardQual=S.pos==='P'?(isSP()?st.IP>=P_RULE.ip*.72:st.G>=38&&st.IP>=28):st.PA>=H_RULE.pa*.78;
  if(!awardQual){
    const current=S.pos==='P'?(isSP()?`${fmtIP(st.IP)} 局`:`${st.G} 場／${fmtIP(st.IP)} 局`):`${st.PA} 打席`;
    const needed=S.pos==='P'?(isSP()?`${Math.ceil(P_RULE.ip*.72)} 局`:`38 場／28 局`):`${Math.ceil(H_RULE.pa*.78)} 打席`;
    S.awardWatch.push(`未達主要個人獎競爭樣本｜目前 ${current}・參考線 ${needed}`);
  }else if(S.pos==='P'){
    if(isSP()&&!h.includes(`${y} ${lgN}防禦率王`))S.awardWatch.push(`防禦率榜 ${st.era.toFixed(2)}｜聯盟領先 ${COMP.era.toFixed(2)} ${lead('era')}`);
    else if(S.role==='CL'&&!h.includes(`${y} ${lgN}救援王`))S.awardWatch.push(`救援榜 ${st.SV||0}｜聯盟領先 ${COMP.sv} ${lead('sv')}`);
    else if(bucket==='NPB'&&!h.includes(`${y} 日職最優秀中繼投手`))S.awardWatch.push(`中繼點榜 ${st.HLD||0} HLD｜聯盟領先 ${COMP.hld} ${lead('hld')}`);
    else if(bucket==='CPBL'&&!h.includes(`${y} 中職中繼王`))S.awardWatch.push(`中繼點榜 ${st.HLD||0} HLD｜聯盟領先 ${COMP.hld} ${lead('hld')}`);
    else S.awardWatch.push(`中繼點｜${st.HLD||0} HLD`);
    if(!h.includes(`${y} ${lgN}三振王`))S.awardWatch.push(`三振榜 ${st.SO||0}｜聯盟領先 ${COMP.so} ${lead('so')}`);
    if(isSP())S.awardWatch.push(`年度最佳投手票選｜球季評價 ${st.d>=0?'+':''}${st.d.toFixed(1)}`);
  }else{
    const obp=st.PA?(st.H+st.BB)/st.PA:0,ops=obp+slgOf(st);
    if(!h.includes(`${y} ${lgN}打擊王`)&&st.avg>=COMP.avg-.035)S.awardWatch.push(st.PA>=H_RULE.pa?`打擊王競爭｜目前 ${st.avg.toFixed(3).replace(/^0/,'')}・聯盟領先 ${COMP.avg.toFixed(3).replace(/^0/,'')} ${lead('avg')}`:`打擊率 ${st.avg.toFixed(3).replace(/^0/,'')}｜尚未取得打擊王資格・目前 ${st.PA} PA／規定 ${H_RULE.pa} PA`);
    if(!h.includes(`${y} ${lgN}全壘打王`)&&(st.HR||0)>=Math.max(5,COMP.hr*.55))S.awardWatch.push(`全壘打王競爭｜目前 ${st.HR||0}・聯盟領先 ${COMP.hr} ${lead('hr')}`);
    if(S.dpos==='C'){
      const cs=st.SBA?Math.round((st.CS||0)/st.SBA*100):0,era=Number(st.STAFF_ERA_ADJ)||0;
      S.awardWatch.push(`最佳捕手競爭｜OPS ${ops.toFixed(3).replace(/^0/,'')}・本季票選線約 ${COMP.ops.toFixed(3).replace(/^0/,'')}・守備貢獻 ${(st.DEF||0)>=0?'+':''}${st.DEF||0}`);
      S.awardWatch.push(`捕手金手套競爭｜阻殺率 ${cs}%（競爭線約 ${COMP.cs}%）・失誤 ${st.E||0}・配球 ${st.CALL_GRADE||'—'}・配球防失分 ${(st.CALL_RUNS||0)>=0?'+':''}${st.CALL_RUNS||0}`);
    }else if(!st._batVote||!st._batVote.won)S.awardWatch.push(`${S.dpos==='DH'?'最佳指定打擊票選未獲獎':'年度攻守票選'}｜OPS ${ops.toFixed(3).replace(/^0/,'')}・本季票選線約 ${COMP.ops.toFixed(3).replace(/^0/,'')}${st._batVote?`・估算獲獎率 ${st._batVote.p}%`:''}${S.dpos!=='DH'?`・守備貢獻 ${(st.DEF||0)>=0?'+':''}${st.DEF||0}`:''}`);
  }
  const added=h.filter(x=>x.startsWith(String(y)));
  if(added.length){ card('gold','年度獎項',`<div class="award-grid">${added.map(x=>`<div class="award-item">🏆 ${x.slice(5)}</div>`).join('')}</div>`);
    if(S.traits.yips){ removeTrait('yips','失憶症'); card('good','走出陰影','站上大舞台拿下獎項的那一刻，腦海裡的雜音消失了——<b class="hl">失憶症痊癒</b>。'); }
    /* 浴火重生:已是玻璃人卻在頂級聯盟奪年度大獎 */
    if(S.traits.glass&&!S.traits.phoenix){ const big=added.some(x=>/MVP|最佳投手|打擊王|全壘打王|新人王/.test(x));
      if(big){ S.traits.phoenix=true; removeTrait('glass','玻璃人');
        S.pool+=8;
        card('gold','隱藏屬性解鎖：浴火重生','那些殺不死你的，真的讓你更強大了。撕裂的韌帶長成更堅韌的形狀——<b class="hl">玻璃人懲罰解除，受傷率恢復正常，並獲得一大筆能力點</b>。'); } }
  }
  potentialBreakthroughAudit(added);
}
function maybeIntl(done){
  const wbc=(S.year-2026)%4===0; let p12=(S.year-2028)%4===0;
  if(S.lv==='MLB')p12=false; /* 大聯盟球員只打經典賽,不打 12 強 */
  if(S.stage!=='PRO'||(!wbc&&!p12)||ovr()<r99(52)||S.seasonFactor<0.5||S.rehab>0||S.skipMid){ done(); return; } /* 復健年/報銷年不徵召 */
  const name=wbc?'世界棒球經典賽':'世界12強賽';
  let forced=false,first=false;
  if(S.intlLock===null){ S.intlLock=S.year; forced=true; first=true; }
  else if(S.year-S.intlLock<5) forced=true;
  if(forced){
    card('info','體育署公文',first
      ?`「查 台端符合國家代表隊遴選資格，依規定<b class="hl">強制徵召</b>，並自即日起<b class="hl">列管五年</b>，列管期間各國際賽事皆須配合徵召，不得以任何理由推辭。」——你甚至還沒拆完信封，行李箱已經被球團打包好了。`
      :`列管期間（剩 ${5-(S.year-S.intlLock)} 年），依規定<b class="hl">強制徵召</b>。你沒有選擇。`);
  }
  const opts=[
    {t:forced?'⋯⋯只能報到（強制徵召）':'披上國家隊戰袍',main:true,s:'依成績獲得能力點｜下季受傷機率 +10%',f:()=>{
      /* 國家隊成敗看整體興衰,個人只佔一小部分 */
      const b=clamp(Math.round(ratingGap(ovr(),r99(52))*0.35),0,8), r=R()*100+b;
      const i=r>=96?0:r>=88?1:r>=79?2:r>=46?3:4;
      const rk=['冠軍','亞軍','季軍','複賽止步','預賽出局'][i], pts=[6,5,4,2,1][i];
      let gpts=pts; if(S.traits.intlace)gpts=Math.max(pts,2);
      S.pool+=gpts; S.injNext=S.traits.intlace?0:10; S.intlCount++;
      /* 國際賽先產生本屆實際成績，再由該成績判斷 MVP；局數與出賽數必須彼此合理。 */
      let intlLine='',mvpScore=-99;
      { const a=S.ab,par=r99(52),IS=S.intlStat;
        if(S.pos==='P'){
          const dd=ratingGap(a.vel*.34+a.ctl*.33+a.brk*.33,par),g=isSP()?ri(1,3):ri(2,5),ip=outsFromIP(g*(isSP()?clamp(4.7+dd*.045+N0(.35),3.2,6.5):clamp(.88+ratingGap(a.sta,par)*.006+N0(.08),.55,1.35)))/3;
          const k=Math.round(ip/9*clamp(7.5+ratingGap(a.vel,par)*.10+ratingGap(a.brk,par)*.07+N0(.45),4,14.5)),era=clamp(3.75-dd*.15+N0(.65),.35,8.5),er=Math.round(era*ip/9);
          let w=0,sv=0;if(i<=2&&chance(clamp(30+dd*2,18,62)))w=1;if(!isSP()&&w===0&&chance(clamp(24+dd*2,12,55)))sv=1;
          IS.G+=g;setPitchingOuts(IS,pitchingOuts(IS)+outsFromIP(ip));IS.SO+=k;IS.ER+=er;IS.W+=w;IS.SV+=sv;
          const realEra=ip?er*9/ip:9.9;mvpScore=(3.2-realEra)*2+ip*.34+k*.16+w*1.5+sv*1.2;intlLine=`本屆 ${g} G｜${fmtIP(ip)} IP｜${w} W｜${sv} SV｜${k} K｜ERA ${realEra.toFixed(2)}`;
        }else{
          const contact=ratingGap(a.con*.68+a.eye*.22+a.spd*.10,par),g=ri(5,8),pa=g*ri(3,4),bb=Math.round(pa*clamp(.075+ratingGap(a.eye,par)*.003,.03,.18)),ab=Math.max(1,pa-bb),avg=clamp(.255+contact*.006+N0(.025),.10,.500),h=Math.round(ab*avg),hr=Math.min(h,Math.round(ab*clamp(.018+ratingGap(a.pow,par)*.0022,.002,.12)*( .8+R()*.4))),rbi=Math.round(hr*2.1+(h-hr)*.31);
          IS.G+=g;IS.PA+=pa;IS.AB+=ab;IS.H+=h;IS.HR+=hr;IS.RBI+=rbi;
          const realAvg=h/ab,obp=(h+bb)/pa,slg=(Math.max(0,h-hr)*1.28+hr*4)/ab,ops=obp+slg;mvpScore=(ops-.72)*12+hr*.8+rbi*.12;intlLine=`本屆 ${g} G｜${pa} PA｜${h} H｜${hr} HR｜${rbi} RBI｜AVG ${realAvg.toFixed(3).replace(/^0/,'')}｜OPS ${ops.toFixed(3).replace(/^0/,'')}`;
        }
      }
      if(i<=1)S.intlTop4=(S.intlTop4||0)+1; /* 需打進冠亞軍才算 */
      if(!S.traits.intlace&&S.intlCount>=3&&(S.intlTop4||0)>=2){ S.traits.intlace=true;
        card('gold','隱藏屬性解鎖：國際賽之鬼','只要穿上 CT 球衣，你的痛覺就會消失——你是為大場面而生的男人。<b class="hl">國際賽不再增加受傷風險，且每次徵召能力點保底 +2</b>。'); }
      if(i<=2)S.honors.push(`${S.year} ${name}${rk}`);
      let ex='';const mvpChance=i<=1?clamp(Math.round(6+Math.max(0,mvpScore)*3+(i===0?8:0)+(S.traits.clutch?8:0)),0,48):0;if(mvpScore>=4&&chance(mvpChance)){S.honors.push(`${S.year} ${name}MVP`);ex='你以本屆實際成績被選為<b class="hl">賽會MVP</b>！';}
      card(i<=1?'gold':'info',name,`中華隊最終成績：<b class="hl">${rk}</b>。<div class="statline">${intlLine}｜MVP 競爭 ${mvpScore>=4?mvpChance:0}%</div>${ex}獲得能力點 <b class="hl">${gpts}</b> 點。${S.traits.intlace?'國家英雄不知何謂疲憊。':'國際賽的高強度消耗，讓下季受傷風險上升。'}`);
      done(); }},
    ];
  if(!forced)opts.push({t:'以調整為由婉拒',s:'列管期已過，終於能說不',f:done});
  choose(`中華隊徵召 · ${name}`,opts);
}
/* ---------- 季末 ---------- */
function phaseEnd(){
  board(2);
  let pay=null,financePlan=null,routineFinance=null;
  if(S.stage==='PRO'){
    /* 合約簽下後年薪固定，不再隨隔年的單季表現偷偷重算；只有非全保障合約在全年傷缺時按保障比例給付。 */
    const listed=S.ct&&Number.isFinite(S.ct.annual)?S.ct.annual:salaryFor(S.lv,S.lastD||0)*(S.ct?S.ct.mult:1)*dpMult();
    let sal=Math.round(listed);if(S.seasonFactor===0&&S.ct&&(S.ct.guaranteed||0)<1)sal=Math.round(sal*S.ct.guaranteed);
    pay=bookIncome(sal,'salary',S.org,S.orgTeam);
    let extra='';
    if(S.traits.fanhero||S.traits.community){
      const top=LV[S.lv]&&LV[S.lv].top,base=({CPBL:90,NPB:300,MLB:1200})[top]||30,mult=(S.traits.fanhero ? 1 : .45)+(S.traits.community ? .35 : 0),bonus=Math.round(base*mult*clamp(1+(S.lastD||0)*.025,.8,1.35));
      const sponsor=bookIncome(bonus,'endorsement',S.org,S.orgTeam);extra+=`<br>人氣／公益合作收入：<b class="hl">${fmtContractMoney(bonus,S.org)}</b>｜稅費後 ${fmtLocalMoney(sponsor.net,S.org)}`;
    }
    if(LV[S.lv].top&&S.seasonFactor>0&&S.currentStandings&&S.currentStandings.champion===S.orgTeam){
      const cN={CPBL:'中職總冠軍',NPB:'日本一',MLB:'世界大賽冠軍'}[LV[S.lv].top];
      S.honors.push(`${S.year} ${cN}`);S.wonChamp=true;S.champThisTeam=true;S.champTeam=S.orgTeam;extra+=`<br>球隊從年度戰績與季後賽一路突圍，奪下 <b class="hl">${cN}</b>！`;
    }
    if(S.tradeRefuse>0&&S.year>(S.tradeRefuseSetYear||0))S.tradeRefuse--;
    if(S.tradeHeat>0)S.tradeHeat=Math.max(0,S.tradeHeat-5);
    financePlan=financePlanningTrigger(pay);
    if(!financePlan.reason){routineFinance=settleRoutineFinance(pay,financePlan.profile);extra+=`<br>年度基本生活支出：<b>${fmtContractMoney(routineFinance.cost,S.org)}</b>${routineFinance.interest?`｜負債利息 ${fmtContractMoney(routineFinance.interest,S.org)}`:''}（例行自動結算，未觸發財務選擇）`;}
    card('','季末結算',`本年度合約薪資：<b class="hl">${fmtContractMoney(sal,S.org)}</b>｜估算稅負 ${fmtLocalMoney(pay.tax,S.org)}｜經紀人費 ${fmtLocalMoney(pay.agent,S.org)}｜稅費後 ${fmtLocalMoney(pay.net,S.org)}${S.ct?`｜合約剩 ${Math.max(0,S.ct.yrs-1)} 年`:''}${extra}`);
    board(2);
  }
  const afterMeeting=()=>{if(!pay){movement();return;}if(financePlan&&financePlan.reason)annualFinanceChoice(pay,()=>movement(),financePlan.reason);else financeIncident(()=>movement(),routineFinance.profile,7);};
  const go=()=>S.stage==='PRO'?postSeasonRosterMeeting(afterMeeting):afterMeeting();
  if(S.pool>0){ const p=S.pool; S.pool=0;
    choose('',[{t:`▸ 分配能力點（${p} 點·大賽／國際賽成果）`,main:true,f:()=>allocUI({pool:p},'季末能力點分配（大賽／國際賽成果）',go)}]); }
  else go();
}
/* 官方制度的遊戲化年資：CPBL 一般 9 季／大學滿四年 8 季；NPB 國內 8 季（大社 7 季）、海外 9 季；MLB 6 年。 */
function faServiceRequirement(org,overseas){
  const college=S.proEntry==='U'||S.proEntry==='AMA';
  if(org==='CPBL')return college?8:9;
  if(org==='NPB')return overseas?9:(college?7:8);
  return 6;
}
function cpblFaMarketRule(){
  S.cpblFaMarketByYear=S.cpblFaMarketByYear||{};
  if(!S.cpblFaMarketByYear[S.year]){
    const declared=ri(5,18),teamLimit=declared<=10?2:declared<=15?3:4;
    S.cpblFaSignings=S.cpblFaSignings||{};S.cpblFaSignings[S.year]=S.cpblFaSignings[S.year]||{};
    const occupied=S.cpblFaSignings[S.year],npcSigned=Math.min(declared-1,ri(Math.max(1,Math.floor(declared*.35)),Math.max(2,Math.floor(declared*.65))));
    for(let i=0;i<npcSigned;i++){
      const available=CPBL_TEAMS.filter(t=>(occupied[t]||0)<teamLimit);if(!available.length)break;
      const team=pick(available);occupied[team]=(occupied[team]||0)+1;
    }
    S.cpblFaMarketByYear[S.year]={declared,teamLimit,npcSigned};
  }
  return S.cpblFaMarketByYear[S.year];
}
function serviceDayLine(org){const target=SERVICE_DAY_TARGET[org]||1,days=Math.max(0,Math.round((S.serviceDays&&S.serviceDays[org])||((S.service&&S.service[org])||0)*target)),years=Math.floor(days/target),rem=days%target;return `${days} 日（${years} 年＋${rem} 日）`;}
/* NPB 以一軍「出場選手登錄日數」折算 FA 年資；遊戲逐月累積登錄日，二軍月份不計入。 */
function npbRosterStatus(){
  if(!S||S.org!=='NPB')return {foreign:false,years:0,need:8,label:''};
  const years=(S.service&&S.service.NPB)||0,days=Math.max(0,Math.round((S.serviceDays&&S.serviceDays.NPB)||years*SERVICE_DAY_TARGET.NPB)),need=8,foreign=days<need*SERVICE_DAY_TARGET.NPB;
  return {foreign,years,days,need,label:foreign?'外籍球員':'視同本土球員'};
}
function npbStatusText(lv){const rs=npbRosterStatus();if(!S||S.org!=='NPB')return '';return rs.foreign?`外籍球員・${lv==='NPB2'?'目前不占一軍外籍登錄席次':'占用一軍外籍登錄席次'}・一軍登錄 ${serviceDayLine('NPB')}`:`視同本土球員・一軍登錄 ${serviceDayLine('NPB')}`;}
function faRuleSummary(org){
  const req=faServiceRequirement(org,org==='NPB'),svc=(S.service&&S.service[org])||S.svc||0;
  if(org==='CPBL'){const market=cpblFaMarketRule(),signed=Object.values((S.cpblFaSignings&&S.cpblFaSignings[S.year])||{}).reduce((n,v)=>n+(Number(v)||0),0);return `中職 ${req} 個一軍球季取得資格；目前 ${serviceDayLine('CPBL')}。本年 ${market.declared} 人宣告 FA，市場已有 ${signed} 人簽約，每隊最多簽 ${market.teamLimit} 人`;
  }
  if(org==='NPB')return `日職海外球員 FA 需 ${req} 個一軍登錄球季；目前 ${npbStatusText(S.lv)}`;
  return `大聯盟 6 年服務時間取得自由球員資格；目前 ${serviceDayLine('MiLB')}`;
}
/* ---------- 升降級與去向 ---------- */
function cpbl2RetentionProfile(o){
  const st=S.lastSt||{},abilityLow=o<LV.CPBL2.min;
  if(S.pos==='P'){
    const era=st.IP>0?st.ER*9/st.IP:99,whip=st.IP>0?(st.H+st.BB)/st.IP:99,load=st.IP>=(isSP()?36:22),poor=!load||era>5.40||whip>1.65,strong=load&&(era<=4.35||whip<=1.42),severe=abilityLow&&(st.IP<15||era>=7||whip>=1.90);
    return {poor,strong,severe,abilityLow,line:`${st.G||0} 場｜${fmtIP(st.IP||0)} 局｜ERA ${era.toFixed(2)}｜WHIP ${whip.toFixed(2)}`};
  }
  const obp=st.PA?(st.H+st.BB)/st.PA:0,ops=obp+slgOf(st),load=(st.PA||0)>=120,poor=!load||ops<.620,strong=load&&(ops>=.700||(st.SB||0)>=15||(st.DEF||0)>=7),severe=abilityLow&&((st.PA||0)<70||ops<.520);
  return {poor,strong,severe,abilityLow,line:`${st.G||0} 場｜${st.PA||0} 打席｜OPS ${ops.toFixed(3).replace(/^0/,'')}｜盜壘 ${st.SB||0}｜守備貢獻 ${(st.DEF||0)>=0?'+':''}${st.DEF||0}`};
}
function joinIndustrialAfterRelease(){
  buyoutRemaining();S.stage='AMA';S.formerPro=true;S.stageYr=1;S.team=pick(['台電','合庫','安永鮮物','綺麗珊瑚']);S.org=null;S.orgTeam=null;S.lv=null;S.ct=null;S.faElig=false;S.minorStruggle=0;
  card('info','轉往業餘成棒',`${S.name} 加入 <b class="hl">${S.team}</b>，保留比賽與訓練環境。這不是自動回職棒；必須靠成績重新贏得測試機會。`);advance();
}
function cpbl2ReleaseFlow(o,profile){
  const oldTeam=S.orgTeam,agePenalty=Math.max(0,S.age-24)*3,interest=clamp(Math.round(43+ratingGap(o,LV.CPBL2.min)*5+contractPerformanceD()*4-agePenalty-(profile.severe?18:0)),8,72),pool=CPBL_TEAMS.filter(t=>t!==oldTeam),offers=chance(interest)?randomSubset(pool,interest>=55?2:1):[];
  card('bad','球季結束｜中職二軍釋出通知',`年度成績與季末會報結算後，${oldTeam} 決定不再保留你的合約與下季二軍名額。<div class="statline">本季 ${profile.line}｜連續留用警報 ${S.minorStruggle} 年｜他隊接手意願 ${interest}%</div>`);
  const opts=offers.map(team=>({t:`接受 ${team} 的二軍測試合約`,main:true,modal:true,s:'1 年非全保障合約｜重新從二軍競爭，原隊已正式釋出',f:()=>{buyoutRemaining();S.minorStruggle=0;signTo('CPBL','CPBL2',team,1,.82);advance();}}));
  if(S.age<36)opts.push({t:'離開職棒，轉往業餘成棒',main:!offers.length,modal:true,s:'收入與曝光下降｜保留比賽、工作與日後測試機會',f:joinIndustrialAfterRelease});
  opts.push({t:'結束球員生涯',warn:true,modal:true,s:'不再尋找下一份球員合約',f:()=>endGame(`${S.year} 年遭 ${oldTeam} 釋出後，決定結束球員生涯。`)});
  choose(`球季結束｜二軍名單重整・${oldTeam} 正式釋出`,opts);
}
function cpbl2RetentionAudit(o){
  if(S.lv!=='CPBL2')return false;
  const retain=()=>S.ct&&S.ct.yrs<=0?resolveContractExpiry(o):advance();
  if(S.seasonFactor<.55){card('info','二軍留用評估暫緩','本季主要問題是傷病，球團不把這一年直接算成打不起來；原本的留用警報不會增加。合約年仍照常消耗。');retain();return true;}
  const p=cpbl2RetentionProfile(o),need=S.age<=21?3:S.age<=31?2:1;
  if(!p.poor){if(p.strong)S.minorStruggle=0;if(p.abilityLow){card('info','實績保住二軍名額',`體能評估低於二軍門檻，但實際成績讓球團願意再觀察一年。<div class="statline">${p.line}｜能力仍需提升，否則下一次低潮會重新進入留用審查。</div>`);retain();return true;}return false;}
  S.minorStruggle=(S.minorStruggle||0)+1;
  if((p.severe&&S.age>21)||S.minorStruggle>=need){cpbl2ReleaseFlow(o,p);return true;}
  card('bad','球季結束｜中職二軍留用警報',`年度成績結算後，你的出賽角色或實際成績未達二軍留用標準，球團把你放進季末名單觀察。<div class="statline">${p.line}｜警報 ${S.minorStruggle}/${need}；再一個不合格球季可能直接不續約。合約年照常消耗。</div>`);retain();return true;
}
function actualRosterVerdict(st){
  if(!st||S.seasonFactor<.5)return {awful:false,line:''};
  if(S.pos==='P'){
    const era=st.IP>0?st.ER*9/st.IP:99,whip=st.IP>0?(st.H+st.BB)/st.IP:99;
    const sample=isSP()?st.IP>=25:st.G>=20&&st.IP>=15;
    const awful=sample&&(era>=7.00||whip>=1.90);
    return {awful,line:`${st.G} G｜${fmtIP(st.IP)} IP｜ERA ${era.toFixed(2)}｜WHIP ${whip.toFixed(2)}`};
  }
  const avg=st.AB?st.H/st.AB:(Number(st.avg)||0),obp=st.PA?(st.H+st.BB)/st.PA:0,ops=obp+slgOf(st);
  const awful=(st.PA>=50&&ops<.400)||(st.PA>=150&&ops<.560);
  return {awful,line:`${st.G} G｜${st.PA} PA｜AVG ${avg.toFixed(3).replace(/^0/,'')}｜OPS ${ops.toFixed(3).replace(/^0/,'')}`};
}
function firstTeamPerformanceReview(st){
  const firstTeam=!!(LV[S.lv]&&LV[S.lv].top),empty={firstTeam,eligible:false,needs:false,sample:false,poor:false,borderline:false,finalChance:false,severe:false,severity:0,line:'',standard:'',team:teamRosterDecisionContext(false)};
  if(!firstTeam||!st||S.seasonFactor<.5)return empty;
  const limits={
    CPBL1:{era:5.35,whip:1.65,ops:.610},
    NPB1:{era:4.65,whip:1.50,ops:.590},
    MLB:{era:5.20,whip:1.58,ops:.620}
  }[S.lv]||{era:5.10,whip:1.58,ops:.610};
  let sample=false,poor=false,borderline=false,severity=0,line='',standard='';
  if(S.pos==='P'){
    const era=st.IP>0?st.ER*9/st.IP:99,whip=st.IP>0?(st.H+st.BB)/st.IP:99,starter=(st.role||S.role)==='SP';
    sample=starter?st.IP>=45:st.G>=20&&st.IP>=15;
    poor=sample&&(era>=limits.era||whip>=limits.whip);
    borderline=sample&&(era>=limits.era-.55||whip>=limits.whip-.12);
    severity=Math.max(0,(era-limits.era)/.35,(whip-limits.whip)/.09);
    line=`${st.G} G｜${fmtIP(st.IP)} IP｜ERA ${era.toFixed(2)}｜WHIP ${whip.toFixed(2)}`;
    standard=`一軍留用線｜ERA ${limits.era.toFixed(2)} 以下、WHIP ${limits.whip.toFixed(2)} 以下`;
  }else{
    const avg=st.AB?st.H/st.AB:(st.avg||0),obp=st.PA?(st.H+st.BB)/st.PA:0,ops=obp+slgOf(st);
    sample=st.PA>=70;poor=sample&&ops<limits.ops;borderline=sample&&ops<limits.ops+.055;
    severity=Math.max(0,(limits.ops-ops)/.035);
    line=`${st.G} G｜${st.PA} PA｜AVG ${avg.toFixed(3).replace(/^0/,'')}｜OPS ${ops.toFixed(3).replace(/^0/,'')}`;
    standard=`一軍留用線｜OPS ${limits.ops.toFixed(3).replace(/^0/,'')} 以上`;
  }
  const finalChance=S.lastChanceYear===S.year;
  if(finalChance&&borderline)poor=true;
  const team=teamRosterDecisionContext(poor);
  if(finalChance&&borderline){team.pressure+=18;team.label+='・去年已給最後觀察期';}
  const severe=actualRosterVerdict(st).awful,needs=poor||(borderline&&team.pressure>=8);
  return {firstTeam,eligible:poor,needs,sample,poor,borderline,finalChance,severe,severity,line,standard,team};
}
function teamRosterDecisionContext(poor){
  const rep=S.currentStandings,mine=rep&&rep.mine;if(!mine)return {pressure:0,label:'球隊戰績資料不足',record:'未建立年度排名'};
  const group=(rep.groups||[]).find(g=>(g.rows||[]).some(r=>r.team===S.orgTeam)),size=group&&group.rows?group.rows.length:6,champ=rep.champion===S.orgTeam,contender=champ||mine.playoff||mine.pct>=.54||mine.rank<=Math.max(2,Math.ceil(size*.35)),rebuild=mine.pct<=.45||mine.rank>=Math.max(4,Math.ceil(size*.75));let pressure=0,label='中段球隊・正常名單競爭';
  if(champ){pressure=poor?12:-6;label=poor?'冠軍隊・低潮球員容錯很低':'冠軍隊・既有角色獲得留用信用';}
  else if(contender){pressure=poor?10:-3;label=poor?'爭冠隊・補強壓力提高':'爭冠隊・團隊分工提供小幅保護';}
  else if(rebuild){pressure=S.age<=26?-12:S.age>=30?12:2;label=S.age<=26?'重建隊・年輕球員獲得較長觀察期':S.age>=30?'重建隊・中高齡低效球員優先清理':'重建隊・全隊進入名單重整';}
  return {pressure,label,record:`${mine.W}-${mine.L}｜勝率 ${mine.pct.toFixed(3).replace(/^0/,'')}｜${mine.group||group&&group.name||'聯盟'}第 ${mine.rank} 名｜${rep.minePostseason||'未進季後賽'}`};
}
function postSeasonReviewProfile(st){
  const firstTeamReview=firstTeamPerformanceReview(st);
  if(firstTeamReview.firstTeam)return firstTeamReview;
  if(!st||S.seasonFactor<.5)return {needs:false};let sample=false,poor=false,borderline=false,line='';
  if(S.pos==='P'){
    const era=st.IP>0?st.ER*9/st.IP:99,whip=st.IP>0?(st.H+st.BB)/st.IP:99,top=!!(LV[S.lv]&&LV[S.lv].top);sample=isSP()?st.IP>=35:st.G>=18&&st.IP>=14;poor=sample&&(era>=(top?5.10:5.55)||whip>=(top?1.60:1.72)||(st.d||0)<=-5);borderline=sample&&(era>=4.55||whip>=1.48||(st.d||0)<=-3);line=`${st.G} G｜${fmtIP(st.IP)} IP｜ERA ${era.toFixed(2)}｜WHIP ${whip.toFixed(2)}`;
  }else{
    const obp=st.PA?(st.H+st.BB)/st.PA:0,ops=obp+slgOf(st),top=!!(LV[S.lv]&&LV[S.lv].top);sample=st.PA>=70;poor=sample&&(ops<(top?.610:.575)||(st.d||0)<=-5);borderline=sample&&(ops<(top?.680:.640)||(st.d||0)<=-3);line=`${st.G} G｜${st.PA} PA｜AVG ${st.avg.toFixed(3).replace(/^0/,'')}｜OPS ${ops.toFixed(3).replace(/^0/,'')}`;
  }
  let team=teamRosterDecisionContext(poor),needs=poor||(borderline&&team.pressure>=8),finalChance=S.lastChanceYear===S.year;if(finalChance&&borderline){poor=true;needs=true;team=teamRosterDecisionContext(true);team.pressure+=18;team.label+='・去年已給最後觀察期';}
  return {needs,sample,poor,borderline,finalChance,severe:actualRosterVerdict(st).awful,line,team};
}
function postSeasonRosterMeeting(done){
  const p=postSeasonReviewProfile(S.lastSt);if(!p.needs||S._postSeasonMeetingYear===S.year){done();return;}S._postSeasonMeetingYear=S.year;
  const finish=(response,adj,tone,title,text)=>{S.rosterMeeting={year:S.year,response,adj,pressure:p.team.pressure,record:p.team.record,severe:p.severe};card(tone,title,`${text}<div class="statline">個人成績｜${p.line}<br>球隊戰績｜${p.team.record}<br>球團方向｜${p.team.label}</div>`);board(2);continueAction('結束季後約談，繼續 ▸',done);};
  const opts=[
    {t:'接受角色縮減或下放安排',main:true,modal:true,s:'團隊關係 +1｜球團保留調整名單的權利',f:()=>{S.chemistry=clamp((S.chemistry||0)+1,-5,5);finish('accept',8,'info','季後約談｜接受球團方案','你承認本季表現沒有守住角色，願意從較低順位重新競爭。這能保住關係，但不能阻止球團依戰力決定名單。');}},
    {t:'請經紀人探索交易或轉隊',risk:true,modal:true,s:'交易熱度大增｜團隊關係 −2；不保證有球隊接手',f:()=>{S.tradeHeat=clamp((S.tradeHeat||0)+18,0,60);S.chemistry=clamp((S.chemistry||0)-2,-5,5);finish('trade',4,'bad','季後約談｜要求換環境','你公開表示希望尋找更適合的出賽機會。市場會收到訊號，但差成績也可能讓報價直接消失。');}}
  ];
  if(!p.finalChance&&!p.severe)opts.splice(1,0,{t:'要求保留原層級，明年春訓再競爭',risk:true,modal:true,s:'本次暫緩下放｜下季成為最後觀察年；傷病風險 +2%',f:()=>{S.lastChanceYear=S.year+1;S.injNext+=2;finish('compete',-40,'info','季後約談｜取得最後觀察期','球團同意把最終決定延到明年春訓。你暫時守住層級，但下一季若再度低迷，名單壓力會大幅提高。');}});
  choose(`季後球團約談｜${seasonTeamInfo().name}｜${p.team.record}`,opts);
}
const SERVICE_DAY_TARGET={CPBL:125,NPB:145,MiLB:172};
function professionalServiceCredits(){
  const parts=(S._seasonServiceParts||[]).filter(p=>p&&p.lv&&LV[p.lv]&&LV[p.lv].top),credits={};
  parts.forEach(p=>{const org=p.org||S.org;credits[org]=(credits[org]||0)+clamp(Number(p.calendarShare)||0,0,1);});
  if(!parts.length&&S.stage==='PRO'&&S.lv&&LV[S.lv]&&LV[S.lv].top)credits[S.org]=1; /* 傷兵名單／復健年仍隨一軍合約累積登錄時間。 */
  if(credits.CPBL&&S.lastSt){const st=S.lastSt,games=(LV[S.lv]&&LV[S.lv].g)||120,full=S.pos==='P'?(st.IP||0)>=games*2/3:(st.G||0)>=games*2/3;if(full)credits.CPBL=1;}
  return credits;
}
function settleProfessionalSeasonClock(){
  if(S.stage!=='PRO'||S._proClockYear===S.year)return;
  S._proClockYear=S.year;
  S.proYears=(S.proYears||0)+1;
  if(S.org==='NPB')S.npbYears=(S.npbYears||0)+1;
  S.overseasDepth=S.overseasDepth||{npb2:0,milb:0};
  S.overseasDepth.npb2=S.org==='NPB'&&S.lv==='NPB2'?(S.overseasDepth.npb2||0)+1:0;
  S.overseasDepth.milb=S.org==='MiLB'&&S.lv!=='MLB'?(S.overseasDepth.milb||0)+1:0;
  const credits=professionalServiceCredits();S.service=S.service||{CPBL:0,NPB:0,MiLB:0};S.serviceDays=S.serviceDays||{};Object.keys(SERVICE_DAY_TARGET).forEach(org=>{const target=SERVICE_DAY_TARGET[org];if(!Number.isFinite(S.serviceDays[org]))S.serviceDays[org]=Math.round((Number(S.service[org])||0)*target);const add=Math.round((credits[org]||0)*target);S.serviceDays[org]+=add;S.service[org]=+(S.serviceDays[org]/target).toFixed(2);});S.svcOrg=S.org;S.svc=S.service[S.org]||0;
  if(S.svc>=faServiceRequirement(S.org,S.org==='NPB'))S.faElig=true;
  const topShare=credits[S.org]||0;
  if(topShare>0){
    if(S.org==='NPB'&&S.service.NPB>=8&&!S.npbLocalNotified){S.npbLocalNotified=true;card('gold','日職登錄身分改變','一軍登錄年資折算達到 8 季。從下一次名單競爭開始，你不再占用洋將名額，正式以 <b class="hl">視同本土球員</b> 身分接受球團評估。');board(1);}
    S.teamYears=+((S.teamYears||0)+topShare).toFixed(2);
    if(!S.traits.goldcloth&&S.orgTeam==='台中猛瑪'&&(S.teamTally.CPBL&&S.teamTally.CPBL['台中猛瑪']>=10)){S.traits.goldcloth=true;card('gold','隱藏屬性解鎖：黃金聖衣','效力 台中猛瑪 滿十年，你已是這支球隊的象徵。披上那件黃金戰袍，你就是主場的信仰。');board(1);}
    if(!S.traits.franchise&&S.teamYears>=7&&S.champThisTeam&&S.champTeam===S.orgTeam){S.traits.franchise=true;card('gold','隱藏屬性解鎖：神主牌','這座城市的球迷看著你長大。球團高層很清楚，放你走球迷會把主場拆了——<b class="hl">母隊續約年薪係數固定 ≥×1.2，引退評價加成</b>。');}
    if(!S.traits.mrteam&&S.teamYears>=15&&(S.lastD||0)>=0){S.traits.mrteam=true;S.mrTeamName=S.orgTeam;const nick=teamNick(S.orgTeam);card('gold','隱藏稱號：'+nick+'先生',`十五個年頭，同一件球衣。球迷不再喊你的名字，他們喊你「<b class="hl">${nick}先生</b>」——你就是這支球隊的代名詞。`);board(1);}
  }
  if(!S.ct)S.ct={yrs:2,signedYears:2,mult:1,annual:Math.round(salaryFor(S.lv,contractPerformanceD())*dpMult()),guaranteed:LV[S.lv]&&LV[S.lv].top?1:.65};
  S.ct.yrs=Math.max(0,(Number(S.ct.yrs)||0)-1);
}
function resolveContractExpiry(o){
  const top=LV[S.lv]&&LV[S.lv].top,d=contractPerformanceD();
  if(S.ct&&S.ct.option==='球隊選擇權'&&!S.ct.optionUsed){
    const awful=actualRosterVerdict(S.lastSt).awful,exerciseP=awful?0:clamp(Math.round(54+d*6-Math.max(0,S.age-32)*5-(S.seasonFactor<.55?12:0)),8,92);S.ct.optionUsed=true;
    if(chance(exerciseP)){S.ct.yrs=1;S.ct.signedYears=(S.ct.signedYears||0)+1;card('info','球隊執行選擇權',`${S.teamName()} 依本季表現與健康評估執行一年球隊選擇權，年薪維持 ${fmtContractMoney(S.ct.annual,S.org)}。`);advance();return;}
    card('bad','球隊拒絕執行選擇權',`${S.teamName()} 放棄下一年的球隊選擇權，你的原合約正式結束，立即進入自由市場。`);S.faElig=true;faFlow(o);return;
  }
  if(top){
    const roster=actualRosterVerdict(S.lastSt);if(roster.awful){card('bad','球季結束｜不續約／非戰力名單',`原合約到期，球團依實際成績決定不提出下一份合約。<div class="statline">${roster.line}</div>`);outOfOrg(o,{cause:'contract',skipDevelopment:true});return;}
    if(S.faElig){faFlow(o);return;}
    if(S.org==='NPB'&&npbRosterStatus().foreign&&(S.lastD||0)<1&&chance(48)){card('bad','洋將合約未獲保留','合約到期後，球團把有限的洋將名額留給其他即戰力。你成為自由契約球員，可以尋找日職其他球團、返台或轉往其他聯盟。');outOfOrg(o,{cause:'contract',skipDevelopment:true});return;}
    const req=faServiceRequirement(S.org,S.org==='NPB');termChoice(o,d,`球團續約談判｜${S.teamName()}｜服務 ${S.svc}/${req} 季`,(y,m,option)=>{
      S.ct={yrs:y,signedYears:y,mult:m,annual:Math.round(salaryFor(S.lv,d)*m*dpMult()),guaranteed:1,extOffered:false,option:option||null};
      card('info','續約談判完成',`你尚未取得自由球員資格，但仍透過經紀人談定年限與薪資。與 <b class="hl">${S.teamName()}</b> 簽下 ${y} 年合約｜年薪 ${fmtContractMoney(S.ct.annual,S.org)}｜總值 ${fmtContractMoney(S.ct.annual*y,S.org)}。`);board(1);advance();
    });return;
  }
  const lowerVerdict=actualRosterVerdict(S.lastSt),depth=S.org==='NPB'?(S.overseasDepth&&S.overseasDepth.npb2||0):(S.org==='MiLB'?(S.overseasDepth&&S.overseasDepth.milb||0):S.minorStruggle||0),retainP=clamp(Math.round(68+contractPerformanceD()*7-Math.max(0,S.age-27)*3-Math.max(0,depth-2)*5),8,92);
  if((lowerVerdict.awful||contractPerformanceD()<=-3.5)&&!chance(retainP)){
    if(tryYouthDevelopmentRetention(o,{cause:'performance'}))return;
    card('bad','發展合約到期',`${S.orgTeam} 不再保留下季名額。<div class="statline">${lowerVerdict.line}</div>`);outOfOrg(o,{cause:'contract',skipDevelopment:true});return;
  }
  termChoice(o,d,`發展合約談判｜${S.teamName()}｜${LV[S.lv].n}`,(y,m,option)=>{
    S.ct={yrs:y,signedYears:y,mult:m,annual:Math.round(salaryFor(S.lv,d)*m*dpMult()),guaranteed:.65,option:option||null};
    card('info','發展合約談成',`經紀人與球團完成逐項協商：${y} 年｜年薪 ${fmtContractMoney(S.ct.annual,S.org)}｜保障 65%。二軍／小聯盟名額仍會逐季依實際成績審查。`);advance();
  });
}
function movement(){
  const o=ovr();
  if(S.stage==='HS'){ if(S.stageYr<3)advance(); else pathChoiceHS(); return; }
  if(S.stage==='U'){ if(S.stageYr<4)advance(); else pathChoiceU4(); return; }
  if(S.stage==='AMA'){
    if(S.formerPro){
      if(S.age>=38){endGame(`${S.year} 年完成最後一個業餘成棒球季，正式結束球員生涯。`);return;}
      const d=(S.lastAmateurSt&&S.lastAmateurSt.d)||0,p=clamp(Math.round(34+ratingGap(o,LV.CPBL2.min)*6+d*4-Math.max(0,S.age-29)*3),10,78),opts=[];
      if(o>=LV.CPBL2.min-3)opts.push({t:'參加中職球團季後測試',risk:true,probability:p,modal:true,s:`重返職棒機會 ${p}%｜能力、業餘實績與年齡共同評估`,f:()=>animatedRoll({sides:100,title:'中職季後測試',probability:p,modifiers:[`業餘實績 ${d>=0?'+':''}${d.toFixed(1)}`,`目前能力 ${o}/99`,`年齡 ${S.age}`]}).then(r=>{if(r.success){S.stage='PRO';S.minorStruggle=0;signTo('CPBL','CPBL2',pick(CPBL_TEAMS),1,.78);card('gold','重返職棒',`${S.name} 靠測試表現拿到一年二軍合約；過去的資歷不保證位置，仍要重新競爭。`);advance();}else{card('bad','測試未獲合約','球團肯定部分工具，但認為目前不足以占用二軍名額。你留在業餘球隊再拚一年。');continueAction('接受測試結果，繼續下一年 ▸',advance);}})});
      opts.push({t:'留在業餘成棒繼續打',main:true,modal:true,s:'保留工作與比賽環境｜明年仍可能爭取測試，但年齡會影響機會',f:advance},{t:'結束球員生涯',warn:true,modal:true,f:()=>endGame(`${S.year} 年在 ${S.team} 結束最後一個球季。`)});choose('前職棒球員的下一步',opts);return;
    }
    if(S.age>=26){ endGame('選秀多年落榜，'+S.year+' 年結束球員身分，轉任基層教練。'); return; }
    choose('業餘年度結束',[
      {t:'再次投入中職選秀',main:true,f:()=>runDraft(false,()=>advance())},
      {t:'高掛球鞋',warn:true,f:()=>endGame('在業餘球隊劃下句點。')}]);
    return;
  }
  /* 職業：先結算服務年資與合約年，傷病／二軍觀察都不能讓合約時鐘暫停。 */
  settleProfessionalSeasonClock();
  if(S.farewellYear===S.year){voluntaryRetirementSettlement();daibaFarewell(()=>endGame(`${S.year} 年告別球季結束，正式高掛球鞋。`));return;}
  if(S.pendingTrade){applyPendingTrade();finishRosterMove(o);return;}
  if(S.skipMid){const afterRehab=()=>S.ct&&S.ct.yrs<=0?resolveContractExpiry(o):advance();if(maybeTaiwanReturnInquiry(o,afterRehab))return;afterRehab();return;} /* 復健年不做升降，但合約與年資已正常結算 */
  if(cpbl2RetentionAudit(o))return;
  const path=PATHS[S.org], idx=path.indexOf(S.lv);
  let minReq=LV[S.lv].min;
  if(S.org==='NPB'&&S.npbYears>=8){ minReq-=4; }
  const perf=(S.seasonFactor>=0.5)?(S.lastD||0):null; /* 傷缺季不看成績 */
  const rosterVerdict=actualRosterVerdict(S.lastSt);
  const firstTeamReview=firstTeamPerformanceReview(S.lastSt);
  const meeting=S.rosterMeeting&&S.rosterMeeting.year===S.year?S.rosterMeeting:null,teamDecision=firstTeamReview.firstTeam?firstTeamReview.team:teamRosterDecisionContext(perf!==null&&perf<=-4),rosterPressure=(meeting?meeting.pressure:teamDecision.pressure)+(meeting?meeting.adj:0),decisionRecord=meeting?meeting.record:teamDecision.record;
  /* 得獎保護傘:當季拿過個人獎項(MVP/王/最佳投手,不含明星賽)→絕不下放/釋出 */
  const wonAward = S.honors.some(x=>x.startsWith(String(S.year))&&/王|MVP|賽揚|澤村|最佳投手|金手套/.test(x)&&!/明星賽/.test(x));
  /* Fix C:實際成績達標保護傘——用當季真實數據(不看能力 d),打得好就不下放 */
  let goodReal=false;
  { const st=S.lastSt;
    if(st&&S.seasonFactor>=0.5){
      const foreign=S.lv==='NPB1'&&npbRosterStatus().foreign;
      if(S.pos==='P'){
        const era=st.IP>0?st.ER*9/st.IP:99, whip=st.IP>0?(st.H+st.BB)/st.IP:99;
        /* 出賽規模門檻:先發 80 局、後援 30 局,達不到代表可能有傷/撐不起位置→不保護 */
        const ipOK = isSP()? st.IP>=80 : st.IP>=30;
        /* 投手:規模達標 且 (ERA/WHIP 一線 或 救援/中繼產能) */
        if(ipOK && (foreign?(era<=3.55||whip<=1.25||(st.SV||0)>=22||(st.HLD||0)>=22):(era<=4.20||whip<=1.35||(st.SV||0)>=15||(st.HLD||0)>=15)))goodReal=true;
      }else{
        const obp=st.PA>0?(st.H+st.BB)/st.PA:0, slg=slgOf(st), ops=obp+slg;
        /* 出賽規模門檻:250 打席,達不到代表可能有傷/撐不起主力→不保護 */
        const paOK = st.PA>=250;
        /* 野手:規模達標 且 (OPS 主力水準 或 雙位數轟/盜/打點達標) */
        const gloveValue=!st._dh&&S.dpos!=='DH'&&(st.defG||0)>=LV[S.lv].g*.58&&(st.DEF||0)>=6;
        if(paOK && (foreign?(ops>=.790||st.HR>=20||st.SB>=25||st.RBI>=70||gloveValue):(ops>=0.720||st.HR>=12||st.SB>=15||st.RBI>=(LV[S.lv].g>=150?70:55)||gloveValue)))goodReal=true;
      }
    }
  }
  if(S.developmentWatch&&S.developmentWatch.org===S.org&&S.developmentWatch.team===S.orgTeam&&(goodReal||(perf!==null&&perf>=0))){S.developmentWatch=null;}
  if(rosterVerdict.awful){
    const hasLowerHome=path.slice(0,idx).some(lv=>o>=LV[lv].min);
    if(!hasLowerHome&&tryYouthDevelopmentRetention(o,{cause:'performance'}))return;
    card('bad','球季結束｜名單位置不保',`球團以實際帳面成績做出決定；外部狀態再好，也不能掩蓋已經失去競爭力的球季。<div class="statline">${rosterVerdict.line}｜立即進入降級、DFA 或釋出程序。</div>`);
    handleDemotion(o,path,idx);return;
  }
  if(wonAward||goodReal){ /* 拿獎 或 帳面成績達標 → 球團不會處理掉 */ }
  else if(firstTeamReview.eligible){
    if(meeting&&meeting.response==='compete'&&!meeting.severe&&!firstTeamReview.finalChance){
      card('info','一軍最後觀察期生效',`球團履行季後約談承諾，暫緩這次下放；你保住的不是永久席位，而是明年春訓重新競爭的機會。<div class="statline">所屬球隊｜${seasonTeamInfo().name}<br>本季一軍成績｜${firstTeamReview.line}<br>${firstTeamReview.standard}<br>球隊戰績｜${decisionRecord}</div>`);
    }else{
      const agePressure=S.age>=34?8:S.age>=31?4:S.age<=24?-5:0;
      const demoteP=clamp(Math.round(64+firstTeamReview.severity*9+rosterPressure+agePressure),35,96);
      const target=idx>0?LV[path[idx-1]].n:'組織外名單';
      if(chance(demoteP)){
        card('bad',`一軍名單調整｜下放 ${target}`,`球團依本季<b class="dn">實際一軍成績</b>啟動名單調整；能力值與過去名氣不能保證一軍位置。<div class="statline">所屬球隊｜${seasonTeamInfo().name}<br>本季一軍成績｜${firstTeamReview.line}<br>${firstTeamReview.standard}<br>球隊戰績｜${decisionRecord}<br>本次下放風險｜${demoteP}% → 球團決定下放</div>`);
        handleDemotion(o,path,idx);return;
      }
      S.lastChanceYear=S.year+1;
      card('info','一軍名單邊緣留用',`本季成績已低於一軍留用標準，但球團這次只縮減角色，保留到明年春訓；若下一季仍未改善，名單壓力會大幅提高。<div class="statline">所屬球隊｜${seasonTeamInfo().name}<br>本季一軍成績｜${firstTeamReview.line}<br>${firstTeamReview.standard}<br>球隊戰績｜${decisionRecord}<br>本次下放風險｜${demoteP}% → 暫時留用</div>`);
    }
  }
  else if(S.lv==='NPB1'&&npbRosterStatus().foreign&&(perf===null||perf<1)&&chance(clamp(58+rosterPressure,18,92))){
    card('bad','一軍外籍登錄競爭',`你的登錄身分仍是外籍球員；目前一軍登錄年資 ${npbRosterStatus().years} 季。球團要求占用一軍外籍登錄名額的球員立即貢獻，本季實績未達續留一軍標準。<div class="statline">球隊戰績｜${decisionRecord}<br>名單方向｜${teamDecision.label}</div>`);
    handleDemotion(o,path,idx);return;
  }
  else if(o<minReq){
    if(perf!==null&&perf>=0){ /* 帳面成績夠好,球團續留觀察 */
      card('info','球團評估',`體能檢測數字亮紅燈，但你用<b class="hl">實際成績</b>說話——本季表現達聯盟水準，球團決定續留一線觀察。<div class="statline">球隊戰績｜${decisionRecord}</div>`);
    }else if(teamDecision.pressure<=-8&&S.age<=26&&!rosterVerdict.awful){
      card('info','重建球隊延長觀察',`能力檢測尚未達標，但球團正在重建，願意再給年輕球員一季發展時間。<div class="statline">球隊戰績｜${decisionRecord}<br>個人成績｜${rosterVerdict.line}</div>`);
    }else{ handleDemotion(o,path,idx); return; }
  }else if(perf!==null&&perf<=-4){ /* 能力還在但成績低迷，球隊方向與約談選擇共同決定。 */
    if(meeting&&meeting.response==='compete'&&!meeting.severe){
      card('info','最後觀察期生效',`球團履行季後約談承諾，暫緩本次下放；明年春訓是最後一次守住原層級的機會。<div class="statline">個人成績｜${rosterVerdict.line}<br>球隊戰績｜${decisionRecord}</div>`);
    }else{
      const demoteP=clamp(Math.round(34+Math.max(0,-perf-4)*9+rosterPressure),10,94);
      if(chance(demoteP)){const hasLowerHome=path.slice(0,idx).some(lv=>o>=LV[lv].min);if(!hasLowerHome&&tryYouthDevelopmentRetention(o,{cause:'performance'}))return;card('bad','球團名單決策',`帳面成績、年齡與球隊方向綜合後，球團決定調整你的層級。<div class="statline">個人成績｜${rosterVerdict.line}<br>球隊戰績｜${decisionRecord}<br>下放／釋出機會｜${demoteP}%</div>`);handleDemotion(o,path,idx);return;}
      card('info','名單邊緣留用',`本季低潮已壓縮下一季角色，但球團這次仍保留你。<div class="statline">個人成績｜${rosterVerdict.line}<br>球隊戰績｜${decisionRecord}<br>本次名單壓力｜${demoteP}%</div>`);
    }
  }
  /* 升級還要競爭有限名額：能力與實績都會提高機會，但達到門檻不等於自動升級。 */
  if(idx<path.length-1){ const nx=path[idx+1];
    const review=endSeasonPromotionProfile(S.lastSt,S.lv,nx,o),margin=review.margin,topPenalty=LV[nx].top?8:0;
    const foreignSlotPenalty=S.org==='NPB'&&npbRosterStatus().foreign?12:0;
    const rosterP=clamp(Math.round(34+margin*7+review.perf.score*7+(review.perf.elite?12:0)-topPenalty-foreignSlotPenalty),8,88);
    if(review.eligible&&chance(rosterP)){
      let to=nx;
      if(idx<path.length-2){ const nx2=path[idx+2];
        if(!review.comeback&&review.perf.elite&&ratingGap(o,LV[nx2].min)>=2&&(S.lastD||0)>=4)to=nx2; }
      const from=S.lv;S.lv=to;S.lastDemotion=null;if(to==='MLB')mlbAddToFortyMan('季末選入 40 人名單');card('good',`升上${LV[to].n}`,`${S.orgTeam}｜${LV[from].n} → <b class="hl">${LV[to].n}</b>${to!==nx?'｜連跳兩級':''}`); board(2);
      S._endSeasonPromotion={from,to};
      if(S.traits.yips){ removeTrait('yips','失憶症'); card('good','走出陰影','重回上一層舞台，你終於找回了節奏——<b class="hl">失憶症痊癒</b>。'); }
    }else if(margin>=0&&!review.alreadyPromoted){
      const reason=review.comeback&&!review.perf.elite?'下放後首季需打出明顯優勢':!review.perf.strong?'本季實績未達升格線':'名單暫無空缺';
      card('info','續留原層級',`${S.orgTeam}｜${LV[S.lv].n}｜${reason}`);
    }
  }
  if(S._endSeasonPromotion){const p=S._endSeasonPromotion;S._endSeasonPromotion=null;achievementFX({kind:p.to==='MLB'?'mlb':'promotion',kicker:p.to==='MLB'?'生涯最高舞台':'球團正式升格',title:p.to==='MLB'?'升上大聯盟！':`升上${LV[p.to].n}！`,subtitle:`${S.orgTeam}｜${LV[p.from].n} → ${LV[p.to].n}`,detail:`本季實績：${rosterVerdict.line}`,result:`${LV[p.to].n}名單正式登錄`,note:'下一球季將以新層級身分競爭。'}).then(()=>contractContinuation(o));return;}
  if(S.org==='MiLB'&&S.lv!=='MLB'&&mlbRosterState().forty){mlbReserveNextSeason(o,()=>contractContinuation(o));return;}
  contractContinuation(o);
}
function qualifiesIronSeason(st,lv){
  const ironIP=lv==='MLB'?120:lv==='NPB1'?100:lv==='CPBL1'?85:80,games=(LV[lv]&&LV[lv].g)||0;
  return S.seasonFactor>=.95&&(S.pos==='P'?(isSP()?(st.IP||0)>=ironIP:(st.G||0)>=42):(st.G||0)>=games*.8);
}
function contractContinuation(o){
  /* 合約到期仍先完成本季的升格、下放與名單審查，再依審查後層級談下一份合約。 */
  if(S.ct&&S.ct.yrs<=0){if(maybeTaiwanReturnInquiry(o,()=>resolveContractExpiry(o)))return;resolveContractExpiry(o);return;}
  if(maybeTaiwanReturnInquiry(o,()=>contractContinuation(o)))return;
  if(S.stage==='PRO'&&S.org!=='CPBL'&&S.age>=32&&S.ct&&S.ct.yrs>0&&S._contractDirectionYear!==S.year){
    S._contractDirectionYear=S.year;
    choose(`合約與生涯方向｜${S.teamName()}｜合約尚餘 ${S.ct.yrs} 年`,[
      {t:`留在 ${S.teamName()} 履行合約`,main:true,s:'不改變保障薪資與球隊身分',f:()=>contractContinuation(o)},
      {t:'請經紀人與球團談買斷，爭取回台灣',risk:true,modal:true,s:'球團可以拒絕；談成後仍要另外和中職球隊談新約',f:()=>returnTaiwanBuyoutFlow(o,()=>contractContinuation(o))}
    ]);return;
  }
  if(LV[S.lv].top&&S.ct.option&&/球員跳脫權/.test(S.ct.option)&&!S.ct.optionUsed&&(S.ct.signedYears||S.ct.yrs)-S.ct.yrs>=3&&S.ct.yrs>0){
    choose(`球員跳脫權｜合約尚餘 ${S.ct.yrs} 年`,[
      {t:'行使跳脫權，立即測試市場',warn:true,s:'放棄剩餘保障薪資；進入多隊自由市場',f:()=>{S.ct.optionUsed=true;S.faElig=true;card('info','行使球員跳脫權',`${S.name} 放棄剩餘 ${S.ct.yrs} 年合約，重新進入自由市場。`);faMarket(o,contractPerformanceD());}},
      {t:'不跳脫，留在原合約',main:true,s:`保留剩餘 ${S.ct.yrs} 年保障`,f:()=>{S.ct.optionUsed=true;card('info','留在原合約',`${S.name} 選擇保留現有保障，繼續效力 ${S.teamName()}。`);crossOffers(o);}}
    ]);return;
  }
  /* 母隊延長/換約時機:多年約跑到倒數第二年、或最後一張約剩1年,可談延長 */
  if(S.ct.yrs===1&&LV[S.lv].top&&!S.ct.extOffered&&S.faElig&&contractPerformanceD()>=1&&chance(45)){
    S.ct.extOffered=true; extensionOffer(o); return;
  }
  crossOffers(o);
}
function finishRosterMove(o){
  if(S.ct&&S.ct.yrs<=0){if(maybeTaiwanReturnInquiry(o,()=>resolveContractExpiry(o)))return;resolveContractExpiry(o);return;}
  advance();
}
function buyoutRemaining(){ /* 球團主動終止合約；各聯盟依合約與解約規章結清。 */
  if(!S.ct)return 0;
  const remain=Math.max(0,S._proClockYear===S.year?S.ct.yrs:S.ct.yrs-1); /* movement 已扣當年時不可再扣一次 */
  if(remain<=0)return 0;
  const yearly=Math.round(S.ct.annual||salaryFor(S.lv,S.lastD||0)*(S.ct.mult||1)*dpMult());
  if(S.org==='CPBL'){
    const total=Math.max(0,Math.round(yearly/24)); /* 季後至春訓期間由球團終止，遊戲折算 15 日薪資。 */
    if(total>0){const pay=bookIncome(total,'buyout',S.org,S.orgTeam);card('info','中職合約終止結算',`<b class="hl">${S.name}</b> 的合約原剩 ${remain} 年；球團依季後／春訓解約規則支付 <b class="hl">15 日薪資</b>，稅前 ${fmtContractMoney(total,S.org)}、估算稅費後 ${fmtLocalMoney(pay.net,S.org)}。未履行的剩餘年薪不會自動全額買斷。`);}
    S.ct={...S.ct,yrs:0,guaranteed:0};return total;
  }
  if(!LV[S.lv].top)return 0;
  const full=yearly*remain,guaranteed=clamp(S.ct.guaranteed==null?1:S.ct.guaranteed,0,1);
  const total=Math.round(full*guaranteed);
  if(total>0){ const pay=bookIncome(total,'buyout',S.org,S.orgTeam);
    card('gold','合約保障結清',`<b class="hl">${S.name}</b> 的合約仍剩 ${remain} 年。球團依保障比例 <b class="hl">${Math.round(guaranteed*100)}%</b> 結清：原合約剩餘 ${fmtContractMoney(full,S.org)}，稅前入帳 ${fmtContractMoney(total,S.org)}，估算稅費後 <b class="hl">${fmtLocalMoney(pay.net,S.org)}</b>。`); }
  S.ct={...S.ct,yrs:0,annual:yearly,guaranteed:0}; /* 買斷後合約結清 */
  return total;
}
function voluntaryRetirementSettlement(){
  if(!S.ct||!(S.ct.yrs>0))return 0;const years=S.ct.yrs,value=Math.round((S.ct.annual||0)*years*(S.ct.guaranteed==null?1:S.ct.guaranteed));S.ct={...S.ct,yrs:0,guaranteed:0};card('info','自願退休合約結算',`${S.name} 主動結束球員合約，因此放棄尚未履行的 ${years} 年保障薪資 ${fmtContractMoney(value,S.org)}；這不是球團買斷，不會把剩餘合約全額變成退休獎金。`);return value;
}
function taiwanReturnInquiryThreshold(kind,age){
  age=Number(age)||18;
  if(kind==='npb2')return age<=20?4:age<=23?3:age<=29?2:1;
  if(kind==='milb')return age<=20?5:age<=23?4:age<=27?3:age<=30?2:1;
  return 99;
}
function taiwanReturnInquiryProfile(o){
  const depth=S.overseasDepth||{npb2:0,milb:0},kind=S.org==='NPB'&&S.lv==='NPB2'?'npb2':S.org==='MiLB'&&S.lv!=='MLB'?'milb':null,years=kind?depth[kind]||0:0,threshold=taiwanReturnInquiryThreshold(kind,S.age),history=(S.returnInquiryHistory||[]).filter(x=>x.kind===kind),last=history.slice(-1)[0],first=!history.length,d=contractPerformanceD(),perf=promotionPerformance(S.lastSt,S.lv);
  const due=!last||S.year-last.year>=3,eligible=!!kind&&S.seasonFactor>=.5&&!!S.lastSt&&years>=threshold&&due&&o>=LV.CPBL2.min-3,level=o>=LV.CPBL1.min-2&&(d>=-2||perf.strong||years>=threshold+1)?'CPBL1':'CPBL2',formAdj=perf.elite?16:perf.strong?9:actualRosterVerdict(S.lastSt).awful?-12:0,interest=clamp(Math.round(27+ratingGap(o,LV[level].min)*5+d*3+formAdj+Math.min(10,(years-threshold)*3)-Math.max(0,S.age-34)*3),10,78);
  const ageRule=kind==='npb2'?(S.age<=20?'20 歲以下養成期':S.age<=23?'21–23 歲發展期':S.age<=29?'24–29 歲戰力評估':'30 歲以上即戰力評估'):(S.age<=20?'20 歲以下長期養成':S.age<=23?'21–23 歲新秀發展':S.age<=27?'24–27 歲升格窗口':S.age<=30?'28–30 歲即戰力評估':'31 歲以上返台窗口');
  return {kind,years,threshold,first,due,eligible,level,interest,d,ageRule,perf};
}
function maybeTaiwanReturnInquiry(o,onContinue){
  if(S._returnInquiryYear===S.year)return false;
  const p=taiwanReturnInquiryProfile(o);if(!p.eligible)return false;
  /* 達到年齡與旅外年資門檻仍只是進入市場池；近期實績會改變興趣，拒絕後至少隔兩個完整球季。 */
  if(!chance(p.interest))return false;
  S._returnInquiryYear=S.year;const count=p.level==='CPBL1'?clamp(p.d>=4?3:2,1,3):1,source=p.kind==='npb2'?'日職二軍':'美職小聯盟',role=p.level==='CPBL1'?'一軍名單與先發／主力牛棚競爭':'二軍合約，但列為季中升一軍優先觀察',candidates=randomSubset(CPBL_TEAMS,count).map((team,i)=>({team,lv:p.level,role,mult:+clamp(.94+p.d*.025+R()*.12-i*.025,.76,1.42).toFixed(2)}));
  const stay=()=>{S.returnInquiryHistory=S.returnInquiryHistory||[];S.returnInquiryHistory.push({year:S.year,kind:p.kind,years:p.years,age:S.age,threshold:p.threshold,outcome:'stay'});card('info','留隊競爭',`${S.orgTeam}｜${LV[S.lv].n}`);board(1);onContinue();};
  card('info','中職來電',`${candidates.length} 支球隊表達興趣｜目前 ${S.orgTeam}・${LV[S.lv].n}`);board(2);
  returnTaiwanBuyoutFlow(o,stay,candidates,'返台報價',{kind:p.kind,years:p.years,age:S.age,threshold:p.threshold});return true;
}
function returnTaiwanBuyoutFlow(o,onStay,preferredCandidates,marketTitle,inquiryMeta){
  if(S.org==='CPBL'){onStay();return;}
  const activeContract=!!(S.ct&&S.ct.yrs>0),remain=activeContract?Math.max(1,S.ct.yrs):0,annual=activeContract?Math.round(S.ct.annual||salaryFor(S.lv,contractPerformanceD())*(S.ct.mult||1)*dpMult()):0,guaranteed=activeContract?clamp(S.ct.guaranteed==null?1:S.ct.guaranteed,0,1):0,guaranteedValue=Math.round(annual*remain*guaranteed),d=contractPerformanceD(),oldOrg=S.org,oldTeam=S.orgTeam,interest=clamp(Math.round(35+ratingGap(o,LV.CPBL1.min)*7+d*4-Math.max(0,S.age-35)*4),6,92),offerCount=preferredCandidates?preferredCandidates.length:chance(interest)?clamp(d>=4?3:d>=0?2:1,1,3):0;
  const candidates=(preferredCandidates||randomSubset(CPBL_TEAMS,offerCount).map(team=>({team,lv:'CPBL1'}))).map((target,i)=>({...target,lv:target.lv||'CPBL1',mult:Number.isFinite(target.mult)?target.mult:+clamp(.92+d*.035+R()*.13-i*.03,.72,1.45).toFixed(2)}));
  if(!candidates.length){card('bad','返台市場沒有正式意向',`經紀人詢問六支中職球隊，但目前沒有球隊願意在你仍有海外合約時先行承諾一軍合約。<div class="statline">市場興趣 ${interest}%｜目前能力 ${o}/99｜本季評價 ${d>=0?'+':''}${d.toFixed(1)}｜年齡 ${S.age}</div>`);onStay();return;}
  const standing=teamRosterDecisionContext(d<0),clubNeed=standing.pressure||0;
  const signTaiwanTerms=target=>{
    const targetLv=target.lv||'CPBL1',saved={org:S.org,lv:S.lv,team:S.orgTeam};S.org='CPBL';S.lv=targetLv;S.orgTeam=target.team;S.marketHeat=clamp(4+d*2,-8,18);
    termChoice(o,d,`${target.team}｜返台正式談薪`,(y,m,option)=>{S.org=saved.org;S.lv=saved.lv;S.orgTeam=saved.team;signTo('CPBL',targetLv,target.team,y,+(m*target.mult).toFixed(2),option);S.marketHeat=0;S.overseasDepth={npb2:0,milb:0};if(inquiryMeta){S.returnInquiryHistory=S.returnInquiryHistory||[];S.returnInquiryHistory.push({year:S.year,kind:inquiryMeta.kind,years:inquiryMeta.years,age:inquiryMeta.age,threshold:inquiryMeta.threshold,outcome:'signed',team:target.team,lv:targetLv});}card('gold','返台加盟完成',`${S.name} 與 <b class="hl">${target.team}</b> 完成 ${LV[targetLv].n} 合約。海外滯留年數已重置，下一季將依新球隊承諾的角色重新競爭。`);advance();},null,target.mult);
  };
  const negotiate=(target,settlePct,label)=>{
    const relief=Math.round((1-settlePct)*100),approval=clamp(Math.round(70-remain*8-Math.max(0,d)*4+Math.max(0,-d)*5+clubNeed+(settlePct===0?17:settlePct<=.25?5:-10)),12,94);
    animatedRoll({sides:100,title:'合約買斷談判',subtitle:`${oldTeam} 必須同意終止剩餘 ${remain} 年合約。`,probability:approval,modifiers:[`放棄原保障 ${relief}%`,`本季評價 ${d>=0?'+':''}${d.toFixed(1)}`,`球隊戰績 ${standing.record}`]}).then(r=>{
      if(!r.success){card('bad','買斷談判破局',`${oldTeam} 拒絕提前終止合約。你仍有約在身，本次不能直接加盟台灣球隊。<div class="statline">剩餘 ${remain} 年｜剩餘保障 ${fmtContractMoney(guaranteedValue,oldOrg)}｜本次同意機會 ${approval}%</div>`);onStay();return;}
      const settlement=Math.round(guaranteedValue*settlePct);if(settlement>0)bookIncome(settlement,'buyout',oldOrg,oldTeam);
      S.ct=null;card('gold','買斷協議成立',`${oldTeam} 同意解除剩餘 ${remain} 年合約。你放棄 ${relief}% 剩餘保障${settlement?`，取得稅前和解金 ${fmtContractMoney(settlement,oldOrg)}`:'，沒有取得額外買斷金'}。<div class="statline">原剩餘保障｜${fmtContractMoney(guaranteedValue,oldOrg)}<br>談判方式｜${label}<br>下一步｜與 ${target.team} 正式談台灣合約</div>`);
      signTaiwanTerms(target);
    });
  };
  const offers=candidates.map(target=>({t:`聽取 ${target.team} 返台方案`,modal:true,sideTitle:LV[target.lv].n,sideNote:target.role||'返台名單競爭',s:`${target.role||'返台名單競爭'}｜預估年薪 ${fmtContractMoney(Math.round(salaryFor(target.lv,d)*target.mult),'CPBL')}｜${activeContract?'仍須處理海外剩餘合約':'海外合約已到期，可直接談新約'}`,f:()=>activeContract?choose(`向 ${oldTeam} 提出買斷方案｜剩餘保障 ${fmtContractMoney(guaranteedValue,oldOrg)}`,[
    {t:'放棄全部剩餘保障，換取自由身',main:true,s:'原球團較容易同意｜談成後原合約不再支付',f:()=>negotiate(target,0,'球員放棄全部剩餘保障')},
    {t:'要求支付 25% 剩餘保障',risk:true,s:'保留部分保障，但原球團同意機會較低',f:()=>negotiate(target,.25,'雙方以四分之一保障結清')},
    {t:'要求支付 50% 剩餘保障',risk:true,s:'金額較高，長約或好成績時很可能破局',f:()=>negotiate(target,.50,'雙方以一半保障結清')},
    {t:'取消買斷，留隊履約',s:'不改變目前合約',f:onStay}
  ]):(card('info','海外合約已屆滿',`${oldTeam} 的發展合約已結束，不需要買斷或交易；你可以直接與 ${target.team} 談返台新約。`),signTaiwanTerms(target))}));
  offers.push({t:`留在 ${oldTeam}`,main:true,s:activeContract?'履行現有合約':'繼續等待海外合約',f:onStay});
  choose(marketTitle||`返台意向市場｜${candidates.length} 支中職球隊接觸`,offers);
}
/* 旅外引退的台灣告別活動：依守位與生涯隨機抽選，不再固定同一段。 */
function daibaFarewell(cont){
  if(S.stage==='PRO'&&S.org!=='CPBL'&&!S._daiba){ S._daiba=true;
    const nm=`<b class="hl">${S.name}</b>`,scenes=S.pos==='P'?
      [
        `${nm} 接受邀請回到 <b class="hl">臺北大巨蛋</b> 擔任開球嘉賓。球落進捕手手套後，全場喊的是你的名字；這一球不計勝負，卻替旅外生涯畫下完整句點。`,
        `兒時母校的捕手在本壘後方蹲下，${nm} 從正式投手丘投出告別一球。大螢幕依序亮起高中、日職與大聯盟時期的背號，看台久久沒有坐下。`,
        `${nm} 沒有選擇華麗開球，而是在賽前牛棚替六名少棒投手逐一接力指導。最後由孩子們把紀念球送回你手上，觀眾以掌聲送別。`
      ]:[
        `${nm} 回到 <b class="hl">臺北大巨蛋</b> 完成一打席紀念對決。你沒有全力揮擊，而是把球輕輕送向右外野；跑到一壘時，兩隊球員都已站上場鼓掌。`,
        `球團替 ${nm} 安排賽前全壘打挑戰。最後一球飛進外野看台，接到球的小球迷立刻把球送回來，請你在上面簽下自己的名字。`,
        `${nm} 與母校學弟一起走進大巨蛋，親自替小球員餵球。活動結束時，全場舉起手機燈光，像替漫長旅外生涯點亮回家的路。`
      ];
    card('gold',S.pos==='P'?'台灣告別一球':'台灣告別打席',pick(scenes));
  }
  cont();
}
function mlbFreeAgentNext(o,d,title){
  S.faElig=true;choose(title||'MLB 自由球員下一步',[
    {t:'留美測試 MLB 自由市場',main:true,modal:true,s:'經紀人向多支 MLB 球隊尋找大聯盟合約；成績差可能沒有正式報價',f:()=>faMarket(o,d)},
    {t:'同步詢問日職與中職',modal:true,s:'放棄先談 MLB 市場；依能力、年齡與外籍身分尋找亞洲合約',f:()=>outOfOrg(o,{cause:'market',skipDevelopment:true})},
    {t:'結束球員生涯',warn:true,modal:true,s:'不再等待下一份球員合約',f:()=>daibaFarewell(()=>endGame(`${S.year} 年離開 MLB 40 人名單後宣布引退。`))}
  ]);
}
function mlbAcquireOnForty(team,method,o){
  const old=S.orgTeam,r=mlbRosterState();if(team!==old){S.teamYears=0;S.champThisTeam=false;S.champTeam=null;}S.orgTeam=team;S.lv='MLB';r.forty=true;r.history.push({year:S.year,type:method,from:old,to:team});
  card('gold',method==='trade'?'DFA 七日內完成交易':'讓渡名單遭到 Claim',`${team} ${method==='trade'?'與原球團完成交易':'在 outright waivers 階段提出 claim'}，接手你的現有合約並立即把你加入該隊 40 人名單。<div class="statline">原球隊｜${old}<br>新球隊｜${team}<br>名單｜40 人名單＋26 人名單<br>合約｜剩餘保障與年薪由新球隊承接</div>`);board(2);finishRosterMove(o);
}
function mlbOutrightToAAA(o,d){
  const r=mlbRosterState(),rights=mlbDfaRights();r.outrightCount++;r.forty=false;r.history.push({year:S.year,type:'outright',team:S.orgTeam});
  const accept=()=>{recordDemotion(S.lv,'A3',S.year+1,'outright');S.lv='A3';card('bad','通過讓渡｜Outright 至 3A',`29 支球隊都沒有提出 claim，原球團把你的合約 outright 至 3A；你已不在 40 人名單，但原合約仍照條款執行。<div class="statline">目前層級｜3A<br>40 人名單｜名單外<br>生涯 outright｜${r.outrightCount} 次<br>日後回 MLB｜球團必須重新把合約選入 40 人名單</div>`);board(2);finishRosterMove(o);};
  if(!rights.canRejectOutright){accept();return;}
  const elect=()=>{const keep=rights.keepsGuarantee;if(keep)buyoutRemaining();else S.ct=null;S.ct=null;r.forty=false;card('info','拒絕 Outright｜選擇自由球員',`${S.name} 拒絕 3A outright assignment，立即成為自由球員。${keep?'你已有至少 5 年 MLB 年資，原合約剩餘保障仍會結清。':'你的 MLB 年資未滿 5 年，選擇自由球員代表放棄原合約剩餘保障。'}<div class="statline">取得拒絕權原因｜${rights.service>=3?`MLB 年資 ${rights.service} 年`:'生涯已有過 outright'}<br>40 人名單｜已移出<br>下一步｜重新測試市場</div>`);mlbFreeAgentNext(o,d,'拒絕 Outright｜自由球員市場');};
  choose(`Outright 權利選擇｜已通過 29 隊讓渡`,[
    {t:'接受 outright，前往 3A',main:true,modal:true,s:'保留原合約｜移出 40 人名單；日後必須重新選入合約才能回 MLB',f:accept},
    {t:'拒絕 outright，選擇自由球員',risk:true,modal:true,s:rights.keepsGuarantee?'保留剩餘保障｜立刻測試自由市場':'放棄原合約剩餘保障｜立刻測試自由市場',f:elect}
  ]);
}
function mlbDfaFlow(o,reason){
  const r=mlbRosterState(),rights=mlbDfaRights(),oldTeam=S.orgTeam,d=contractPerformanceD();r.forty=false;r.dfaCount++;r.history.push({year:S.year,type:'DFA',team:oldTeam,reason:reason||'名單調整'});
  const salaryLoad=S.ct&&S.ct.annual?clamp(Math.log10(Math.max(1,S.ct.annual))*2,0,12):0,ageLoad=Math.max(0,S.age-30)*2,tradeP=clamp(Math.round(20+d*4-ageLoad-salaryLoad*.35),3,48),claimP=clamp(Math.round(35+d*5-ageLoad-salaryLoad*.55),5,72),releaseP=clamp(Math.round(12+Math.max(0,-d)*5+Math.max(0,S.age-33)*3),6,62),pool=MLB_TEAMS.filter(t=>t!==oldTeam);
  card('bad','DFA｜移出 40 人名單',`${oldTeam} 將你的合約指定讓渡（DFA），你已立即離開 40 人名單。球團必須在 7 天內完成交易，或放上 outright／unconditional release waivers。<div class="statline">原因｜${reason||'一軍成績與名單空間調整'}<br>MLB 年資｜${rights.service} 年<br>小聯盟選擇權｜剩 ${mlbRosterStatus().remaining} 年<br>交易完成機會｜${tradeP}%<br>讓渡遭 claim 機會｜${claimP}%</div><small><a href="https://www.mlb.com/glossary/transactions/designate-for-assignment" target="_blank" rel="noopener">MLB DFA 規則</a>｜<a href="https://www.mlb.com/glossary/transactions/minor-league-options" target="_blank" rel="noopener">MLB 選擇權規則</a></small>`);
  const released=()=>{buyoutRemaining();S.ct=null;r.forty=false;r.history.push({year:S.year,type:'release',team:oldTeam});card('bad','Unconditional Release｜正式釋出',`${oldTeam} 沒有選擇 outright，而是讓你通過 unconditional release waivers 後正式釋出。原 MLB 合約依保障條款結清，你成為自由球員。`);mlbFreeAgentNext(o,d,'遭 MLB 球團釋出｜下一步');};
  const waivers=()=>{if(chance(claimP)){mlbAcquireOnForty(pick(pool),'claim',o);return;}if(chance(releaseP)){released();return;}mlbOutrightToAAA(o,d);};
  if(chance(tradeP)){
    const target=pick(pool),hasVeto=rights.tenAndFive||!!(S.ct&&S.ct.option==='完整不可交易條款');
    if(hasVeto){choose(`DFA 交易提案｜${target} 願意接手合約`,[
      {t:`批准交易至 ${target}`,main:true,modal:true,s:'新球隊承接原合約｜加入新球隊 40 人與 26 人名單',f:()=>mlbAcquireOnForty(target,'trade',o)},
      {t:'否決交易，繼續進入讓渡程序',risk:true,modal:true,s:'保留否決權，但接下來仍可能遭 claim、outright 或釋出',f:waivers}
    ]);return;}
    mlbAcquireOnForty(target,'trade',o);return;
  }
  waivers();
}
function mlbOptionToAAA(o,done,assignmentYear){
  const y=assignmentYear||S.year+1,used=consumeMlbOptionYear(y);if(!used.ok){mlbDfaFlow(o,used.reason);return;}const r=mlbRosterState();recordDemotion(S.lv,'A3',y,'option');S.lv='A3';r.forty=true;r.history.push({year:y,type:'optioned-to-AAA',team:S.orgTeam});
  card('bad','Optional Assignment｜下放 3A',`球團使用一個小聯盟選擇權球季，將你從 26 人名單 option 至 3A；你仍留在 40 人名單，原合約繼續有效。<div class="statline">生效球季｜${y}<br>該季 option 次數｜${used.assignments}/5<br>生涯已用選擇權球季｜${used.used}/${used.limit}<br>剩餘選擇權球季｜${used.remaining}<br>目前名單｜3A・40 人名單內</div><small>${S.pos==='P'?'投手原則上至少在小聯盟 15 天後才能被召回。':'野手原則上至少在小聯盟 10 天後才能被召回。'}</small>`);board(2);if(done)done();else finishRosterMove(o);
}
function mlbDemotionFlow(o){
  mlbAddToFortyMan('既有 MLB 名單');const status=mlbRosterStatus(),rights=mlbDfaRights();
  if(status.remaining<=0){mlbDfaFlow(o,'小聯盟選擇權已用完');return;}
  if(rights.optionConsent){choose(`MLB 名單約談｜球團計畫 option 至 3A`,[
    {t:'同意 optional assignment，前往 3A',main:true,modal:true,s:`使用本季選擇權｜仍在 40 人名單｜剩餘選擇權 ${status.remaining} 年`,f:()=>mlbOptionToAAA(o)},
    {t:'拒絕 optional assignment',risk:true,modal:true,s:'至少 5 年 MLB 年資可拒絕；球團將改為留在 26 人名單或啟動 DFA',f:()=>mlbDfaFlow(o,'球員以 5 年年資權利拒絕 optional assignment')}
  ]);return;}
  mlbOptionToAAA(o);
}
function mlbReserveNextSeason(o,done){
  const r=mlbRosterState();if(S.org!=='MiLB'||S.lv==='MLB'||!r.forty){done();return;}const status=mlbRosterStatus(),rights=mlbDfaRights(),nextYear=S.year+1;
  if(status.remaining<=0){
    const perf=promotionPerformance(S.lastSt,S.lv),keepP=clamp(Math.round(18+ratingGap(o,LV.MLB.min)*8+perf.score*6),5,72);
    if((perf.strong||o>=LV.MLB.min)&&chance(keepP)){const from=S.lv;S.lv='MLB';r.forty=true;card('gold','Out of Options｜擠進 MLB 名單',`你的選擇權已用完，球團只能把你留在 26 人名單，否則就必須 DFA。春訓最後一次名單會議後，你守住了大聯盟席位。<div class="statline">原層級｜${LV[from].n}<br>下季層級｜MLB<br>名單競爭通過機會｜${keepP}%<br>選擇權｜0 年</div>`);board(2);achievementFX({kind:'mlb',kicker:'OUT OF OPTIONS',title:'擠進 MLB 26 人名單！',subtitle:`${S.orgTeam}｜${LV[from].n} → MLB`,detail:`選擇權 0 年｜名單競爭通過機會 ${keepP}%`,result:'40 人名單＋26 人名單',note:'沒有選擇權保護；未來再次失去席位將直接進入 DFA。'}).then(done);return;}
    mlbDfaFlow(o,'選擇權用完，且未能進入下季 26 人名單');return;
  }
  const assign=()=>{const used=consumeMlbOptionYear(nextYear);if(!used.ok){mlbDfaFlow(o,used.reason);return;}card('info','40 人名單保留｜下季續留 3A',`球團決定讓你留在 40 人名單，並使用 ${nextYear} 年的小聯盟選擇權。<div class="statline">下季名單｜3A・40 人名單內<br>已用選擇權球季｜${used.used}/${used.limit}<br>剩餘選擇權球季｜${used.remaining}<br>${nextYear} 年 option 次數｜${used.assignments}/5</div>`);board(2);done();};
  if(rights.optionConsent){choose(`下季 40 人名單安排｜${nextYear}`, [{t:'同意留在 40 人名單並前往 3A',main:true,modal:true,s:`使用 ${nextYear} 年選擇權｜保留原合約`,f:assign},{t:'拒絕 optional assignment',risk:true,modal:true,s:'5 年 MLB 年資權利｜球團將改為留在 26 人名單或 DFA',f:()=>mlbDfaFlow(o,'球員拒絕下季 optional assignment')}]);return;}
  assign();
}
function handleDemotion(o,path,idx){
  if((S.lv==='CPBL1'||S.lv==='NPB1'||S.lv==='MLB')&&(S.lastD||0)<=-6&&!S.traits.yips&&S.seasonFactor>=0.5){
    traitCard('yips','失憶症',`生理上明明沒受傷，但站上場的瞬間，腦海全是上個賽季被痛宰的畫面——<b class="dn">系統評價暫時 −3，直到再次升級或奪得年度獎項才能解除</b>。`,'bad'); }
  if(S.org==='MiLB'&&S.lv==='MLB'){mlbDemotionFlow(o);return;}
  const doDemote=()=>{
    /* 找同組織中符合的層級 */
    let t=-1; for(let i=idx-1;i>=0;i--){ if(o>=LV[path[i]].min){t=i;break;} }
    if(t>=0){
      const acceptDemotion=()=>{const from=S.lv,to=path[t];recordDemotion(from,to,S.year+1,'performance');S.lv=to;board(2);finishRosterMove(o);};
      /* 旅外體系下放時,亞洲球團同步遞約 */
      const alts=[];
      if(S.org==='MiLB'){
        if(o>=LV.NPB1.min&&chance(Math.round(60*ageGateJP())))alts.push({t:'跳槽日職一軍',s:'旅日合約',f:()=>{buyoutRemaining();signTo('NPB','NPB1');advance();}});
        else if(o>=LV.NPB2.min&&chance(Math.round(50*ageGateJP())))alts.push({t:'轉戰日職二軍支配下合約',f:()=>{buyoutRemaining();signTo('NPB','NPB2');advance();}});
        if(o>=LV.CPBL1.min)alts.push({t:'返台加盟中職一軍',s:'落葉歸根',f:()=>{buyoutRemaining();signTo('CPBL','CPBL1');advance();}});
      }else if(S.org==='NPB'&&o>=LV.CPBL1.min&&chance(70)){
        alts.push({t:'返台加盟中職一軍',f:()=>{buyoutRemaining();signTo('CPBL','CPBL1');advance();}});
      }
      if(alts.length){
        card('bad','降級通知',`成績未達標，球團打算將你下放 <b class="dn">${LV[path[t]].n}</b>——但消息一出，其他聯盟的邀請也到了。`);
        choose('接受下放，還是換個舞台？',[
          {t:'接受下放 '+LV[path[t]].n,main:true,f:acceptDemotion},...alts]);
      }else{ const from=S.lv,to=path[t];recordDemotion(from,to,S.year+1,'performance');S.lv=to;card('bad','降級通知',`成績未達標，被下放至 <b class="dn">${LV[to].n}</b>。`);board(2);finishRosterMove(o); }
    }
    else outOfOrg(o,{cause:'performance'});
  };
  const longContract = S.ct && S.ct.yrs>1 && LV[S.lv].top;
  if(longContract){
    choose('球團約談：成績未達當前層級要求，打算將你下放',[
      {t:'接受下放，繼續奮鬥',main:true,f:doDemote},
      {t:'行使長約條款，拒絕下放',warn:true,s:'觸發更衣室毒瘤；隔年成績打回身價才能洗刷，否則更慘',f:()=>{
        S.demotionRefused=true;
        if(!S.traits.cancer&&!S.traits.franchise&&!S.traits.intlace){ S.traits.cancer=true;
          card('bad','隱藏屬性解鎖：更衣室毒瘤','你搬出合約條款拒絕下放。教練搖頭，隊友私下議論——你保住了位置，卻失去了更衣室。'); }
        else card('info','拒絕下放','你搬出合約條款留在一軍。球團記住了這件事。');
        board(1); advance(); }},
      {t:'就此引退',warn:true,s:'自願退休並放棄未履行的保障薪資',f:()=>{voluntaryRetirementSettlement();daibaFarewell(()=>endGame('不願下放，'+S.year+' 年宣布引退。'));}}]);
  } else if(S.age>=33){
    choose('球團約談：成績未達當前層級的最低要求',[
      {t:'接受下放，繼續奮鬥',f:doDemote},
      {t:'選擇引退',warn:true,s:'自願退休並放棄未履行的保障薪資',f:()=>{voluntaryRetirementSettlement();daibaFarewell(()=>endGame('不願下放低階聯盟，'+S.year+' 年宣布引退。'));}}]);
  } else doDemote();
}
function youthDevelopmentGrant(){
  if(S.age<=19)return 2;
  if(S.age<=21)return 1;
  return S.age<=23&&(S.proYears||0)<=1?1:0;
}
function youthDevelopmentPreview(context){
  context=context||{};
  if(context.skipDevelopment||context.cause==='contract'||S.stage!=='PRO'||!['NPB','CPBL','MiLB'].includes(S.org))return {eligible:false,protect:false};
  if(S.traits.cancer||S.demotionRefused)return {eligible:false,protect:false,discipline:true};
  const key=`${S.org}|${S.orgTeam}`,watch=S.developmentWatch&&S.developmentWatch.key===key?S.developmentWatch:null,granted=watch?watch.granted:youthDevelopmentGrant(),used=watch?watch.used:0,next=used+1;
  return {eligible:granted>0,protect:granted>0&&next<=granted,key,granted,used,next,remaining:Math.max(0,granted-next)};
}
function tryYouthDevelopmentRetention(o,context){
  const p=youthDevelopmentPreview(context);if(!p.protect)return false;
  const from=S.lv,bottom=PATHS[S.org]&&PATHS[S.org][0]||S.lv;S.lv=bottom;S.lastChanceYear=S.year+1;
  S.developmentWatch={key:p.key,org:S.org,team:S.orgTeam,granted:p.granted,used:p.next,started:S.developmentWatch&&S.developmentWatch.key===p.key?S.developmentWatch.started:S.year,lastYear:S.year};
  const remaining=p.remaining>0?`仍有 ${p.remaining} 季養成保護`:'本次已用完保護；下一個未達標球季才會進入釋出審查';
  card('info',`養成保護｜第 ${p.next}/${p.granted} 季`,`${S.orgTeam} 沒有把 ${S.age} 歲的你直接列為戰力外，而是依年齡、職業年資與養成順位保留觀察名額。<div class="statline">本季成績｜${actualRosterVerdict(S.lastSt).line}<br>下季安排｜${LV[bottom].n}・縮減角色後重新競爭<br>${remaining}<br>合約｜原年限照常計算，不因保護期自動加薪或重置</div><small>${from!==bottom?`先由 ${LV[from].n} 調整至 ${LV[bottom].n}；`:''}可接受的球季會清除連續低迷紀錄。合約到期或嚴重紀律問題仍會單獨審查。</small>`);
  board(2);advance();return true;
}
function outOfOrg(o,context){
  if(tryYouthDevelopmentRetention(o,context))return;
  /* 遭原聯盟釋出，尋找重疊層級合約 */
  const offers=[],jpReq=r99(44+Math.max(0,Math.floor((S.age-28)/2))),cpblReq=r99(41+Math.max(0,Math.floor((S.age-33)/2)));
  const marketD=contractPerformanceD(),ageCost=Math.max(0,S.age-29)*4;
  if(S.org!=='NPB'&&S.age<=34&&o>=jpReq&&chance(clamp(Math.round(52+ratingGap(o,jpReq)*5+marketD*4-ageCost),6,78)))offers.push({t:'日職二軍支配下合約',f:()=>{buyoutRemaining();signTo('NPB','NPB2');}});
  if(S.org!=='CPBL'){
    const topP=clamp(Math.round(56+ratingGap(o,cpblReq)*6+marketD*5-ageCost),5,86),farmP=clamp(Math.round(62+ratingGap(o,r99(30))*5+marketD*4-ageCost),8,88);
    if(S.age<=40&&o>=cpblReq&&chance(topP))offers.push({t:'中職一軍合約',f:()=>{buyoutRemaining();signTo('CPBL','CPBL1');}});
    else if(S.age<=35&&o>=r99(30+Math.max(0,S.age-30))&&chance(farmP))offers.push({t:'中職二軍合約',f:()=>{buyoutRemaining();signTo('CPBL','CPBL2');}});
  }
  if(!offers.length){buyoutRemaining();if(S.age<36){card('bad','市場沒有職業合約','目前沒有球隊願意提供職業名額。');choose('下一步',[{t:'轉往業餘成棒',main:true,s:'保留比賽機會，未來可再參加測試',f:joinIndustrialAfterRelease},{t:'結束球員生涯',warn:true,f:()=>daibaFarewell(()=>endGame('遭球團釋出且無人問津，'+S.year+' 年引退。'))}]);}else daibaFarewell(()=>endGame('遭球團釋出且無人問津，'+S.year+' 年引退。'));return; }
  card('bad','戰力外通告',`未達 ${S.org==='NPB'?'日職':'原聯盟'}留用門檻，遭到釋出。所幸還有球隊捎來邀請——`);
  if(S.age>=33){ offers.push({t:'就此引退',warn:true,f:()=>{buyoutRemaining();daibaFarewell(()=>endGame('收到戰力外通告後，'+S.year+' 年選擇引退。'));}}); }
  choose('新東家的邀請',offers.map(x=>({...x,f:()=>{x.f();advance();}})));
}
function teamListOf(org){ return org==='CPBL'?CPBL_TEAMS:org==='NPB'?NPB_TEAMS:MLB_TEAMS; }
function signTo(org,lv,team,yrs,mult,dealOption,terms){
  terms=terms||{};
  const oldOrg=S.org,oldTeam=S.orgTeam;S.org=org; S.lv=lv;
  S.service=S.service||{CPBL:0,NPB:0,MiLB:0};
  if(oldOrg&&oldOrg!==org){S.faElig=false;S.svc=S.service[org]||0;}
  /* 【修正】先決定新球隊是誰，比對不一樣才把年資歸零，最後再蓋掉 S.orgTeam */
  const newTeam = team || pick(teamListOf(org));
  if(oldOrg!==org||newTeam !== S.orgTeam){ S.teamYears=0; S.champThisTeam=false; S.champTeam=null;S.developmentWatch=null; }
  S.orgTeam = newTeam;
  if(org==='MiLB'){
    if(lv==='MLB')mlbAddToFortyMan(oldOrg==='MiLB'&&oldTeam===newTeam?'大聯盟合約續留':'大聯盟合約選入 40 人名單');
    else if(oldOrg!=='MiLB'||oldTeam!==newTeam)mlbRosterState().forty=false;
  }else if(oldOrg==='MiLB')mlbRosterState().forty=false;
  const years=Math.min(yrs||2,contractTermCap(lv)),m=mult||1,calculatedAnnual=Math.round(salaryFor(lv,contractPerformanceD())*m*dpMult()),annual=terms.annualCap?Math.min(calculatedAnnual,terms.annualCap):calculatedAnnual;
  S.ct={yrs:years,signedYears:years,mult:m,annual,guaranteed:LV[lv]&&LV[lv].top?1:.65,option:dealOption||(years>=4&&chance(35)?'第 3 年後球員跳脫權':years>=3&&chance(30)?'球隊選擇權':null)};
  if(terms.cpblFaFrom){S.cpblFaSignings=S.cpblFaSignings||{};S.cpblFaSignings[S.year]=S.cpblFaSignings[S.year]||{};S.cpblFaSignings[S.year][newTeam]=(S.cpblFaSignings[S.year][newTeam]||0)+1;S.ct.cpblFaFrom=terms.cpblFaFrom;S.ct.firstYearSalaryCap=terms.annualCap;}
  if(org!=='NPB')S.npbYears=0;
  const div=org==='MiLB'&&MLB_TEAM_META[newTeam]?`｜${MLB_TEAM_META[newTeam][0]}`:'';
  const faRule=terms.cpblFaFrom?`｜中職首次行使 FA 首年薪資上限已套用（原年薪 ×1.5）；${terms.cpblFaFrom} 的補償程序由兩球團另行辦理；本年每隊簽約上限 ${cpblFaMarketRule().teamLimit} 人`:'';
  card('info','簽約',`與 <b class="hl">${S.teamName()}</b> 簽下 <b class="hl">${S.ct.yrs} 年</b>合約${div}｜年薪 ${fmtContractMoney(annual,org)}｜總值 ${fmtContractMoney(annual*years,org)}｜保障 ${Math.round(S.ct.guaranteed*100)}%${S.ct.option?`｜${S.ct.option}`:''}${faRule}。`); board(2);
}
/* 多隊報價選擇:opts=[{team,bonus,yrs,mult,lv}] */
function pickOfferUI(title,org,offers,after){
  choose(title,offers.map(of=>({
    t:of.team+(of.lv?`（${LV[of.lv].n}）`:''),
    s:`簽約金 ${fmtContractMoney(of.bonus,org)}｜${of.yrs} 年約${of.mult&&of.mult!==1?`｜年薪係數 ×${of.mult.toFixed(2)}`:''}`,
    f:()=>{ const pay=bookIncome(of.bonus,'bonus',org,of.team);
      signTo(org,of.lv||S.lv,of.team,of.yrs,of.mult||1);
      card('gold','簽約金',`稅前 ${fmtContractMoney(of.bonus,org)}｜稅費後入袋 <b class="hl">${fmtContractMoney(pay.net,org)}</b>。`); after(); }
  })));
}
function makeOffers(org,n,bonusBase,yrsLo,yrsHi,lv,exclude){
  const list=teamListOf(org).filter(t=>t!==exclude);
  const teams=[]; const pool=list.slice();
  for(let i=0;i<n&&pool.length;i++)teams.push(pool.splice(Math.floor(R()*pool.length),1)[0]);
  return teams.map(t=>({team:t,bonus:Math.round(bonusBase*(0.8+R()*0.5)),yrs:ri(yrsLo,yrsHi),lv,mult:1,market:org==='MiLB'&&MLB_TEAM_META[t]?MLB_TEAM_META[t][1]:1}));
}
function teamMarketProfile(team,org,d){
  let rec=latestTeamRecord(team,org),games=org==='MiLB'?162:org==='NPB'?143:120;
  const budget=org==='MiLB'&&MLB_TEAM_META[team]?MLB_TEAM_META[team][1]:.88+stableIndex(`${org}|${team}|預算`,38)/100;
  if(!rec){
    const base=.5+(budget-1)*.07+(stableIndex(`${S.year}|${team}|戰力`,19)-9)/100+N0(.025),W=Math.round(games*clamp(base,.34,.66));
    rec={team,W,L:games-W,pct:W/games,rank:null,year:S.year,group:'季前預測'};
  }
  const need=stableIndex(`${S.year}|${team}|${S.pos}|${S.dpos||S.role||''}|${ri(0,999999999)}`,101);
  const direction=rec.pct>=.555?'爭冠補強':rec.pct<=.455?'重建布局':'卡位季後賽';
  const roleNeed=need>=72?'守位急需':need>=43?'輪替需求':'深度備案';
  /* 明星更受爭冠隊青睞；低潮或年輕球員在重建隊反而有較大角色。 */
  const windowFit=d>=3?(rec.pct-.5)*75:d<0?(.5-rec.pct)*52:(.52-Math.abs(rec.pct-.52))*28;
  const score=need*.38+windowFit+budget*16+R()*28-(S.age>=34&&rec.pct<.48?6:0);
  const interest=clamp(.90+(need-50)*.0016+(budget-1)*.10+(rec.pct-.5)*(d>=3?.24:-.08)+N0(.025),.82,1.18);
  return {record:rec,budget,need,direction,roleNeed,fit:`${rec.W}-${rec.L}・${direction}・${roleNeed}`,score,interest};
}
function makeFaOffers(org,n,bonusBase,yrsLo,yrsHi,lv,exclude,d){
  const cpblLimit=org==='CPBL'?cpblFaMarketRule().teamLimit:Infinity;
  const ranked=teamListOf(org).filter(t=>t!==exclude).filter(t=>org!=='CPBL'||!S.cpblFaSignings||((S.cpblFaSignings[S.year]||{})[t]||0)<cpblLimit).map(team=>({team,profile:teamMarketProfile(team,org,d||0)})).sort((a,b)=>b.profile.score-a.profile.score);
  const selected=[],pool=ranked.slice(0,Math.max(n*3,Math.min(8,ranked.length)));
  while(selected.length<n&&pool.length){
    /* 偏向最需要你的球隊，但每輪仍可能由意外球團搶先出價。 */
    const idx=Math.min(pool.length-1,Math.floor(Math.pow(R(),1.7)*pool.length));selected.push(pool.splice(idx,1)[0]);
  }
  return selected.map(({team,profile})=>({team,bonus:Math.round(bonusBase*(.76+R()*.42)*profile.budget*profile.interest),yrs:ri(yrsLo,yrsHi),lv,
    mult:1,market:profile.budget,interest:profile.interest,fit:profile.fit,record:profile.record,need:profile.roleNeed}));
}
/* ---------- 長約/短約 選擇器 ---------- */
function termParams(d,lv){ /* 長約 >2 年、短約 1-2 年;年齡大或成績爛 → 不夠格長約 */
  const offeredYears=arguments.length>2?arguments[2]:null,cap=contractTermCap(lv);
  const maxY=offeredYears==null?faYears(d,cap):clamp(Math.round(offeredYears),1,cap); /* 多隊市場保留各隊自己的年限。 */
  const longEligible = maxY>2 && d>=0;    /* 值得長約:年限>2 且成績不差(d>=0) */
  const longY=Math.max(3,maxY);           /* 長約至少 3 年 */
  const shortY=Math.min(2,Math.max(1,maxY)); /* 短約 1-2 年 */
  let baseM=d>=3?1.2:d>=0?1:0.8;
  if((S.awardLeverageUntil||0)>=S.year)baseM*=1+Math.min(12,(S.awardLeverage||0)*3)/100;
  if((S.poachLeverageUntil||0)>=S.year)baseM*=1+Math.min(6,(S.poachLeverage||0)*2)/100;
  if(S.traits.franchise)baseM=Math.max(baseM,1.2);
  if(S.tradeRefuse>0)baseM*=0.67;
  return {longEligible,longY,shortY,longM:+(baseM*0.92).toFixed(2),shortM:+(baseM*1.12).toFixed(2)};
}
function termChoice(o,d,baseTitle,onPick,onReject,offerMultiplier,offeredYears){
  const tp=termParams(d,S.lv,offeredYears);
  const offerM=offerMultiplier||1;
  const annual=(m)=>Math.round(salaryFor(S.lv,d)*m*offerM*dpMult()),deal=(y,m)=>{const a=annual(m),gross=a*y;return `年薪 ${fmtContractMoney(a,S.org)}｜總值 ${fmtContractMoney(gross,S.org)}｜${LV[S.lv].top?'全額保障':'保障 65%'}`;};
  const opts=[];
  if(tp.longEligible){ /* 夠格才給長約選項 */
    opts.push({t:`接受長約（${tp.longY} 年）`,main:true,s:deal(tp.longY,tp.longM),
      f:()=>onPick(tp.longY,tp.longM)});
    opts.push({t:`接受短約（${tp.shortY} 年）`,s:deal(tp.shortY,tp.shortM),
      f:()=>onPick(tp.shortY,tp.shortM)});
    const optM=+(tp.longM*.95).toFixed(2);
    opts.push({t:`長約加入球員跳脫權`,s:`${deal(tp.longY,optM)}｜第 3 年後可自行重返市場`,f:()=>onPick(tp.longY,optM,'第 3 年後球員跳脫權')});
  } else { /* 年齡大或成績不佳:只能短約(不出現長約) */
    opts.push({t:`接受短約（${tp.shortY} 年）`,main:true,s:deal(tp.shortY,tp.shortM),
      f:()=>onPick(tp.shortY,tp.shortM)});
  }
  { const cy=tp.longEligible?tp.longY:tp.shortY,cm=tp.longEligible?tp.longM:tp.shortM;
    const p=clamp(42+d*4+(S.marketHeat||0),12,85);
    opts.push({t:'讓經紀人反提案：年薪再加 12%',risk:true,probability:p,s:`成功機會 ${p}%｜成功提高年薪；失敗可能降價或撤回`,f:()=>{
      animatedRoll({sides:100,title:'合約談判｜反提案',subtitle:'市場熱度、當季表現與球團耐心共同決定。',probability:p,modifiers:[`市場 ${S.marketHeat>=0?'+':''}${S.marketHeat||0}%`,`成績修正 ${d>=0?'+':''}${Math.round(d*4)}%`]}).then(r=>{
        if(r.success){const nm=+(cm*1.12).toFixed(2);card('gold','談判成功',`經紀人守住立場，球團把年薪係數提高到 <b class="hl">×${nm}</b>。`);onPick(cy,nm);}
        else{const reduced=+(cm*.95).toFixed(2);choose('球團拒絕反提案',[{t:'接受球團最後報價',main:true,s:`${deal(cy,reduced)}｜反提案失敗後降價 5%`,f:()=>onPick(cy,reduced)},{t:'離開談判桌',warn:true,s:'回到市場，這份報價失效',f:onReject||(()=>onPick(1,Math.max(.65,reduced-.15)))}]);}
      });
    }});
  }
  if(tp.longEligible&&d>=4){const ntM=+(tp.longM*.92).toFixed(2),ntP=clamp(38+d*4+(S.marketHeat||0),35,82);
    opts.push({t:'要求完整不可交易條款',risk:true,probability:ntP,s:`成功機會 ${ntP}%｜薪資略降，成功後合約期間球團不能交易你`,f:()=>animatedRoll({sides:100,title:'合約談判｜不可交易條款',probability:ntP,modifiers:['明星球員談判籌碼']}).then(r=>{
      if(r.success)onPick(tp.longY,ntM,'完整不可交易條款');
      else choose('球團拒絕不可交易條款',[{t:'接受原本長約',main:true,s:deal(tp.longY,tp.longM),f:()=>onPick(tp.longY,tp.longM)},{t:'離開談判桌',warn:true,f:onReject||(()=>onPick(tp.shortY,tp.shortM))}]);
    })});
  }
  if(onReject)opts.push({t:'拒絕，維持現狀',s:'不接受這份合約',f:onReject});
  choose(baseTitle+contractMarketResume(),opts);
}
/* 母隊延長續約:提前綁約 */
function extensionOffer(o){
  const d=contractPerformanceD();
  termChoice(o,d,`母隊提前延長續約 · ${S.teamName()}（合約剩 1 年）`,(y,m,option)=>{
    S.ct={yrs:S.ct.yrs+y,signedYears:S.ct.yrs+y,mult:m,annual:Math.round(salaryFor(S.lv,d)*m*dpMult()),guaranteed:1,extOffered:true,option:option||S.ct.option||null};
    card('gold','延長續約',`與 <b class="hl">${S.teamName()}</b> 達成延長協議，追加 <b class="hl">${y} 年</b>｜固定年薪 ${fmtContractMoney(S.ct.annual,S.org)}｜目前剩餘總值 ${fmtContractMoney(S.ct.annual*S.ct.yrs,S.org)}。`); board(1);
    crossOffers(o);
  }, ()=>{ /* 拒絕延長:維持原合約繼續跑 */
    card('info','婉拒延長',`你婉拒了母隊的提前延長，選擇打完現有合約再說。`);
    crossOffers(o);
  });
}
/* ---------- FA 自由球員 ---------- */
function faFlow(o){
  const d=contractPerformanceD();
  const cap=contractTermCap(S.lv);
  let stayY=faYears(d,cap);
  let stayM=d>=3?1.2:d>=0?1:0.8;
  const injHist=(S.bigInj||0)+(S.tjCount||0);
  if(injHist>=2&&stayY<=3)stayM+=0.15; /* 傷病史多但短約:補高薪 */
  if(S.traits.franchise)stayM=Math.max(stayM,1.2); /* 神主牌 */
  if(S.tradeRefuse>0)stayM*=0.67; /* 否決交易:下約 -1/3 */
  if(S.traits.cancer){ stayM=Math.min(stayM,0.95); /* 毒瘤:續約惡化 */
    if(!S.traits.franchise&&chance(45)){
      card('bad','球團冷處理','母球團明確表示無意續約——你的新聞比你的成績更出名。');
      faMarket(o,d); return; } }
  choose(`合約到期 · 取得自由球員資格｜${faRuleSummary(S.org)}`,[
    {t:`與 ${S.teamName()} 續約`,main:true,s:'接著選擇長約或短約',
     f:()=>termChoice(o,d,`與 ${S.teamName()} 續約 · 選擇合約類型`,(y,m,option)=>{
       S.ct={yrs:y,signedYears:y,mult:m,annual:Math.round(salaryFor(S.lv,d)*m*dpMult()),guaranteed:1,extOffered:false,option:option||null};
       card('info','續約',`與 <b class="hl">${S.teamName()}</b> 完成 <b class="hl">${y} 年</b>續約｜固定年薪 ${fmtContractMoney(S.ct.annual,S.org)}｜合約總值 ${fmtContractMoney(S.ct.annual*y,S.org)}。`); advance(); })},
    {t:'跳出合約，測試自由市場',warn:true,s:'成績不佳可能乏人問津，只能回原隊減薪',f:()=>faMarket(o,d)}]);
}
const FA_MARKETS=[
  {n:'賣方市場',d:'同位置優質球員稀少，多隊手上都有預算',heat:15,offers:1,pay:1.12},
  {n:'正常市場',d:'需求與供給接近平衡，球團按成績出價',heat:0,offers:0,pay:1},
  {n:'預算緊縮',d:'多支球隊接近薪資上限，長約變得保守',heat:-12,offers:-1,pay:.90},
  {n:'同位置供給過剩',d:'市場上同類型球員太多，球團有得挑',heat:-8,offers:-1,pay:.94},
  {n:'爭冠窗口',d:'幾支強隊急著補最後一塊拼圖',heat:10,offers:1,pay:1.08}];
function faMarket(o,d,round){
  round=round||1;const org=S.org,lv=S.lv,offers=[],marketKey=`${S.year}|${org}|${lv}`;if(!S.faMarketState||S.faMarketState.key!==marketKey)S.faMarketState={key:marketKey,market:pick(FA_MARKETS)};const market=S.faMarketState.market;S.marketHeat=market.heat;
  card(market.heat>=8?'good':market.heat<=-8?'bad':'info',`自由市場｜第 ${round} 輪`,`${market.n}｜${market.d}`);
  let n=(d>=3?ri(2,4):d>=1?ri(1,3):d>=-1?(chance(60)?ri(1,2):0):(chance(30)?1:0))+market.offers;
  if(S.traits.cancer)n--;n=Math.max(d>=3?2:0,n);
  const cap=contractTermCap(lv);
  makeFaOffers(org,n,({CPBL1:200,NPB1:800,MLB:2000})[lv]||100,1,cap,lv,S.orgTeam,d)
    .forEach(of=>{of.yrs=clamp(of.yrs,1,cap);of.mult=+((1+Math.max(0,d)*.05+R()*.12)*market.pay*(of.market||1)*(of.interest||1)).toFixed(2);
      if(((S.bigInj||0)+(S.tjCount||0))>=2&&of.yrs<=3)of.mult=+(of.mult+.15).toFixed(2);offers.push({...of,org});});
  if(lv==='CPBL1'&&o>=r99(53))makeFaOffers('NPB',1,1000,2,3,o>=r99(51)?'NPB1':'NPB2',null,d).forEach(of=>offers.push({...of,org:'NPB',mult:+(market.pay*(of.interest||1)).toFixed(2)}));
  if(lv==='NPB1'&&o>=r99(60)&&((S.service&&S.service.NPB)||0)>=faServiceRequirement('NPB',true)&&chance(50))makeFaOffers('MiLB',1,3000,3,5,'MLB',null,d).forEach(of=>offers.push({...of,org:'MiLB',mult:+(market.pay*(of.market||1)*(of.interest||1)).toFixed(2)}));
  if(!offers.length){
    card('bad','自由市場',`第 ${round} 輪沒有正式報價。經紀人提醒你：等待可能換來機會，也可能讓僅存的名額關上。`);
    const none=[{t:`回 ${S.teamName()} 減薪簽約`,main:true,s:'1 年｜年薪係數 ×0.70',f:()=>{S.ct={yrs:1,mult:.7,annual:Math.round(salaryFor(S.lv,d)*.7*dpMult()),guaranteed:1};card('bad','減薪合約',`回到 <b class="hl">${S.teamName()}</b>，簽下 1 年固定年薪 ${fmtContractMoney(S.ct.annual,S.org)} 的證明合約。`);advance();}},{t:'就此引退',warn:true,f:()=>endGame('FA 市場乏人問津，'+S.year+' 年黯然引退。')}];
    if(round<3)none.unshift({t:'再等一輪市場',s:'可能出現新需求，也可能繼續降溫',f:()=>faMarket(o,d,round+1)});choose('市場下一步',none);return;
  }
  const opts=offers.map(of=>{const a=Math.round(salaryFor(of.lv,d)*(of.mult||1)),yrs=clamp(of.yrs||1,1,contractTermCap(of.lv)),div=of.org==='MiLB'&&MLB_TEAM_META[of.team]?MLB_TEAM_META[of.team][0]:'跨聯盟報價';return{
    t:`${of.team}（${LV[of.lv].n}）`,
    s:`${yrs} 年｜年薪 ${fmtContractMoney(a,of.org)}｜總值 ${fmtContractMoney(a*yrs,of.org)}｜${div}`,
    f:()=>{const savedLv=S.lv,savedOrg=S.org,savedTeam=S.orgTeam;S.lv=of.lv;S.org=of.org;S.orgTeam=of.team;
      termChoice(o,d,`${of.team} · 正式合約談判`,(y,m,option)=>{S.lv=savedLv;S.org=savedOrg;S.orgTeam=savedTeam;bookIncome(of.bonus,'bonus',of.org,of.team);const cpblFa=of.org==='CPBL'&&savedOrg==='CPBL'&&savedTeam!==of.team,annualCap=cpblFa&&S.ct?Math.round((S.ct.annual||0)*1.5):null;signTo(of.org,of.lv,of.team,y,+(m*(of.mult||1)).toFixed(2),option,{annualCap,cpblFaFrom:cpblFa?savedTeam:null});S.marketHeat=0;S.faMarketState=null;advance();},
        ()=>{S.lv=savedLv;S.org=savedOrg;S.orgTeam=savedTeam;faMarket(o,d,round+1);},of.mult||1,yrs);}
  };});
  if(round<3)opts.push({t:'暫不簽約，等待下一輪',warn:true,s:'新需求可能出現；現有報價將全部失效',f:()=>faMarket(o,d,round+1)});
  opts.push({t:`回原隊（${S.teamName()}）1 年約`,s:'年薪係數 ×0.90',f:()=>{S.ct={yrs:1,mult:.9,annual:Math.round(salaryFor(S.lv,d)*.9*dpMult()),guaranteed:1};S.marketHeat=0;card('info','回歸',`重回 <b class="hl">${S.teamName()}</b>，1 年固定年薪 ${fmtContractMoney(S.ct.annual,S.org)}。`);advance();}});
  choose(`自由市場報價一覽｜${offers.length} 隊正式出價`,opts);
}
function ageGateUSA(o,minReq){ /* 旅美/日職跳大聯盟:年齡越大越難,28 歲後幾乎關窗 */
  const age=S.age;
  if(age<=22)return 1.0;
  if(age<=24)return 0.75;
  if(age<=26)return 0.5;
  if(age<=27)return 0.3;
  if(age<=28)return 0.15;
  /* 28 歲以後:只有能力遠超門檻(+5)的怪物即戰力還有微弱機會 */
  return o>=minReq+7 ? 0.08 : 0;
}
function ageGateJP(){ /* 旅日:窗口寬,31 歲(衰退前)都還有機會 */
  const age=S.age;
  if(age<=26)return 1.0;
  if(age<=28)return 0.7;
  if(age<=30)return 0.45;
  if(age<=31)return 0.25;
  return 0; /* 32 歲起(進入衰退)關窗 */
}
function crossOffers(o){
  /* 這裡只處理跨聯盟接觸；同聯盟換隊已由低頻正式交易流程處理。 */
  if(S._poachCheckYear!==S.year){S._poachCheckYear=S.year;poachingCheck(S.lastSt,()=>crossOffers(o));return;}
  advance();
}
/* ---------- 選秀與生涯路口 ---------- */
function shuffledDraftTeams(){
  const a=CPBL_TEAMS.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
}
/* 業餘市場只看實戰履歷，不另設隱藏累積條。能力是工具底盤，個人成績、大賽與守備／球速決定能否拿到海外合約。 */
function amateurRecruitingResume(st){
  st=st||S.lastAmateurSt||{};
  const cupYear=(S.hsCupHistory||[]).slice().reverse().find(x=>x.year===S.year)||(S.hsCupHistory||[]).slice(-1)[0],results=cupYear&&cupYear.results||[],tierOf=x=>Number.isFinite(x.tier)?x.tier:Math.max(0,['冠軍','亞軍','四強','八強','十六強','預賽出局'].indexOf(x.rank)),cupPoints=results.reduce((n,x)=>n+(Number(x.pts)||0),0),bestTier=results.length?Math.min(...results.map(tierOf)):5,best=results.slice().sort((a,b)=>tierOf(a)-tierOf(b))[0],cupAdj=clamp(Math.round(cupPoints*.45+(bestTier<=1?3:bestTier<=3?1:0)),0,9),o=ovr();
  let performanceAdj=-8,jpActual=false,usActual=false,line='本季沒有足夠實戰樣本',tool='';
  if(S.pos==='P'){
    const ip=Number(st.IP)||0,era=ip?Number(st.era)||9.99:9.99,whip=ip?Number(st.WHIP)||2.5:2.5,k9=ip?(Number(st.SO)||0)/ip*9:0,velo=Number(st.avgVelo)||pitcherAvgVelocityMph(0);
    performanceAdj=clamp(Math.round((4.25-era)*2.0+(k9-6.4)*.65+(1.45-whip)*3.2+(velo-86)*.18),-8,13);
    jpActual=ip>=25&&era<=3.65&&whip<=1.38&&(k9>=7.6||velo>=89);usActual=ip>=30&&era<=3.05&&whip<=1.22&&(k9>=8.8||velo>=91.5);
    line=`${fmtIP(ip)} IP｜ERA ${era.toFixed(2)}｜WHIP ${whip.toFixed(2)}｜K/9 ${k9.toFixed(1)}｜AVG FB ${velo.toFixed(1)} mph`;tool=`${usActual?'球速／三振已達旅美實戰線':jpActual?'壓制與局數已達旅日實戰線':'局數、壓制或球速尚未同時達到海外直接合約線'}`;
  }else{
    const pa=Number(st.PA)||0,avg=Number(st.avg)||0,obp=pa?((Number(st.H)||0)+(Number(st.BB)||0))/pa:0,slg=slgOf(st),ops=obp+slg,hr=Number(st.HR)||0,sb=Number(st.SB)||0,def=Number(st.DEF)||0;
    performanceAdj=clamp(Math.round((ops-.650)*35+(avg-.250)*18+hr*.22+sb*.07+def*.12),-8,13);
    jpActual=pa>=70&&avg>=.275&&(ops>=.760||(avg>=.290&&def>=4));usActual=pa>=80&&ops>=.850&&(hr>=3||sb>=6||def>=6);
    line=`${pa} PA｜AVG ${avg.toFixed(3).replace(/^0/,'')}｜OPS ${ops.toFixed(3).replace(/^0/,'')}｜${hr} HR｜${sb} SB｜DEF ${def>0?'+':''}${def}`;tool=`${usActual?'打擊與突出工具已達旅美實戰線':jpActual?'打擊與守備／跑壘已達旅日實戰線':'打席、打擊產出或突出工具尚未達到海外直接合約線'}`;
  }
  const total=o+performanceAdj+cupAdj,jpDirect=jpActual&&total>=r99(44),usDirect=usActual&&total>=r99(50),grade=usDirect?'美職國際市場級':jpDirect?'日職支配下合約級':performanceAdj>=4||cupAdj>=4?'國內選秀重點':'建議升學或成棒繼續累積',marketAdj=clamp(Math.round(performanceAdj*.55+cupAdj*.45),-6,10),negotiation=clamp(Math.round(Math.max(0,performanceAdj)+cupAdj)*2,0,18);
  return {o,line,tool,cupPoints,best:best?`${best.cup}・${best.rank}`:'無全國大賽紀錄',cupAdj,performanceAdj,total,jpDirect,usDirect,grade,marketAdj,negotiation};
}
/* 簽約金以總順位計價：每往後一順位必定下降，不會再出現後段順位比前段更高。單位為新台幣萬元。 */
function draftSigningBonus(overall){
  const slot=clamp(Math.round(overall||60),1,60),x=61-slot;
  return Math.round(45+x*10+550*Math.pow(x/60,2));
}
function draftContractNegotiation(result,lv,cb){
  const resume=amateurRecruitingResume(),baseBonus=draftSigningBonus(result.overall),baseAnnual=Math.round(salaryFor(lv,0)*dpMult()),years=result.round<=2?3:2,team=result.team,finish=(bonus,mult,label)=>{
    const paid=bookIncome(bonus,'bonus','CPBL',team);signTo('CPBL',lv,team,years,mult);
    card('gold','新秀合約談成',`第 ${result.round} 輪、總順位第 ${result.overall} 獲 ${team} 指名。<div class="statline">談判結果｜${label}<br>合約年限｜${years} 年<br>固定年薪｜${fmtContractMoney(S.ct.annual,'CPBL')}<br>簽約金｜${fmtContractMoney(bonus,'CPBL')}（估算稅費後 ${fmtLocalMoney(paid.net,'CPBL')}）<br>起始層級｜${LV[lv].n}</div>`);board(0);cb();
  },counterP=clamp(68-result.round*4+resume.negotiation,24,82),salaryP=clamp(58-result.round*3+Math.round(resume.negotiation*.5),22,72);
  choose(`新秀合約談判｜${team}｜總順位第 ${result.overall}`,[
    {t:'接受順位行情合約',main:true,modal:true,s:`${years} 年｜年薪 ${fmtContractMoney(baseAnnual,'CPBL')}｜簽約金 ${fmtContractMoney(baseBonus,'CPBL')}`,f:()=>finish(baseBonus,1,'接受順位行情')},
    {t:'要求簽約金提高 12%',risk:true,probability:counterP,modal:true,s:`成功機會 ${counterP}%｜失敗則回到原順位金額`,f:()=>animatedRoll({sides:100,title:'新秀簽約金談判',probability:counterP,modifiers:[`總順位 #${result.overall}`,`本季實績與大賽履歷 ${resume.negotiation>=0?'+':''}${resume.negotiation}%`]}).then(r=>finish(r.success?Math.round(baseBonus*1.12):baseBonus,1,r.success?'簽約金提高 12%':'球團守住順位行情'))},
    {t:'降低簽約金，爭取年薪提高 10%',risk:true,probability:salaryP,modal:true,s:`成功機會 ${salaryP}%｜長期年薪較高；簽約金先減少 8%`,f:()=>animatedRoll({sides:100,title:'新秀年薪談判',probability:salaryP,modifiers:['以簽約金交換固定年薪']}).then(r=>finish(Math.round(baseBonus*.92),r.success?1.10:1,r.success?'年薪提高 10%':'只換到原年薪'))}
  ]);
}
function draftBroadcast(targetRound){
  const used=new Set([S.name]),targetSlot=targetRound?ri(1,CPBL_TEAMS.length):0,picks=[];
  for(let round=1;round<=10;round++){
    const order=shuffledDraftTeams();
    order.forEach((team,idx)=>{const isPlayer=round===targetRound&&idx+1===targetSlot;
      picks.push({round,overall:picks.length+1,team,isPlayer,name:isPlayer?S.name:randomProspectName(used),
        pos:isPlayer?(S.dpos?DPN[S.dpos]:POSN[S.pos]):pick(['右投手','左投手','捕手','內野手','外野手']),
        school:isPlayer?(S.team||stageLabel()):pick(PROSPECT_SCHOOLS)});
    });
  }
  const targetIndex=picks.findIndex(x=>x.isPlayer),overlay=$('draft-overlay'),ticker=$('draft-ticker'),next=$('draft-next'),auto=$('draft-auto'),skip=$('draft-skip');
  const ann=$('draft-announcement');let cursor=-1,timer=null,complete=false;
  overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
  $('draft-year').textContent=`${S.year} DRAFT`;$('draft-overall').textContent='—';$('draft-round').textContent='等待開選';$('draft-team').textContent='選秀會現場';$('draft-title').textContent='各隊選秀室準備完成';$('draft-detail').textContent='球員名字將逐一揭曉。你不知道自己會在什麼時候被叫到。';
  ticker.innerHTML='';ann.classList.remove('player-picked');next.classList.remove('warn','wide');next.classList.add('main');next.style.display='block';auto.style.display='block';skip.style.display='block';next.textContent='揭曉下一順位';auto.textContent='▶ 自動播放';
  function stopAuto(){if(timer){clearInterval(timer);timer=null;}auto.textContent='▶ 自動播放';}
  function addRow(p){
    const row=document.createElement('div');row.className='draft-row'+(p.isPlayer?' you':'');
    const rank=document.createElement('span');rank.textContent=`R${p.round} · #${p.overall}`;
    const name=document.createElement('b');name.textContent=p.name;
    const team=document.createElement('em');team.textContent=p.team;
    const detail=document.createElement('span');detail.textContent=`${p.pos}｜${p.school}`;
    row.append(rank,name,team,detail);ticker.appendChild(row);ticker.scrollTop=ticker.scrollHeight;
  }
  function setComplete(p){
    complete=true;stopAuto();auto.style.display='none';skip.style.display='none';next.classList.add('wide');next.textContent=p&&p.isPlayer?`接受 ${p.team} 指名，查看合約 ▸`:'確認選秀落榜結果 ▸';
    next.classList.add(p&&p.isPlayer?'main':'warn');
  }
  function revealOne(){
    if(complete)return;cursor++;const p=picks[cursor];if(!p)return;
    $('draft-overall').textContent=String(p.overall).padStart(2,'0');$('draft-round').textContent=`第 ${p.round} 輪 · 第 ${(p.overall-1)%6+1} 順位`;$('draft-team').textContent=`${p.team} 選擇`;$('draft-title').textContent=p.name;$('draft-detail').textContent=`${p.school}｜${p.pos}`;addRow(p);
    if(p.isPlayer){ann.classList.add('player-picked');$('draft-detail').textContent=`就是你！${p.school}｜${p.pos}｜總順位第 ${p.overall}｜簽約金行情 ${fmtContractMoney(draftSigningBonus(p.overall),'CPBL')}`;setComplete(p);}
    else if(cursor===picks.length-1){ann.classList.remove('player-picked');$('draft-team').textContent='選秀會結束';$('draft-title').textContent='未獲球團指名';$('draft-detail').textContent='十輪、六十個順位全部唱名完畢，你的名字沒有出現。';setComplete(null);}
  }
  return new Promise(resolve=>{
    function finish(){stopAuto();overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');document.body.style.overflow='';const p=targetIndex>=0?picks[targetIndex]:null;resolve(p);}
    next.onclick=()=>complete?finish():revealOne();
    auto.onclick=()=>{if(timer){stopAuto();return;}auto.textContent='Ⅱ 暫停播放';revealOne();if(!complete)timer=setInterval(revealOne,620);};
    skip.onclick=()=>{stopAuto();const dest=targetIndex>=0?targetIndex:picks.length-1,skipped=Math.max(0,dest-cursor-1);
      if(skipped){const gap=document.createElement('div');gap.className='draft-row';gap.style.opacity='.65';gap.textContent=`已快速跳過 ${skipped} 個順位…`;ticker.appendChild(gap);}cursor=dest-1;revealOne();};
  });
}
function runDraft(fromSchool,cb){
  const entryStage=S.stage,o=ovr(),resume=amateurRecruitingResume(); const score=o+Math.max(0,22-S.age)*3+resume.marketAdj+ri(-5,5);
  const rd=score>=r99(56)?1:score>=r99(49)?2:score>=r99(43)?ri(3,4):score>=r99(37)?ri(5,7):score>=r99(30)?ri(8,10):0;
  draftBroadcast(rd).then(result=>{
    if(!result){
      card('bad','選秀落榜',`十輪六十個順位全部唱名完畢，始終沒有你的名字。<div class="statline">本季履歷｜${resume.line}<br>大賽最佳｜${resume.best}<br>綜合 ${o}｜實績修正 ${resume.marketAdj>=0?'+':''}${resume.marketAdj}｜年齡加權後評價 ${score}</div>`);
      if(fromSchool){card('info','','回到校隊，明年再來。本年度不會重複參選。');cb('fail');}else cb('fail');return;
    }
    const lv=(rd===1&&o>=r99(50))?'CPBL1':'CPBL2',team=result.team;
    S.proEntry=S.proEntry||entryStage;S.stage='PRO';S.team='';S.svc=0;S.faElig=false;
    card('gold','中華職棒選秀會',`第 <b class="hl">${rd}</b> 輪、總順位第 <b class="hl">${result.overall}</b> 獲 <b class="hl">${team}</b> 指名！順位行情簽約金為 ${fmtContractMoney(draftSigningBonus(result.overall),'CPBL')}。${lv==='CPBL1'?'球團給予即戰力評價。':'球團規劃先從二軍出發。'}接下來仍要正式談年限、年薪與簽約金。`);
    draftContractNegotiation(result,lv,cb);
  });
}
function pathChoiceHS(){
  const o=ovr(),resume=amateurRecruitingResume(),jpCount=resume.performanceAdj>=8||resume.cupAdj>=6?3:2,usCount=resume.performanceAdj>=10&&resume.cupAdj>=4?3:2;
  const opts=[{t:'就讀大學（延長養成）',s:'一年僅 2 場大賽加點｜大二起每年可投入選秀',f:()=>{
      S.stage='U'; S.stageYr=0; S.team=pick(['文化大學','輔仁大學','國立體大','台灣體大','開南大學']);
      card('info','升學',`進入 <b class="hl">${S.team}</b> 棒球隊。`); advance(); }},
    {t:'投入中華職棒選秀',s:'目前綜合 '+o,f:()=>runDraft(false,r=>{
      if(r==='fail')choose('落榜之後',[
        {t:'改就讀大學',main:true,f:()=>{S.stage='U';S.stageYr=0;S.team=pick(['文化大學','輔仁大學','國立體大','台灣體大']);advance();}},
        {t:'加入業餘成棒隊',f:()=>{S.stage='AMA';S.team=pick(['台電','合庫','安永鮮物','綺麗珊瑚']);advance();}}]);
      else advance(); })}];
  if(resume.jpDirect)opts.push({t:'洽談旅日合約',s:`${resume.best}｜日職二軍起步`,f:()=>{
    S.proEntry=S.proEntry||'HS';S.stage='PRO';
    pickOfferUI('日職球團的支配下合約報價','NPB',makeOffers('NPB',jpCount,Math.max(650,800+resume.performanceAdj*55+resume.cupAdj*45),3,3,'NPB2',null),()=>{
      card('gold','旅日','目標：一軍初登場。'); advance(); }); }});
  if(resume.usDirect)opts.push({t:'洽談旅美合約',main:true,s:`${resume.best}｜${resume.total>=r99(54)?'1A':'新人聯盟'}起步`,f:()=>{
    S.proEntry=S.proEntry||'HS';S.stage='PRO';
    pickOfferUI('大聯盟球團的國際簽約報價','MiLB',makeOffers('MiLB',usCount,Math.max(1200,1500+resume.performanceAdj*90+resume.cupAdj*70),3,4,resume.total>=r99(54)?'A1':'R',null),()=>{
      card('gold','旅美','美國的紅土，等著你去征服。'); advance(); }); }});
  choose(`高中畢業｜綜合 ${o}/99｜${resume.grade}`,opts);
}
function pathChoiceU4(){
  const o=ovr();
  const decision=S.draftDecision&&S.draftDecision.year===S.year?S.draftDecision.status:null;
  const amateurTeams=['台電','合庫','安永鮮物','綺麗珊瑚'];
  const joinAmateur=()=>{S.stage='AMA';S.team=pick(amateurTeams);card('info','畢業後加入業餘成棒',`你沒有被送進另一場選秀，而是直接加入 <b class="hl">${S.team}</b>，保留工作、訓練與未來再次參選的選擇。`);advance();};
  const opts=[];
  /* 大四季初已做過決定時，畢業後絕不偷偷重跑同一屆選秀。 */
  if(!decision)opts.push({t:'投入中華職棒選秀',main:true,s:'綜合 '+o+'｜這是本年度唯一一次選秀',f:()=>{
    S.draftDecision={year:S.year,status:'entered'};
    runDraft(false,r=>{
      if(r==='fail'){S.draftDecision={year:S.year,status:'undrafted'};choose('落榜之後',[
        {t:'加入業餘成棒隊',main:true,f:joinAmateur},
        {t:'高掛球鞋',warn:true,f:()=>endGame('大學畢業選秀落榜，決定告別球場。')}]);}
      else advance();
    });
  }});
  opts.push({t:decision==='undrafted'?'本屆已落榜，轉往業餘成棒':'不參加選秀，加入業餘成棒隊',main:decision==='declined'||decision==='undrafted',s:decision==='declined'?'延續季初決定｜不會開啟選秀會':'保留比賽機會，未來仍可自行決定是否再次參選',f:joinAmateur});
  opts.push({t:'離開競技棒球',warn:true,s:'不參加選秀，直接結束球員生涯',f:()=>endGame('大學畢業後決定不投入選秀，告別競技棒球。')});

  /* 大四畢業 (約22歲)，套用最大年齡懲罰 (Senior Sign) */
  const agePenalty = Math.max(0, S.age - 18);
  const reqNPB = r99(44 + Math.floor(agePenalty / 2));
  const reqMiLB = r99(50 + Math.floor(agePenalty / 2));
  const bonusNPB = Math.max(100, 800 - agePenalty * 180);
  const bonusMiLB = Math.max(150, 1500 - agePenalty * 350);
  if(o>=reqNPB)opts.push({t:'洽談旅日合約',s:'大齡新秀，簽約行情極低',f:()=>{S.proEntry=S.proEntry||'U';S.stage='PRO';
    pickOfferUI('日職球團報價','NPB',makeOffers('NPB',2,bonusNPB,2,3,'NPB2',null),advance);}});
  if(o>=reqMiLB)opts.push({t:'洽談旅美合約',s:'大齡底薪簽約 (Senior Sign)',f:()=>{S.proEntry=S.proEntry||'U';S.stage='PRO';
    pickOfferUI('大聯盟球團報價','MiLB',makeOffers('MiLB',2,bonusMiLB,3,4,o>=r99(55)?'A1':'R',null),advance);}});
  choose(`大學畢業 · 綜合能力 ${o}`,opts);
}
if(typeof document!=='undefined'&&document.getElementById('btn-restart')){
  document.getElementById('btn-restart').onclick=function(){
    if(confirm('確定要放棄這段人生，從頭開始嗎？'))location.href=location.pathname;
  };
}
function advance(){
  if(_choiceResultCapture&&_choiceResultCapture.hasResult){continueAction('看完選擇結果，再進入下一年 ▸',advance);return;}
  S.age++; S.year++; S.stageYr++; startYear();
}
/* ================= 生涯終章 ================= */
const TIER_TH={CPBL:[8000,5900,4300,2900],NPB:[6400,4900,3600,2500],MLB:[5000,3900,2900,2200]};
const LG_N={CPBL:'中職',NPB:'日職',MLB:'大聯盟',MINOR:'小聯盟／二軍'};
function careerScore(st){
  if(S.pos==='P'){
    const raw=st.W*13+st.SV*6+(st.HLD||0)*4+st.SO*.9+st.IP*.35,era=st.IP?st.ER*9/st.IP:9.9,whip=st.IP?(st.H+st.BB)/st.IP:2;
    const quality=clamp(.78+(4.25-era)*.14+(1.35-whip)*.18,.42,1.38);
    return raw*quality+(st.qualYrs||0)*70+(st.eliteYrs||0)*105;
  }
  const raw=st.H+st.HR*3+st.SB*.8+st.RBI*.5+st.BB*.3+Math.max(0,st.DEF||0)*6,obp=st.PA?(st.H+st.BB)/st.PA:0,ops=obp+slgOf(st),quality=clamp(.70+(ops-.650)*1.25,.42,1.40);
  return raw*quality+(st.qualYrs||0)*65+(st.eliteYrs||0)*100;
}
function roleName3(r){return r==='SP'?'先發投手':r==='CL'?'終結者':r==='MR'?'後援投手':'投手';}
function primaryDposCode(){
  const entries=Object.entries(S.dposYears||{}).filter(([,years])=>years>0).sort((a,b)=>b[1]-a[1]);
  if(!entries.length)return S.dpos||(S.pos==='C'?'C':null);
  const total=entries.reduce((n,e)=>n+e[1],0),top=entries[0];if(top[1]>=total/2)return top[0];
  return (entries.find(e=>e[0]!=='DH'&&e[0]!=='—')||top)[0];
}
function primaryPos(){ /* 生涯主守位:過半→該位;無過半→工具人/搖擺人(年數降序) */
  if(S.pos==='P'){
    const ry=S.roleYears||{}; const tot=Object.values(ry).reduce((a,b)=>a+b,0);
    if(!tot)return roleName3(S.role);
    const es=Object.entries(ry).sort((a,b)=>b[1]-a[1]);
    if(es[0][1]>=tot/2){if(es[0][0]==='MR'){const rs=Object.entries(S.reliefStatusYears||{}).sort((a,b)=>b[1]-a[1])[0];return rs?`${reliefStatusName(rs[0],'MR')}投手`:'後援投手';}return roleName3(es[0][0]);} /* 有過半 */
    /* 無過半:搖擺人(附主要兩種定位) */
    const list=es.map(e=>({SP:'先發',MR:'後援',CL:'終結者'}[e[0]]||'')).filter(Boolean);
    return '搖擺人('+list.slice(0,2).join('、')+')';
  }
  const dy=S.dposYears||{}; const total=Object.values(dy).reduce((a,b)=>a+b,0);
  if(!total)return S.dpos?DPN[S.dpos]:POSN[S.pos];
  const entries=Object.entries(dy).sort((a,b)=>b[1]-a[1]);
  if(entries[0][1]>=total/2)return DPN[entries[0][0]]||entries[0][0]; /* 有過半 */
  const noDH=entries.filter(e=>e[0]!=='DH'&&e[0]!=='—').map(e=>DPN[e[0]]||e[0]);
  if(!noDH.length)return DPN['DH'];
  return '工具人('+noDH.join('、')+')';
}
function capTeam(bucket){ /* 該聯盟效力最久的球隊,作為名人堂帽徽 */
  const tb=(S.teamTally&&S.teamTally[bucket])||{}; let best=null,bn=-1;
  for(const k in tb)if(tb[k]>bn){bn=tb[k];best=k;}
  return best;
}
function defShare(bucket){ /* 守備貢獻占生涯總價值比重 0~1 */
  const st=S.stats[bucket]; if(!st||S.pos==='P')return 0;
  const off=st.H+st.HR*3+st.SB*0.8+st.RBI*0.5+st.BB*0.3;
  const def=Math.max(0,st.DEF||0)*6;
  return (off+def)>0?def/(off+def):0;
}
function posLegendPhrase(bucket){ /* 依守備占比與獎項決定守位敘述 */
  const share=defShare(bucket), st=S.stats[bucket];
  const dp=primaryDposCode();
  const hasGlove=S.honors.some(h=>h.includes('金手套')||h.includes('守備王'));
  if(S.pos==='P'||!dp||dp==='DH')return '';
  const posN=DPN[dp]||'';
  if(share>=0.34||(hasGlove&&share>=0.22))return `，以${{SS:'史上最偉大的游擊手之一',CF:'守備範圍撼動聯盟的中外野手',C:'蹲捕藝術的化身',_:'守備傳奇'}[dp]||('頂尖'+posN)}之姿`;
  if(hasGlove&&share>=0.12)return `，一位攻守俱佳的${posN}`;
  return '';
}
function honorScore(bucket){
  const lg={CPBL:'中職',NPB:'日職',MLB:'大聯盟'}[bucket];
  const champ={CPBL:'中職總冠軍',NPB:'日本一',MLB:'世界大賽冠軍'}[bucket];
  const ace=/年度最佳投手|賽揚|澤村/;
  let sc=0,mvp=0,aceN=0,king=0;
  S.honors.forEach(h=>{
    if(h.includes(champ)){sc+=90;return;}
    if(ace.test(h)){sc+=460;aceN++;return;}
    if(!h.includes(lg))return;
    if(h.includes('年度MVP')){sc+=420;mvp++;}
    else if(h.includes('新人王'))sc+=140;
    else if(h.includes('白金手套')){sc+=340;king++;}
    else if(h.includes('金手套')){sc+=220;king++;}
    else if(/銀棒|最佳九人|最佳十人|All-MLB/.test(h)){sc+=150;king++;}
    else if(h.includes('守備王')){sc+=220;king++;}
    else if(h.includes('王')){sc+=160;king++;}
    else if(h.includes('明星賽'))sc+=(S.pos==='P'?70:40);
  });
  if(S.traits.franchise)sc+=200; /* 神主牌:忠誠加成 */
  return {sc,mvp,aceN,king};
}
function tierOf(bucket){
  const st=S.stats[bucket]; if(!st)return null;
  const hs=honorScore(bucket);
  const sc=careerScore(st)+hs.sc,th=TIER_TH[bucket];
  let i=sc>=th[0]?0:sc>=th[1]?1:sc>=th[2]?2:sc>=th[3]?3:4;
  const minQualityYears={MLB:7,NPB:6,CPBL:6}[bucket]||0;if(i===0&&(st.qualYrs||0)<minQualityYears)i=1;
  /* 獎項保底:MVP/最高投手獎至少明星球員;單項王至少每日球員 */
  if(hs.mvp||hs.aceN)i=Math.min(i,1);
  else if(hs.king)i=Math.min(i,2);
  return {i,sc:Math.round(sc),name:LG_N[bucket]+['名人堂','明星球員','每日球員','邊緣球員','一頁過客'][i]};
}
function statTable(bucket){
  const st=S.stats[bucket]; if(!st)return '';
  let rows;
  if(S.pos==='P'){
    const era=st.IP>0?(st.ER*9/st.IP).toFixed(2):'-';
    const whip=st.IP>0?((st.H+st.BB)/st.IP).toFixed(2):'-';
    rows=`<tr><th>Yrs</th><th>G</th><th>IP</th><th>W</th><th>L</th><th>SV</th><th>HLD</th><th>SO</th><th>BB</th><th>ERA</th><th>WHIP</th><th>AVG FB</th></tr>
    <tr><td>${st.yr}</td><td>${st.G}</td><td>${fmtIP(st.IP)}</td><td>${st.W}</td><td>${st.L}</td><td>${st.SV||0}</td><td>${st.HLD||0}</td><td>${st.SO}</td><td>${st.BB||0}</td><td>${era}</td><td>${whip}</td><td>${veloText(st)}</td></tr>`;
  }else{
    const obpN = st.PA>0 ? (st.H+st.BB)/st.PA : 0;
    const slgN = slgOf(st);
    const avg = st.AB>0 ? (st.H/st.AB).toFixed(3).replace(/^0/,'') : '-';
    const obp = st.PA>0 ? obpN.toFixed(3).replace(/^0/,'') : '-';
    const slg = st.AB>0 ? slgN.toFixed(3).replace(/^0/,'') : '-';
    const ops = st.AB>0 ? (obpN+slgN).toFixed(3).replace(/^0/,'') : '-';
    rows=`<tr><th>球季</th><th>G</th><th>PA</th><th>AVG</th><th>OBP</th><th>SLG</th><th>OPS</th><th>H</th><th>HR</th><th>RBI</th><th>盜壘</th><th>守備率</th><th>失誤</th><th>守備貢獻</th></tr>
    <tr><td>${st.yr}</td><td>${st.G}</td><td>${st.PA}</td><td>${avg}</td><td>${obp}</td><td>${slg}</td><td>${ops}</td><td>${st.H}</td><td>${st.HR}</td><td>${st.RBI}</td><td>${st.SB}</td><td>${st.TC?fieldingPct(st).toFixed(3).replace(/^0/,''):'—'}</td><td>${st.E||0}</td><td>${st.DEF>0?'+':''}${st.DEF||0}</td></tr>`;
  }
  const asN=st.AS||0;
  return `<p style="margin-top:8px"><b>${LG_N[bucket]}</b>${asN?` · 明星賽 ${asN} 度入選`:''}</p><table class="fin">${rows}</table>`;
}
function careerAggregate(){
  const total=blankStat();let veloWeight=0;
  ['MLB','NPB','CPBL','MINOR'].forEach(bucket=>{const st=S.stats&&S.stats[bucket];if(!st)return;
    total.yr+=st.yr||0;['G','PA','AB','H','_1B','_2B','_3B','HR','RBI','SB','BB','W','L','SV','HLD','SO','ER','AS','DEF','TC','E','PO','A','DP','OFA','CS','SBA'].forEach(k=>total[k]+=(st[k]||0));
    setPitchingOuts(total,pitchingOuts(total)+pitchingOuts(st));veloWeight+=(st.avgVelo||0)*(st.IP||0);
  });
  const loggedYears=new Set((S.log||[]).filter(r=>r&&r.st).map(r=>r.y));if(loggedYears.size)total.yr=loggedYears.size;
  total.avg=total.AB?total.H/total.AB:0;total.era=total.IP?total.ER*9/total.IP:0;total.WHIP=total.IP?(total.H+total.BB)/total.IP:0;total.avgVelo=total.IP?veloWeight/total.IP:0;total.FPCT=total.TC?+((total.TC-total.E)/total.TC).toFixed(3):0;
  return total;
}
function careerOverviewHTML(){
  const st=careerAggregate(),box=(label,value,key)=>`<div class="stat-box${key?' key':''}"><span>${label}</span><b>${value}</b></div>`;
  if(!st.yr)return '<div class="career-empty">尚未留下職業賽季紀錄。進入職業並完成球季後，這裡會自動累積。</div>';
  if(S.pos==='P')return `<div class="career-overview">${box('生涯主要定位',primaryPos(),true)}${box('職業球季',st.yr)}${box('出賽',st.G)}${box('局數',fmtIP(st.IP),true)}${box('勝敗',`${st.W}-${st.L}`)}${box('救援成功 SV',st.SV||0)}${box('中繼點 HLD',st.HLD||0)}${box('三振',st.SO||0)}${box('ERA',st.era.toFixed(2),true)}${box('WHIP',st.WHIP.toFixed(2),true)}${box('平均球速',veloText(st),true)}</div>`;
  const obp=st.PA?(st.H+st.BB)/st.PA:0,slg=slgOf(st),ops=obp+slg;
  const dp=S.dpos||(S.pos==='C'?'C':'2B'),special=dp==='C'?box('阻殺',`${st.CS||0}/${st.SBA||0}`):['LF','CF','RF'].includes(dp)?box('外野助殺',st.OFA||0):box('參與雙殺',st.DP||0);
  return `<div class="career-overview">${box('職業球季',st.yr)}${box('出賽',st.G)}${box('打席',st.PA)}${box('打擊率',st.avg.toFixed(3).replace(/^0/,''),true)}${box('OPS',ops.toFixed(3).replace(/^0/,''),true)}${box('安打',st.H)}${box('全壘打',st.HR,true)}${box('打點',st.RBI)}${box('盜壘',st.SB)}${box('守備率',st.TC?fieldingPct(st).toFixed(3).replace(/^0/,''):'—',true)}${box('失誤',st.E||0)}${special}${box('守備貢獻',`${st.DEF>0?'+':''}${st.DEF||0}`)}</div>`;
}
function wrapCareerTable(html){return html.replace('<table class="fin">','<div class="fin-wrap"><table class="fin">').replace('</table>','</table></div>');}
function careerTotalsHTML(){
  const leagues=['MLB','NPB','CPBL','MINOR'].filter(b=>S.stats&&S.stats[b]);
  const leagueBlocks=leagues.map(b=>`<div class="career-league-block">${wrapCareerTable(statTable(b))}</div>`).join('');
  const intl=S.intlCount?`<div class="career-league-block"><p><b>中華隊國際賽</b> · ${S.intlCount} 屆</p><div class="statline">${S.pos==='P'?`出賽 ${S.intlStat.G}｜局數 ${fmtIP(S.intlStat.IP)}｜${S.intlStat.W} 勝｜${S.intlStat.SV} 救援｜${S.intlStat.SO} 三振｜ERA ${S.intlStat.IP?(S.intlStat.ER*9/S.intlStat.IP).toFixed(2):'—'}`:`出賽 ${S.intlStat.G}｜打席 ${S.intlStat.PA}｜安打 ${S.intlStat.H}｜全壘打 ${S.intlStat.HR}｜打點 ${S.intlStat.RBI}｜打擊率 ${S.intlStat.AB?(S.intlStat.H/S.intlStat.AB).toFixed(3).replace(/^0/,''):'—'}`}</div></div>`:'';
  return `<section class="report-section"><h3>跨聯盟生涯總計</h3>${careerOverviewHTML()}</section><section class="report-section"><h3>各聯盟累積</h3>${leagueBlocks||'<div class="career-empty">目前沒有職業聯盟累積數據。</div>'}${intl}</section>`;
}
function careerYearRowsHTML(){
  const logs=(S.log||[]).filter(r=>r&&r.st);
  if(!logs.length)return '<div class="career-empty">尚未完成任何有正式數據的球季。</div>';
  if(S.pos==='P'){
    const rows=logs.map(r=>{const s=r.st||blankStat(),era=s.IP?(s.ER*9/s.IP).toFixed(2):'—',whip=s.IP?((s.H+s.BB)/s.IP).toFixed(2):'—';return `<tr class="${r.y===S.year?'current':''}"><td>${r.y}</td><td>${r.age}</td><td style="text-align:left;white-space:nowrap">${r.tm}</td><td>${roleN(s.role||'SP',s.reliefStatus)}</td><td>${s.G||0}</td><td>${fmtIP(s.IP||0)}</td><td>${s.W||0}-${s.L||0}</td><td>${s.SV||0}</td><td>${s.HLD||0}</td><td>${s.SO||0}</td><td>${s.BB||0}</td><td>${era}</td><td>${whip}</td><td>${veloText(s)}</td></tr>`;}).join('');
    return `<div class="fin-wrap"><table class="fin career-year-table"><thead><tr><th>年度</th><th>齡</th><th style="text-align:left">球隊</th><th>定位</th><th>G</th><th>IP</th><th>W-L</th><th>SV</th><th>HLD</th><th>SO</th><th>BB</th><th>ERA</th><th>WHIP</th><th>AVG FB</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  const rows=logs.map(r=>{const s=r.st||blankStat(),obp=s.PA?(s.H+s.BB)/s.PA:0,slg=slgOf(s),ops=obp+slg;return `<tr class="${r.y===S.year?'current':''}"><td>${r.y}</td><td>${r.age}</td><td style="text-align:left;white-space:nowrap">${r.tm}${r.p?'・'+r.p:''}</td><td>${s.G||0}</td><td>${s.PA||0}</td><td>${s.AB?(s.H/s.AB).toFixed(3).replace(/^0/,''):'—'}</td><td>${s.PA?obp.toFixed(3).replace(/^0/,''):'—'}</td><td>${s.AB?slg.toFixed(3).replace(/^0/,''):'—'}</td><td>${s.AB?ops.toFixed(3).replace(/^0/,''):'—'}</td><td>${s.H||0}</td><td>${s.HR||0}</td><td>${s.RBI||0}</td><td>${s.SB||0}</td><td>${s.TC?fieldingPct(s).toFixed(3).replace(/^0/,''):'—'}</td><td>${s.E||0}</td><td>${s.DEF>0?'+':''}${s.DEF||0}</td></tr>`;}).join('');
  return `<div class="fin-wrap"><table class="fin career-year-table"><thead><tr><th>年度</th><th>齡</th><th style="text-align:left">球隊</th><th>G</th><th>PA</th><th>AVG</th><th>OBP</th><th>SLG</th><th>OPS</th><th>H</th><th>HR</th><th>RBI</th><th>盜壘</th><th>守備率</th><th>失誤</th><th>守備貢獻</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function amateurHistoryHTML(){
  const rows=(S.log||[]).filter(r=>r&&!r.st).map(r=>`<tr><td>${r.y}</td><td>${r.age}</td><td style="text-align:left;white-space:nowrap">${r.tm}</td><td style="text-align:left">${r.line}</td></tr>`).join('');
  return rows?`<section class="report-section"><h3>業餘與傷缺紀錄</h3><div class="fin-wrap"><table class="fin"><thead><tr><th>年度</th><th>齡</th><th style="text-align:left">球隊</th><th style="text-align:left">紀錄</th></tr></thead><tbody>${rows}</tbody></table></div></section>`:'';
}
function careerHonorsHTML(){
  const groups={'年度主要獎項':{},'聯盟單項王':{},'最佳陣容與守備':{},'明星與短期獎':{},'冠軍與國際賽':{},'業餘大賽':{},'球團／公益獎':{}},cups=[...HS_CUPS,...U_CUPS,'大學春季聯賽','大專盃'];
  (S.honors||[]).forEach(h=>{const m=String(h).match(/^(\d{4})\s+(.+)$/),yr=m?m[1]:'',awd=m?m[2]:h;let group;
    if(cups.some(c=>awd.includes(c)))group='業餘大賽';else if(/經典賽|12強|中華隊|總冠軍|日本一|世界大賽冠軍/.test(awd))group='冠軍與國際賽';else if(/打擊王|安打王|全壘打王|打點王|盜壘王|上壘王|防禦率王|勝投王|三振王|救援王|中繼王|最優秀中繼/.test(awd))group='聯盟單項王';else if(/金手套|銀棒|白金手套|最佳九人|最佳十人|All-MLB|指定打擊/.test(awd))group='最佳陣容與守備';else if(/明星賽|單月|單週/.test(awd))group='明星與短期獎';else if(/MVP|賽揚|澤村|新人王|最佳投手|後援投手|東山再起|最佳進步/.test(awd))group='年度主要獎項';else group='球團／公益獎';
    (groups[group][awd]||(groups[group][awd]=[])).push(yr);
  });
  const blocks=Object.entries(groups).map(([label,items])=>{const rows=Object.entries(items);if(!rows.length)return '';return `<section class="honor-group"><h5>${label}</h5>${rows.map(([awd,yrs])=>`<p>🏆 ${awd}${yrs.length>1?` ×${yrs.length}`:''}<br><em>${yrs.filter(Boolean).join('、')}</em></p>`).join('')}</section>`;}).join('');
  const honorYears=new Set((S.honors||[]).map(h=>(String(h).match(/^(\d{4})/)||[])[1]).filter(Boolean)).size,major=(S.honors||[]).filter(h=>/MVP|賽揚|澤村|新人王|王|金手套|銀棒|最佳九人|最佳十人|All-MLB/.test(h)).length;
  const watch=(S.awardWatch||[]).length?`<section class="report-section"><h3>最近一次獎項競爭</h3><div class="award-grid">${S.awardWatch.map(x=>`<div class="award-item">◌ ${x}</div>`).join('')}</div></section>`:'';
  return `<div class="career-award-count"><div><span>正式榮譽</span><b>${(S.honors||[]).length}</b></div><div><span>主要個人獎</span><b>${major}</b></div><div><span>得獎年度</span><b>${honorYears}</b></div></div><section class="report-section"><h3>獎項與大賽成績</h3>${blocks?`<div class="honor-groups">${blocks}</div>`:'<div class="career-empty">目前尚未獲得正式獎項；明星賽、單項王、年度獎與冠軍會在球季結算後記錄。</div>'}</section>${watch}<section class="report-section"><h3>連霸與潛力突破</h3>${potentialProgressHTML()}</section>`;
}
function careerTeamsHTML(){
  const logs=(S.log||[]).filter(x=>x&&x.tm),stops=[];
  logs.forEach(row=>{const last=stops[stops.length-1];if(last&&last.team===row.tm&&last.end===row.y-1){last.end=row.y;last.seasons++;last.last=row;last.games+=(row.st&&row.st.G)||0;}else stops.push({team:row.tm,start:row.y,end:row.y,seasons:1,last:row,games:(row.st&&row.st.G)||0});});
  const current=S.stage==='PRO'?(S.orgTeam||S.teamName()):(S.team||stageLabel()),last=stops[stops.length-1];if(current&&(!last||!String(last.team).includes(current)))stops.push({team:current,start:S.year,end:S.year,seasons:0,last:null,games:0,current:true});else if(last)last.current=true;
  const timeline=stops.map(x=>`<div class="career-team-stop${x.current?' current':''}"><span>${x.start===x.end?x.start:`${x.start}–${x.end}`}</span><b>${x.team}${x.current?'｜目前':''}</b><small>${x.last?x.last.line:'目前名單與合約身分'}</small><em>${x.seasons?`${x.seasons} 季・${x.games} 場`:'本季'}</em></div>`).join('');
  const roster=S.org==='MiLB'?(()=>{const rs=mlbRosterStatus(),mr=mlbRosterState();return `<section class="report-section"><h3>MLB 名單履歷</h3><div class="hs-formula">目前｜<b>${rs.label}</b><br>選擇權使用年度｜${mr.optionSeasons.length?mr.optionSeasons.join('、'):'尚未使用'}<br>DFA ${mr.dfaCount||0} 次｜Outright ${mr.outrightCount||0} 次</div></section>`;})():'';
  return `<section class="report-section"><h3>球隊與層級軌跡</h3>${timeline?`<div class="career-team-timeline">${timeline}</div>`:'<div class="career-empty">完成第一個年度後，球隊軌跡會出現在這裡。</div>'}</section>${roster}`;
}
function financeTypeLabel(row){const map={salary:'薪資入帳',bonus:'簽約金',living:'生活支出',luxury:'個人消費',family:'家庭支出',investment:'投資損益','asset-transfer':'資產配置','debt-payment':'償還負債',interest:'負債利息'};return row.label||map[row.type]||'財務紀錄';}
function careerFinanceHTML(){
  const f=syncFinance(),box=(label,value)=>`<div class="stat-box"><span>${label}</span><b>${value}</b></div>`,ledger=(f.ledger||[]).slice().reverse();
  const overview=`<div class="finance-overview">${box('可動用現金',fmtMoney(f.cash))}${box('目前淨資產',fmtMoney(f.netWorth))}${box('合約總收入',fmtMoney(f.gross))}${box('累計稅負',fmtMoney(f.tax))}${box('經紀費',fmtMoney(f.agent))}${box('場外總支出',fmtMoney((f.living||0)+(f.luxury||0)+(f.family||0)))}${box('投資＋房產',fmtMoney((f.investments||0)+(f.homeEquity||0)))}${box('負債',fmtMoney(f.debt))}</div>`;
  const contract=S.stage==='PRO'&&S.ct?`<div class="hs-formula"><b>目前合約</b>｜${S.orgTeam||'球團'}｜剩餘 ${S.ct.yrs} 年｜年薪 ${fmtLocalMoney(S.ct.annual||0,S.org)}｜保障 ${Math.round((S.ct.guaranteed||0)*100)}%${S.ct.option?`｜${S.ct.option}`:''}</div>`:'<div class="career-empty">目前沒有有效職業合約。</div>';
  const rows=ledger.map(r=>{const expense=(r.net||0)<0||['living','luxury','family','interest'].includes(r.type),income=(r.gross||0)>0||(r.net||0)>0,amount=r.gross?`收入 ${fmtMoney(r.gross)}｜實拿 ${fmtMoney(r.net||0)}`:r.amount?fmtMoney(r.amount):fmtMoney(Math.abs(r.net||0));return `<tr><td>${r.year||'—'}</td><td style="text-align:left"><span class="finance-ledger-type ${income?'income':expense?'expense':''}">${financeTypeLabel(r)}</span></td><td>${amount}</td><td>${r.tax?fmtMoney(r.tax):'—'}</td><td>${r.agent?fmtMoney(r.agent):'—'}</td><td>${r.borrowed?`借款 ${fmtMoney(r.borrowed)}`:'—'}</td></tr>`;}).join('');
  return `<section class="report-section"><h3>資產與現金流</h3>${overview}</section><section class="report-section"><h3>目前合約</h3>${contract}</section><section class="report-section"><h3>生涯財務明細</h3>${rows?`<div class="fin-wrap"><table class="fin"><thead><tr><th>年度</th><th style="text-align:left">項目</th><th>金額</th><th>稅</th><th>經紀費</th><th>資金缺口</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="career-empty">目前尚無收入或支出紀錄。</div>'}<div class="standings-foot">跨國合約在交易當下以當地貨幣顯示；生涯資產表統一折算為新台幣，方便比較現金、資產、稅負與負債。</div></section>`;
}
let careerReportTab='totals';
function renderCareerReport(tab){
  careerReportTab=tab||careerReportTab;document.querySelectorAll('.career-tab').forEach(b=>b.classList.toggle('on',b.dataset.tab===careerReportTab));
  const team=S.stage==='PRO'?(S.orgTeam||S.teamName()):(S.team||stageLabel());$('career-report-title').textContent=`${S.name}｜生涯資料`;$('career-report-sub').textContent=`${S.year}・${S.age} 歲・${team}｜資料統計至最近完成球季`;
  const views={totals:careerTotalsHTML,years:()=>`<section class="report-section"><h3>逐年正式成績</h3>${careerYearRowsHTML()}</section>${amateurHistoryHTML()}`,honors:careerHonorsHTML,teams:careerTeamsHTML,finance:careerFinanceHTML};$('career-report-body').innerHTML=(views[careerReportTab]||views.totals)();$('career-report-body').scrollTop=0;
}
function openCareerReport(tab){if(!S)return;renderCareerReport(tab||careerReportTab);openFx('career-overlay');}
const FAN={
 0:['{n}退休了……我的青春也跟著結束了 QQ','以後帶小孩進場，我會指著引退背號說：爸爸看過{n}打球。','外電已經在算名人堂得票率了，根本沒有懸念','謝謝你把台灣棒球帶到世界的舞台上','這種等級的選手，一個世代只會出現一個','引退試合門票秒殺，黃牛價已經翻五倍了','數據會被後人超越，但那個時代只有一個{n}','今天不討論歷史排名，只想好好說一聲謝謝','從新人年看到最後一年，原來我們一起老了','他的精華剪輯長到可以播一整晚','每座客場都有人留下來鼓掌，這就是傳奇的份量','名人堂匾額還沒做，大家已經在爭該戴哪隊的帽子'],
 1:['{n}確定引退，推文區已經滿滿的 QQ','明星賽常客就這樣說再見了，唉','生涯數據攤開來還是很漂亮，值得一面背號布幕','謝謝你每一次的全力奔跑，辛苦了','小時候牆上貼的海報就是他，時代的眼淚','不是歷史第一，但一定是這個年代最熟悉的名字之一','最難忘的不是某一支安打，是他每年都還在名單上','球衣先別收，我還沒準備好接受他真的退休','客隊球迷都願意起立，這份尊重不是數據送的','那幾次季後賽關鍵表現，我大概會講給孫子聽','他把明星球員該做的事做了十幾年，真的不容易','最後一季還有人買他的球衣，答案已經很清楚了'],
 2:['稱不上超級巨星，但每天打開轉播都看得到他，這樣就夠了','默默扛了這麼多年，辛苦了','這種工兵型選手才是一支球隊真正的骨幹','數據不會說謊，穩定就是他最大的天賦','總教練換了好幾任，他還是能找到自己的角色','不是頭版人物，卻是隊友口中最可靠的那一個','每支冠軍隊都需要這種不搶鏡的人','生涯沒有華麗標題，但有很多重要的小事','謝謝你讓板凳、守備和跑壘也有人值得應援','他上場時我不一定尖叫，但總是覺得安心','這種球員退了之後，球隊才會發現少了多少東西','願意把每個普通球季打完，本身就是一種成就'],
 3:['板凳暖了這麼多年，也是一種浪漫啦','至少他真的站上過職棒舞台，比鍵盤上的我們都強','代打人生，謝謝那幾支關鍵安打','二軍發電機引退，只有鐵粉會記得，但我們記得','每次登錄名單看到他，都覺得又多一層保險','沒有固定位置還能撐這麼久，代表他真的很會生存','那支再見安打夠我們記一輩子了','替補球員的故事不會上紀錄片，但一樣值得尊敬','他可能只得到幾十個打席，準備卻從來沒有少一天','謝謝你接受每一個不起眼的任務','不是每個職業球員都能成為明星，但每個人都付過代價','最後一次被叫上場時，全隊站起來的畫面我忘不了'],
 4:['欸這誰？……查了一下，原來真的打過職業喔','棒球真的好難，祝福第二人生順利','又一個被現實打敗的追夢人，唏噓','看板留言只有三則，其中一則還是他本人回的','至少照片裡的他真的穿過職業球衣','二軍也有人每天提早兩小時到球場，辛苦了','沒有站穩一軍不代表那些年都是假的','希望下一份工作不需要每天擔心明天會不會被釋出','查完他的經歷，突然覺得能留下任何紀錄都很難','夢想沒有成功版本，走過就算數','也許沒多少人認識，但家人一定知道他撐了多久','祝福離開球場後，終於能好好睡一覺'],
};
/* 54 種基礎告別場景；依代表聯盟、成就層級與守備身分篩選，再加入生涯特性專屬版本。 */
const RETIRE_SCENES={
 common:[
  {maxTier:1,t:'球場在賽前播放整段生涯年表。當年份從新人球季一路跳到今天，{n}站在休息室口，直到自己的第一張證件照出現才低頭笑了。'},
  {maxTier:1,t:'兩隊球員在邊線排成長廊，{n}抱著花束逐一擊掌。最後一位是當年的新人隊友，如今已經成了教練。'},
  {maxTier:2,t:'大螢幕沒有剪輯全壘打或三振，而是播放隊友談論你的片段。每個人記得的，都是鏡頭沒拍到的小事。'},
  {maxTier:2,t:'最後一次唱名後，現場播報員停了幾秒才念完致詞。{n}把帽沿壓低，仍被攝影機拍到泛紅的眼眶。'},
  {minTier:1,maxTier:3,t:'隊友把休息室裡的名牌完整拆下，背面寫滿每個人的留言。{n}把它放進裝備袋，成為最後帶走的球場物品。'},
  {minTier:1,maxTier:3,t:'賽後球場沒有立刻關燈。{n}獨自走到守備位置站了一會兒，場務人員遠遠等著，沒有催促。'},
  {minTier:2,t:'儀式很短，只有一束花、一件裱框球衣和全隊合照。當快門按下，隊友突然一起喊出你的綽號。'},
  {minTier:2,t:'最後一趟球隊巴士離開球場前，司機把車停了幾分鐘。{n}回頭看著選手入口，才終於在座位坐下。'},
  {minTier:3,t:'沒有全國轉播，球團只在社群上傳一支九十秒影片。留言不算多，但每一則都叫得出你曾穿過的背號。'},
  {minTier:3,t:'整理置物櫃時，{n}找到新人年留下的交通票根。裝備已經換過無數次，這張薄紙卻一路留到了最後。'},
  {t:'家人受邀走進場內。{n}把陪伴生涯的{gear}交給孩子，告訴他不必成為球員，只要記得自己曾經很愛棒球。'},
  {t:'簽名會排到球場準備熄燈。工作人員幾次提醒時間，{n}還是把最後一件球衣簽完，才向空下來的看台揮手。'}],
 CPBL:[
  {maxTier:1,t:'{n}的引退戰選在臺北大巨蛋。四萬人看著你完成{lastPlay}，全場燈光暗下，只剩一道追光陪你繞場。'},
  {maxTier:1,t:'母隊把外野看台排成你的背號。六隊代表各送上一顆簽名球，象徵你走過的整個中職世代。'},
  {maxTier:1,t:'你要求把告別日辦成公益賽。門票收入投入基層棒球，曾受幫助的小球員站滿兩側，把一百顆簽名球送到手中。'},
  {maxTier:2,t:'最後一個主場系列賽，客隊應援團先奏了一次你的應援曲。主場看台接著唱完，連主播都安靜沒有插話。'},
  {maxTier:2,t:'球團邀回歷年隊友，從高中學長到新人學弟依序獻花。總教練講到第一次見面時，台下笑聲和眼淚混在一起。'},
  {maxTier:2,t:'環島客場的最後一站，客隊把一壘側燈光留給{n}。不同隊球迷舉起的，竟是你效力各時期的球衣。'},
  {minTier:1,maxTier:3,t:'熟悉的應援曲只吹奏了一遍。{n}向內野、外野與兩側休息室各鞠一躬，然後把最後一顆比賽球交給場務。'},
  {minTier:1,maxTier:3,t:'午後大雨讓儀式延後，球迷卻沒有離場。雨停後你踏上濕紅土，全場用沒有樂器的清唱完成最後應援。'},
  {minTier:2,t:'球團把你的第一張一軍登錄表和最後一張排在一起。兩張紙中間沒有傳奇標題，只有許多撐過二軍與低潮的年份。'},
  {minTier:2,t:'轉播單位剪了一段「那些不在精華裡的守備」。{n}看完只說，原來有人記得，導播室裡卻先哭成一片。'},
  {minTier:3,t:'二軍最終戰後，學弟用紙膠帶在牆上貼出「辛苦了」。沒有觀眾席煙火，但全隊把你抬出休息室一次。'},
  {minTier:3,t:'球團官網刊出引退消息，母校棒球隊隔天全員穿你的舊背號練球。照片傳到手機時，{n}正在清空置物櫃。'}],
 NPB:[
  {maxTier:1,t:'球團安排正式引退試合。{lastPlay}後，監督親自上場迎接；兩軍列隊，隊友以胴上げ把{n}高高拋起。'},
  {maxTier:1,t:'滿場球迷把多年應援毛巾拼成巨幅背號。{n}用日文與中文各說一次謝謝，最後一句被全場掌聲蓋過。'},
  {maxTier:1,t:'東京與台北的體育報同日以你的背影做頭版。場內播放兩地生涯，字幕最後只留下「海を越えた」。'},
  {maxTier:2,t:'客隊應援團先奏出你的舊應援曲，主場再接著唱完。{n}抱著花束慢慢繞場，走了比預定時間多一倍。'},
  {maxTier:2,t:'車站通往球場的長廊換上告別海報。最後一戰散場後，仍有球迷排隊在每張海報前合照。'},
  {maxTier:2,t:'昔日台灣與日本隊友透過影片致詞。翻譯坐在角落沒有工作，因為{n}已經能聽懂每一句玩笑。'},
  {minTier:1,maxTier:3,t:'廣播念出生涯成績時，客場球迷也起立鼓掌。記者用不太標準的中文問「還會回來嗎」，你笑著點頭。'},
  {minTier:1,maxTier:3,t:'球團送上紀念框裱球衣與花束。{n}走到投手丘旁抓起一把土，裝進新人年就在使用的小布袋。'},
  {minTier:2,t:'最終戰後，隊友在室內練習場等你。大家沒有致詞，只把簽滿名字的練習衣套到你身上。'},
  {minTier:2,t:'整理置物櫃那天，翻譯陪你走完最後一段球員通道。警衛伯伯深深鞠躬，你也用同樣角度回禮。'},
  {minTier:3,t:'二軍球場只辦了簡短送別會。幾名長年追隨的球迷帶著手工中文布條，讓{n}站在原地看了很久。'},
  {minTier:3,t:'引退消息刊在地方版一角。隔天自主訓練時，仍有十幾位球迷等在門外，把你在異鄉的每一年都寫進信裡。'}],
 MLB:[
  {maxTier:1,pos:'P',t:'主場最終戰，{n}完成最後一局後，總教練親自走上投手丘。你把球交出去，回到休息室後又兩度出來接受 Curtain Call。'},
  {maxTier:1,pos:'B',t:'主場最終戰，{n}走進最後一個打席前，全場起立，主審退到一旁等待。打席結束後，你兩度走出休息室接受 Curtain Call。'},
  {maxTier:1,t:'三十座球場在同一晚播放致敬畫面。客場大螢幕上的生涯照片停住，全場掌聲一路延續到下一名打者熱身。'},
  {maxTier:1,t:'當地報紙用整版刊出你的背影，標題沒有寫數據，只寫「An Era Walks Away」。台灣版則一路直播到球場熄燈。'},
  {maxTier:2,pos:'P',t:'最後一次登板後，捕手沒有把球交給裁判，而是直接塞回你的手套。兩隊打者全站在階梯前鼓掌。'},
  {maxTier:2,pos:'B',t:'最後一個守備半局結束，你被單獨換下場。場上隊友刻意放慢腳步陪你走回休息室，全場手機燈光亮起。'},
  {maxTier:2,t:'告別系列賽前，球隊把每個效力城市的背號都掛進球員通道。{n}從第一件一路摸到最後一件才走進場。'},
  {minTier:1,maxTier:3,t:'球隊致贈裱框球衣與主場紅土。台灣遠道而來的球迷留在三壘側，把中文應援喊到工作人員開始拆舞台。'},
  {minTier:1,maxTier:3,t:'最後一趟客場，對手在賽前送上酒莊年份與城市鑰匙。{n}笑說行李已經超重，卻把每件紀念品都親自帶走。'},
  {minTier:2,t:'俱樂部只安排一段簡短賽前儀式。當地記者寫道：「他不是超級巨星，但他是每個總教練都想要的球員。」'},
  {minTier:3,t:'你在社群貼出一張空蕩球場，配文只有「Thank you, baseball.」。台灣時間深夜，昔日小聯盟隊友一個個留下留言。'},
  {minTier:3,t:'最後一次被移出名單後，俱樂部讓{n}穿球衣進場告別。沒有正式打席，卻有整排牛棚投手走過來擁抱。'}],
 MINOR:[
  {t:'沒有鎂光燈。{n}把釘鞋擦乾淨放進袋子，跟隊友一一擁抱，走出球場時回頭看了記分板最後一眼。'},
  {t:'長途巴士出發前，全隊在車邊送上一顆簽名球。有人開玩笑說終於少一件行李，卻沒有人先上車。'},
  {t:'寄宿家庭替你做了最後一頓晚餐。牆上仍貼著新人聯盟時的合照，那時每個人都相信自己會上大聯盟。'},
  {t:'二軍／小聯盟球場的夕陽跟第一年一樣。{n}把打擊練習撿到的最後一顆球送給場邊唯一等候的孩子。'},
  {t:'裝備管理員把你歷年用過的背號布章縫成一小塊紀念布。沒有官方儀式，這就是俱樂部最真誠的告別。'},
  {t:'球隊在休息室白板寫下「下一站順利」。{n}最後一次擦掉自己的名字，發現隊友早已在背面簽滿祝福。'}]
};
const RETIRE_TRAIT_SCENES={
 franchise:'球團宣布將討論退休背號。{n}站在唯一效力過的母隊主場中央，從新人席一路望向曾經坐過的核心位置。',
 community:'受你幫助過的基層球員擔任開球嘉賓。當孩子們排成兩列，{n}才知道那些場外日子也成了生涯的一部分。',
 iron:'大螢幕倒數連續出賽紀錄，最後停在一個難以想像的數字。醫療與防護團隊全被請到場內，和{n}一起接受掌聲。',
 phoenix:'曾替你動手術的醫師帶著第一張術後影像到場。{n}把它和最後一件球衣放在一起：中間隔著一段沒有人敢保證能完成的路。',
 leader:'隊友沒有送昂貴禮物，而是輪流說出低潮時被你拉住的那一天。儀式結束後，{n}成了最後離開休息室的人。',
 fanhero:'球團把致詞時間交給看台。十名不同年代的球迷輪流說故事，{n}每一張臉竟然都認得。'};
function retirementSceneCount(){return Object.values(RETIRE_SCENES).reduce((n,a)=>n+a.length,0)+Object.keys(RETIRE_TRAIT_SCENES).length;}
function retirementSceneText(scene,lg,nm){
  const last=S.pos==='P'?'最後一次登板':'最後一個打席',gear=S.pos==='P'?'手套':'球棒',team=S.orgTeam||((S.log||[]).slice(-1)[0]||{}).tm||'母隊';
  return String(scene.t||scene).replaceAll('{n}',nm).replaceAll('{lastPlay}',last).replaceAll('{gear}',gear).replaceAll('{team}',team).replaceAll('{lg}',LG_N[lg]||'職棒');
}
function retireScene(tiers){
  /* tiers: {CPBL:{i,sc},NPB:...,MLB:...} 有出賽才有 */
  /* 生涯代表聯盟＝出賽最久的頂級聯盟;分級取生涯最佳(i 最小) */
  let lg=bucketOf(S.lv), bestI=4;
  const order=['MLB','NPB','CPBL'];
  order.forEach(b=>{ if(tiers[b]&&tiers[b].i<bestI){ bestI=tiers[b].i; } });
  /* 代表聯盟:在最佳分級的聯盟中,取出賽年資最多者 */
  let repYr=-1;
  order.forEach(b=>{ if(tiers[b]&&tiers[b].i===bestI){ const yy=S.stats[b]?S.stats[b].yr:0; if(yy>repYr){repYr=yy;lg=b;} } });
  const t=tiers[lg], i=t?t.i:4, yr=S.year,nm=`<b class="hl">${S.name}</b>`;
  let txt='';
  if(lg==='CPBL'){
    if(i===0)txt=pick([
      `${nm} 的引退戰選在<b class="hl">臺北大巨蛋</b>。四萬人看著你完成${S.pos==='P'?'最後一次登板':'最後一個打席'}，全場燈光暗下，只剩一道追光。兩隊球員列隊脫帽，你繞場一周，把陪伴生涯的${S.pos==='P'?'手套':'球棒'}留在本壘板旁。`,
      `例行賽最後一晚，${nm} 穿著母隊球衣走進滿場主場。歷年隊友從休息室依序現身，外野看台排出你的背號；致詞結束後，球迷又把應援曲唱了整整一遍。`,
      `${nm} 要求把引退儀式辦成公益賽。門票收入投入基層棒球，曾受你幫助的小球員站滿兩側；最後不是煙火，而是一百顆孩子簽名的棒球送到你手中。`]);
    else if(i===1)txt=pick([
      `球團為 ${nm} 舉辦引退儀式。大螢幕從高中時期一路播到${S.pos==='P'?'職棒初登板':'職棒初安打'}，老隊友回來獻花，總教練致詞時數度停頓。最後你向四個方向深深鞠躬。`,
      `${nm} 在主場完成告別。球團沒有安排冗長節目，只把全隊留在場上陪你繞場；每走到一個看台區，球迷就喊出一段不同年代的應援口號。`]);
    else if(i===2)txt=`${S.pos==='P'?'球季最後一個主場日，球團安排你先發登板。投完第一局後被換下場，全場觀眾起立鼓掌，隊友在休息室門口排成兩排跟你擊掌。沒有煙火，沒有演唱會，但看台上有人拉起手寫布條：「謝謝你投出的每一顆全力的球」。':'球季最後一個主場日，球團安排你先發打第一棒。第一個打席結束後被換下場，全場觀眾起立鼓掌，隊友在休息室門口排成兩排跟你擊掌。沒有煙火，沒有演唱會，但看台上有人拉起手寫布條：「謝謝你的每一次全力奔跑」。'}`;
    else txt=`你在球團官網的一則新聞稿裡宣布引退。發文的那個晚上，還是有幾十個老球迷湧進你的社群留言：「辛苦了」。職業棒球就是這樣——不是每個人都有儀式，但每個認真打過球的人，都有人記得。`;
  }else if(lg==='NPB'){
    if(i<=1)txt=pick([
      `球團為 ${nm} 安排了<b class="hl">引退試合</b>。${S.pos==='P'?'你投完最後一名打者後，監督親自走上投手丘換人':'最後一個守備半局結束，你被單獨留在場上'}。兩軍沿邊線列隊，隊友以胴上げ把你高高拋起，看台舉著中文「謝謝」毛巾。`,
      `${nm} 的引退儀式在滿場主場舉行。昔日台灣與日本隊友透過影片致詞，球迷把十二年來使用過的應援毛巾拼成巨幅背號；你用日文與中文各說了一次謝謝。`,
      `最終戰後，${nm} 抱著花束慢慢繞場。客隊應援團先奏出你的舊應援曲，主場球迷再接著唱完；隔天體育報以「跨越語言的生涯」作為頭版標題。`]);
    else if(i===2)txt=`最終戰賽後，球團在場邊為你舉行了簡短的引退セレモニー：花束、紀念框裱的球衣、與監督的合影。廣播念出你的生涯成績時，客場球迷也起立鼓掌。記者會上有記者用不太標準的中文問你「還會回來嗎」，你笑著點頭。`;
    else txt=`你透過球團發表引退聲明。整理置物櫃的那天，翻譯陪你走完最後一段球員通道，警衛伯伯跟你深深鞠了一躬。異鄉打拚的日子結束了，行李箱裡裝著幾件捨不得丟的練習衫。`;
  }else if(lg==='MLB'){
    if(i<=1)txt=pick(S.pos==='P'?[
      `主場最終戰，${nm} 完成最後一局後，總教練親自走上投手丘。全場起立，內野手逐一上前擁抱；你把球交給教練，走回休息室後又兩度出來接受 <b class="hl">Curtain Call</b>。`,
      `${nm} 的最後一次登板安排在滿場主場。捕手沒有把最後一顆球交給裁判，而是直接塞進你的手套；兩隊打者全站在階梯前鼓掌，台灣轉播一路留到球場熄燈。`,
      `球團在系列賽前宣布這會是 ${nm} 的告別先發。你離場時沒有音樂，只有全場持續數分鐘的掌聲；隔天當地報紙用整版刊出你走下投手丘的背影。`
    ]:[
      `主場最終戰，${nm} 走進生涯最後一個打席前，全場起立，主審退到一旁等待。打席結束後隊友全走出休息室擁抱你，你兩度出來接受 <b class="hl">Curtain Call</b>。`,
      `${nm} 在最後一場比賽守完半局後被替換下場。外野三名隊友刻意放慢腳步陪你走回休息室，全場手機燈光亮起，台灣轉播單位做了整夜特別節目。`,
      `告別系列賽的最後一天，${nm} 把打擊手套送給場邊小球迷。大螢幕播放不同城市的生涯片段，曾效力球隊的球迷也在客場看台掛出你的舊背號。`]);
    else if(i===2)txt=`球隊在你生涯最後一個系列賽前於場邊舉行了簡單儀式：致贈裱框球衣與紀念浮雕，隊友列隊擊掌。當地報紙寫道：「他不是超級巨星，但他是每個總教練都想要的那種球員。」`;
    else txt=`你在社群媒體上發了一張空蕩球場的照片，配文只有一句英文：「Thank you, baseball.」按讚數在台灣時間的深夜默默破了十萬。`;
  }else{
    txt=`沒有鎂光燈。你把釘鞋擦乾淨放進袋子，跟隊友一一擁抱，走出球場時回頭看了記分板最後一眼。二軍球場的夕陽跟十年前一樣好看。`;
  }
  /* 新版告別資料庫：代表聯盟、成就層級、投打身分與生涯特性共同篩選，不再只有少數固定句。 */
  {const posCode=S.pos==='P'?'P':'B',basePool=(RETIRE_SCENES.common||[]).concat(RETIRE_SCENES[lg]||RETIRE_SCENES.MINOR).filter(x=>(x.minTier===undefined||i>=x.minTier)&&(x.maxTier===undefined||i<=x.maxTier)&&(!x.pos||x.pos===posCode)),traitPool=Object.entries(RETIRE_TRAIT_SCENES).filter(([k])=>S.traits[k]).map(([,t])=>({t})),scene=traitPool.length&&chance(34)?pick(traitPool):pick(basePool);if(scene)txt=retirementSceneText(scene,lg,nm);}
  card('gold','引退之日',txt);
  /* 名人堂票選(可多聯盟並存) */
  const hofs=[]; let firstBallot=false; const hofLeagues=[];
  const HOF_CFG={
    CPBL:{n:'台灣棒球名人堂',wait:5,maxBallot:15,lg:'中職',body:'提名甄審與遴選委員'},
    NPB:{n:'日本野球殿堂',wait:5,maxBallot:15,lg:'日職',body:'競技者表彰委員'},
    MLB:{n:'美國棒球名人堂',wait:5,maxBallot:10,lg:'大聯盟',body:'全美棒球記者協會'}
  };
  ['CPBL','NPB','MLB'].forEach(b=>{ const t=tiers[b]; if(!t)return;
    const cfg=HOF_CFG[b];
    if(b==='MLB'&&(S.stats.MLB.yr||0)<10){
      if(t.i<=1)hofs.push(`${nm} 的大聯盟生涯為 ${S.stats.MLB.yr||0} 季，未達美國棒球名人堂球員票選所需的 10 季大聯盟經歷，因此不會進入記者票選。`);
      return;
    }
    if(t.i===0){
      /* 第一年當選門檻:評價分明顯超標(1.15×名人堂門檻)才 first-ballot,否則需等 N 年 */
      const th=TIER_TH[b][0];
      const fbMult={CPBL:1.12,NPB:1.12,MLB:1.2}[b]||1.2; /* 大聯盟最嚴,中職日職放寬 */
      const firstNow = t.sc>=th*fbMult;
      const ballotYr = firstNow?1:ri(2,6);
      if(firstNow){ firstBallot=true; }
      hofLeagues.push(cfg.lg);
      const pct=Math.min(99.1,75+ (t.sc-th)/th*40 + R()*6 - (ballotYr-1)*4);
      if(!S.hofInfo)S.hofInfo=[]; S.hofInfo.push({lg:cfg.lg,yr:ballotYr,pct:Math.max(75,pct).toFixed(1),body:cfg.body}); /* 供結算圖 */
      const cap=capTeam(b), phr=posLegendPhrase(b);
      hofs.push(`${nm} 在引退 <b class="hl">${cfg.wait}</b> 年後（${yr+cfg.wait} 年）取得候選資格，於<b class="hl">第 ${ballotYr} 年票選</b>獲得 ${cfg.body} <b class="hl">${Math.max(75,pct).toFixed(1)}%</b> 支持，跨過 75% 門檻並入選<b class="hl">${cfg.n}</b>。生涯代表球隊為 <b class="hl">${cap||'—'}</b>${phr}。${ballotYr===1?'<b class="hl">首次取得候選資格即入選。</b>':''}`);
    }else if(t.i===1){
      const pct=55+R()*18.5,tries=ri(3,cfg.maxBallot);
      hofs.push(`你在${cfg.n}候選名單停留 ${tries} 年，最高獲得 ${pct.toFixed(1)}% 支持；未跨過 75% 入選門檻，${tries>=cfg.maxBallot?'候選年限已結束':'其後未再取得足夠支持'}。`);
    } });
  if(firstBallot&&!S.traits.legend){ S.traits.legend=true;
    S.legendLeague=hofLeagues[0]||''; }
  if(hofs.length)card('gold','名人堂票選',hofs.join('<br><br>'));
  if(S.traits.legend){ card('gold','隱藏屬性解鎖：'+(S.legendLeague||'')+'歷史級球星',
    `第一年投票就披上名人堂金袍——你不只是進了殿堂，你<b class="hl">定義了一個時代</b>。這個名字，會被寫進${S.legendLeague||''}的歷史課本。`); }
}
function endGame(reason){
  S.done=true; actClear();
  divider('生涯終幕');
  card('info','引退',`<b class="hl">${S.name}</b>｜${reason}`);
  /* 各聯盟數據與評價 */
  let tables='',evals=[],best=99; const tiersByLg={};
  ['MLB','NPB','CPBL','MINOR'].forEach(b=>{ if(S.stats[b]){ tables+=statTable(b);
    if(b!=='MINOR'){ const t=tierOf(b); tiersByLg[b]=t; evals.push(`<span class="tag">${t.name}</span>（評價分 ${t.sc}）`); best=Math.min(best,t.i); } } });
  if(best===99)best=4;
  retireScene(tiersByLg);
  /* 成就門檻:中職名人堂 或 站上日職/大聯盟 */
  const reachedTop = (tiersByLg.CPBL&&tiersByLg.CPBL.i===0) || !!S.stats.NPB || !!S.stats.MLB;
  if(reachedTop){
    /* 小學校之光:T3 弱旅出身 */
    if(!S.traits.smallschool && S.hsTier===3){ S.traits.smallschool=true;
      card('gold','隱藏特性：小學校之光',`當年那所沒沒無聞的小學校，走出了一個站上頂級舞台的男人。你證明了：出身，從來不是天花板。`); }
    /* 努力仔：99 制下依原始低潛力分位換算。 */
    const grindTh = S.pos==='P'?287:565;
    if(!S.traits.grinder && (S.potSum0||999)<=grindTh){ S.traits.grinder=true;
      card('gold','隱藏特性：努力仔',`天賦平庸的球員千千萬萬，能走到這裡的卻寥寥無幾。你不是天選之人，你是把汗水熬成天賦的那種人。`); }
  }
  /* 25 歲前離開棒球:每個球員都有第二人生的好劇本 */
  if(S.age<25){
    const nm=S.name;
    const second=[
      `你加入了乙組業餘棒球隊。平日上班、週末穿上球衣，去年在協會盃敲出再見安打的影片被瘋傳，底下最熱門的留言是：「這揮棒不像業餘的。」——因為本來就不是。你比誰都清楚，愛棒球不一定要靠它吃飯。`,
      `你考到了不動產營業員執照。帶看時爬六樓透天面不改色，客戶都說你氣場不一樣——十六歲就在幾千人面前投球的人，還會怕開價嗎？三年後你成了店裡的銷售王，名片頭銜下面偷偷印了一行小字：「前職業棒球選手」。`,
      `你跟著舅舅去做板模。工地的日子曬得比春訓還黑，但你的核心力量和不服輸讓老師傅都點頭。五年後你自己出來帶班，薪水不比二軍差，而且——你笑著說——這裡沒有人會把你下放。`,
      `你穿上襯衫走進辦公室，同事只知道你「以前有在打球」。直到公司壘球隊比賽那天，你一棒把球送出圍牆，全場安靜三秒。後來每年比賽，對手公司都會先問一句：「那個人今年還在嗎？」`,
      `你頂下一間早餐店，招牌取名「滿壘」。店裡掛著你高中的球衣，蛋餅煎得跟你的守備一樣扎實。附近的少棒隊員放學都來報到，因為老闆會一邊煎蘿蔔糕一邊講解怎麼看投手的放球點——加蛋不加價。`,
      `你回到母校當教練，月薪不高，但你把自己沒走完的路畫成地圖交給學弟。第七年，你帶的投手在選秀會上被第一輪指名，電視轉播帶到你的時候，你哭得比他還慘。`,
      `你創了業，做棒球訓練科技——用手機慢動作幫素人抓揮棒軌跡。第一年差點倒閉，第三年被運動中心整批採購。募資簡報的第一頁只有一句話：「我沒能站上去的舞台，我想讓更多人站上去。」`,
      `你考上了消防員。體能測驗全項第一，教官問你以前練什麼的，你說棒球。第一次出勤救人那晚，你突然明白：肩膀不能再投一百五，但還能扛著人走出火場——這雙手還是有用的。`];
    card('gold','第二人生',second[Math.floor(R()*second.length)].replace(/{n}/g,nm)+`<br><br><span class="sub">離開球場的人生，也是人生。${nm}，辛苦了。</span>`);
  }
  /* 逐年成績年表 (分為業餘與職業) */
  if(S.log.length){
    const amaLogs = S.log.filter(r => !r.st);
    const proLogs = S.log.filter(r => r.st);
    if(amaLogs.length > 0){
      const amaRows = amaLogs.map(r=>`<tr><td style="white-space:nowrap">${r.y}</td><td style="white-space:nowrap">${r.age}</td><td style="text-align:left;white-space:nowrap">${r.tm}</td><td style="text-align:left;font-size:11px;${r.inj?'color:var(--bad);font-weight:700;':''}">${r.line}</td></tr>`).join('');
      card('','生涯年表（業餘成績）',`<table class="fin"><tr><th>年度</th><th>齡</th><th style="text-align:left">球隊</th><th style="text-align:left">成績</th></tr>${amaRows}</table>`);
    }
    if(proLogs.length > 0){
      const isP = S.pos === 'P';
      const head = isP
        ? `<tr><th>年</th><th>齡</th><th style="text-align:left">球隊</th><th>定位</th><th>G</th><th>IP</th><th>W</th><th>L</th><th>SV</th><th>HLD</th><th>SO</th><th>BB</th><th>ERA</th><th>WHIP</th><th>AVG FB</th></tr>`
        : `<tr><th>年</th><th>齡</th><th style="text-align:left">球隊</th><th>G</th><th>PA</th><th>AVG</th><th>OBP</th><th>SLG</th><th>OPS</th><th>H</th><th>HR</th><th>RBI</th><th>盜壘</th><th>守備率</th><th>失誤</th><th>守備貢獻</th></tr>`;
      const rows = proLogs.map(r => {
        const cS = r.inj ? 'color:var(--bad);font-weight:700;' : '';
        const s = r.st || {G:0,PA:0,AB:0,H:0,HR:0,RBI:0,SB:0,BB:0,W:0,L:0,SV:0,HLD:0,HP:0,IP:0,SO:0,ER:0,avg:0,era:0,WHIP:0,DEF:0};
        if(isP){
          const era = s.IP>0 ? (s.ER*9/s.IP).toFixed(2) : '-';
          const whip = s.IP>0 ? ((s.H+s.BB)/s.IP).toFixed(2) : '-';
          return `<tr style="${cS}"><td>${r.y}</td><td>${r.age}</td><td style="text-align:left;white-space:nowrap">${r.tm}</td><td>${roleN(s.role||S.role,s.reliefStatus)}</td><td>${s.G}</td><td>${fmtIP(s.IP)}</td><td>${s.W}</td><td>${s.L}</td><td>${s.SV||0}</td><td>${s.HLD||0}</td><td>${s.SO}</td><td>${s.BB||0}</td><td>${era}</td><td>${whip}</td><td>${veloText(s)}</td></tr>`;
        } else {
          const obpN = s.PA>0 ? (s.H+s.BB)/s.PA : 0;
          const slgN = slgOf(s);
          const avg = s.AB>0 ? (s.H/s.AB).toFixed(3).replace(/^0/,'') : '-';
          const obp = s.PA>0 ? obpN.toFixed(3).replace(/^0/,'') : '-';
          const slg = s.AB>0 ? slgN.toFixed(3).replace(/^0/,'') : '-';
          const ops = s.AB>0 ? (obpN+slgN).toFixed(3).replace(/^0/,'') : '-';
          return `<tr style="${cS}"><td>${r.y}</td><td>${r.age}</td><td style="text-align:left;white-space:nowrap">${r.tm}${r.p?"·"+r.p:""}</td><td>${s.G}</td><td>${s.PA}</td><td>${avg}</td><td>${obp}</td><td>${slg}</td><td>${ops}</td><td>${s.H}</td><td>${s.HR}</td><td>${s.RBI}</td><td>${s.SB}</td><td>${s.TC?fieldingPct(s).toFixed(3).replace(/^0/,''):'—'}</td><td>${s.E||0}</td><td>${s.DEF>0?'+':''}${s.DEF||0}</td></tr>`;
        }
      }).join('');
      card('','生涯年表（職業成績）',`<table class="fin">${head}${rows}</table>`);
    }
  }
  let intlTable='';
  if(S.intlCount>0){ const IS=S.intlStat;
    if(S.pos==='P'){ const era=IS.IP>0?(IS.ER*9/IS.IP).toFixed(2):'-';
      intlTable=`<h4 style="margin:12px 0 4px">國際賽生涯（中華隊 ${S.intlCount} 屆）</h4><table class="st"><tr><th>出賽</th><th>局數</th><th>勝</th><th>救援</th><th>三振</th><th>ERA</th></tr><tr><td>${IS.G}</td><td>${fmtIP(IS.IP)}</td><td>${IS.W}</td><td>${IS.SV}</td><td>${IS.SO}</td><td>${era}</td></tr></table>`;
    } else { const avg=IS.AB>0?(IS.H/IS.AB).toFixed(3).replace(/^0/,''):'-';
      intlTable=`<h4 style="margin:12px 0 4px">國際賽生涯（中華隊 ${S.intlCount} 屆）</h4><table class="st"><tr><th>出賽</th><th>打席</th><th>打擊率</th><th>安打</th><th>全壘打</th><th>打點</th></tr><tr><td>${IS.G}</td><td>${IS.PA}</td><td>${avg}</td><td>${IS.H}</td><td>${IS.HR}</td><td>${IS.RBI}</td></tr></table>`;
    }
  }
  card('','生涯累積數據',(tables||'<p>（無職業層級出賽紀錄）</p>')+intlTable);
  if(evals.length)card('gold','生涯評價',evals.join('<br>'));
  /* 獎項與大賽成績（群組化） */
  let honorsHTML = '（生涯未獲得任何獎項）';
  if(S.honors.length) {
    const groups={'個人年度獎':{},'明星／短期獎':{},'球隊冠軍':{},'國際賽':{},'業餘大賽':{}},cups=[...HS_CUPS,...U_CUPS,'大學春季聯賽','大專盃'];
    S.honors.forEach(h=>{
      const m=String(h).match(/^(\d{4})\s+(.+)$/),yr=m?m[1]:'',awd=m?m[2]:h;
      const group=/經典賽|12強|中華隊/.test(awd)?'國際賽':cups.some(c=>awd.includes(c))?'業餘大賽':/總冠軍|日本一|世界大賽冠軍/.test(awd)?'球隊冠軍':/明星賽|單月|單週/.test(awd)?'明星／短期獎':'個人年度獎';
      (groups[group][awd]||(groups[group][awd]=[])).push(yr);
    });
    const blocks=[];Object.entries(groups).forEach(([label,items])=>{const rows=Object.entries(items);if(!rows.length)return;
      blocks.push(`<section class="honor-group"><h5>${label}</h5>${rows.map(([awd,yrs])=>`<p>🏆 ${awd}${yrs.length>1?` ×${yrs.length}`:''}<br><em>${yrs.filter(Boolean).join('、')}</em></p>`).join('')}</section>`);
    });
    honorsHTML=`<div class="honor-groups">${blocks.join('')}</div>`;
  }
  card(S.honors.length?'gold':'','獎項與大賽成績', honorsHTML);
  /* 特質與薪資 */
  const tr=[];
  const TN={genius:'天才',iron:'鐵人',glass:'玻璃人',scum:'渣男',late:'大器晚成',disc:'自律狂',academy:'學院派',intlace:'國際賽之鬼',franchise:'神主牌',clutch:'大心臟',phoenix:'浴火重生',combo:'無巧不工',onetool:'只會這個',rubber:'橡膠手臂',goldcloth:'黃金聖衣',mrteam:(teamNick(S.mrTeamName||'')||'')+'先生',confidante:'閨中密友',smallschool:'小學校之光',grinder:'努力仔',legend:(S.legendLeague||'')+'歷史級球星',yips:'失憶症',distract:'外務纏身',cancer:'更衣室毒瘤',ambience:'氣氛大師',thief:'薪水小倫',...DYNAMIC_TRAIT_LABELS};
  const posT={pos:['legend','goldcloth','mrteam','confidante','genius','late','disc','academy','intlace','franchise','clutch','phoenix','rubber','onetool','smallschool','grinder','ace','slugger','sparkplug','defchief','steady','fanhero','community','leader','mentor'],neg:['glass','scum','yips','distract','cancer','ambience','thief','island','booed']};
  const tagStyle=k=>{
    if(k==='legend')return 'background:#3a2c05;border-color:#ffc95c;color:#ffe08a'; /* 歷史級:金 */
    if(k==='goldcloth')return 'background:#3a3505;border-color:#e8d43a;color:#fff35a'; /* 黃金聖衣:黃 */
    if(k==='mrteam'){ const tc=TEAM_COLOR[S.mrTeamName]||'#ffc95c'; return 'background:#1a1a1a;border-color:'+tc+';color:'+tc; }
    if(k==='genius')return 'background:#232733;border-color:#c8d0e0;color:#e8eef7';        /* 天才:銀 */
    return ''; /* 正向:預設琥珀 */
  };
  posT.pos.forEach(k=>{ if(S.traits[k])tr.push(traitTagHTML(k,TN[k],tagStyle(k))); });
  posT.neg.forEach(k=>{ if(S.traits[k])tr.push(traitTagHTML(k,TN[k])); });
  (S.removed||[]).forEach(lbl=>tr.push(`<span class="tag" style="text-decoration:line-through;opacity:.4;color:#8a8a8a;border-color:#4a4a4a">${lbl}</span>`));
  const lv=S.love;
  const cur=lv.st==='married'?`伴侶 ${lv.partner}${lv.partnerJob?`／${lv.partnerJob}`:''}（${lv.kids}）`:lv.st==='dating'?`交往中 ${lv.partner}${lv.partnerJob?`／${lv.partnerJob}`:''}（${lv.dyrs||0} 年）`:lv.st==='divorced'?'離婚':'未婚';
  const exStr=lv.exes.length?`｜過往婚姻 ${lv.exes.map(e=>`${e.name}${e.job?`／${e.job}`:''}（${e.kids}）`).join('、')}`:'';
  const totKids=lv.kids+lv.exes.reduce((t,e)=>t+e.kids,0);
  { const f=syncFinance(),spend=f.living+f.luxury+f.family,so=socialState();
    card('','生涯檔案',`隱藏素質：${tr.join(' ')||'（無）'}<br>聲望：球迷 <b class="${so.fanRep>=0?'up':'dn'}">${so.fanRep>=0?'+':''}${so.fanRep}</b>｜球員 <b class="${so.playerRep>=0?'up':'dn'}">${so.playerRep>=0?'+':''}${so.playerRep}</b>｜公益活動 ${so.communityActs} 次｜導師互動 ${so.mentorActs} 次<br>家庭：${cur}${exStr}｜子女共 ${totKids} 人${lv.affairs?`｜外遇 ${lv.affairs}(${lv.caught})`:''}<br>國際賽出賽：${S.intlCount} 次｜生涯大傷：${S.bigInj} 次｜球季報銷：${S.seasonEndingInjuries||0} 次${S.pos==='P'?`｜Tommy John 手術：${S.tjCount} 次`:''}<br><br><b>生涯財務（萬台幣）</b><br>合約與獎金收入：<b class="hl">${fmtMoney(f.gross)}</b>｜估算稅負：${fmtMoney(f.tax)}｜經紀人費：${fmtMoney(f.agent)}｜生活／家庭／奢侈支出：${fmtMoney(spend)}<br>可動用現金：${fmtMoney(f.cash)}｜投資：${fmtMoney(f.investments)}｜房產權益：${fmtMoney(f.homeEquity)}｜負債：<b class="${f.debt?'dn':''}">${fmtMoney(f.debt)}</b><br>引退時淨資產：<b class="${f.netWorth>=0?'up':'dn'}" style="font-size:19px">${fmtMoney(f.netWorth)}</b>`); }
  /* 球迷留言 */
  const pool=FAN[best].slice(); const picks=[];
  while(picks.length<5&&pool.length)picks.push(pool.splice(Math.floor(R()*pool.length),1)[0]);
  /* 盤子留言:低聯盟明星以上,旅外到更高聯盟卻淪替補/邊緣 */
  { const LGR={CPBL:0,NPB:1,MLB:2}, CTY={CPBL:'台灣',NPB:'日本',MLB:'美國'};
    ['CPBL','NPB','MLB'].forEach(low=>{ ['CPBL','NPB','MLB'].forEach(high=>{
      if(LGR[high]>LGR[low] && tiersByLg[low] && tiersByLg[high] && tiersByLg[low].i<=1 && tiersByLg[high].i>=3){
        picks.push(`在${CTY[low]}是${LG_N[low]}的招牌，到了${CTY[high]}的${LG_N[high]}卻完全打不出來——「這人是誰？」當地球迷一臉問號，簽他的球團真是盤子`);
      }
    }); });
  }
  if(S.traits.glass)picks.push('如果沒有那些傷，他的生涯會是什麼樣子……不敢想');
  if(S.traits.iron)picks.push('鐵人謝幕。那個連續出賽紀錄，大概很久都不會被打破了');
  if(S.traits.genius&&best<=1)picks.push('高中就被叫做天才的男人，真的把天賦兌現了');
  if(S.honors.some(h=>h.includes('經典賽冠軍')))picks.push('經典賽奪冠那一夜，全台灣都沒睡。謝謝你');
  if(S.love.caught)picks.push('球技沒話說，私生活就……唉，不說了');
  if(S.traits.scum)picks.push('引退串裡不准提那些事，今天只談棒球。……好啦還是很氣');
  if(S.traits.franchise)picks.push('一隊一人，退休號碼準備掛上去了。謝謝你留下來');
  if(S.traits.legend)picks.push('這輩子能看到你打球，是我們這代球迷的福氣。歷史級的');
  if(S.traits.intlace)picks.push('穿上國家隊球衣的那個男人，永遠的國家英雄');
  if(S.traits.disc)picks.push('自律到可怕，凌晨四點的球場都認得他');
  if(S.traits.cancer)picks.push('球是打得好啦，但那個態度……更衣室少了他反而清靜');
  if(S.traits.thief)picks.push('當年拒絕下放又打不出來，薪水小倫這名號是自己掙來的');
  if(S.traits.mrteam)picks.push('十五年只為一隊，'+(teamNick(S.mrTeamName||'')||'')+'先生這個稱號，他當之無愧');
  if(S.traits.confidante)picks.push('場上叱吒風雲，感情路上卻總是差一步，唉');
  if(S.traits.smallschool)picks.push('從那種小學校打到職業，這故事夠拍一部電影了');
  if(S.traits.grinder)picks.push('沒什麼天分卻拼到這種成就，這種球員最讓人尊敬');
  if(S.traits.goldcloth)picks.push('我愛台中猛瑪，不離不棄');
  if(S.traits.phoenix)picks.push('從手術台爬回來還能拿獎，這種心臟是鈦合金做的吧');
  if(S.traits.onetool&&S.toolRole)picks.push(`那招${S.toolRole}真的無解，關鍵時刻換他上場就對了`);
  if(S.traits.clutch)picks.push('大場面先生，越關鍵的時刻越信任他');
  if(S.traits.fanhero)picks.push('他真的記得看台上的人。簽名排到再晚，也沒有把我們當成背景');
  if(S.traits.community)picks.push('社區球場那批孩子長大了，還在穿他送的背號');
  if(S.traits.leader)picks.push('數據表看不到他在連敗時說過的那些話，但每個隊友都記得');
  if(S.traits.booed)picks.push('最後還是沒能把噓聲贏回來。成績之外，球迷也記得你怎麼對待人');
  if(S.love.st==='married'&&S.love.kids>=2)picks.push('引退後好好陪家人吧，孩子們等你很久了');
  {const baseFan=picks.slice(0,5),contextFan=[...new Set(picks.slice(5))],shownFan=baseFan.concat(randomSubset(contextFan,Math.min(7,contextFan.length)));card('info','球迷看板・引退串',shownFan.map(p=>'「'+p.replace(/{n}/g,S.name)+'」').join('<br>'));}
  /* 一鍵分享 */
  const sh=document.createElement('div'); sh.className='card';
  sh.innerHTML=`<div class="title">分享這段生涯</div>
    <div class="row2" style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn main" id="sh-img" style="flex:1">📸 產生結算圖</button>
      <button class="btn" id="sh-url" style="flex:1">🔗 複製重播連結</button>
    </div><div id="sh-out" style="margin-top:8px"></div>`;
  $('log').appendChild(sh);
  sh.querySelector('#sh-img').onclick=()=>shareImage(evals,sh.querySelector('#sh-out'));
  sh.querySelector('#sh-url').onclick=e=>{
    const base=location.origin.startsWith('http')?location.origin+location.pathname:location.href.split('?')[0];
    const url=RNG_MODE==='destiny'?base+'?mode=destiny&seed='+encodeURIComponent(SEED):base;
    const okmsg=()=>{e.target.textContent='✅ 已複製';setTimeout(()=>e.target.textContent='🔗 複製重播連結',1600);};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(okmsg,()=>prompt('手動複製連結：',url));
    else prompt('手動複製連結：',url);
  };
  const again=[{t:'⚾ 開啟全新隨機人生',main:true,f:()=>{location.href=location.pathname;}}];
  if(RNG_MODE==='destiny')again.push({t:'用同一個命運種子重來',s:'seed: '+SEED,f:()=>{location.href=location.pathname+'?mode=destiny&seed='+encodeURIComponent(SEED);}});
  choose('',again);
}
/* 結算圖（Canvas 產生 PNG，完成後直接開啟全螢幕檢視器） */
function closeSettlementViewer(){
  const el=$('settlement-overlay');el.classList.remove('open');el.setAttribute('aria-hidden','true');document.body.classList.remove('settlement-open');
}
function shareImage(evals,out){
  const isP=S.pos==='P';
  const tiers=evals.map(t=>t.replace(/<[^>]+>/g,''));
  /* 特性(保留 + 刪除線標記) */
  const TN2={legend:(S.legendLeague||'')+'歷史級球星',goldcloth:'黃金聖衣',genius:'天才',iron:'鐵人',glass:'玻璃人',scum:'渣男',late:'大器晚成',disc:'自律狂',academy:'學院派',intlace:'國際賽之鬼',franchise:'神主牌',clutch:'大心臟',phoenix:'浴火重生',combo:'無巧不工',onetool:'只會這個',rubber:'橡膠手臂',mrteam:(teamNick(S.mrTeamName||'')||'')+'先生',confidante:'閨中密友',smallschool:'小學校之光',grinder:'努力仔',yips:'失憶症',distract:'外務纏身',cancer:'更衣室毒瘤',ambience:'氣氛大師',thief:'薪水小倫',...DYNAMIC_TRAIT_LABELS};
  const negK=['glass','scum','yips','distract','cancer','ambience','thief','island','booed'];
  const keepTr=Object.keys(TN2).filter(k=>S.traits[k]).map(k=>({label:TN2[k],key:k,neg:negK.includes(k)}));
  const remTr=(S.removed||[]).map(l=>({label:l,key:'',neg:false,rem:true}));
  /* 生涯數據列(每聯盟一列) */
  const leagues=['MLB','NPB','CPBL'].filter(b=>S.stats[b]);
  /* 生涯里程碑 + 名人堂資訊(加在榮譽最前面) */
  const milestones = [];
  const isPit = S.pos==='P';
  /* 名人堂入選資訊 */
  if(S.hofInfo&&S.hofInfo.length){ S.hofInfo.forEach(h=>{
    milestones.push(`${h.lg}名人堂 · 第${h.yr}年入選 ${h.pct}%`); }); }
  /* 生涯數據里程碑（各聯盟獨立計算 + 跨聯盟加總） */
  { let tH=0,tHR=0,tSB=0,tW=0,tSV=0,tHLD=0,tSO=0;
    let playedLgs = 0;
    const L_N={CPBL:'中職',NPB:'日職',MLB:'大聯盟'};
    ['CPBL','NPB','MLB'].forEach(b=>{
      const st=S.stats[b]; if(!st)return;
      if(isPit) {
        if(st.IP>0) playedLgs++;
        const w = [300,250,200,150,100,50].find(m=>(st.W||0)>=m);
        const so = [4000,3000,2500,2000,1500,1000,500].find(m=>(st.SO||0)>=m);
        const sv = [500,400,300,200,100].find(m=>(st.SV||0)>=m);
        const hld = [400,300,200,100].find(m=>(st.HLD||0)>=m);
        if(w) milestones.push(`${L_N[b]} ${w}勝`);
        if(so) milestones.push(`${L_N[b]} ${so}三振`);
        if(sv) milestones.push(`${L_N[b]} ${sv}救援`);
        if(hld) milestones.push(`${L_N[b]} ${hld}中繼`);
      } else {
        if(st.PA>0) playedLgs++;
        const h = [4000,3500,3000,2500,2000,1500,1000,500].find(m=>(st.H||0)>=m);
        const hr = [800,700,600,500,400,300,200,100].find(m=>(st.HR||0)>=m);
        const sb = [1000,900,800,700,600,500,400,300,200,100].find(m=>(st.SB||0)>=m);
        if(h) milestones.push(`${L_N[b]} ${h}安`);
        if(hr) milestones.push(`${L_N[b]} ${hr}轟`);
        if(sb) milestones.push(`${L_N[b]} ${sb}盜`);
      }
      tH+=st.H||0; tHR+=st.HR||0; tSB+=st.SB||0;
      tW+=st.W||0;tSV+=st.SV||0;tHLD+=st.HLD||0;tSO+=st.SO||0;
    });

    /* 只有真正打過兩個以上的聯盟，才顯示跨聯盟加總 */
    if(playedLgs > 1){
      if(isPit){
        if(tW>0||tSO>0) milestones.push(`跨聯盟生涯合計 ${tW}勝 ${tSO}K ${tSV}救援 ${tHLD}中繼`);
      }else{
        if(tH>0) milestones.push(`跨聯盟生涯合計 ${tHR}轟 ${tH}安 ${tSB}盜`);
      }
    }
  }
  /* 榮譽群組化(依年份) */
  const honors = milestones.slice();
  const aMap = {};
  S.honors.forEach(h => {
     const parts = h.split(' ');
     if(parts.length >= 2) { const yr = parts[0]; const awd = parts.slice(1).join(' ');
       if(!aMap[awd]) aMap[awd] = []; aMap[awd].push(yr);
     } else { if(!aMap[h]) aMap[h] = []; aMap[h].push(''); }
  });
  for(const awd in aMap) {
     const yrs = aMap[awd];
     if(yrs.length > 1 && yrs[0] !== '') honors.push(`${awd} *${yrs.length} (${yrs.join(',')})`);
     else honors.push(`${awd} ${yrs[0]?`(${yrs[0]})`:''}`);
  }
  /* 歷年成績 */
  const hist=S.log.slice();

  const W=920, PAD=34, scale=2;

  /* 為了計算換行，先建立 Canvas 與 Context 來測量字體寬度 */
  const cv=document.createElement('canvas');
  const c=cv.getContext('2d');
  c.font='13px sans-serif';

  /* 處理榮譽雙欄換行 */
  const colW=(W-PAD*2)/2, maxTextW=colW-20;
  const honorBlocks = honors.map(h => {
    let text = '· ' + h;
    let lines = []; let curr = '';
    for(let i=0; i<text.length; i++) {
      let test = curr + text[i];
      if(c.measureText(test).width > maxTextW && curr.length > 0) {
        lines.push(curr);
        curr = '  ' + text[i];
      } else { curr = test; }
    }
    if(curr) lines.push(curr);
    return lines;
  });
  const rows2=Math.ceil(honorBlocks.length/2);
  let leftH=0, rightH=0;
  honorBlocks.slice(0, rows2).forEach(b => leftH += b.length * 23);
  honorBlocks.slice(rows2).forEach(b => rightH += b.length * 23);
  const honorsTotalHeight = Math.max(leftH, rightH);
  /* 預估總高度 */
  let H=150; // header
  H+=30+tiers.length*24+14; // 評價
  if(keepTr.length||remTr.length)H+=54;
  H+=34+(leagues.length+1)*26+16; // 生涯數據表
  if(S.intlCount>0)H+=30+24+28+12; // 國際賽區塊
  H+=30+honorsTotalHeight+16; // 榮譽(雙欄換行後的高度)

  const amaLogs = hist.filter(r => !r.st);
  const proLogs = hist.filter(r => r.st);
  if(amaLogs.length > 0) H += 34 + amaLogs.length * 20 + 24;
  if(proLogs.length > 0) H += 34 + proLogs.length * 20 + 24;

  H+=70;
  cv.width=W*scale; cv.height=H*scale;
  c.scale(scale,scale);
  c.fillStyle='#0b1a12'; c.fillRect(0,0,W,H);
  c.strokeStyle='#2b4a38'; c.lineWidth=3; c.strokeRect(10,10,W-20,H-20);
  c.textBaseline='top';
  const posN={P:roleN(S.role),C:'捕手',IF:'內野手',OF:'外野手'}[S.pos];

  // Header
  c.fillStyle='#8fae9c'; c.font='13px sans-serif'; c.fillText('Y a K y o L i f e ・ 引 退 紀 念',PAD,30);
  c.fillStyle='#ffc95c'; c.font='bold 36px sans-serif'; c.fillText(S.name,PAD,52);
  c.fillStyle='#e8efe9'; c.font='15px sans-serif';
  c.fillText(`${primaryPos()}｜${playerType()}｜${hist.length?hist[0].y:'?'}–${S.year}｜引退時 ${S.age} 歲${S.pos==='P'&&S.tjCount?`｜TJ×${S.tjCount}`:''}`,PAD,98);
  // 特性列(header 右方)
  let y=126;
  function tagColor(o){
    if(o.rem)return {bg:'#242424',bd:'#4a4a4a',fg:'#8a8a8a'};
    if(o.key==='legend')return {bg:'#3a2c05',bd:'#ffc95c',fg:'#ffe08a'}; /* 金 */
    if(o.key==='goldcloth')return {bg:'#3a3505',bd:'#e8d43a',fg:'#fff35a'}; /* 黃 */
    if(o.key==='mrteam'){ const tc=TEAM_COLOR[S.mrTeamName]||'#ffc95c'; return {bg:'#1a1a1a',bd:tc,fg:tc}; }
    if(o.key==='genius')return {bg:'#232733',bd:'#c8d0e0',fg:'#e8eef7'}; /* 銀 */
    if(o.neg)return {bg:'#2a0f0f',bd:'#c0392b',fg:'#ff8b7a'};             /* 紅 */
    return {bg:'#173524',bd:'#2b4a38',fg:'#9fd8a8'};                      /* 琥珀綠 */
  }
  function drawTags(items){ items.forEach(function(o){ const t=o.label, col=tagColor(o);
    c.font='12px sans-serif'; const w=c.measureText(t).width+16;
    c.fillStyle=col.bg; c.strokeStyle=col.bd; c.lineWidth=1;
    c.fillRect(tagx,y,w,20); c.strokeRect(tagx,y,w,20);
    c.fillStyle=col.fg; c.fillText(t,tagx+8,y+3);
    if(o.rem){ c.strokeStyle='#8a8a8a'; c.beginPath(); c.moveTo(tagx+4,y+10); c.lineTo(tagx+w-4,y+10); c.stroke(); }
    tagx+=w+8; if(tagx>W-160){tagx=PAD;y+=26;}
  }); }
  var tagx=PAD;
  if(keepTr.length||remTr.length){ drawTags(keepTr.concat(remTr)); y+=30; }

  function hr(){ c.strokeStyle='#2b4a38'; c.lineWidth=1; c.beginPath(); c.moveTo(PAD,y); c.lineTo(W-PAD,y); c.stroke(); y+=12; }
  function sectionTitle(t){ c.fillStyle='#8fae9c'; c.font='bold 13px sans-serif'; c.fillText(t,PAD,y); y+=22; }

  // 評價
  hr(); sectionTitle('生涯評價');
  c.font='bold 16px sans-serif'; c.fillStyle='#ffc95c';
  tiers.forEach(function(t){ c.fillText('★ '+t,PAD,y); y+=24; }); y+=6;

  // 生涯數據表
  hr(); sectionTitle('生涯累積數據');
  const cols=isP?[['League',90],['Yrs',36],['G',48],['IP',54],['W',36],['L',36],['SV',48],['HLD',52],['SO',52],['BB',48],['ERA',52],['WHIP',54],['AVG FB',76]]
                :[['League',80],['Yrs',34],['G',40],['PA',46],['AVG',48],['OBP',48],['SLG',48],['OPS',48],['H',44],['HR',38],['RBI',44],['盜壘',40],['守備',40]];
  function row(cells,head){ let x=PAD; c.font=(head?'bold ':'')+'13px monospace'; c.fillStyle=head?'#8fae9c':'#e8efe9';
    cells.forEach(function(cell,i){ c.fillText(String(cell),x,y); x+=cols[i][1]; }); y+=head?24:26; }
  row(cols.map(cc=>cc[0]),true);
  leagues.forEach(function(b){ const st=S.stats[b];
    if(isP){ const era=st.IP>0?(st.ER*9/st.IP).toFixed(2):'-'; const whip=st.IP>0?((st.H+st.BB)/st.IP).toFixed(2):'-';
      row([LG_N[b],st.yr,st.G,fmtIP(st.IP),st.W,st.L,st.SV||0,st.HLD||0,st.SO,st.BB||0,era,whip,veloText(st)]); }
    else{
      const obpN = st.PA>0 ? (st.H+st.BB)/st.PA : 0;
      const slgN = slgOf(st);
      const avg = st.AB>0 ? (st.H/st.AB).toFixed(3).replace(/^0/,'') : '-';
      const obp = st.PA>0 ? obpN.toFixed(3).replace(/^0/,'') : '-';
      const slg = st.AB>0 ? slgN.toFixed(3).replace(/^0/,'') : '-';
      const ops = st.AB>0 ? (obpN+slgN).toFixed(3).replace(/^0/,'') : '-';
      row([LG_N[b],st.yr,st.G,st.PA,avg,obp,slg,ops,st.H,st.HR,st.RBI,st.SB,(st.DEF>0?'+':'')+(st.DEF||0)]); } });
  y+=6;

  // 國際賽生涯成績
  if(S.intlCount>0){ const IS=S.intlStat;
    hr(); sectionTitle('國際賽生涯（中華隊 '+S.intlCount+' 屆）');
    const rowIntl=(cells,head)=>{ let x=PAD; c.font=(head?'bold ':'')+'13px monospace'; c.fillStyle=head?'#8fae9c':'#e8efe9';
      cells.forEach(function(cell,i){ c.fillText(String(cell),x,y); x+=ic[i][1]; }); y+=head?24:28; };
    var ic;
    if(isP){ const era=IS.IP>0?(IS.ER*9/IS.IP).toFixed(2):'-';
      ic=[['',110],['G',80],['IP',86],['W',60],['SV',72],['SO',80],['ERA',80]];
      rowIntl(['', 'G', 'IP', 'W', 'SV', 'SO', 'ERA'], true);
      rowIntl(['',IS.G,fmtIP(IS.IP),IS.W,IS.SV,IS.SO,era],false);
    } else { const avg=IS.AB>0?(IS.H/IS.AB).toFixed(3).replace(/^0/,''):'-';
      ic=[['',110],['G',76],['PA',76],['AVG',76],['H',72],['HR',60],['RBI',72]];
      rowIntl(['', 'G', 'PA', 'AVG', 'H', 'HR', 'RBI'], true);
      rowIntl(['',IS.G,IS.PA,avg,IS.H,IS.HR,IS.RBI],false);
    }
    y+=6;
  }

  // 榮譽(雙欄橫式,過長自動換行)
  hr(); sectionTitle('生涯榮譽（'+honors.length+' 項）');
  c.font='13px sans-serif'; c.fillStyle='#9fd8a8';
  let startY = y;
  let currY = startY;
  honorBlocks.forEach(function(b, i){
    const isRightCol = i >= rows2;
    if(i === rows2) currY = startY;
    const hx = PAD + (isRightCol ? colW : 0);
    b.forEach(line => { c.fillText(line, hx, currY); currY += 23; });
  });
  y += honorsTotalHeight + 8;

  // 年表(分為業餘與職業表格)
  if(amaLogs.length > 0){
    hr(); sectionTitle('生涯年表（業餘成績）');
    const hc=[['年',48],['齡',40],['球隊',150],['成績',W-PAD*2-238]];
    let x=PAD; c.font='bold 12px monospace'; c.fillStyle='#8fae9c';
    hc.forEach(function(h){ c.fillText(h[0],x,y); x+=h[1]; }); y+=20;
    c.font='11px monospace';
    amaLogs.forEach(function(r){ x=PAD; c.fillStyle=r.inj?'#ff8b7a':'#cfe0d4';
      const cells=[String(r.y),String(r.age),r.tm,r.line];
      cells.forEach(function(cell,i){
        let t=String(cell); const maxw=hc[i][1]-8;
        while(c.measureText(t).width>maxw&&t.length>1)t=t.slice(0,-1);
        c.fillText(t,x,y); x+=hc[i][1]; }); y+=20; });
    y+=4;
  }
  if(proLogs.length > 0){
    hr(); sectionTitle('生涯年表（職業成績）');
    const hc = isP
      ? [['年',46],['齡',36],['球隊',100],['定位',68],['G',42],['IP',52],['W',34],['L',34],['SV',40],['HLD',46],['SO',44],['BB',44],['ERA',50],['WHIP',52],['AVG FB',72]]
      : [['年',46],['齡',34],['球隊',120],['G',36],['PA',42],['AVG',46],['OBP',46],['SLG',46],['OPS',46],['H',40],['HR',36],['RBI',40],['盜壘',36],['守備',40]];
    let x=PAD; c.font='bold 12px monospace'; c.fillStyle='#8fae9c';
    hc.forEach(function(h){ c.fillText(h[0],x,y); x+=h[1]; }); y+=20;
    c.font='12px monospace';
    proLogs.forEach(function(r){ x=PAD; c.fillStyle=r.inj?'#ff8b7a':'#cfe0d4';
      const tmS=r.tm;
      const s = r.st || {G:0,PA:0,AB:0,H:0,HR:0,RBI:0,SB:0,BB:0,W:0,L:0,SV:0,HLD:0,HP:0,IP:0,SO:0,ER:0,avg:0,era:0,WHIP:0,DEF:0};
      let cells = [];
      if(isP){
        const era = s.IP>0 ? (s.ER*9/s.IP).toFixed(2) : '-';
        const whip = s.IP>0 ? ((s.H+s.BB)/s.IP).toFixed(2) : '-';
        cells=[String(r.y),String(r.age),tmS,roleN(s.role||S.role,s.reliefStatus),String(s.G),fmtIP(s.IP),String(s.W),String(s.L),String(s.SV||0),String(s.HLD||0),String(s.SO),String(s.BB||0),era,whip,veloText(s)];
      } else {
        const obpN = s.PA>0 ? (s.H+s.BB)/s.PA : 0;
        const slgN = slgOf(s);
        const avg = s.AB>0 ? (s.H/s.AB).toFixed(3).replace(/^0/,'') : '-';
        const obp = s.PA>0 ? obpN.toFixed(3).replace(/^0/,'') : '-';
        const slg = s.AB>0 ? slgN.toFixed(3).replace(/^0/,'') : '-';
        const ops = s.AB>0 ? (obpN+slgN).toFixed(3).replace(/^0/,'') : '-';
        cells=[String(r.y), String(r.age), tmS+(r.p?'·'+r.p:''), String(s.G), String(s.PA), avg, obp, slg, ops, String(s.H), String(s.HR), String(s.RBI), String(s.SB), String(s.DEF>0?'+'+s.DEF:s.DEF||0)];
      }
      cells.forEach(function(cell,i){
        let t=String(cell); const maxw=hc[i][1]-8;
        while(c.measureText(t).width>maxw&&t.length>1)t=t.slice(0,-1);
        c.fillText(t,x,y); x+=hc[i][1]; });
      y+=20;
    });
    y+=4;
  }

  c.fillStyle='#ffc95c'; c.font='bold 16px sans-serif';
  {const f=syncFinance();c.fillText('生涯收入 '+fmtMoney(Math.round(f.gross))+'｜可用現金 '+fmtMoney(f.cash)+'｜負債 '+fmtMoney(f.debt)+'｜淨資產 '+fmtMoney(f.netWorth),PAD,y);y+=26;}
  c.fillStyle='#8fae9c'; c.font='11px monospace'; c.fillText(S.rngMode==='destiny'?('同種子：'+SEED):'模式：完全隨機',PAD,H-40);
  c.textAlign='right'; c.fillText(APP_VER,W-PAD,H-40); c.textAlign='left';

  const url=cv.toDataURL('image/png');
  const fileName='棒球生涯結算_'+S.name+'.png';
  const overlay=$('settlement-overlay'),image=$('settlement-image');
  $('settlement-title').textContent=`${S.name}｜生涯結算圖`;
  image.src=url;image.alt=`${S.name} 的棒球生涯結算圖`;$('settlement-stage').scrollTop=0;
  overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');document.body.classList.add('settlement-open');
  out.innerHTML=`<div class="statline">結算圖已用全螢幕開啟。關閉後可再次查看。</div><button class="btn main" id="sh-reopen" type="button">再次開啟全螢幕結算圖</button>`;
  out.querySelector('#sh-reopen').onclick=()=>{overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');document.body.classList.add('settlement-open');$('settlement-stage').scrollTop=0;};
  const download=()=>{ const a=document.createElement('a'); a.href=url; a.download=fileName;
    document.body.appendChild(a); a.click(); a.remove(); };
  /* 分享:優先 Web Share(可存相簿),不支援則退回下載 */
  $('settlement-download').onclick=download;
  $('settlement-save').onclick=async ()=>{
    try{
      const blob=await (await fetch(url)).blob();
      const file=new File([blob],fileName,{type:'image/png'});
      if(navigator.canShare&&navigator.canShare({files:[file]})){
        await navigator.share({files:[file],title:'棒球生涯結算',text:S.name+' 的棒球人生'});
        return;
      }
    }catch(e){ if(e&&e.name==='AbortError')return; /* 使用者取消,不用退回 */ }
    /* 不支援 Web Share → 退回下載 */
    download();
  };
}
/* ================= 開場設定 ================= */
(function(){ const t=document.getElementById('act-toggle');
  if(t)t.onclick=()=>{ document.getElementById('act').classList.toggle('collapsed');
    t.textContent=document.getElementById('act').classList.contains('collapsed')?'⌃ 展開選項':'⌄ 收合選項'; };
})();
function setMobileView(view){
  const allowed=['broadcast','player','season','finance'];view=allowed.includes(view)?view:'broadcast';$('app').dataset.mobileView=view;
  document.querySelectorAll('.mobile-nav-btn').forEach(b=>{const on=b.dataset.mobileView===view;b.classList.toggle('on',on);b.setAttribute('aria-current',on?'page':'false');});
  if(view==='broadcast')requestAnimationFrame(scrollBottom);else{const panel=view==='season'?$('roll-rail'):$('player-rail');if(panel)panel.scrollTop=0;}
}
document.querySelectorAll('.mobile-nav-btn').forEach(b=>b.onclick=()=>setMobileView(b.dataset.mobileView));
setMobileView('broadcast');
let selPos='P';
$('seed-show').value=SEED;
$('seed-re').onclick=e=>{e.preventDefault();SEED=makeSeed();$('seed-show').value=SEED;};
let selMode=RNG_MODE;
function syncModeUI(){
  document.querySelectorAll('#seg-mode button').forEach(b=>b.classList.toggle('on',b.dataset.v===selMode));
  $('seed-controls').style.display=selMode==='destiny'?'block':'none';
  $('mode-help').textContent=selMode==='destiny'?'輸入相同種子，就能和朋友比較不同選擇。':'每次重新開始，都會遇到不同結果。';
}
document.querySelectorAll('#seg-mode button').forEach(b=>b.onclick=()=>{selMode=b.dataset.v;syncModeUI();});
syncModeUI();
document.querySelectorAll('#seg-pos button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('#seg-pos button').forEach(x=>x.classList.remove('on'));
  b.classList.add('on'); selPos=b.dataset.v;
});
$('btn-start').onclick=()=>{
  const nm=cleanPlayerName($('in-name').value);
  RNG_MODE=selMode;
  const sv=$('seed-show').value.trim(); if(RNG_MODE==='destiny'&&sv)SEED=sv;
  history.replaceState(null,'',RNG_MODE==='destiny'?`?mode=destiny&seed=${encodeURIComponent(SEED)}`:location.pathname);
  seedInit(SEED);
  S=attachStateMethods(newState(nm,selPos,null));
  showGameShell();
  card('info','球員誕生',`${S.year} 年春天，${POSN[S.pos]} <b class="hl">${S.name}</b> 加入 <b class="hl">${S.team}</b> 棒球隊。三年後的路，要自己選。<br><span style="color:var(--dim);font-size:13px">模式：${RNG_MODE==='destiny'?'同種子挑戰':'完全隨機'}｜22 歲前累積擲出 6 次「6」可覺醒隱藏素質。</span>`);
  startYear();
};
$('btn-save').onclick=()=>{renderSaveManager();setSaveStatus('');openFx('save-overlay');};
$('save-close').onclick=()=>closeFx('save-overlay');$('save-overlay').querySelector('.fx-backdrop').onclick=()=>closeFx('save-overlay');$('save-export').onclick=exportCheckpoint;$('save-import').onclick=()=>$('save-file').click();$('save-file').onchange=e=>{importCheckpoint(e.target.files&&e.target.files[0]);e.target.value='';};
$('btn-career-report').onclick=()=>openCareerReport();
$('career-report-close').onclick=()=>closeFx('career-overlay');
document.querySelectorAll('.career-tab').forEach(b=>b.onclick=()=>renderCareerReport(b.dataset.tab));
$('career-overlay').querySelector('.fx-backdrop').onclick=()=>closeFx('career-overlay');
$('settlement-close').onclick=closeSettlementViewer;
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if($('settlement-overlay').classList.contains('open'))closeSettlementViewer();else if($('save-overlay').classList.contains('open'))closeFx('save-overlay');else if($('career-overlay').classList.contains('open'))closeFx('career-overlay');else if($('decision-backdrop').classList.contains('open')){const dock=$('act').querySelector('.decision-dock');if(dock)dock.click();}});
(function(){ const vb=document.getElementById('ver-badge'); if(vb)vb.textContent=APP_VER; })();
renderStartSaveList();
if(new URLSearchParams(location.search).get('visual-audit')==='save-manager'){
  RNG_MODE='destiny';seedInit('visual-audit-save-manager');S=attachStateMethods(newState('蔣孟杰','IF',null));S.stage='PRO';S.lv='NPB1';S.org='NPB';S.orgTeam='東京大人';S.dpos='SS';S.age=27;S.year=2037;S.finance.cash=28640;S.ct={yrs:3,signedYears:4,annual:22000,mult:1.2,guaranteed:.8};_yearStartSnapshot=buildSavePackage(S,'');writeSave('auto',_yearStartSnapshot);showGameShell();board(0);renderSaveManager();openFx('save-overlay');
}
if(new URLSearchParams(location.search).get('visual-audit')==='catcher-season'){
  RNG_MODE='destiny';seedInit('visual-audit-catcher-season');S=attachStateMethods(newState('蔣孟杰','C',null));S.stage='PRO';S.lv='CPBL1';S.org='CPBL';S.orgTeam='台中猛瑪';S.dpos='C';S.age=31;S.year=2040;S.stageYr=12;S.seasonFactor=1;Object.assign(S.ab,{con:78,pow:42,eye:72,spd:38,sta:75,rng:70,fld:82,arm:78,cat:88});prepareNpcSeason();S.seasonPlan=makeSeasonPlan();S.seasonContext=makeSeasonContext();
  $('start').style.display='none';document.body.classList.add('game-started');$('board').style.display='';$('act').style.display='';$('player-rail').style.display='';$('roll-rail').style.display='';board(1);runSeasonAnimation(()=>{});
}
if(new URLSearchParams(location.search).get('visual-audit')==='relief-status'){
  RNG_MODE='destiny';seedInit('visual-audit-relief-status');S=attachStateMethods(newState('蔣孟杰','P','MR'));S.stage='PRO';S.lv='CPBL1';S.org='CPBL';S.orgTeam='台中猛瑪';S.reliefStatus='SETUP';S.age=31;S.year=2041;S.stageYr=13;S.proYears=10;S.seasonFactor=1;Object.assign(S.ab,{vel:82,ctl:79,brk:81,sta:62});S.awardWatch=['中繼點榜 28 HLD｜聯盟領先 31・落後 3'];
  const st={G:56,IP:54+2/3,OUTS:164,W:3,L:2,SV:1,HLD:28,SO:64,BB:15,H:39,ER:13,era:2.16,WHIP:1.00,avgVelo:95.4,d:7.2,role:'MR',reliefStatus:'SETUP',usageRole:'勝利組',effectBreakdown:{luck:1.1,momentum:.4,choice:.2,environment:-.3,chemistry:.3,traits:.2,teammates:.1,transfer:0,total:2.0}};S.currentStandings=null;
  $('start').style.display='none';document.body.classList.add('game-started');$('board').style.display='';$('act').style.display='';$('player-rail').style.display='';$('roll-rail').style.display='';board(1);showSeasonSummary(st,()=>{});
}
if(new URLSearchParams(location.search).get('visual-audit')==='pitch-plan'){
  RNG_MODE='destiny';seedInit('visual-audit-pitch-plan');S=newState('蔣孟杰','P','MR');S.stage='PRO';S.lv='NPB2';S.org='NPB';S.orgTeam='名古屋神龍';S.age=19;S.year=2029;S.stageYr=2;S.proYears=1;S.tj=8;S.seasonFactor=1;S.seasonPlan=makeSeasonPlan();S.seasonContext=makeSeasonContext();Object.assign(S.ab,{vel:74,ctl:70,brk:72,sta:66});S.teamName=function(){return this.orgTeam||'';};
  $('start').style.display='none';document.body.classList.add('game-started');$('board').style.display='';$('act').style.display='';$('player-rail').style.display='';$('roll-rail').style.display='';board(0);phasePreContinue();
}
if(new URLSearchParams(location.search).get('visual-audit')==='hs-market'){
  RNG_MODE='destiny';seedInit('visual-audit-hs-market');S=newState('蔣孟杰','IF',null);S.age=18;S.year=2028;S.stage='HS';S.stageYr=3;S.dpos='SS';S.team='北科附工';Object.assign(S.ab,{con:58,pow:54,eye:56,spd:55,sta:54,rng:58,fld:59,arm:57});S.lastAmateurSt={G:31,PA:132,AB:113,H:39,BB:19,HR:4,RBI:25,SB:7,avg:39/113,DEF:7,TC:138,E:4};S.hsCupHistory=[{year:2028,results:[{cup:'木棒聯賽',rank:'四強',tier:2,pts:3},{cup:'黑豹旗',rank:'八強',tier:3,pts:2},{cup:'玉山盃',rank:'十六強',tier:4,pts:1}]}];
  $('start').style.display='none';document.body.classList.add('game-started');$('board').style.display='';$('act').style.display='';$('player-rail').style.display='';$('roll-rail').style.display='';board(0);pathChoiceHS();
}
if(new URLSearchParams(location.search).get('visual-audit')==='retirement'){
  RNG_MODE='destiny';seedInit('visual-audit-retirement');S=newState('蔣孟杰','IF',null);S.stage='PRO';S.lv='MLB';S.org='MiLB';S.orgTeam='休士頓太空人';S.dpos='SS';S.age=45;S.year=2055;S.stageYr=30;S.teamName=()=>S.orgTeam;S.stats.MLB=blankStat();Object.assign(S.stats.MLB,{yr:21,G:2780,PA:10940,AB:9510,H:3012,BB:1230,HR:512,RBI:1710,SB:188,AS:14,DEF:126,TC:11700,E:92});Object.assign(S.traits,{iron:true,genius:true,franchise:true,fanhero:true,community:true,leader:true,legend:true});S.legendLeague='大聯盟';S.honors=['2032 大聯盟新人王','2037 大聯盟年度 MVP','2038 大聯盟年度 MVP','2040 世界大賽冠軍'];S.log.push({y:2054,age:44,tm:S.orgTeam,line:'最後一個完整球季',st:{G:138,PA:540,AB:470,H:137,BB:62,HR:22,RBI:81,SB:4}});$('start').style.display='none';document.body.classList.add('game-started');$('board').style.display='';$('act').style.display='';$('player-rail').style.display='none';$('roll-rail').style.display='none';board(0);endGame('完成最後一季後宣布引退。');const selected=[...$('log').querySelectorAll('.card')].filter(c=>['引退之日','球迷看板・引退串'].includes((c.querySelector('h4')||{}).textContent));actClear();$('log').innerHTML='';selected.forEach(c=>$('log').appendChild(c));$('log').scrollTop=0;
}
if(new URLSearchParams(location.search).get('visual-audit')==='poaching'){
  RNG_MODE='destiny';seedInit('visual-audit-poaching');S=newState('蔣孟杰','IF',null);S.stage='PRO';S.lv='CPBL1';S.org='CPBL';S.orgTeam='台中猛瑪';S.dpos='SS';S.age=27;S.year=2037;S.stageYr=12;S.seasonFactor=1;S.ct={yrs:2,signedYears:3,mult:1.18,annual:1280,guaranteed:1};S.teamName=()=>S.orgTeam;Object.assign(S.ab,{con:84,pow:80,eye:82,spd:71,sta:78,rng:77,fld:79,arm:76});S.currentStandings={year:S.year,org:S.org,lv:S.lv,groups:[{name:'中華職棒',rows:CPBL_TEAMS.map((team,i)=>({team,W:[68,62,57,53,47,42][i],L:[52,58,63,67,73,78][i],pct:[68,62,57,53,47,42][i]/120,rank:i+1}))}]};S.currentStandings.mine=S.currentStandings.groups[0].rows[0];S.teamStrengths=Object.fromEntries(CPBL_TEAMS.map((team,i)=>[`CPBL|${team}`,[59,56,53,50,45,41][i]]));S.honors=[`${S.year} 中華職棒年度 MVP`];
  $('start').style.display='none';document.body.classList.add('game-started');$('board').style.display='';$('act').style.display='';$('player-rail').style.display='';$('roll-rail').style.display='';board(1);presentPoachingMarket(randomSubset(crossLeaguePoachOffers(9,true),2),9,1,true,220,()=>{});
}
if(new URLSearchParams(location.search).get('visual-audit')==='return-inquiry'){
  RNG_MODE='destiny';seedInit('visual-audit-return-inquiry');S=newState('蔣孟杰','P','MR');S.stage='PRO';S.lv='NPB2';S.org='NPB';S.orgTeam='名古屋神龍';S.age=22;S.year=2035;S.stageYr=7;S.seasonFactor=1;S.overseasDepth={npb2:3,milb:0};S.ct={yrs:2,signedYears:3,mult:1.05,annual:1180,guaranteed:.65};S.lastD=2.4;S.teamName=()=>S.orgTeam;Object.assign(S.ab,{vel:72,ctl:73,brk:71,sta:66});
  $('start').style.display='none';document.body.classList.add('game-started');$('board').style.display='';$('act').style.display='';$('player-rail').style.display='';$('roll-rail').style.display='';board(1);maybeTaiwanReturnInquiry(ovr(),()=>{});
}
function auditCareerInvariant(st,lv){
  let bad=0;if(!st||st.G<0||st.G>(st.scheduled||LV[lv].g))bad++;if(S.pos==='P'){if((st.role||S.role)!=='SP'&&((st.W||0)+(st.L||0)+(st.SV||0)+(st.HLD||0)>st.G))bad++;if(st.IP<0||st.SO<0||st.era<0||st.WHIP<0)bad++;}else if(st.H>st.AB||st.HR>st.H||st.SB>st.H+st.BB||st.PA<st.AB)bad++;return bad;
}
function auditCareerTraining(){
  S._seasonTrainingPlan=null;const plan=trainingDicePlan(),keys=POS_AB[S.pos].filter(k=>S.ab[k]<99);for(let i=0;i<plan.n&&keys.length;i++)addAb(pick(keys),trainingRoll(S.traits.genius?3:S.traits.late?2:1));
}
function auditCareerAging(){
  const info=agingRiskProfile();if(!info.p||!chance(info.p))return 0;const roll=ri(1,Math.max(1,Math.floor(info.p))),plan=agingLossPlan(info,roll),allocation=agingLossAllocation(plan);let loss=0;Object.entries(allocation.losses).forEach(([k,n])=>{const before=S.ab[k];S.ab[k]=clamp(before-n,1,99);loss+=before-S.ab[k];});return loss;
}
function auditCareerVerdict(st){
  const raw=actualRosterVerdict(st),first=firstTeamPerformanceReview(st),sample=S.pos==='P'?((st.role||S.role)==='SP'?st.IP>=25:st.G>=18&&st.IP>=14):st.PA>=50,poor=!!(raw.awful||first.poor||sample&&st.d<=-3.5),severe=!!(raw.awful||sample&&st.d<=-6.5);return {poor,severe,line:raw.line};
}
function simulateAuditCareer(index){
  const specs=[['P','SP',null,'CPBL2'],['P','MR',null,'NPB2'],['P','CL',null,'A1'],['C',null,'C','CPBL2'],['IF',null,'SS','NPB2'],['IF',null,'2B','A1'],['IF',null,'3B','CPBL2'],['IF',null,'1B','NPB2'],['IF',null,'DH','A1'],['OF',null,'CF','CPBL2'],['OF',null,'RF','NPB2'],['OF',null,'LF','A1']],spec=specs[index%specs.length],[pos,role,dpos,startLv]=spec;
  S=attachStateMethods(newState(`生涯稽核${index}`,pos,role));S.stage='PRO';S.age=19;S.year=2029;S.stageYr=4;S.proYears=0;S.lv=startLv;S.org=LV[startLv].org;S.orgTeam=S.org==='CPBL'?CPBL_TEAMS[index%CPBL_TEAMS.length]:S.org==='NPB'?NPB_TEAMS[index%NPB_TEAMS.length]:MLB_TEAMS[index%MLB_TEAMS.length];S.role=role;S.dpos=dpos;const par=LV[startLv].par;Object.keys(S.ab).forEach(k=>{S.ab[k]=clamp(par+ri(-5,7),25,86);S.pot[k]=clamp(S.ab[k]+ri(8,24),S.ab[k],96);});
  let violations=0,proSeasons=0,peak=ovr(),agingLoss=0,releases=0;const levels=[],lines=[];
  for(let year=0;year<30;year++){
    S.proYears++;S.prevSeasonD=Number.isFinite(S.lastD)?S.lastD:0;S.seasonFactor=1;S.seasonLuck=ri(1,20);S.seasonMomentum=+(ri(-15,15)/10).toFixed(1);S.chemistry=clamp((S.chemistry||0)+ri(-1,1),-5,5);S.seasonContext=null;S.npcSeasonContext=null;S._seasonVariance=null;S._seasonAgeGains={};if(S.pos==='P'&&year>0){const assignment=reviewPitcherAssignment();S.role=assignment.role;S.reliefStatus=assignment.status;}S.lastD=0;auditCareerTraining();agingLoss+=auditCareerAging();
    const inj=injuryProb();if(chance(inj)){const severity=ri(1,100)+(S.age>=35?8:0);S.seasonFactor=severity>94?0:severity>78?.18:severity>50?.58:.84;if(severity>78)S.bigInj++;}
    const st=applySeasonAdjustments(simSeason(S.lv));violations+=auditCareerInvariant(st,S.lv);S.lastSt=st;S.lastD=st.d;S.lastMarketBreakdown=seasonMarketEvaluation(st);S.lastMarketD=S.lastMarketBreakdown.total;levels.push(S.lv);lines.push(st);proSeasons++;peak=Math.max(peak,ovr());
    const bucket=bucketOf(S.lv);accStat(bucket,st);const pay=bookIncome(Math.round(salaryFor(S.lv,st.d)*(.92+R()*.18)),'salary',S.org,S.orgTeam),living=Math.max(30,Math.round(pay.net*(S.org==='MiLB'?.14:S.org==='NPB'?.11:.09)));spendMoney(living,'living','生涯稽核生活支出');
    const path=PATHS[S.org]||[],pi=path.indexOf(S.lv),perf=promotionPerformance(st,S.lv),margin=pi>=0&&pi<path.length-1?ratingGap(ovr(),LV[path[pi+1]].min):-99,verdict=auditCareerVerdict(st);
    if(pi>=0&&pi<path.length-1&&((perf.elite&&margin>=-4)||(perf.strong&&margin>=-1))&&chance(clamp(42+perf.score*5+margin*5,18,88)))S.lv=path[pi+1];
    else if(pi>0&&verdict.poor&&chance(clamp(32+(S.age-28)*2,24,72)))S.lv=path[pi-1];
    else if(pi===0&&verdict.poor){S.minorStruggle=(S.minorStruggle||0)+1;const grace=S.age<=21?3:S.age<=25?2:1;if(verdict.severe&&S.age>21||S.minorStruggle>=grace){releases++;break;}}
    else S.minorStruggle=0;
    if(S.age>=36&&(ovr()<LV[S.lv].min-7||chance(clamp(5+(S.age-36)*9,5,82))))break;S.age++;S.year++;
  }
  return {pos,role:role||dpos,startLv,proSeasons,retireAge:S.age,peak,finalOvr:ovr(),agingLoss,highest:levels.reduce((best,lv)=>{const p=PATHS[LV[lv].org]||[],rank=p.indexOf(lv),bp=PATHS[LV[best].org]||[];return rank>bp.indexOf(best)?lv:best;},levels[0]),netWorth:syncFinance().netWorth,releases,violations,impossibleMoney:!Number.isFinite(syncFinance().netWorth),seasons:lines.length};
}
function runCareerMonteCarlo(samples){
  const count=clamp(Math.round((Number(samples)||120)/2),60,500),careers=[];for(let i=0;i<count;i++){seedInit(`full-career-${i}`);careers.push(simulateAuditCareer(i));}const mean=k=>+(careers.reduce((n,x)=>n+(Number(x[k])||0),0)/careers.length).toFixed(2),byRole=Object.fromEntries([...new Set(careers.map(x=>x.role))].map(role=>[role,{n:careers.filter(x=>x.role===role).length,avgSeasons:+(careers.filter(x=>x.role===role).reduce((n,x)=>n+x.proSeasons,0)/careers.filter(x=>x.role===role).length).toFixed(1),avgPeak:+(careers.filter(x=>x.role===role).reduce((n,x)=>n+x.peak,0)/careers.filter(x=>x.role===role).length).toFixed(1)}]));return {careers:count,avgProSeasons:mean('proSeasons'),avgRetireAge:mean('retireAge'),avgPeak:mean('peak'),avgAgingLoss:mean('agingLoss'),releases:careers.reduce((n,x)=>n+x.releases,0),violations:careers.reduce((n,x)=>n+x.violations,0),invalidMoney:careers.filter(x=>x.impossibleMoney).length,careerLengthRange:[Math.min(...careers.map(x=>x.proSeasons)),Math.max(...careers.map(x=>x.proSeasons))],allRolesCovered:Object.keys(byRole).length===12,byRole,sample:careers.slice(0,8)};
}
function runLogicAudit(samples){
  samples=clamp(Number(samples)||500,50,3000);const saved={S,RNG_MODE,SEED},result={samples};RNG_MODE='destiny';
  const setup=(pos,lv,role,dpos)=>{S=newState('邏輯檢查',pos,role||null);S.stage='PRO';S.lv=lv;S.org=LV[lv].org;S.orgTeam=S.org==='CPBL'?CPBL_TEAMS[0]:S.org==='NPB'?NPB_TEAMS[0]:MLB_TEAMS[0];S.role=pos==='P'?(role||pitcherRole()):null;S.age=28;S.stageYr=10;S.seasonFactor=1;S.seasonLuck=10;S.seasonMomentum=0;S.seasonContext=null;S.dpos=dpos||S.dpos;S.teamName=()=>S.orgTeam;return S;};
  const mean=(a,k)=>+(a.reduce((n,x)=>n+(x[k]||0),0)/Math.max(1,a.length)).toFixed(2);
  const sd=(a,k)=>{const m=a.reduce((n,x)=>n+(Number(x[k])||0),0)/Math.max(1,a.length);return +Math.sqrt(a.reduce((n,x)=>n+Math.pow((Number(x[k])||0)-m,2),0)/Math.max(1,a.length)).toFixed(3);};
  const spread=(a,keys)=>Object.fromEntries(keys.map(k=>[k,{mean:mean(a,k),sd:sd(a,k),min:+Math.min(...a.map(x=>Number(x[k])||0)).toFixed(3),max:+Math.max(...a.map(x=>Number(x[k])||0)).toFixed(3)}]));
  seedInit('audit-independent-training-dice');const diePairs=60000,faceCounts=Array(6).fill(0),jointCounts=Array(36).fill(0);let sameFace=0,sixCount=0;for(let i=0;i<diePairs;i++){const a=trainingRoll(1),b=trainingRoll(1);faceCounts[a-1]++;faceCounts[b-1]++;jointCounts[(a-1)*6+b-1]++;if(a===b)sameFace++;if(a===6)sixCount++;if(b===6)sixCount++;}const faceExpected=diePairs*2/6,jointExpected=diePairs/36,maxFaceDeviation=Math.max(...faceCounts.map(n=>Math.abs(n-faceExpected)/faceExpected)),maxJointDeviation=Math.max(...jointCounts.map(n=>Math.abs(n-jointExpected)/jointExpected));result.trainingDiceFairness={pairs:diePairs,faces:Object.fromEntries(faceCounts.map((n,i)=>[i+1,n])),sixRate:+(sixCount/(diePairs*2)).toFixed(4),sameFaceRate:+(sameFace/diePairs).toFixed(4),maxFaceDeviation:+maxFaceDeviation.toFixed(4),maxJointDeviation:+maxJointDeviation.toFixed(4),allFacesNearOneSixth:maxFaceDeviation<.025,pairsBehaveIndependently:Math.abs(sameFace/diePairs-1/6)<.015&&maxJointDeviation<.10};
  const yearly=(pos,lv,role,dpos,abilities,seed)=>{setup(pos,lv,role,dpos);Object.assign(S.ab,abilities);seedInit(seed);return Array.from({length:samples},()=>{S.seasonLuck=ri(1,20);S._seasonVariance=null;const st=simSeason(lv);if(pos!=='P')st.OPS=(st.PA?(st.H+st.BB)/st.PA:0)+slgOf(st);return st;});};
  const regular=yearly('IF','MLB',null,'SS',{con:78,pow:78,eye:78,spd:70,sta:76,rng:78,fld:78,arm:78},'audit-year-regular'),catcher=yearly('C','CPBL1',null,'C',{con:72,pow:64,eye:72,spd:42,sta:75,rng:75,fld:82,arm:80,cat:84},'audit-year-catcher'),starter=yearly('P','MLB','SP',null,{vel:78,ctl:78,brk:78,sta:80},'audit-year-sp'),reliever=yearly('P','MLB','MR',null,{vel:78,ctl:78,brk:78,sta:64},'audit-year-rp'),bench=yearly('OF','MLB',null,'LF',{con:55,pow:55,eye:55,spd:60,sta:62,rng:58,fld:58,arm:58},'audit-year-bench');
  result.seasonVariance={regular:spread(regular,['G','PA','avg','OPS','HR','RBI','SB']),catcher:spread(catcher,['G','PA','avg','OPS','HR','E','DEF']),starter:spread(starter,['G','IP','era','WHIP','SO','W']),reliever:spread(reliever,['G','IP','era','WHIP','SO','HLD']),bench:spread(bench,['G','PA','avg','OPS','HR']),roleSpecificAndVisible:sd(regular,'OPS')>=.055&&sd(catcher,'OPS')>=.06&&sd(starter,'era')>=.65&&sd(reliever,'era')>=.82&&sd(bench,'PA')>=18};
  const traitSeason=(trait,pos,lv,role,dpos,abilities,seed)=>{seedInit(seed);setup(pos,lv,role,dpos);Object.assign(S.ab,abilities);S.seasonLuck=14;S.traits[trait]=true;return simSeason(lv);},noTraitSeason=(pos,lv,role,dpos,abilities,seed)=>{seedInit(seed);setup(pos,lv,role,dpos);Object.assign(S.ab,abilities);S.seasonLuck=14;return simSeason(lv);},batAb={con:75,pow:78,eye:78,spd:78,sta:75,rng:72,fld:72,arm:72},slug0=noTraitSeason('IF','MLB',null,'SS',batAb,'audit-trait-slug'),slug1=traitSeason('slugger','IF','MLB',null,'SS',batAb,'audit-trait-slug'),spark0=noTraitSeason('IF','MLB',null,'SS',batAb,'audit-trait-spark'),spark1=traitSeason('sparkplug','IF','MLB',null,'SS',batAb,'audit-trait-spark'),patient0=noTraitSeason('IF','MLB',null,'SS',batAb,'audit-trait-patient'),patient1=traitSeason('patient','IF','MLB',null,'SS',batAb,'audit-trait-patient');
  seedInit('audit-trait-steady');setup('IF','MLB',null,'SS');const loose=Array.from({length:500},()=>makeSeasonVarianceProfile().shared);seedInit('audit-trait-steady');setup('IF','MLB',null,'SS');S.traits.steady=true;const stable=Array.from({length:500},()=>makeSeasonVarianceProfile().shared);setup('IF','MLB',null,'SS');S.traits.iron=true;const ironRisk=injuryProb();setup('IF','MLB',null,'SS');S.samePickBonus=true;seedInit('audit-trait-combo');let comboHits=0;for(let i=0;i<800;i++){S.year=2026+i;S._seasonTrainingPlan=null;if(trainingDicePlan().mods.some(x=>x.includes('專精訓練')))comboHits++;}const playoffBase={...regular[0],scheduled:162};seedInit('audit-trait-october');setup('IF','MLB',null,'SS');const oct0=postseasonPlayerLine(playoffBase,7);seedInit('audit-trait-october');setup('IF','MLB',null,'SS');S.traits.october=true;const oct1=postseasonPlayerLine(playoffBase,7);
  result.traitEffects={ironRisk,comboTrainingRate:+(comboHits/800).toFixed(3),slugger:{baseHR:slug0.HR,traitHR:slug1.HR,baseRBI:slug0.RBI,traitRBI:slug1.RBI},sparkplug:{baseBB:spark0.BB,traitBB:spark1.BB,baseSB:spark0.SB,traitSB:spark1.SB},steadyNoise:{baseSd:sd(loose.map(v=>({v})),'v'),traitSd:sd(stable.map(v=>({v})),'v')},patient:{baseBB:patient0.BB,traitBB:patient1.BB},october:{baseH:oct0.H,traitH:oct1.H,baseRBI:oct0.RBI,traitRBI:oct1.RBI}};
  setup('IF','CPBL1',null,'SS');Object.assign(S.ab,{con:84,pow:82,eye:83,spd:72,sta:80,rng:78,fld:78,arm:76});S.age=27;S.honors=[`${S.year} 中華職棒年度 MVP`];seedInit('audit-overseas-poaching');const overseas=crossLeaguePoachOffers(9,true);result.overseasPoaching={offers:overseas.map(x=>({org:x.org,level:x.lv,team:x.team})),countries:[...new Set(overseas.map(x=>x.org))],hasJapan:overseas.some(x=>x.org==='NPB'),hasUSA:overseas.some(x=>x.org==='MiLB')};
  setup('IF','CPBL1',null,'SS');Object.assign(S.ab,{con:76,pow:72,eye:74,spd:68,sta:72,rng:72,fld:74,arm:72});S.currentStandings={year:S.year,org:S.org,lv:S.lv,groups:[{name:'中華職棒',rows:CPBL_TEAMS.map((team,i)=>({team,W:[66,61,57,52,47,43][i],L:[54,59,63,68,73,77][i],pct:[66,61,57,52,47,43][i]/120,rank:i+1}))}]};S.currentStandings.mine=S.currentStandings.groups[0].rows[0];S.teamStrengths=Object.fromEntries(CPBL_TEAMS.map((team,i)=>[`CPBL|${team}`,[58,55,52,49,45,41][i]]));seedInit('audit-same-tier-trading');const sameTier=sameLeagueTradeOffers(8,true),accepted=sameTier.find(x=>x.marketType==='rebuild')||sameTier[0],from=S.orgTeam;S.orgTeam=accepted.team;const acceptedEffect=activatePoachAgreement(accepted,from),storedStrength=S.teamStrengths[`CPBL|${accepted.team}`];
  const acceptedLine=poachEffectLine(acceptedEffect),tradeUsageRun=enabled=>{setup('IF','CPBL1',null,'SS');Object.assign(S.ab,{con:62,pow:58,eye:61,spd:64,sta:67,rng:64,fld:65,arm:63});if(enabled)S.poachEffect={year:S.year,org:S.org,lv:S.lv,team:S.orgTeam,label:'測試交易後角色',rolePromise:'先發打線核心養成席次',usageAdj:14,perfAdj:-.25,teamWins:-.8};seedInit('audit-trade-playing-time');return Array.from({length:160},()=>{S._seasonVariance=null;S.seasonLuck=10;return simSeason('CPBL1');});},withoutTrade=tradeUsageRun(false),withTrade=tradeUsageRun(true);
  const tradeBaseline={};[['MLB','IF',null,'SS'],['A2','IF',null,'SS'],['NPB1','IF',null,'SS'],['NPB2','P','MR',null],['CPBL1','IF',null,'SS'],['CPBL2','P','MR',null]].forEach(([lv,pos,role,dpos])=>{setup(pos,lv,role,dpos);tradeBaseline[lv]=leagueTradeProbability().p;});
  setup('IF','CPBL1',null,'SS');S.currentStandings={mine:{W:60,L:60,pct:.5}};const normalTradeP=leagueTradeProbability().p;S.tradeHeat=18;const requestedTradeP=leagueTradeProbability().p;S.tradeHistory=[{year:S.year-1,from:'A',to:'B'}];S.tradeHeat=0;const cooldownTradeP=leagueTradeProbability().p;
  setup('IF','CPBL1',null,'SS');const baseTerms=termParams(6,'CPBL1');S.poachLeverage=2;S.poachLeverageUntil=S.year;const leveragedTerms=termParams(6,'CPBL1'),contenderOffer=sameTier.find(x=>x.marketType==='contender'),rebuildOffer=sameTier.find(x=>x.marketType==='rebuild');
  result.sameTierTrading={offers:sameTier.map(x=>({team:x.team,level:x.lv,type:x.marketType,label:x.label,record:`${x.record.W}-${x.record.L}`,usage:x.usageAdj,teamWins:x.teamWins})),sameLevelOnly:sameTier.every(x=>x.org==='CPBL'&&x.lv==='CPBL1'&&!x.cross&&x.team!==from),oneConcreteTradeNotMarket:sameTier.length>=3,hasContender:sameTier.some(x=>x.marketType==='contender'),hasRival:sameTier.some(x=>x.marketType==='rival'),hasRebuild:sameTier.some(x=>x.marketType==='rebuild'),recordsMatchDirection:contenderOffer.record.pct>rebuildOffer.record.pct,frequency:{normal:normalTradeP,requested:requestedTradeP,cooldown:cooldownTradeP,normalIsRare:normalTradeP<=5,requestRaisesOdds:requestedTradeP>normalTradeP,cooldownIsRareNotImpossible:cooldownTradeP>0&&cooldownTradeP<=1},agreement:{team:accepted.team,effectYear:acceptedEffect.year,role:acceptedEffect.rolePromise,storedStrength,expectedStrength:accepted.strengthTarget,summaryIsValid:!acceptedLine.includes('undefined')&&!acceptedLine.includes('NaN')},playingTime:{without:mean(withoutTrade,'G'),with:mean(withTrade,'G'),promiseIncreasesGames:mean(withTrade,'G')>mean(withoutTrade,'G')+3},contractLeverage:{base:baseTerms.longM,withTrade:leveragedTerms.longM,actuallyIncreases:leveragedTerms.longM>baseTerms.longM}};
  result.tradeRateCalibration={rates:tradeBaseline,exact:tradeBaseline.MLB===7&&tradeBaseline.A2===4&&tradeBaseline.NPB1===2.5&&tradeBaseline.NPB2===1.5&&tradeBaseline.CPBL1===2&&tradeBaseline.CPBL2===2,mlbAboveAsia:tradeBaseline.MLB>tradeBaseline.NPB1&&tradeBaseline.MLB>tradeBaseline.CPBL1,minorAboveNpbFarm:tradeBaseline.A2>tradeBaseline.NPB2};
  seedInit('audit-trade-rate-rolls');result.tradeRateCalibration.observed=Object.fromEntries(Object.entries(tradeBaseline).map(([lv,p])=>{let hits=0;for(let i=0;i<8000;i++)if(chance(p))hits++;return [lv,+(hits/80).toFixed(2)];}));result.tradeRateCalibration.rollsPerLevel=8000;result.tradeRateCalibration.withinTolerance=Object.entries(tradeBaseline).every(([lv,p])=>Math.abs(result.tradeRateCalibration.observed[lv]-p)<=.8);
  const returnProfileAt=(lv,age,years,lastContact)=>{setup(lv==='NPB2'?'P':'IF',lv,lv==='NPB2'?'MR':null,lv==='NPB2'?null:'SS');S.age=age;S.year=2035;S.overseasDepth={npb2:lv==='NPB2'?years:0,milb:lv==='NPB2'?0:years};S.lastSt=lv==='NPB2'?{G:42,IP:40,H:35,BB:13,SO:43,ER:15,HLD:18}:{G:112,PA:460,AB:410,H:112,BB:42,_1B:78,_2B:22,_3B:3,HR:9,DEF:4};S.lastD=1;if(Number.isFinite(lastContact))S.returnInquiryHistory=[{year:lastContact,kind:lv==='NPB2'?'npb2':'milb',outcome:'stay'}];return taiwanReturnInquiryProfile(ovr());};
  const npbYoungBefore=returnProfileAt('NPB2',20,3),npbYoungDue=returnProfileAt('NPB2',20,4),npbPrimeDue=returnProfileAt('NPB2',25,2),npbVeteranDue=returnProfileAt('NPB2',31,1),milbYoungBefore=returnProfileAt('A2',19,4),milbYoungDue=returnProfileAt('A2',19,5),milbPrimeDue=returnProfileAt('A2',25,3),milbOlderDue=returnProfileAt('A2',29,2),milbVeteranDue=returnProfileAt('A2',32,1);
  const thresholdMatrix={npb2:{age20:taiwanReturnInquiryThreshold('npb2',20),age22:taiwanReturnInquiryThreshold('npb2',22),age25:taiwanReturnInquiryThreshold('npb2',25),age31:taiwanReturnInquiryThreshold('npb2',31)},milb:{age19:taiwanReturnInquiryThreshold('milb',19),age22:taiwanReturnInquiryThreshold('milb',22),age25:taiwanReturnInquiryThreshold('milb',25),age29:taiwanReturnInquiryThreshold('milb',29),age32:taiwanReturnInquiryThreshold('milb',32)}};
  const inquiryCooldown2=returnProfileAt('A2',29,3,2033),inquiryCooldown3=returnProfileAt('A2',29,3,2032);result.taiwanReturnInquiry={thresholds:thresholdMatrix,youngPlayersGetTime:!npbYoungBefore.eligible&&npbYoungDue.eligible&&!milbYoungBefore.eligible&&milbYoungDue.eligible,primeWindows:{npb25:npbPrimeDue.eligible,milb25:milbPrimeDue.eligible,milb29:milbOlderDue.eligible},veteransContactedAfterOne:{npb31:npbVeteranDue.eligible,milb32:milbVeteranDue.eligible},refusalCooldown:{twoYearsBlocked:!inquiryCooldown2.eligible,threeYearsEligible:inquiryCooldown3.eligible},interestIsCapped:Math.max(npbYoungDue.interest,milbPrimeDue.interest,milbOlderDue.interest)<=78,exactAgeBands:JSON.stringify(thresholdMatrix)===JSON.stringify({npb2:{age20:4,age22:3,age25:2,age31:1},milb:{age19:5,age22:4,age25:3,age29:2,age32:1}})};
  const agingSample=(age,bigInj,pos='IF')=>{setup(pos,'MLB',pos==='P'?'SP':null,pos==='P'?null:'SS');S.age=age;S.bigInj=bigInj||0;Object.keys(S.ab).forEach(k=>S.ab[k]=75);S.lastSt=null;const info=agingRiskProfile(),rolls=Array.from({length:2000},()=>ri(1,100)),triggered=rolls.filter(v=>v<=info.p),losses=triggered.map(v=>agingLossPlan(info,v).planned);S._seasonTrainingPlan=null;const tp=trainingDicePlan();return {risk:info.p,triggerRate:+(triggered.length/rolls.length).toFixed(3),meanTriggeredLoss:losses.length?+(losses.reduce((a,b)=>a+b,0)/losses.length).toFixed(1):0,annualExpectedLoss:+(losses.reduce((a,b)=>a+b,0)/rolls.length).toFixed(1),trainingDice:tp.n,trainingCap:tp.ageCap,speedGrowthLimit:ageGrowthLimit('spd'),staminaGrowthLimit:ageGrowthLimit('sta')};};
  seedInit('audit-aging-curve');result.agingCurve={age30:agingSample(30,0),age33:agingSample(33,0),age36:agingSample(36,0),age39:agingSample(39,0),age36AfterMajorInjury:agingSample(36,2),clearlyEscalates:false};result.agingCurve.clearlyEscalates=result.agingCurve.age30.annualExpectedLoss<result.agingCurve.age33.annualExpectedLoss&&result.agingCurve.age33.annualExpectedLoss<result.agingCurve.age36.annualExpectedLoss&&result.agingCurve.age36.annualExpectedLoss<result.agingCurve.age39.annualExpectedLoss&&result.agingCurve.age36AfterMajorInjury.annualExpectedLoss>result.agingCurve.age36.annualExpectedLoss;
  setup('C','CPBL1',null,'C');S.age=45;Object.assign(S.ab,{sta:26,eye:91,fld:29,con:79,pow:95,spd:32,rng:38,arm:55,cat:61});seedInit('audit-aging-allocation');const allocationPlan={ageBand:5,planned:16,count:7},allocationRuns=Array.from({length:2400},()=>agingLossAllocation(allocationPlan)),allocationMean=k=>+(allocationRuns.reduce((n,x)=>n+(x.losses[k]||0),0)/allocationRuns.length).toFixed(2),allocationMax=k=>Math.max(...allocationRuns.map(x=>x.losses[k]||0));result.agingAllocation={means:Object.fromEntries(POS_AB.C.map(k=>[k,allocationMean(k)])),maxima:Object.fromEntries(POS_AB.C.map(k=>[k,allocationMax(k)])),lowPhysicalMoreExposed:allocationMean('sta')>allocationMean('eye')&&allocationMean('spd')>allocationMean('pow'),lowStatCapsHold:allocationMax('sta')<=agingStatProfile('sta',5).cap&&allocationMax('fld')<=agingStatProfile('fld',5).cap,exampleCaps:{stamina26:agingStatProfile('sta',5).cap,fielding29:agingStatProfile('fld',5).cap,eye91:agingStatProfile('eye',5).cap}};
  /* 全層級 × 全角色 × 低／中／高能力矩陣：不只抓數學錯誤，也檢查棒球使用方式與能力方向。 */
  const matrixRoles=[['P','SP',null],['P','MR',null],['P','CL',null],['C',null,'C'],['IF',null,'SS'],['IF',null,'2B'],['IF',null,'3B'],['IF',null,'1B'],['IF',null,'DH'],['OF',null,'CF'],['OF',null,'RF'],['OF',null,'LF']],bands=[['below',-10],['average',0],['star',12]],matrix=[],matrixProblems=[];
  for(const lv of Object.keys(LV))for(const [pos,role,dpos] of matrixRoles)for(const [band,delta] of bands){setup(pos,lv,role,dpos);const par=LV[lv].par;Object.keys(S.ab).forEach(k=>S.ab[k]=clamp(par+delta,1,99));if(pos==='P'){S.role=role;S.ab.sta=clamp(par+delta+(role==='SP'?6:-8),1,99);}seedInit(`matrix-${lv}-${pos}-${role||dpos}-${band}`);const lines=[];for(let i=0;i<18;i++){S.seasonLuck=ri(1,20);S._seasonVariance=null;const st=simSeason(lv);if(pos!=='P')st.OPS=(st.PA?(st.H+st.BB)/st.PA:0)+slgOf(st);lines.push(st);const tag=`${lv}/${role||dpos}/${band}/${i}`;if(st.G<0||st.G>LV[lv].g)matrixProblems.push(tag+':games');if(pos==='P'){if(role==='SP'&&(st.G>34||st.IP>st.G*6.8+.2))matrixProblems.push(tag+':starter workload');if(role!=='SP'&&(st.G>72||st.IP>st.G*1.45+.2||st.W+st.L+st.SV+st.HLD>st.G))matrixProblems.push(tag+':relief workload/decisions');if(st.era<0||st.era>11.6||st.WHIP<0||st.WHIP>2.5)matrixProblems.push(tag+':pitch rates');}else{if(st.PA>st.G*5||st.H>st.AB||st.HR>st.H||st.SB>st.H+st.BB||st.RBI>st.PA)matrixProblems.push(tag+':hitting totals');if(st.avg<0||st.avg>.435||st.OPS<0||st.OPS>1.65)matrixProblems.push(tag+':hitting rates');if(st._dh&&(st.TC||st.E||st.DEF||st.defG))matrixProblems.push(tag+':dh defense');}}
    matrix.push({lv,role:role||dpos,band,G:mean(lines,'G'),volume:mean(lines,pos==='P'?'IP':'PA'),quality:mean(lines,pos==='P'?'era':'OPS'),HR:pos==='P'?undefined:mean(lines,'HR'),HLD:role==='MR'?mean(lines,'HLD'):undefined,SV:role==='CL'?mean(lines,'SV'):undefined});}
  let directionFailures=0;for(const lv of Object.keys(LV))for(const [,role,dpos] of matrixRoles){const key=role||dpos,rows=matrix.filter(x=>x.lv===lv&&x.role===key),lo=rows.find(x=>x.band==='below'),av=rows.find(x=>x.band==='average'),hi=rows.find(x=>x.band==='star');if(!lo||!av||!hi)continue;const pitcher=!!role;if(pitcher?!(hi.quality<av.quality&&av.quality<lo.quality):!(hi.quality>av.quality&&av.quality>lo.quality))directionFailures++;}
  result.fullPossibilityMatrix={levels:Object.keys(LV).length,roles:matrixRoles.length,abilityBands:bands.length,seasonsChecked:matrix.length*18,problems:matrixProblems.slice(0,40),problemCount:matrixProblems.length,directionFailures,sample:matrix.filter(x=>['CPBL1','NPB1','MLB'].includes(x.lv)&&['SP','MR','CL','C','SS','DH','CF'].includes(x.role))};
  const leagueCalibration=['MLB','NPB1','CPBL1'].map(lv=>{const bat=matrix.find(x=>x.lv===lv&&x.role==='SS'&&x.band==='average'),pitch=matrix.find(x=>x.lv===lv&&x.role==='SP'&&x.band==='average'),target={MLB:{ops:[.63,.80],era:[3.35,5.10]},NPB1:{ops:[.57,.75],era:[2.25,3.90]},CPBL1:{ops:[.64,.82],era:[3.25,5.10]}}[lv];return {lv,OPS:+bat.quality.toFixed(3),ERA:+pitch.quality.toFixed(2),inRange:bat.quality>=target.ops[0]&&bat.quality<=target.ops[1]&&pitch.quality>=target.era[0]&&pitch.quality<=target.era[1]};});result.leagueCalibration={rows:leagueCalibration,allInRange:leagueCalibration.every(x=>x.inRange)};
  const amateurBands=[['below',-9],['average',0],['elite',14]],amateurMatrix=[];for(const stage of ['HS','U','AMA'])for(const [pos,role,dpos] of matrixRoles)for(const [band,delta] of amateurBands){setup(pos,'CPBL1',role,dpos);S.stage=stage;S.lv=null;S.team='測試球隊';const par=amateurSeasonConfig().par;Object.keys(S.ab).forEach(k=>S.ab[k]=clamp(par+delta,1,99));if(pos==='P'){S.role=role;S.ab.sta=clamp(par+delta+(role==='SP'?6:-8),1,99);}seedInit(`amateur-${stage}-${pos}-${role||dpos}-${band}`);const ls=Array.from({length:24},()=>{S.seasonLuck=ri(1,20);S._seasonVariance=null;const st=simAmateurSeason();if(pos!=='P')st.OPS=(st.PA?(st.H+st.BB)/st.PA:0)+slgOf(st);return st;});amateurMatrix.push({stage,role:role||dpos,band,G:mean(ls,'G'),volume:mean(ls,pos==='P'?'IP':'PA'),quality:mean(ls,pos==='P'?'era':'OPS'),AVG:pos==='P'?undefined:mean(ls,'avg'),HR:pos==='P'?undefined:mean(ls,'HR'),K9:pos==='P'?mean(ls,'SO')/Math.max(.1,mean(ls,'IP'))*9:undefined});}
  let amateurDirectionFailures=0;for(const stage of ['HS','U','AMA'])for(const [,role,dpos] of matrixRoles){const key=role||dpos,rows=amateurMatrix.filter(x=>x.stage===stage&&x.role===key),lo=rows.find(x=>x.band==='below'),av=rows.find(x=>x.band==='average'),hi=rows.find(x=>x.band==='elite'),pitcher=!!role;if(!lo||!av||!hi||(pitcher?!(hi.quality<av.quality&&av.quality<lo.quality):!(hi.quality>av.quality&&av.quality>lo.quality)))amateurDirectionFailures++;}result.amateurPossibilityMatrix={abilityBands:amateurBands.length,seasonsChecked:amateurMatrix.length*24,problems:amateurMatrix.filter(x=>x.G<0||!Number.isFinite(x.quality)),directionFailures:amateurDirectionFailures,sample:amateurMatrix.filter(x=>x.stage==='HS')};
  const hsResumeTest=(pos,delta,cupRanks)=>{setup(pos,'CPBL1',pos==='P'?'SP':null,pos==='P'?null:'SS');S.stage='HS';S.lv=null;S.year=2028;S.stageYr=3;const par=amateurSeasonConfig().par;Object.keys(S.ab).forEach(k=>S.ab[k]=clamp(par+delta,1,99));if(pos==='P')S.ab.sta=clamp(par+delta+6,1,99);seedInit(`hs-resume-${pos}-${delta}`);const ls=Array.from({length:48},()=>{S.seasonLuck=ri(1,20);S._seasonVariance=null;return simAmateurSeason();}),avgLine={};['G','PA','AB','H','HR','RBI','SB','BB','IP','SO','ER','H','DEF','avgVelo'].forEach(k=>avgLine[k]=mean(ls,k));if(pos==='P'){avgLine.era=mean(ls,'era');avgLine.WHIP=mean(ls,'WHIP');}else avgLine.avg=mean(ls,'avg');S.hsCupHistory=[{year:S.year,results:cupRanks.map((rank,i)=>({cup:HS_CUPS[i],rank,tier:['冠軍','亞軍','四強','八強','十六強','預賽出局'].indexOf(rank),pts:[5,4,3,2,1,0][['冠軍','亞軍','四強','八強','十六強','預賽出局'].indexOf(rank)]}))}];S.lastAmateurSt=avgLine;return amateurRecruitingResume(avgLine);};const eliteHsHitter=hsResumeTest('IF',15,['四強','八強','十六強']),poorHsHitter=hsResumeTest('IF',-9,['預賽出局','十六強','預賽出局']),eliteHsPitcher=hsResumeTest('P',15,['亞軍','四強','八強']);result.highSchoolRecruiting={eliteHitter:eliteHsHitter,poorHitter:poorHsHitter,elitePitcher:eliteHsPitcher,eliteCanDrawOverseas:eliteHsHitter.jpDirect||eliteHsHitter.usDirect||eliteHsPitcher.jpDirect||eliteHsPitcher.usDirect,poorIsNotAutoOffered:!poorHsHitter.jpDirect&&!poorHsHitter.usDirect};
  setup('IF','MLB',null,'DH');Object.assign(S.ab,{con:30,pow:30,eye:30,spd:99,sta:55,rng:30,fld:30,arm:30});seedInit('audit-speed');const speed=Array.from({length:samples},()=>simSeason('MLB'));result.speedBench={avgG:mean(speed,'G'),avgPA:mean(speed,'PA'),avgSB:mean(speed,'SB'),sbOverGames:speed.filter(x=>x.SB>x.G).length,sbOverTimesOnBase:speed.filter(x=>x.SB>x.H+x.BB).length};
  setup('IF','MLB',null,'DH');Object.assign(S.ab,{con:95,pow:45,eye:95,spd:99,sta:80,rng:30,fld:30,arm:30});seedInit('audit-speed-star');const speedStar=Array.from({length:samples},()=>simSeason('MLB'));result.speedStar={avgG:mean(speedStar,'G'),avgPA:mean(speedStar,'PA'),avgSB:mean(speedStar,'SB'),maxSB:Math.max(...speedStar.map(x=>x.SB))};
  const defenseRun=off=>{setup('IF','MLB',null,'SS');Object.assign(S.ab,{con:off,pow:off,eye:off,spd:60,sta:70,rng:90,fld:90,arm:90});return Array.from({length:samples},()=>simSeason('MLB'));};seedInit('audit-defense-bench');const db=defenseRun(30);seedInit('audit-defense-star');const ds=defenseRun(95);result.defensePlayingTime={bench:{avgG:mean(db,'G'),avgDEF:mean(db,'DEF'),avgDefG:mean(db,'defG')},star:{avgG:mean(ds,'G'),avgDEF:mean(ds,'DEF'),avgDefG:mean(ds,'defG')}};
  const catcherRun=value=>{setup('C','CPBL1',null,'C');Object.assign(S.ab,{con:62,pow:45,eye:58,spd:38,sta:68,rng:value,fld:value,arm:value,cat:value});return Array.from({length:samples},()=>simSeason('CPBL1'));};seedInit('audit-catcher-low');const catcherLow=catcherRun(45);seedInit('audit-catcher-high');const catcherHigh=catcherRun(85);result.catcherDefense={low:{avgE:mean(catcherLow,'E'),avgExpectedE:mean(catcherLow,'EXPECTED_E'),avgCallRuns:mean(catcherLow,'CALL_RUNS'),avgStaffEraAdj:mean(catcherLow,'STAFF_ERA_ADJ'),avgDEF:mean(catcherLow,'DEF')},high:{avgE:mean(catcherHigh,'E'),avgExpectedE:mean(catcherHigh,'EXPECTED_E'),avgCallRuns:mean(catcherHigh,'CALL_RUNS'),avgStaffEraAdj:mean(catcherHigh,'STAFF_ERA_ADJ'),avgDEF:mean(catcherHigh,'DEF')}};
  setup('C','CPBL1',null,'C');Object.assign(S.ab,{con:85,pow:42,eye:80,spd:38,sta:75,rng:72,fld:84,arm:80,cat:88});S.stats.CPBL=blankStat();S.stats.CPBL.yr=5;const awardLine={G:104,PA:456,AB:405,H:160,HR:0,RBI:38,SB:1,BB:51,avg:160/405,d:10,scheduled:120,defG:96,TC:810,E:5,EXPECTED_E:4.3,CS:34,SBA:78,DEF:18,CALL_RUNS:14,CALL_GRADE:'S',STAFF_ERA_ADJ:-.22};seedInit('audit-catcher-awards-1');awards('CPBL',awardLine);const awardWatch1=S.awardWatch.slice();S.year++;S.awardWatch=[];seedInit('audit-catcher-awards-2');awards('CPBL',awardLine);const awardWatch2=S.awardWatch.slice();result.catcherAwardWatch={first:awardWatch1,second:awardWatch2,variesBySeason:JSON.stringify(awardWatch1)!==JSON.stringify(awardWatch2),irrelevantHomeRunLine:awardWatch1.some(x=>x.includes('全壘打'))};
  result.awardThresholdConsistency={battingLeadWins:winsStatTitle(true,.308,.303),homeRunLeadWins:winsStatTitle(true,29,21),unqualifiedDoesNotWin:!winsStatTitle(false,.308,.303),lowerEraWins:winsStatTitle(true,2.51,3.03,true),clearDhLeadWins:clearVoteLead(.925,.792,.06)};
  setup('IF','MLB',null,'DH');S.stats.MLB=blankStat();S.stats.MLB.yr=3;const userAwardLine={G:148,PA:554,AB:500,H:154,BB:54,HR:29,RBI:91,SB:2,avg:.308,d:8,scheduled:162,defG:0,TC:0,E:0,DEF:0},userCompetition={avg:.303,h:164,hr:21,rbi:103,sb:31,obp:.397,era:3.05,w:15,so:192,sv:35,hld:31,hp:37,ops:.792,def:7,cs:31};seedInit('audit-user-award-case');awards('MLB',userAwardLine,userCompetition);const userAwardNames=S.honors.filter(x=>x.startsWith(String(S.year))).map(x=>x.slice(5)),userAwardWatch=S.awardWatch.slice();result.userAwardCase={avg:userAwardLine.avg,HR:userAwardLine.HR,OPS:+((userAwardLine.H+userAwardLine.BB)/userAwardLine.PA+slgOf(userAwardLine)).toFixed(3),lines:{avg:userAwardLine._awardCompetition.avg,HR:userAwardLine._awardCompetition.hr,OPS:userAwardLine._awardCompetition.ops},awards:userAwardNames,watch:userAwardWatch,battingTitle:userAwardNames.includes('大聯盟打擊王'),homeRunTitle:userAwardNames.includes('大聯盟全壘打王'),dhAward:userAwardNames.some(x=>/指定打擊|銀棒獎・指定打擊/.test(x)),noWonAwardsRepeatedAsWatch:!userAwardWatch.some(x=>/打擊王競爭|全壘打王競爭|最佳指定打擊/.test(x)),wonEverythingLed:userAwardLine.avg>=userAwardLine._awardCompetition.avg&&userAwardLine.HR>=userAwardLine._awardCompetition.hr&&userAwardNames.includes('大聯盟打擊王')&&userAwardNames.includes('大聯盟全壘打王')};
  setup('IF','MLB',null,'DH');S.stats.MLB=blankStat();S.stats.MLB.yr=3;const shortBatLine={G:112,PA:450,AB:400,H:132,BB:50,HR:22,RBI:70,SB:1,avg:.330,d:5,scheduled:162,defG:0,TC:0,E:0,DEF:0},mlbOfficial=officialAwardQualification('MLB');seedInit('audit-short-batting-qualification');awards('MLB',shortBatLine,userCompetition);result.battingQualification={PA:shortBatLine.PA,required:mlbOfficial.pa,noBattingTitle:!S.honors.includes(`${S.year} 大聯盟打擊王`),homeRunTitleStillPossible:S.honors.includes(`${S.year} 大聯盟全壘打王`),explainsMissingQualification:S.awardWatch.some(x=>x.includes('尚未取得打擊王資格')&&x.includes(`450 PA／規定 ${mlbOfficial.pa} PA`))};
  result.officialAwardQualification={CPBL:officialAwardQualification('CPBL1'),NPB:officialAwardQualification('NPB1'),MLB:mlbOfficial,expected:mlbOfficial.pa===502&&mlbOfficial.ip===162&&officialAwardQualification('NPB1').pa===443&&officialAwardQualification('CPBL1').pa===372};
  setup('C','CPBL1',null,'C');seedInit('audit-monthly-errors');const errorFinal={...catcherHigh[0],G:98,PA:430,AB:390,H:126,HR:0,RBI:38,SB:1,BB:40,TC:760,E:10,EXPECTED_E:7.4,defG:86,CALL_RUNS:12,CALL_DEF:4,DEF:10},errorTimeline=[-1,-2,0,-2,-1,0].map((pulse,i)=>({n:i===0?'打線熄火':'測試月份',pulse,personalPulse:pulse})),errorSlices=monthlySeasonSlices(errorFinal,errorTimeline,6),errorDeltas=errorSlices.map((x,i)=>(x.E||0)-(i?errorSlices[i-1].E||0:0));result.monthlyErrors={deltas:errorDeltas,sum:errorDeltas.reduce((a,b)=>a+b,0),distinct:new Set(errorDeltas).size,final:errorSlices[5].E};
  setup('C','CPBL1',null,'C');S.age=28;seedInit('audit-training-young');S._seasonTrainingPlan=null;const youngPlan=trainingDicePlan();setup('C','CPBL1',null,'C');S.age=38;S.offseasonTrainingDice=3;seedInit('audit-training-veteran');S._seasonTrainingPlan=null;const veteranPlan=trainingDicePlan();setup('C','CPBL1',null,'C');S.age=42;S.offseasonTrainingDice=3;seedInit('audit-training-old');S._seasonTrainingPlan=null;const oldPlan=trainingDicePlan();S._seasonAgeGains={};const sta0=S.ab.sta,spd0=S.ab.spd;addAb('sta',100);addAb('sta',100);addAb('spd',100);result.agingTraining={young:{dice:youngPlan.n,cap:youngPlan.ageCap},veteran:{dice:veteranPlan.n,cap:veteranPlan.ageCap},old:{dice:oldPlan.n,cap:oldPlan.ageCap,staminaGain:S.ab.sta-sta0,speedGain:S.ab.spd-spd0}};
  setup('IF','MLB',null,'SS');Object.assign(S.ab,{con:99,pow:99,eye:99,spd:55,sta:1,rng:80,fld:80,arm:80});seedInit('audit-dh');const dh=Array.from({length:samples},()=>simSeason('MLB')).filter(x=>x._dh);result.temporaryDH={seasons:dh.length,ghostDefense:dh.filter(x=>x.DEF!==0||x.TC>0||x.defG>0).length};
  const powerRun=pow=>{setup('IF','MLB',null,'DH');Object.assign(S.ab,{con:75,pow,eye:75,spd:60,sta:70,rng:30,fld:30,arm:30});return Array.from({length:samples},()=>{const st=simSeason('MLB'),m=seasonMarketEvaluation(st);return {...st,market:m.total,OPS:(st.PA?(st.H+st.BB)/st.PA:0)+slgOf(st)};});};seedInit('audit-power-low');const pl=powerRun(30);seedInit('audit-power-high');const ph=powerRun(99);result.powerValue={low:{avgHR:mean(pl,'HR'),avgOPS:mean(pl,'OPS'),avgMarket:mean(pl,'market')},high:{avgHR:mean(ph,'HR'),avgOPS:mean(ph,'OPS'),avgMarket:mean(ph,'market')}};
  const reliefRuns={};for(const status of ['LONG','MIDDLE','SETUP','CLOSER']){setup('P','CPBL1',status==='CLOSER'?'CL':'MR');S.reliefStatus=status;Object.assign(S.ab,{vel:82,ctl:80,brk:81,sta:45});seedInit(`audit-relief-${status}`);reliefRuns[status]=Array.from({length:samples},()=>simSeason('CPBL1'));}
  const rp=Object.values(reliefRuns).flat();result.relief={seasons:rp.length,roles:Object.fromEntries(Object.entries(reliefRuns).map(([status,rows])=>[status,{G:mean(rows,'G'),IP:mean(rows,'IP'),HLD:mean(rows,'HLD'),SV:mean(rows,'SV')}])),impossibleDecisions:rp.filter(x=>x.W+x.L+x.SV+x.HLD>x.G).length,maxDecisionOverflow:Math.max(...rp.map(x=>x.W+x.L+x.SV+x.HLD-x.G)),hldOnly:rp.every(x=>x.HP===(x.role==='MR'?x.HLD:0)),usageOrdered:mean(reliefRuns.SETUP,'G')>mean(reliefRuns.LONG,'G')&&mean(reliefRuns.SETUP,'HLD')>mean(reliefRuns.MIDDLE,'HLD')&&mean(reliefRuns.MIDDLE,'HLD')>mean(reliefRuns.LONG,'HLD'),closerOwnsSaves:mean(reliefRuns.CLOSER,'SV')>mean(reliefRuns.SETUP,'SV')+10};
  result.relief.impossibleInputRepair=normalizeReliefLine({G:30,IP:30,W:3,L:2,SV:20,HLD:23,HP:26,role:'MR'});
  setup('P','CPBL1','MR');S.reliefStatus='MIDDLE';S.prevSeasonD=7;S.lastSt={G:58,IP:57,H:35,BB:10,SO:72,ER:12,HLD:28,SV:1};seedInit('audit-role-rise');const rise=reviewPitcherAssignment();S.role='CL';S.reliefStatus='CLOSER';S.prevSeasonD=-6;S.lastSt={G:42,IP:39,H:52,BB:24,SO:30,ER:28,HLD:2,SV:9};seedInit('audit-role-fall');const fall=reviewPitcherAssignment();setup('P','CPBL1','SP');S.age=37;S.prevSeasonD=-4;S.ab.sta=r99(55);S.lastSt={G:18,IP:82,H:103,BB:41,SO:55,ER:55};seedInit('audit-veteran-bullpen');const veteran=reviewPitcherAssignment();result.pitcherAssignment={rise,fall,veteran,middleCanRise:rise.status==='SETUP',closerCanFall:fall.status!=='CLOSER',veteranStarterCanMoveToBullpen:veteran.role==='MR'};
  const draftPay=Array.from({length:60},(_,i)=>draftSigningBonus(i+1));result.draftSigningBonus={first:draftPay[0],tenth:draftPay[9],thirtieth:draftPay[29],last:draftPay[59],strictlyDescending:draftPay.every((v,i)=>i===0||v<draftPay[i-1])};
  setup('P','NPB2','MR');S.orgTeam='名古屋神龍';result.seasonIdentity=seasonTeamInfo();result.seasonIdentity.correctSecondTeam=result.seasonIdentity.name==='名古屋神龍二軍'&&result.seasonIdentity.level.startsWith('日職二軍');
  const amateurPitcherLine=role=>{S=newState('業餘定位稽核','P',role);S.stage='HS';S.role=role;S.stageYr=2;S.seasonFactor=1;S.seasonLuck=10;S.seasonMomentum=0;S.seasonContext=null;Object.assign(S.ab,{vel:78,ctl:76,brk:77,sta:82});seedInit(`audit-amateur-role-${role}`);return simAmateurSeason();},amateurSP=amateurPitcherLine('SP'),amateurMR=amateurPitcherLine('MR'),amateurCL=amateurPitcherLine('CL');result.amateurPitcherRoles={SP:{usage:amateurSP.usageRole,G:amateurSP.G,IP:amateurSP.IP},MR:{usage:amateurMR.usageRole,G:amateurMR.G,IP:amateurMR.IP},CL:{usage:amateurCL.usageRole,G:amateurCL.G,IP:amateurCL.IP},starterHasStarterWorkload:/先發|王牌/.test(amateurSP.usageRole)&&amateurSP.IP/amateurSP.G>amateurMR.IP/amateurMR.G,relieversStayInBullpen:/中繼|牛棚/.test(amateurMR.usageRole)&&/終結者|牛棚/.test(amateurCL.usageRole)};
  setup('IF','CPBL1',null,'SS');S.age=26;seedInit('audit-event-frequency');const plans=Array.from({length:5000},()=>makeSeasonPlan()),eventNames=EVENTS.map(e=>e.n),uniqueNames=new Set(eventNames),sideCount=plans.filter(p=>p.team||p.family||p.fan).length;S.drawnEvents=['打擊機特訓'];S.drawnEvents=S.drawnEvents||[];result.events={databaseCount:EVENTS.length,uniqueNameCount:uniqueNames.size,duplicateNames:[...new Set(eventNames.filter((n,i)=>eventNames.indexOf(n)!==i))],quietRate:+(plans.filter(p=>p.quiet).length/plans.length).toFixed(3),averageMainEvents:+(plans.reduce((n,p)=>n+p.events,0)/plans.length).toFixed(3),sideStoryRate:+(sideCount/plans.length).toFixed(3),maxMainEvents:Math.max(...plans.map(p=>p.events)),careerHistoryPersists:S.drawnEvents.includes('打擊機特訓'),reappearsInPool:EVENTS.filter(e=>eventCareerEligible(e,S.drawnEvents)).some(e=>e.n==='打擊機特訓')};
  setup('P','NPB2','MR');Object.assign(S.ab,{vel:78,ctl:72,brk:74,sta:65});const promoLine={G:42,IP:41,H:27,BB:8,SO:51,ER:8,era:1.76,WHIP:.85,HLD:24,W:3,L:1,SV:0,d:8};result.promotionEvaluation={performance:promotionPerformance(promoLine,'NPB2'),abilityMargin:ratingGap(ovr(),LV.NPB1.min)};
  setup('P','NPB1','MR');S.proEntry='U';S.service.NPB=8;const npbForeignReq=faServiceRequirement('NPB',true),npbDomesticReq=faServiceRequirement('NPB',false);result.npbFreeAgency={foreignRequirement:npbForeignReq,domesticRequirement:npbDomesticReq,eightYearsStillIneligible:S.service.NPB<npbForeignReq,nineYearsEligible:9>=npbForeignReq,usesForeignRule:npbForeignReq>npbDomesticReq};
  setup('IF','A2',null,'SS');Object.keys(S.ab).forEach(k=>S.ab[k]=80);S.year=2032;S.orgTeam='紐約大都會';const poorA2={G:104,PA:410,AB:370,H:78,BB:27,_1B:62,_2B:11,_3B:0,HR:5,DEF:-2},strongA2={G:120,PA:500,AB:440,H:130,BB:50,_1B:90,_2B:25,_3B:3,HR:12,DEF:4},eliteA2={G:120,PA:500,AB:440,H:155,BB:60,_1B:100,_2B:27,_3B:3,HR:25,DEF:9},poorReview=endSeasonPromotionProfile(poorA2,'A2','A3',ovr()),normalStrong=endSeasonPromotionProfile(strongA2,'A2','A3',ovr());S.lastDemotion={year:2032,org:S.org,team:S.orgTeam,from:'A3',to:'A2',reason:'performance'};const comebackStrong=endSeasonPromotionProfile(strongA2,'A2','A3',ovr()),comebackElite=endSeasonPromotionProfile(eliteA2,'A2','A3',ovr());result.promotionEvaluation.seasonGate={poorSeasonBlocked:!poorReview.eligible,strongSeasonEligible:normalStrong.eligible,demotionComebackNeedsElite:!comebackStrong.eligible,eliteComebackEligible:comebackElite.eligible};
  setup('IF','A3',null,'SS');S.age=29;S.bigInj=1;const retire29=retirementReviewEligible();S.age=32;S.bigInj=2;const retire32Trauma=retirementReviewEligible();S.age=35;S.bigInj=0;const retire35=retirementReviewEligible();result.retirementReview={age29Hidden:!retire29,age32RepeatedTrauma:retire32Trauma,age35Available:retire35};
  setup('P','NPB2','MR');S.age=19;S.proYears=1;S.year=2029;let dev=youthDevelopmentPreview({cause:'performance'});S.developmentWatch={key:dev.key,org:S.org,team:S.orgTeam,granted:dev.granted,used:1,started:2029,lastYear:2029};const devSecond=youthDevelopmentPreview({cause:'performance'}),devContract=youthDevelopmentPreview({cause:'contract',skipDevelopment:true});result.youthDevelopmentProtection={age19Grant:dev.granted,firstPoorProtected:dev.protect,secondPoorProtected:devSecond.protect,thirdPoorWouldRelease:devSecond.next+1>devSecond.granted,contractExpiryReviewed:!devContract.protect};
  setup('P','NPB2','MR');Object.assign(S.ab,{vel:74,ctl:70,brk:72,sta:66});S.tj=8;const armLight=armConditionProfile(),planFull=pitchingPlanProjection('全力投'),planNormal=pitchingPlanProjection('普通投'),planCare=pitchingPlanProjection('養生球');const planSeason=effort=>{setup('P','NPB2','MR');Object.assign(S.ab,{vel:74,ctl:70,brk:72,sta:66});S.effort=effort;seedInit('audit-pitch-plan-season');return applySeasonAdjustments(simSeason('NPB2'));},fullSeason=planSeason('全力投'),careSeason=planSeason('養生球');result.pitchingPlan={condition:armLight.label,currentLoadPct:armLight.pct,projected:{full:planFull.pct,normal:planNormal.pct,care:planCare.pct},orderedLoad:planFull.pct>planNormal.pct&&planNormal.pct>planCare.pct,effects:{full:[planFull.velo,planFull.era,planFull.so,planFull.grade],care:[planCare.velo,planCare.era,planCare.so,planCare.grade]},sameRollSeason:{full:{avgVelo:fullSeason.avgVelo,era:fullSeason.era,SO:fullSeason.SO,d:fullSeason.d},care:{avgVelo:careSeason.avgVelo,era:careSeason.era,SO:careSeason.SO,d:careSeason.d},fullIsMoreEffective:fullSeason.avgVelo>careSeason.avgVelo&&fullSeason.era<careSeason.era&&fullSeason.SO>careSeason.SO&&fullSeason.d>careSeason.d}};
  const firstTeamChecks={};
  setup('P','CPBL1','MR');let review=firstTeamPerformanceReview({G:38,IP:34,H:43,BB:20,ER:23,role:'MR'});firstTeamChecks.CPBL={eligible:review.eligible,target:PATHS.CPBL[PATHS.CPBL.indexOf('CPBL1')-1],line:review.line};
  setup('IF','NPB1',null,'DH');review=firstTeamPerformanceReview({G:72,PA:185,AB:164,H:29,BB:13,_1B:23,_2B:5,_3B:0,HR:1});firstTeamChecks.NPB={eligible:review.eligible,target:PATHS.NPB[PATHS.NPB.indexOf('NPB1')-1],line:review.line};
  setup('P','MLB','SP');review=firstTeamPerformanceReview({G:14,IP:62,H:76,BB:31,ER:43,role:'SP'});firstTeamChecks.MLB={eligible:review.eligible,target:PATHS.MiLB[PATHS.MiLB.indexOf('MLB')-1],line:review.line};
  setup('P','CPBL1','MR');review=firstTeamPerformanceReview({G:44,IP:42,H:32,BB:10,ER:12,role:'MR'});firstTeamChecks.goodSeasonProtected=!review.eligible;result.firstTeamDemotion=firstTeamChecks;
  setup('IF','CPBL1',null,'SS');S.seasonFactor=1;const fullIronLine={G:100},benchIronLine={G:38};result.ironStreakRule={fullSeasonCounts:qualifiesIronSeason(fullIronLine,'CPBL1'),healthyBenchDoesNotCount:!qualifiesIronSeason(benchIronLine,'CPBL1'),injuredSeasonDoesNotCount:(S.seasonFactor=.8,!qualifiesIronSeason(fullIronLine,'CPBL1'))};S.seasonFactor=1;
  setup('P','MLB','MR');S.year=2030;S.proYears=2;S.service.MiLB=2;mlbAddToFortyMan('audit');const rosterInitial=mlbRosterStatus(),optionFirst=consumeMlbOptionYear(S.year),optionSecond=consumeMlbOptionYear(S.year),rosterAfter=mlbRosterStatus();mlbRosterState().optionAssignments[S.year]=5;const sixthAssignment=consumeMlbOptionYear(S.year);
  setup('IF','MLB',null,'SS');S.proYears=7;S.service.MiLB=5;mlbAddToFortyMan('audit');Object.assign(mlbRosterState(),{optionSeasons:[2027,2028,2029],fourthOptionGranted:false,outrightCount:0});const exhausted=mlbRosterStatus(),veteranRights=mlbDfaRights();S.service.MiLB=3;const threeYearRights=mlbDfaRights();S.service.MiLB=2;mlbRosterState().outrightCount=1;const priorOutrightRights=mlbDfaRights();
  setup('OF','MLB',null,'CF');S.year=2029;S.proYears=3;mlbAddToFortyMan('audit');Object.assign(mlbRosterState(),{optionSeasons:[2027,2028],fourthOptionGranted:false});consumeMlbOptionYear(2029);const fourthOption=mlbRosterStatus();result.mlbRosterRules={initialRemaining:rosterInitial.remaining,sameSeasonUsesOneYear:optionFirst.ok&&optionSecond.ok&&rosterAfter.used===1,sameSeasonAssignments:rosterAfter.assignments,sixthRequiresWaivers:!sixthAssignment.ok,outOfOptions:exhausted.remaining===0,fourthOptionGranted:fourthOption.limit===4&&fourthOption.remaining===1,fiveYearOptionConsent:veteranRights.optionConsent,fiveYearKeepsGuarantee:veteranRights.keepsGuarantee,threeYearCanRejectOutright:threeYearRights.canRejectOutright,priorOutrightCanReject:priorOutrightRights.canRejectOutright,demotionTarget:'A3'};
  let invariantViolations=0,checked=0;for(const lv of Object.keys(LV)){for(const spec of [['P','SP',null],['P','CL',null],['P','MR',null],['IF',null,'SS'],['OF',null,'CF'],['IF',null,'DH']]){setup(spec[0],lv,spec[1],spec[2]);Object.keys(S.ab).forEach(k=>S.ab[k]=ri(20,99));for(let n=0;n<50;n++){const st=simSeason(lv),r=st.role||S.role;checked++;if(st.G>(st.scheduled||LV[lv].g)||st.G<0)invariantViolations++;if(S.pos==='P'&&r!=='SP'&&(st.W+st.L+st.SV+st.HLD>st.G||(r==='MR'&&(st.HP!==st.HLD||st.HP>st.G))))invariantViolations++;if(S.pos!=='P'&&(st.H>st.AB||st.HR>st.H||st.SB>st.H+st.BB||(st._dh&&(st.DEF!==0||st.TC>0||st.defG>0))))invariantViolations++;}}}result.invariantSweep={checked,violations:invariantViolations};
  setup('IF','MLB',null,'SS');S.stats.CPBL={...blankStat(),yr:2,G:200,PA:820,AB:720,H:210,_1B:140,_2B:42,_3B:8,HR:20,BB:80};S.stats.MLB={...blankStat(),yr:2,G:240,PA:980,AB:860,H:250,_1B:156,_2B:54,_3B:8,HR:32,BB:102};const aggregate=careerAggregate(),aggregateSlg=slgOf(aggregate),expectedSlg=(296+96*2+16*3+52*4)/1580;result.careerAggregateHitTypes={oneB:aggregate._1B,twoB:aggregate._2B,threeB:aggregate._3B,slg:+aggregateSlg.toFixed(4),expected:+expectedSlg.toFixed(4),crossLeagueSluggingCorrect:Math.abs(aggregateSlg-expectedSlg)<.0001};
  setup('P','CPBL1','MR');const ipParts=[1,2,4].map((outs,i)=>{const st={...blankStat(),G:1,SO:i+1,H:0,BB:0,ER:0,scheduled:120};setPitchingOuts(st,outs);return {org:'CPBL',team:S.orgTeam,lv:'CPBL1',st};}),ipMerged=mergeSeasonSegments(ipParts);S.stats.CPBL=null;accStat('CPBL',ipMerged,'CPBL1');result.inningsAccounting={segmentOuts:ipParts.map(x=>x.st.OUTS),mergedOuts:ipMerged.OUTS,mergedDisplay:fmtIP(ipMerged.IP),careerOuts:S.stats.CPBL.OUTS,careerDisplay:fmtIP(S.stats.CPBL.IP),legalDisplay:/^\d+\.[012]$/.test(fmtIP(ipMerged.IP)),exact:ipMerged.OUTS===7&&fmtIP(ipMerged.IP)==='2.1'&&S.stats.CPBL.OUTS===7};
  setup('IF','MLB',null,'SS');const contractAges={};for(const age of [34,36,39,42]){S.age=age;contractAges[age]=contractTermCap('MLB');}seedInit('audit-retirement-range');const retirementLimits=[];for(let i=0;i<200;i++){setup('IF','MLB',null,'SS');S.retirementAgeLimit=null;retirementLimits.push(retirementAgeLimit());}result.lateCareerStructure={contractCaps:contractAges,retirementRange:[Math.min(...retirementLimits),Math.max(...retirementLimits)],contractsTaper:contractAges[34]>=contractAges[36]&&contractAges[36]>=contractAges[39]&&contractAges[39]>=contractAges[42],retirementIsVariable:new Set(retirementLimits).size>=4};
  setup('IF','MLB',null,'SS');S.log.push({y:2030,age:27,tm:S.orgTeam,line:'120 G｜500 PA',st:{G:120,PA:500,AB:450,H:130,BB:40,HR:18,RBI:70,SB:12,TC:500,E:8,DEF:9}});S.finance.ledger.push({year:2030,type:'salary',gross:1000,tax:250,agent:25,net:725});const teamView=careerTeamsHTML(),financeView=careerFinanceHTML();result.frontendViews={mobileTabs:document.querySelectorAll('.mobile-nav-btn').length,careerTabs:document.querySelectorAll('.career-tab').length,seasonControls:document.querySelectorAll('.season-control').length,teamTrackRenders:teamView.includes('career-team-stop'),financeLedgerRenders:financeView.includes('生涯財務明細')&&financeView.includes('薪資入帳')};
  const retirementCoverage=[];for(const lg of ['CPBL','NPB','MLB','MINOR'])for(let tier=0;tier<=4;tier++)for(const pos of ['P','B']){const eligible=(RETIRE_SCENES.common||[]).concat(RETIRE_SCENES[lg]||RETIRE_SCENES.MINOR).filter(x=>(x.minTier===undefined||tier>=x.minTier)&&(x.maxTier===undefined||tier<=x.maxTier)&&(!x.pos||x.pos===pos));retirementCoverage.push({lg,tier,pos,count:eligible.length});}result.retirementDiversity={fanBaseCount:Object.values(FAN).reduce((n,a)=>n+a.length,0),fanUniqueCount:new Set(Object.values(FAN).flat()).size,sceneBaseCount:Object.values(RETIRE_SCENES).reduce((n,a)=>n+a.length,0),sceneTraitCount:Object.keys(RETIRE_TRAIT_SCENES).length,sceneTotalCount:retirementSceneCount(),minimumEligibleScenes:Math.min(...retirementCoverage.map(x=>x.count)),allContextsCovered:retirementCoverage.every(x=>x.count>=6),coverage:retirementCoverage};
  setup('P','MLB','SP');S.ct={yrs:3,signedYears:3,annual:1000,mult:1,guaranteed:1};S.skipMid=true;S.rehab=1;S._proClockYear=null;settleProfessionalSeasonClock();const once={yrs:S.ct.yrs,service:S.service.MiLB};settleProfessionalSeasonClock();result.contractClock={afterRehabSeason:once,idempotent:S.ct.yrs===once.yrs&&S.service.MiLB===once.service};
  setup('P','NPB2','MR');S.name='存檔驗證員';S.year=2034;S.age=24;S.stage='PRO';S.finance.cash=4321;S.ct={yrs:2,signedYears:3,annual:1800,mult:1.1,guaranteed:.7};S.promiseHistory=[{year:2033,status:'fulfilled'}];S.leagueWorld.history=[{year:2033,type:'trade',players:['甲','乙']}];seedInit('audit-save-system');const saveCursor=_s,savePkg=buildSavePackage(S,'<div class="yr-block">存檔測試</div>'),loaded=normalizeSavePackage(JSON.parse(JSON.stringify(savePkg)));result.saveSystem={schema:loaded.schema,namePreserved:loaded.state.name===S.name,yearPreserved:loaded.state.year===S.year,contractPreserved:loaded.state.ct.annual===1800,moneyPreserved:loaded.state.finance.cash===4321,npcHistoryPreserved:loaded.state.leagueWorld.history.length===1,promisePreserved:loaded.state.promiseHistory.length===1,logPreserved:loaded.logHTML.includes('存檔測試'),rngCursorPreserved:loaded.rngCursor===saveCursor,methodRestored:typeof loaded.state.teamName==='function'&&loaded.state.teamName().includes('二軍')};
  const unsafePkg=JSON.parse(JSON.stringify(savePkg));unsafePkg.state.name='<img onerror=1>';unsafePkg.logHTML='<div onclick="alert(1)">保留文字<script>alert(1)</script><a href="javascript:alert(1)">連結</a></div>';const safePkg=normalizeSavePackage(unsafePkg);result.saveSecurity={nameHasNoMarkup:!/[<>]/.test(safePkg.state.name),scriptRemoved:!/<script/i.test(safePkg.logHTML),eventAttributeRemoved:!/onclick=/i.test(safePkg.logHTML),javascriptUrlRemoved:!/javascript:/i.test(safePkg.logHTML),textPreserved:safePkg.logHTML.includes('保留文字')};
  setup('IF','CPBL1',null,'SS');S.age=34;Object.assign(S.ab,{con:70,pow:68,eye:69,spd:64,sta:66,rng:67,fld:68,arm:66});seedInit('audit-midseason-injury');const injuryMask=Array(6).fill(true),injuryTimeline=Array.from({length:6},()=>({n:'正常賽程',d:'',pulse:0,personalPulse:0})),injuryResult=applyMidseasonInjury({month:2,score:94,grade:'球季報銷',months:4,applied:false},injuryMask,injuryTimeline);result.midseasonInjury={startsInMonthThree:injuryMask.slice(0,2).every(Boolean),remainingMonthsLost:injuryMask.slice(2).every(x=>!x),recorded:!!S._seasonInjuryDecline,abilityLoss:injuryResult.loss,seasonEndingCount:S.seasonEndingInjuries};
  setup('IF','CPBL1',null,'SS');S.name='玩家本人';S.year=2032;S.age=22;S.stage='PRO';Object.assign(S.ab,{con:62,pow:58,eye:61,spd:64,sta:68,rng:64,fld:65,arm:63});seedInit('audit-npc-world');const npcFirst=prepareNpcSeason(),world=npcWorld(),rosters=Object.values(world.rosters),allNpc=rosters.flat(),beforeAges=Object.fromEntries(allNpc.map(p=>[p.id,p.age])),lowUsage=npcFirst.usageAdj;Object.keys(S.ab).forEach(k=>S.ab[k]=99);const highUsage=prepareNpcSeason().usageAdj;S.year++;const npcSecond=prepareNpcSeason(),allNpcNext=Object.values(world.rosters).flat(),continued=allNpcNext.filter(p=>beforeAges[p.id]!==undefined);result.npcWorld={teamCount:rosters.length,rosterSizesValid:rosters.every(r=>r.length===NPC_ROSTER_ROLES.length),uniqueNames:new Set(allNpc.map(p=>p.name)).size===allNpc.length,playerNameExcluded:allNpc.every(p=>p.name!==S.name),namedRival:!!(npcFirst.rival&&npcFirst.rival.name),competitionResponds:highUsage>lowUsage,yearAdvances:continued.length>0&&continued.every(p=>p.age===beforeAges[p.id]+1),secondYearContext:npcSecond.year===S.year,tradeHistoryRecorded:world.history.some(x=>x.type==='trade')};
  setup('IF','CPBL1',null,'SS');seedInit('audit-npc-levels');const topRoster=ensureNpcRoster('CPBL',S.orgTeam,'CPBL1'),farmRoster=ensureNpcRoster('CPBL',S.orgTeam,'CPBL2');result.npcLevelSeparation={topSize:topRoster.length,farmSize:farmRoster.length,separateObjects:topRoster!==farmRoster,noSharedIds:topRoster.every(p=>!farmRoster.some(q=>q.id===p.id)),noSharedNames:topRoster.every(p=>!farmRoster.some(q=>q.name===p.name))};
  setup('IF','CPBL1',null,'SS');Object.assign(S.ab,{con:72,pow:65,eye:70,spd:68,sta:74,rng:70,fld:72,arm:69});seedInit('audit-balanced-standings');const standingsLine=simSeason('CPBL1'),standings=simulateLeagueStandings(standingsLine),standingsChecks=standings.groups.map(g=>({group:g.name,wins:g.rows.reduce((n,r)=>n+r.W,0),losses:g.rows.reduce((n,r)=>n+r.L,0),allFullSchedule:g.rows.every(r=>r.W+r.L===standings.games)}));result.standingsBalance={groups:standingsChecks,balanced:standingsChecks.every(g=>g.wins===g.losses&&g.allFullSchedule),playerTeamPresent:!!standings.mine,postseasonHasChampion:!!standings.champion};
  setup('P','NPB2','MR');S.year=2035;S.ct={yrs:2,signedYears:2,annual:1200,mult:1,guaranteed:.7};S._seasonServiceParts=Array.from({length:6},(_,i)=>({org:'NPB',team:S.orgTeam,lv:i<3?'NPB2':'NPB1',calendarShare:1/6,statShare:1/6}));S._proClockYear=null;settleProfessionalSeasonClock();const partialDays=S.serviceDays.NPB,partialYears=S.service.NPB,contractAfterPartial=S.ct.yrs;settleProfessionalSeasonClock();result.partialServiceTime={days:partialDays,years:partialYears,expectedDays:Math.round(SERVICE_DAY_TARGET.NPB*.5),onlyTopMonthsCounted:partialDays===Math.round(SERVICE_DAY_TARGET.NPB*.5),contractTickedOnce:contractAfterPartial===1&&S.ct.yrs===1,idempotent:S.serviceDays.NPB===partialDays};
  setup('IF','NPB1',null,'SS');S.year=2036;S.finance={...newState('稅務稽核','IF').finance};const inc1=bookIncome(1000,'salary','NPB',S.orgTeam),inc2=bookIncome(1000,'bonus','NPB',S.orgTeam),expectedTax=estimatedTax(2000,'NPB',S.orgTeam);result.annualTaxAggregation={firstTax:+inc1.tax.toFixed(2),secondTax:+inc2.tax.toFixed(2),totalTax:+S.finance.tax.toFixed(2),expectedTax:+expectedTax.toFixed(2),matchesAnnualBracket:Math.abs(S.finance.tax-expectedTax)<.01,secondPaymentUsesMarginalBracket:inc2.tax>inc1.tax};
  setup('IF','CPBL1',null,'SS');S.year=2037;S.finance={...newState('解約稽核','IF').finance};S.ct={yrs:2,signedYears:3,annual:240,mult:1,guaranteed:1};S._proClockYear=S.year;const cpblTerminationPay=buyoutRemaining();result.cpblTerminationRule={annualSalary:240,terminationPay:cpblTerminationPay,expectedFifteenDayPay:10,notFullRemainingGuarantee:cpblTerminationPay<480,contractClosed:S.ct.yrs===0};
  setup('IF','CPBL1',null,'SS');S.year=2038;S.cpblFaMarketByYear[S.year]={declared:13,teamLimit:3};S.cpblFaSignings[S.year]=Object.fromEntries(CPBL_TEAMS.map(t=>[t,3]));const openCpblTeam=CPBL_TEAMS[0];S.cpblFaSignings[S.year][openCpblTeam]=2;const cpblMarketOffers=makeFaOffers('CPBL',3,200,1,3,'CPBL1',null,2);result.cpblFaMarketRule={declared:cpblFaMarketRule().declared,teamLimit:cpblFaMarketRule().teamLimit,fullTeamsFiltered:cpblMarketOffers.length===1&&cpblMarketOffers[0].team===openCpblTeam,offerTeams:cpblMarketOffers.map(x=>x.team)};
  setup('P','CPBL1','MR');Object.keys(S.ab).forEach(k=>S.ab[k]=75);S.ct={yrs:1,signedYears:1,annual:500,mult:1,guaranteed:1};S.lastSt={G:32,IP:30,OUTS:90,H:61,BB:26,SO:20,ER:31,W:1,L:8,HLD:1,SV:0,role:'MR'};S.lastD=-9;S.lastMarketD=-9;S._proClockYear=null;seedInit('audit-contract-expiry-order');movement();result.contractExpiryOrder={levelAfterRosterReview:S.lv,contractYearConsumed:S.ct&&S.ct.yrs===0,demotedBeforeMarket:S.lv==='CPBL2',decisionVisible:!!document.querySelector('#act .title')};
  setup('OF','MLB',null,'LF');Object.assign(S.ab,{con:55,pow:55,eye:55,spd:60,sta:62,rng:58,fld:58,arm:58});seedInit('audit-bench-home-runs');const benchHr=Array.from({length:600},()=>simSeason('MLB'));result.benchHomeRunRandomness={zeroSeasons:benchHr.filter(x=>x.HR===0).length,homeRunSeasons:benchHr.filter(x=>x.HR>0).length,max:Math.max(...benchHr.map(x=>x.HR)),notDeterministicallyZero:benchHr.some(x=>x.HR===0)&&benchHr.some(x=>x.HR>0)};
  setup('IF','A1',null,'SS');seedInit('audit-monthly-causal-merge');const monthlyParts=[];for(let i=0;i<6;i++){S.seasonFactor=1/6;S.seasonLuck=i===2?18:i===4?3:10;S.seasonMomentum=i===2?2:i===4?-2:0;S._seasonVariance=monthlyVarianceProfile(makeSeasonVarianceProfile(),S.seasonMomentum);const month=applySeasonAdjustments(simSeason('A1'));month.calendarShare=1/6;month.statShare=1/6;monthlyParts.push({org:'MiLB',team:S.orgTeam,lv:'A1',st:month});}const mergedMonths=mergeSeasonSegments(monthlyParts);S.stats.MINOR=null;accSeasonSegments([{org:'MiLB',team:S.orgTeam,lv:'A1',st:mergeSeasonSegments(monthlyParts.slice(0,3))},{org:'MiLB',team:S.orgTeam,lv:'A2',st:mergeSeasonSegments(monthlyParts.slice(3))}]);result.monthlyCausalMerge={months:monthlyParts.length,scheduled:mergedMonths.scheduled,games:mergedMonths.G,withinSchedule:mergedMonths.G<=mergedMonths.scheduled,monthlyLinesDiffer:new Set(monthlyParts.map(p=>`${p.st.G}|${p.st.H}|${p.st.HR}|${p.st.avg.toFixed(3)}`)).size>1,sameLeagueCareerYearCountedOnce:S.stats.MINOR.yr===1,careerGamesMatch:S.stats.MINOR.G===mergedMonths.G};
  S=newState('高中月份稽核','C',null);S.stage='HS';S.dpos='C';S.seasonContext=null;S.seasonLuck=10;S.seasonMomentum=0;seedInit('audit-amateur-monthly-catcher');const amateurParts=[];for(let i=0;i<3;i++){S.seasonFactor=1/3;S._seasonVariance=monthlyVarianceProfile(makeSeasonVarianceProfile(),i-1);const month=simAmateurSeason();month.calendarShare=1/3;month.statShare=1/3;amateurParts.push({org:null,team:S.team,lv:null,st:month});}const amateurMerged=mergeSeasonSegments(amateurParts);result.amateurMonthlyMerge={months:amateurParts.length,scheduled:amateurMerged.scheduled,games:amateurMerged.G,withinSchedule:amateurMerged.G<=32,catcherGrade:amateurMerged.CALL_GRADE,completedWithoutProLevel:amateurMerged.scheduled===32&&amateurMerged.CALL_GRADE!=='undefined'};
  result.careerMonteCarlo=runCareerMonteCarlo(samples);
  S=saved.S;RNG_MODE=saved.RNG_MODE;SEED=saved.SEED;return result;
}
if(new URLSearchParams(location.search).get('logic-audit')==='1'){
  const out=document.createElement('pre');out.id='logic-audit-output';out.style.cssText='white-space:pre-wrap;color:#111;background:#fff;padding:20px;font:14px monospace;position:relative;z-index:99999';
  try{const requested=Number(new URLSearchParams(location.search).get('audit-samples'))||120;out.textContent=JSON.stringify(runLogicAudit(requested),null,2);}catch(err){out.textContent='AUDIT_ERROR\n'+(err&&err.stack||err);}
  document.body.innerHTML='';document.body.appendChild(out);
}
if(new URLSearchParams(location.search).get('visual-audit')==='amateur-season'){
  document.documentElement.setAttribute('data-amateur-season-audit','running');window.addEventListener('error',e=>document.documentElement.setAttribute('data-amateur-season-error',e.message));RNG_MODE='destiny';seedInit('visual-audit-amateur-season');S=attachStateMethods(newState('高中測試球員','C',null));S.stage='HS';S.dpos='C';S.team='高苑工商';S.seasonPlan=makeSeasonPlan();S.seasonContext=makeSeasonContext();S._seasonEventMonths=[];showGameShell();board(0);runSeasonAnimation(()=>document.documentElement.setAttribute('data-amateur-season-audit','complete'));setTimeout(()=>{if($('season-skip')&&!$('season-skip').disabled)$('season-skip').click();},250);const amateurAuditTimer=setInterval(()=>{if($('season-accept')&&$('season-accept').style.display==='block'){clearInterval(amateurAuditTimer);$('season-accept').click();}},80);
}
