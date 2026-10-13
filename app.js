const STORAGE_KEY = 'form-journal-data-v1';
const SCHEMA_VERSION = 2;
const programURL = './program.json';
let program = null;
let state = { view: 'today', selectedDay: 'A', expandedId: null, toastTimeout: null, restTimerEnds: null, calendarDate: localYMD(new Date()), calendarMonth: localYMD(new Date()).slice(0,7), programDate: localYMD(new Date()), editSessionId: null };
let data = readStoredData();

function initialData() {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: { unit: 'lb', restSeconds: 90, clinicianReviewed: false },
    sessions: [], active: null, plans: {}
  };
}
function readStoredData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialData();
    const obj = JSON.parse(raw);
    return normalizeData(obj);
  } catch (err) { console.warn('Local data unavailable:', err); return initialData(); }
}
function normalizeData(obj) {
  const base = initialData();
  if (!obj || typeof obj !== 'object' || ![1, 2].includes(Number(obj.schemaVersion))) return base;
  const cleanSession = s => {
    const startedAt = Number.isFinite(new Date(s?.startedAt).getTime()) ? String(s.startedAt) : new Date().toISOString();
    return {
      id: String(s?.id || ''),
      day: ['A','B','C','D'].includes(s?.day) ? s.day : 'A',
      workoutDate: isValidYMD(s?.workoutDate) ? s.workoutDate : localYMD(startedAt),
      startedAt,
      finishedAt: s?.finishedAt && Number.isFinite(new Date(s.finishedAt).getTime()) ? String(s.finishedAt) : null,
      sets: Array.isArray(s?.sets) ? s.sets.filter(x => x && typeof x.exerciseId==='string' && Number.isInteger(Number(x.reps)) && Number(x.reps)>=1 && Number(x.reps)<=100).slice(0,1000).map(x => ({
        id: String(x.id || cryptoId()), exerciseId: String(x.exerciseId).slice(0,80), reps: Number(x.reps),
        weightKg: Math.max(0,Math.min(3000,Number(x.weightKg)||0)),
        rpe: Number(x.rpe)>=1 && Number(x.rpe)<=10 ? Number(x.rpe) : null,
        createdAt: String(x.createdAt || startedAt)
      })) : [],
      cardio: Array.isArray(s?.cardio) ? s.cardio.filter(x => x && typeof x.name==='string').slice(0,100).map(x=>({
        id: String(x.id || cryptoId()),name:String(x.name).slice(0,80),minutes:Math.max(0,Math.min(300,Number(x.minutes)||0))
      })) : [],
      notes: String(s?.notes||'').slice(0,2000)
    };
  };
  const plans = {};
  if (obj.plans && typeof obj.plans==='object' && !Array.isArray(obj.plans)) {
    Object.entries(obj.plans).slice(0,5000).forEach(([ymd,day]) => {
      if (isValidYMD(ymd) && ['A','B','C','D','rest'].includes(day)) plans[ymd] = day;
    });
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: {
      unit: obj.settings?.unit === 'kg' ? 'kg' : 'lb',
      restSeconds: Math.max(30,Math.min(300,Number(obj.settings?.restSeconds)||90)),
      clinicianReviewed: obj.settings?.clinicianReviewed===true
    },
    sessions: Array.isArray(obj.sessions) ? obj.sessions.slice(-2000).map(cleanSession).filter(x=>x.id) : [],
    active: obj.active && typeof obj.active==='object' ? cleanSession(obj.active) : null,
    plans
  };
}
function persist() { try {localStorage.setItem(STORAGE_KEY,JSON.stringify(data));} catch { toast('Could not save locally. Export a backup or check browser storage.'); } }
function cryptoId() { return globalThis.crypto?.randomUUID?.() || ('id-'+Date.now()+'-'+Math.random().toString(36).slice(2,9)); }
function escapeHTML(s) {return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function formatDate(s,opts={month:'short',day:'numeric',year:'numeric'}){ const d=new Date(s); return Number.isNaN(d.getTime()) ? 'Unknown date':d.toLocaleDateString('en-CA',opts);}
function formatTime(s){const d=new Date(s);return Number.isNaN(d.getTime())?'':d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});}
function localYMD(input){const d=new Date(input);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function isValidYMD(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year,month,day] = value.split('-').map(Number);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(year,month-1,day);
  return d.getFullYear()===year && d.getMonth()===month-1 && d.getDate()===day;
}
function dateFromYMD(ymd) { if (!isValidYMD(ymd)) return new Date(); const [y,m,d]=ymd.split('-').map(Number); return new Date(y,m-1,d,12,0,0); }
function displayYMD(ymd,opts={weekday:'long',month:'long',day:'numeric',year:'numeric'}) { return isValidYMD(ymd) ? dateFromYMD(ymd).toLocaleDateString('en-CA',opts) : 'Unknown date'; }
function sessionDate(s) { return isValidYMD(s?.workoutDate) ? s.workoutDate : localYMD(s?.startedAt||new Date()); }
function datedSessions(ymd) {return data.sessions.filter(s=>sessionDate(s)===ymd).sort((a,b)=>a.startedAt.localeCompare(b.startedAt));}
function plannedDay(ymd) {return data.plans[ymd]||null;}
function chooseDate(ymd) {if (!isValidYMD(ymd)) return;state.calendarDate=ymd;state.calendarMonth=ymd.slice(0,7);state.editSessionId=null;render();}
function calendarMark(ymd){const ss=datedSessions(ymd),active=data.active && sessionDate(data.active)===ymd, planned=plannedDay(ymd);return {ss,active,planned};}
function thisWeekDates(){const now=dateFromYMD(localYMD(new Date())); const off=(now.getDay()+6)%7;const first=new Date(now.getFullYear(),now.getMonth(),now.getDate()-off);return Array.from({length:7},(_,i)=>localYMD(new Date(first.getFullYear(),first.getMonth(),first.getDate()+i)));}
function dayById(id){return program?.days.find(d=>d.id===id)||program?.days[0];}
function exById(id){return program?.exercises.find(e=>e.id===id);}
function totalSets(s){return s?.sets?.length||0;}
function totalMinutes(s){return (s?.cardio||[]).reduce((a,c)=>a+(Number(c.minutes)||0),0);}
function latestHistory(day){return [...data.sessions].reverse().find(s=>s.day===day);}
function lastSet(exId){const sessions=[...(data.active?[data.active]:[]),...data.sessions.slice().reverse()];for(const session of sessions){const sets=session.sets.filter(x=>x.exerciseId===exId);if(sets.length)return sets[sets.length-1];}return null;}
function displayWeight(kg){return (kg * (data.settings.unit==='lb'?2.2046226218:1)).toFixed(kg===0?0:1).replace(/\.0$/,'');}
function toKg(amount){return data.settings.unit==='lb' ? amount/2.2046226218 : amount;}
function formatSets(s){const n=s?.sets?.length||0;return n===1?'1 set':`${n} sets`;}
function completedThisWeek(){return data.sessions.filter(s=>thisWeekDates().includes(sessionDate(s))).length;}
function thisWeekMinutes(){return data.sessions.filter(s=>thisWeekDates().includes(sessionDate(s))).reduce((v,s)=>v+totalMinutes(s),0);}
function suggestedDay(){const assigned=plannedDay(localYMD(new Date()));if(assigned && assigned!=='rest')return assigned;const dow=(new Date()).getDay();return ({1:'A',2:'B',4:'C',6:'D'})[dow]||(data.active?.day||'A');}
function toast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');clearTimeout(state.toastTimeout);state.toastTimeout=setTimeout(()=>el.classList.remove('show'),3200);}
function setView(view,day){if(day)state.selectedDay=day;state.view=view;location.hash=view;render();window.scrollTo({top:0,behavior:'auto'});}
function progressBar(value,max){return `<div class="progress-track" aria-label="${value} of ${max} sets logged"><span style="width:${Math.min(100,(max?value/max:0)*100)}%"></span></div>`;}
function badgeDay(id){const day=dayById(id);return `<span class="day-token ${day.theme}">${id}</span>`;}
function navUpdate(){document.querySelectorAll('[data-nav]').forEach(b=>{const is=b.dataset.nav===state.view;b.classList.toggle('active',is);if(b.closest('nav'))b.setAttribute('aria-current',is?'page':'false');});}
function sidebarUpdate(){document.getElementById('sidebar-days').innerHTML=program.days.map(d=>`<button class="sidebar-day" type="button" data-selectday="${d.id}">${badgeDay(d.id)}<span><strong>${escapeHTML(d.title)}</strong><small>${d.schedule} · ${d.exercises.length} movements</small></span></button>`).join('');}
function render(){
  if(!program)return;
  navUpdate();
  let html='';
  switch(state.view){
    case 'program':html=renderProgram();break;
    case 'calendar':html=renderCalendar();break;
    case 'history':html=renderHistory();break;
    case 'progress':html=renderProgress();break;
    case 'settings':html=renderSettings();break;
    default:html=renderToday();
  }
  document.getElementById('main-content').innerHTML=html;
  updateRestTime();
}
function renderToday(){
  const current=data.active, guess=dayById(current?.day||suggestedDay()),last=data.sessions.at(-1);
  const finished=completedThisWeek();
  const heroVisual=`<svg viewBox="0 0 290 250" aria-hidden="true"><g fill="none" stroke="#bfd6c4" stroke-width="2"><circle cx="140" cy="145" r="83"/><circle cx="140" cy="145" r="57"/></g><g stroke="#E5F3E8" fill="none" stroke-width="12" stroke-linecap="round"><path d="M 69 167 L 93 123 L 119 166 L 148 118 L 181 165 L 220 99"/></g><circle cx="220" cy="99" r="12" fill="#E6A978"/><text x="63" y="223" fill="#DCEDE0" font-size="10" font-family="Arial" letter-spacing="4">KEEP MOVING</text></svg>`;
  return `<section class="hero"><div class="hero-copy"><p class="eyebrow">YOUR STRENGTH COMPANION</p><h1>Progress looks<br>good on you.</h1><p>Simple sessions. Confident movement. A workout journal that remembers the small wins.</p><div class="row"><button type="button" class="btn" data-action="open-day" data-day="${guess.id}">${current?'Resume':'Explore'} Day ${guess.id} <span aria-hidden="true">↗</span></button><a class="btn btn-ghost" style="color:white;border-color:#6b9782" href="./handbook.pdf" target="_blank" rel="noopener">Open handbook ↗</a></div></div><div class="hero-art"><span class="hero-ring"></span><span class="hero-ring"></span><span class="hero-ring"></span>${heroVisual}</div></section>
  <div class="metrics"><div class="metric"><small>Sessions this week</small><strong>${finished}<span class="muted" style="font-family:system-ui;font-size:1rem"> / 4</span></strong><div class="support">Steady wins count</div></div><div class="metric"><small>Total workouts</small><strong>${data.sessions.length}</strong><div class="support">Saved on this device</div></div><div class="metric"><small>Cardio this week</small><strong>${thisWeekMinutes()}<span style="font-family:system-ui;font-size:.95rem"> min</span></strong><div class="support">Logged cardio minutes</div></div></div>
  ${current?`<div class="session-panel is-active"><div><strong>Workout in progress: Day ${escapeHTML(current.day)}</strong><p>${formatSets(current)} logged · started ${formatTime(current.startedAt)}. Your progress has been saved.</p></div><button class="btn btn-primary" data-action="open-day" data-day="${escapeHTML(current.day)}">Continue workout →</button></div>`:''}
  ${renderTodayWeek()}
  <div class="section-heading"><div><p class="eyebrow">YOUR TRAINING WEEK</p><h2>Four days, one stronger you.</h2><p>Select a workout to see every movement and start logging.</p></div></div>
  <div class="week-grid">${program.days.map(d=>`<button type="button" class="day-card" data-action="open-day" data-day="${d.id}">${badgeDay(d.id)}<strong>${escapeHTML(d.title)}</strong><footer><small>${d.schedule} · ${d.exercises.length} exercises</small><span class="arrow">↗</span></footer></button>`).join('')}</div>
  <div class="section-heading"><h2>Make it sustainable.</h2></div>
  <div class="notice"><span class="icon">✳</span><p><strong>Your starting prescription:</strong> two sets of 10–15 repetitions, light–moderate intensity, 1–2 minutes rest. The A/B → four-day change is a proposed adaptation to review with your exercise clinician. ${data.settings.clinicianReviewed?'You marked it as reviewed in Settings.':'You have not yet marked that review as complete.'}</p></div>
  ${last?`<div class="section-heading"><h3>Last session</h3><button type="button" class="btn btn-small" data-nav="calendar">Open calendar →</button></div><div class="history-entry"><div class="row-between"><div><strong>Day ${escapeHTML(last.day)} · ${escapeHTML(dayById(last.day).title)}</strong><br><small>${displayYMD(sessionDate(last),{month:'short',day:'numeric',year:'numeric'})} · ${formatSets(last)} · ${totalMinutes(last)} min cardio</small></div>${badgeDay(last.day)}</div></div>`:''}<p class="footer-note">Designed from the 29 Sep 2026 Group A / Group B program and illustrated with original motion sketches. Nothing you log is transmitted to a server.</p>`;
}
function renderTodayWeek() {
  const today=localYMD(new Date());
  return `<section class="home-calendar-block"><div class="row-between"><div><p class="eyebrow" style="margin-bottom:5px">AT A GLANCE</p><h2 style="margin:0">Your week, your way.</h2><p class="small muted" style="margin:8px 0 0">Tap a date to plan or review your sets.</p></div><button class="btn btn-secondary btn-small" type="button" data-nav="calendar">Full calendar →</button></div><div class="week-strip">${thisWeekDates().map(d=>{
    const mark=calendarMark(d), count=mark.ss.reduce((n,s)=>n+s.sets.length,0);
    return `<button type="button" class="week-strip-date ${d===today?'is-today':''}" data-action="calendar-go-date" data-date="${d}"><small>${displayYMD(d,{weekday:'short'})}</small><strong>${Number(d.slice(-2))}</strong><span class="week-mini-badge">${mark.ss.length?`✓ ${count} sets`:mark.planned==='rest'?'Rest':mark.planned?`Day ${mark.planned}`:'+'}</span></button>`;
  }).join('')}</div></section>`;
}
function renderCalendar(){
  const today=localYMD(new Date());
  const selected=state.calendarDate;
  const [yy,mm]=state.calendarMonth.split('-').map(Number);
  const first=new Date(yy,mm-1,1);
  const daysInMonth=new Date(yy,mm,0).getDate();
  const offset=(first.getDay()+6)%7;
  const cells=Math.ceil((offset+daysInMonth)/7)*7;
  const monthName=first.toLocaleDateString('en-CA',{month:'long',year:'numeric'});
  const grid=Array.from({length:cells},(_,i)=>{
    const d=new Date(yy,mm-1,1+i-offset),ymd=localYMD(d),inMonth=d.getMonth()===mm-1;
    const {ss,active,planned}=calendarMark(ymd);
    const setCount=ss.reduce((n,s)=>n+s.sets.length,0);
    const label=ss.length?`${ss.length} completed ${ss.length===1?'workout':'workouts'}, ${setCount} sets`:planned==='rest'?'rest day':planned?`Day ${planned} planned`:'no workout planned';
    return `<button type="button" class="calendar-cell ${inMonth?'':'outside'} ${ymd===selected?'selected':''} ${ymd===today?'today':''} ${ss.length?'has-done':''}" data-action="calendar-go-date" data-date="${ymd}" aria-label="${displayYMD(ymd)}, ${label}" aria-pressed="${ymd===selected}"><span class="calendar-num">${d.getDate()}</span><span class="calendar-flags">${ss.length?`<span class="calendar-done" title="${setCount} logged sets">✓${setCount}</span>`:''}${active?'<span class="calendar-active" title="Unfinished">…</span>':''}${planned&&!ss.length?`<span class="calendar-assigned ${planned==='rest'?'rest':''}">${planned==='rest'?'Rest':planned}</span>`:''}</span></button>`;
  }).join('');
  const planned=plannedDay(selected),selectedSessions=datedSessions(selected),isFuture=selected>today;
  return `<section class="page-head calendar-head"><p class="eyebrow">YOUR WORKOUT CALENDAR</p><h1>Make every day yours.</h1><p class="page-intro">Choose any date, assign a workout day, and see exactly which sets you completed. Your history stays editable.</p></section>
    <div class="calendar-layout"><section class="calendar-panel"><div class="calendar-toolbar"><div><p class="small muted" style="margin:0 0 2px">YOUR SCHEDULE</p><h2 id="calendar-month">${escapeHTML(monthName)}</h2></div><div class="calendar-controls"><button class="calendar-nav-btn" type="button" data-action="calendar-prev" aria-label="Previous month">‹</button><button type="button" class="btn btn-small" data-action="calendar-today">Today</button><button class="calendar-nav-btn" type="button" data-action="calendar-next" aria-label="Next month">›</button></div></div>
    <div class="calendar-grid" role="group" aria-label="Workout calendar for ${escapeHTML(monthName)}">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<div class="calendar-weekday" aria-hidden="true">${d}</div>`).join('')}${grid}</div><div class="calendar-legend"><span><i class="legend-dot legend-done"></i> Completed</span><span><i class="legend-dot legend-planned"></i> Planned</span><span><i class="legend-dot legend-now"></i> Today</span></div></section>
    <section class="calendar-detail"><p class="eyebrow">SELECTED DATE</p><h2>${displayYMD(selected,{weekday:'long',month:'short',day:'numeric'})}</h2><div class="selected-status">${selectedSessions.length?`${selectedSessions.length} completed ${selectedSessions.length===1?'workout':'workouts'} · ${selectedSessions.reduce((a,s)=>a+s.sets.length,0)} sets`:isFuture?'Your plans, ahead of time':'No workout logged yet'}${data.active&&sessionDate(data.active)===selected?' · workout in progress':''}</div>
    <h3 class="calendar-field-title">${planned?'Change this day':'Assign a workout to this day'}</h3><div class="assign-days">${program.days.map(d=>`<button type="button" class="assign-day ${planned===d.id?'active':''}" data-action="plan-date" data-day="${d.id}" data-date="${selected}" aria-pressed="${planned===d.id}">${badgeDay(d.id)}<span>Day ${d.id}</span></button>`).join('')}</div>
    <div class="assign-footer"><button class="btn btn-small ${planned==='rest'?'btn-secondary':''}" type="button" data-action="plan-date" data-day="rest" data-date="${selected}">☼ Rest day</button>${planned?'<button class="mini-link" type="button" data-action="clear-plan" data-date="'+selected+'">Clear plan</button>':''}</div>
    ${isFuture?`<p class="small muted" style="margin:18px 0 0">Future date — plan your workout now and log sets when that date arrives.</p>`:`<div class="calendar-start"><label for="calendar-workout-select">Log workout for this date</label><div class="calendar-start-row"><select class="field" id="calendar-workout-select" aria-label="Workout to record">${program.days.map(d=>`<option value="${d.id}" ${d.id===(planned&&planned!=='rest'?planned:suggestedDay())?'selected':''}>Day ${d.id} · ${escapeHTML(d.title)}</option>`).join('')}</select><button type="button" class="btn btn-primary" data-action="calendar-start" ${data.active?'disabled title="Finish your existing workout first"':''}>${data.active?'Workout active':'Start / log'} →</button></div></div>`}
    ${data.active&&sessionDate(data.active)===selected?`<div class="calendar-active-panel"><strong>Day ${escapeHTML(data.active.day)} is in progress</strong><p>${data.active.sets.length} sets logged</p><button type="button" class="btn btn-small btn-secondary" data-action="open-day" data-day="${data.active.day}">Continue →</button></div>`:''}
    ${selectedSessions.length?`<div class="calendar-past"><h3>Completed on this date</h3>${selectedSessions.map(renderCalendarSession).join('')}</div>`:`<div class="calendar-empty"><span class="calendar-empty-icon">◷</span><p>Workouts you complete on this date will appear here with every set, rep and weight.</p></div>`}
    </section></div><div class="row-between" style="margin:26px 0"><p class="small muted" style="margin:0">Past and upcoming days can be selected freely. Plans and completed workouts are separate.</p><button class="btn btn-secondary btn-small" type="button" data-nav="history">All workout history →</button></div>`;
}
function renderCalendarSession(s){
  const day=dayById(s.day),edit=state.editSessionId===s.id;
  return `<article class="calendar-session"><div class="calendar-session-head">${badgeDay(s.day)}<div><strong>Day ${escapeHTML(s.day)} · ${escapeHTML(day.title)}</strong><small>${s.sets.length} sets · ${totalMinutes(s)} min cardio</small></div></div><button type="button" class="btn btn-small ${edit?'btn-secondary':''}" data-action="toggle-session-edit" data-sid="${escapeHTML(s.id)}">${edit?'Close editor':'View / edit sets'}</button>${edit?renderSessionEditor(s):`<p class="small muted" style="margin:10px 0 0">${s.sets.length?`${s.sets.slice(0,3).map(x=>escapeHTML(exById(x.exerciseId)?.name||'Exercise')).join(' · ')}${s.sets.length>3?'…':''}`:'No sets recorded'}${s.notes?` · ${escapeHTML(s.notes.slice(0,65))}`:''}</p>`}</article>`;
}
function renderSessionEditor(s){
 const groups=s.sets.reduce((acc,x)=>(acc[x.exerciseId]??=[],acc[x.exerciseId].push(x),acc),{});
 const exOptions=program.exercises.map(e=>`<option value="${escapeHTML(e.id)}">${escapeHTML(e.name)}</option>`).join('');
 return `<div class="session-editor"><form data-form="edit-session" data-sid="${escapeHTML(s.id)}" class="editor-date-row"><label>Workout date<input class="field" type="date" name="workoutDate" value="${sessionDate(s)}" min="1900-01-01" max="2100-12-31" required></label><label>Workout group<select class="field" name="day">${program.days.map(d=>`<option value="${d.id}" ${d.id===s.day?'selected':''}>Day ${d.id}</option>`).join('')}</select></label><button type="submit" class="btn btn-secondary">Save day</button></form><p class="small muted" style="margin:8px 0 17px">Changing the group keeps your existing sets, even if they came from another group.</p>
   ${Object.entries(groups).length?Object.entries(groups).map(([id,sets])=>`<div class="editor-exercise"><strong>${escapeHTML(exById(id)?.name||id)}</strong>${sets.map((x,i)=>`<form class="edit-set-row" data-form="edit-history-set" data-sid="${escapeHTML(s.id)}" data-setid="${escapeHTML(x.id)}"><span class="set-number">${i+1}</span><label>Reps<input class="field field-small" type="number" name="reps" min="1" max="100" step="1" value="${x.reps}" required></label><label>${data.settings.unit}<input class="field field-small" type="number" name="weight" inputmode="decimal" min="0" max="3000" step="0.5" value="${displayWeight(x.weightKg)}" required></label><label>Effort<select class="field field-small" name="rpe"><option value="">—</option>${[5,6,7,8,9,10].map(n=>`<option value="${n}" ${x.rpe===n?'selected':''}>${n}</option>`).join('')}</select></label><div class="edit-set-actions"><button type="submit" class="btn btn-small btn-secondary">Save</button><button type="button" class="mini-link danger-link" data-action="history-delete-set" data-sid="${escapeHTML(s.id)}" data-setid="${escapeHTML(x.id)}">Remove</button></div></form>`).join('')}</div>`).join(''):'<p class="small muted">No sets logged. You can add one below.</p>'}
   <form class="history-add-set" data-form="history-add-set" data-sid="${escapeHTML(s.id)}"><h4>Add a missing set</h4><label>Exercise<select class="field" name="exerciseId">${exOptions}</select></label><div class="set-grid history-grid"><label>Reps<input class="field" name="reps" type="number" min="1" max="100" value="12" required></label><label>Weight (${data.settings.unit})<input class="field" name="weight" type="number" inputmode="decimal" min="0" max="3000" step="0.5" value="0" required></label><label>Effort<select class="field" name="rpe"><option value="">—</option>${[5,6,7,8,9,10].map(n=>`<option value="${n}">${n}</option>`).join('')}</select></label><button class="btn btn-primary" type="submit">+ Add set</button></div></form>
   <div class="editor-cardio"><h4>Cardio</h4>${s.cardio.length?s.cardio.map(c=>`<div class="set-log-row"><span>${escapeHTML(c.name)} · ${c.minutes} min</span><button type="button" class="mini-link danger-link" data-action="history-delete-cardio" data-sid="${escapeHTML(s.id)}" data-cid="${escapeHTML(c.id)}">Remove</button></div>`).join(''):'<p class="small muted">No cardio logged.</p>'}<form class="cardio-form" data-form="history-add-cardio" data-sid="${escapeHTML(s.id)}"><label>Activity<select name="name" class="field"><option>Treadmill</option><option>Elliptical</option><option>Stationary bike</option><option>Walk</option><option>Other cardio</option></select></label><label>Minutes<input name="minutes" class="field" type="number" min="1" max="300" value="15" required></label><button type="submit" class="btn btn-secondary">+ Add cardio</button></form></div>
   <label class="editor-notes">Notes<textarea class="field" data-input="history-notes" data-sid="${escapeHTML(s.id)}" maxlength="2000" rows="3" placeholder="How did it go?">${escapeHTML(s.notes)}</textarea></label><button class="btn btn-danger btn-small" type="button" data-action="delete-session" data-sid="${escapeHTML(s.id)}">Delete whole workout</button></div>`;
}
function renderProgram(){const d=dayById(state.selectedDay),active=data.active;const currentActive=!!(active && active.day===d.id);const completed=active?.sets?.filter(s=>d.exercises.includes(s.exerciseId)).length||0;const target=d.exercises.reduce((n,id)=>n+(exById(id)?.sets||2),0);
 return `<section class="page-head"><p class="eyebrow">YOUR PERSONAL PROGRAM</p><h1>Move with intention.</h1><p class="page-intro">Four balanced days using your pictured gym setup. Follow the technique cues, log each set, and progress gradually.</p></section>
 <div class="program-selector">${program.days.map(x=>`<button type="button" class="${d.id===x.id?'selected':''}" data-selectday="${x.id}" aria-pressed="${d.id===x.id}"><strong>DAY ${x.id}</strong><small>${escapeHTML(x.title)}</small></button>`).join('')}</div>
 <section class="day-banner"><div><p class="eyebrow">${escapeHTML(d.schedule.toUpperCase())} · ${escapeHTML(d.tagline.toUpperCase())}</p><h2>Day ${d.id} — ${escapeHTML(d.title)}</h2><p>${escapeHTML(d.intro)}</p><div class="row" style="margin-top:16px"><span class="day-pill">◷ ${escapeHTML(d.estimatedMinutes)}</span><span class="day-pill">2 sets · 10–15 reps</span><span class="day-pill">Light–moderate</span></div></div><div class="start-date-controls">${currentActive?`<span class="day-pill">Logged for ${displayYMD(sessionDate(active),{month:'short',day:'numeric',year:'numeric'})}</span>`:`<label for="workout-date" class="small">Workout date<input class="field" type="date" id="workout-date" data-setting="programDate" value="${state.programDate}" min="1900-01-01" max="2100-12-31"></label><button class="btn btn-primary" data-action="start" data-day="${d.id}">Start / log workout →</button>`}</div></section>
 ${active && !currentActive?`<div class="notice" style="margin-top:15px"><span class="icon">i</span><p>You have an unfinished <strong>Day ${escapeHTML(active.day)}</strong> session. Finish or discard it before starting a different day. <button class="mini-link" type="button" data-action="open-day" data-day="${escapeHTML(active.day)}">Go to active session →</button></p></div>`:''}
 ${currentActive?`<div class="session-panel is-active"><div><strong>Session in progress · ${completed}/${target} suggested sets logged</strong>${progressBar(Math.min(completed,target),target)}<p>Logging for ${displayYMD(sessionDate(active),{weekday:'short',month:'short',day:'numeric',year:'numeric'})}. Started at ${formatTime(active.startedAt)}. You can stop and come back without losing your work.</p></div><div class="row"><button type="button" class="btn btn-primary" data-action="finish">Finish workout ✓</button><button type="button" class="btn btn-danger btn-small" data-action="discard">Discard</button></div></div>`:`<div class="notice notice-green" style="margin-top:15px"><span class="icon">◎</span><p>Tap any exercise to see <strong>start/move reference sketches, setup, exact steps, muscle groups and modifications.</strong> Press Start to log sets.</p></div>`}
 <div class="cardio-note"><h3>Prescribed cardio pairing</h3><p>${escapeHTML(d.cardio.prescription)}</p></div>
 <div class="section-heading"><div><h2>${d.exercises.length} movements</h2><p>Tap a card to reveal technique steps and logging.</p></div></div>
 <div class="exercise-list">${d.exercises.map((id,i)=>renderExerciseCard(exById(id),i,currentActive)).join('')}</div>
 ${currentActive?renderCardioLogger(d):`<div style="margin-top:20px" class="notice"><span class="icon">✳</span><p>The default cardio prescription is shown above. Start this workout to record weights, reps, effort and cardio.</p></div>`}
 ${currentActive?renderRest():''}
 <p class="footer-note">Reference figures are original simplified movement sketches, not diagnostic or technique-validation tools. Use the clinician's diagrams and demonstration for precise alignment. Ask about any painful movement, unclear machine substitution or new exercise before progressing.</p>`;
}
function renderExerciseCard(ex,index,currentActive){if(!ex)return '';const expanded=state.expandedId===ex.id;const logs=currentActive?data.active.sets.filter(s=>s.exerciseId===ex.id):[];const prev=lastSet(ex.id);const status=ex.status==='prescribed'?'Original prescribed movement':ex.status==='prescribed variation'?'Prescribed movement · gym variation':ex.status==='adapted substitute'?'Substitute · confirm with clinician':'Extra accessory · optional';
 return `<article class="exercise-card ${expanded?'is-expanded':''}"><button class="exercise-top" type="button" data-action="toggle-ex" data-ex="${ex.id}" aria-expanded="${expanded}"><span class="ex-index">${String(index+1).padStart(2,'0')}</span><span class="ex-copy"><strong>${escapeHTML(ex.name)}</strong><span>${escapeHTML(ex.muscles)} · ${ex.sets} × ${escapeHTML(ex.reps)}</span></span>${logs.length?`<span class="ex-complete">${logs.length} logged</span>`:''}<span class="ex-expand">${expanded?'−':'+'}</span></button>${expanded?`<div class="ex-detail"><div class="visual-frame"><img loading="lazy" alt="Simplified start and moving position for ${escapeHTML(ex.name)}" src="./assets/exercises/${ex.illustration}.svg"></div><div class="ex-meta"><span class="chip">${escapeHTML(ex.equipment)}</span><span class="chip">${escapeHTML(ex.muscles)}</span><span class="chip ${ex.status==='adapted substitute'?'warning':''}">${escapeHTML(status)}</span></div><ol>${ex.steps.map(x=>`<li>${escapeHTML(x)}</li>`).join('')}</ol><div class="coach-tip"><strong>Form note:</strong> ${escapeHTML(ex.avoid)}</div><p class="small muted"><strong>Source mapping:</strong> ${escapeHTML(ex.origin)}</p>${currentActive?renderSetLogger(ex,logs,prev):`<div class="row"><button type="button" class="btn btn-primary btn-small" data-action="start" data-day="${state.selectedDay}">Start session to log</button>${prev?`<span class="muted small">Last logged: ${prev.reps} reps × ${displayWeight(prev.weightKg)} ${data.settings.unit}</span>`:''}</div>`}</div>`:''}</article>`;
}
function renderSetLogger(ex,logs,prev){const target=ex.sets;const unit=data.settings.unit;return `<div class="set-panel"><div class="row-between"><strong>Log your sets</strong><small>${logs.length}/${target} suggested sets · rest ${data.settings.restSeconds}s</small></div>${logs.length?`<div class="set-history">${logs.map((x,i)=>`<div class="set-log-row"><span><b>Set ${i+1}</b> · ${x.reps} reps × ${Number(x.weightKg)===0?'bodyweight':`${displayWeight(x.weightKg)} ${unit}`}${x.rpe?` · effort ${x.rpe}/10`:''}</span><button type="button" class="mini-link" data-action="delete-set" data-sid="${x.id}">Undo</button></div>`).join('')}</div>`:''}<form data-form="set" data-ex="${ex.id}"><div class="set-grid"><label>Reps<input class="field field-small" name="reps" type="number" inputmode="numeric" min="1" max="100" step="1" value="12" required></label><label>Weight (${unit})<input class="field field-small" name="weight" type="number" inputmode="decimal" min="0" max="3000" step="0.5" value="${prev?displayWeight(prev.weightKg):'0'}" required></label><label>Effort /10<select class="field field-small" name="rpe"><option value="">—</option>${[5,6,7,8,9,10].map(n=>`<option value="${n}">${n}</option>`).join('')}</select></label><button class="btn btn-primary" type="submit">+ Save set</button></div></form><div class="small muted" style="margin-top:8px">Use weight 0 for bodyweight/unloaded work. Previous values populate as a starting reference, not an automatic recommendation.</div></div>`;}
function renderCardioLogger(day){const logged=data.active.cardio||[];return `<div class="section-heading"><div><h2>Finish with cardio</h2><p>Log the activity you actually complete, even if you do less than planned.</p></div></div><div class="settings-block"><h3>Cardio log</h3>${logged.length?`<div class="set-history">${logged.map(x=>`<div class="set-log-row"><span>${escapeHTML(x.name)} · ${x.minutes} min</span><button class="mini-link" type="button" data-action="delete-cardio" data-cid="${x.id}">Remove</button></div>`).join('')}</div>`:''}<form data-form="cardio" class="cardio-form"><label>Activity<select class="field" name="name"><option value="Treadmill">Treadmill</option><option value="Elliptical">Elliptical</option><option value="Stationary bike">Stationary bike</option><option value="Walk">Walk</option><option value="Other cardio">Other cardio</option></select></label><label>Minutes<input class="field" name="minutes" type="number" inputmode="numeric" min="1" max="300" value="15" required></label><button class="btn btn-primary" type="submit">+ Log cardio</button></form><label style="display:block;font-size:.72rem;color:var(--muted);margin:20px 0 7px">Session notes</label><textarea class="field" style="height:94px;resize:vertical;max-width:750px" data-input="notes" maxlength="2000" placeholder="How did it feel? Anything to discuss with your clinician?">${escapeHTML(data.active.notes)}</textarea></div>`;}
function renderRest(){return `<div class="rest-timer" id="rest-widget" ${!state.restTimerEnds?'hidden':''}><div><small>REST TIMER</small><br><strong id="rest-remaining">${data.settings.restSeconds}s</strong></div><div class="row"><button type="button" data-action="start-rest">Restart</button><button type="button" data-action="skip-rest">Dismiss ×</button></div></div>`;}

function renderHistory(){
 const ss=[...data.sessions].sort((a,b)=>sessionDate(b).localeCompare(sessionDate(a))||b.startedAt.localeCompare(a.startedAt));
 return `<section class="page-head"><p class="eyebrow">YOUR TRAINING LOG</p><h1>Every rep counts.</h1><p class="page-intro">See all completed workouts, or choose a date in your calendar to update any set.</p><button class="btn btn-primary" type="button" data-nav="calendar">Open workout calendar →</button></section>${ss.length?`<div class="history-list">${ss.map(s=>{
 const day=dayById(s.day),grouped=s.sets.reduce((g,x)=>(g[x.exerciseId]??=[],g[x.exerciseId].push(x),g),{});
 return `<article class="history-entry"><details><summary><span style="display:flex;align-items:center;gap:13px">${badgeDay(s.day)}<span><strong>Day ${escapeHTML(s.day)} — ${escapeHTML(day.title)}</strong><br><small>${displayYMD(sessionDate(s))} · ${formatSets(s)} · ${totalMinutes(s)} min cardio</small></span></span><span class="arrow">⌄</span></summary><div class="history-details"><ul>${Object.entries(grouped).map(([id,sets])=>`<li><b>${escapeHTML(exById(id)?.name||id)}</b>: ${sets.map(x=>`${x.reps} × ${x.weightKg===0?'BW':displayWeight(x.weightKg)+' '+data.settings.unit}`).join(' · ')}</li>`).join('')}</ul>${s.cardio.length?`<p><b>Cardio:</b> ${s.cardio.map(c=>`${escapeHTML(c.name)} ${c.minutes} min`).join(' · ')}</p>`:''}${s.notes?`<p><b>Notes:</b> ${escapeHTML(s.notes)}</p>`:''}<button type="button" class="btn btn-small btn-secondary" data-action="calendar-open-session" data-sid="${escapeHTML(s.id)}">Edit on calendar →</button></div></details></article>`;
 }).join('')}</div>`:`<div class="empty"><h3>Nothing logged yet.</h3><p>Complete a workout and it will appear in your calendar. You can also backdate a workout.</p><button class="btn btn-primary" data-nav="calendar">Open calendar →</button></div>`}<p class="footer-note">Workout history is kept on this device. Export backups in Settings if you switch phones.</p>`;
}
function renderProgress(){const last=data.sessions.slice(-8), sessionsCount=data.sessions.length;let rects='';if(last.length){const w=700,h=180,step=w/last.length,max=Math.max(2,...last.map(s=>s.sets.length));rects=last.map((s,i)=>{const bh=(s.sets.length/max)*120,x=34+i*step,y=150-bh;return `<rect x="${x}" y="${y}" width="${Math.max(28,step-18)}" height="${bh}" rx="7" fill="${s.day==='A'?'#8bb79a':s.day==='B'?'#97bed4':s.day==='C'?'#dda77c':'#b4a4d0'}"/><text x="${x+Math.max(28,step-18)/2}" y="171" text-anchor="middle" fill="#567166" font-size="12" font-family="Arial">${escapeHTML(s.day)}</text><text x="${x+Math.max(28,step-18)/2}" y="${y-7}" text-anchor="middle" fill="#355F4C" font-size="12" font-family="Arial">${s.sets.length}</text>`}).join('');}
 const personal=[];for(const e of program.exercises){const v=data.sessions.flatMap(s=>s.sets).filter(s=>s.exerciseId===e.id&&s.weightKg>0);if(v.length){const max=v.reduce((a,b)=>a.weightKg>=b.weightKg?a:b);personal.push({name:e.name,max:max.weightKg,n:v.length});}}
 personal.sort((a,b)=>b.n-a.n);
 return `<section class="page-head"><p class="eyebrow">BEYOND THE SCALE</p><h1>See your strength grow.</h1><p class="page-intro">Review completed sessions, training consistency and weights over time—without judging your body.</p></section><div class="milestones"><div class="milestone"><small>Total logged sets</small><strong>${data.sessions.reduce((a,s)=>a+s.sets.length,0)}</strong></div><div class="milestone"><small>Total cardio minutes</small><strong>${data.sessions.reduce((a,s)=>a+totalMinutes(s),0)}</strong></div><div class="milestone"><small>Completed workouts</small><strong>${sessionsCount}</strong></div><div class="milestone"><small>Workouts this week</small><strong>${completedThisWeek()}</strong></div></div><div class="graph"><h3>Sets per recent session</h3>${last.length?`<svg viewBox="0 0 700 188" role="img" aria-label="Bar chart showing sets completed per session"><path d="M20 151 H683" stroke="#D5E0D6"/>${rects}</svg><p class="small muted">Each bar represents one completed session, from older to newer. Height shows logged sets—not calories burned.</p>`:`<div class="empty">Complete a workout to start seeing your training chart.</div>`}</div><div class="section-heading"><h2>Your logged resistance</h2></div>${personal.length?`<div class="history-list">${personal.slice(0,10).map(e=>`<div class="history-entry row-between"><div><strong>${escapeHTML(e.name)}</strong><br><small>${e.n} set(s) logged across your workouts</small></div><div><strong>${displayWeight(e.max)} ${data.settings.unit}</strong><br><small>highest entered resistance</small></div></div>`).join('')}</div>`:`<div class="empty">Your recorded exercise weights will appear here as you log sets.</div>`}<p class="footer-note">A higher logged load can reflect different exercise setup, assistance, movement range or reps; compare like-for-like sessions rather than treating every number as a strength test.</p>`;}
function renderSettings(){return `<section class="page-head"><p class="eyebrow">YOUR OWN SPACE</p><h1>Settings & backups.</h1><p class="page-intro">Keep your journal private. No account, subscription, ads or paid service required.</p></section><div class="settings-block"><h3>Workout preferences</h3><div class="settings-grid"><div><p class="small">Weight unit</p><div class="unit-toggle"><button type="button" class="${data.settings.unit==='lb'?'active':''}" data-action="unit" data-unit="lb">lb</button><button type="button" class="${data.settings.unit==='kg'?'active':''}" data-action="unit" data-unit="kg">kg</button></div></div><div><label for="rest-select" class="small muted">Rest timer duration</label><select id="rest-select" class="field" style="margin-top:8px" data-setting="restSeconds">${[60,90,120,180].map(n=>`<option value="${n}" ${data.settings.restSeconds===n?'selected':''}>${n} seconds</option>`).join('')}</select></div></div></div><div class="settings-block"><h3>Clinician review</h3><p>Four weekly lifting days and the machine substitutions are a proposed expansion of your original exercise prescription. Confirm with your exercise clinician before adopting or progressing the changes.</p><label class="switch-row"><input type="checkbox" data-setting="clinicianReviewed" ${data.settings.clinicianReviewed?'checked':''}> I have discussed this four-day adaptation with my exercise clinician.</label></div><div class="settings-block"><h3>Keep a safe copy</h3><p>All logs live in this local iPhone/browser installation. If you reinstall, switch devices or clear Safari data, they may be lost unless backed up. Download your backup to Files regularly.</p><div class="row"><button class="btn btn-primary" type="button" data-action="export">Download JSON backup ↓</button><label class="btn" for="backup-file">Import JSON backup ↑</label><input id="backup-file" type="file" accept="application/json,.json" style="position:absolute;opacity:0;width:1px;height:1px"></div><p class="small">Backups contain workout details and notes. Handle the file privately.</p></div><div class="settings-block"><h3>Your exercise handbook</h3><p>Illustrated instructions for all four days, cardio routines, equipment substitutions and technique notes—available as a printable PDF.</p><a class="btn btn-secondary" href="./handbook.pdf" target="_blank" rel="noopener">Open PDF handbook ↗</a></div><div class="settings-block"><h3>Install on iPhone</h3><p>After you publish this site on a free HTTPS URL, open it in <b>Safari</b>, tap <b>Share</b> (square with arrow), choose <b>Add to Home Screen</b>, and open the new icon. The installed app keeps its own local data; import your backup if switching from Safari.</p><p>Hosting instructions are included in <b>DEPLOY.md</b> inside the downloaded site package.</p></div><div class="settings-block"><h3>Delete this device's journal</h3><p>This will delete all workout history and your active session on this device. Export first if you want to keep a copy.</p><button class="btn btn-danger" type="button" data-action="reset">Erase local workout data</button></div><div class="notice"><span class="icon">!</span><p><strong>Health and safety:</strong> this app supports your clinician's plan but does not replace assessment or a supervised technique demonstration. Stop for chest pain, fainting, unusual shortness of breath or sharp pain and seek appropriate care. If Zepbound makes you dizzy, dehydrated, nauseated or unable to fuel your session, postpone strenuous exercise and consult your care team.</p></div><p class="footer-note">Form Journal 1.1 · Free local-first PWA · No third-party tracking.</p>`;}
function startSession(day,ymd=state.programDate){
 if(!['A','B','C','D'].includes(day))return;
 if(!isValidYMD(ymd)){toast('Choose a valid workout date.');return;}
 if(ymd>localYMD(new Date())){toast('Choose today or a past date to log. You can plan future workouts in Calendar.');return;}
 if(data.active){
   if(data.active.day===day && sessionDate(data.active)===ymd){state.selectedDay=day;state.view='program';render();return;}
   toast(`Finish or discard Day ${data.active.day} before starting another workout.`);return;
 }
 data.active={id:cryptoId(),day,workoutDate:ymd,startedAt:new Date().toISOString(),finishedAt:null,sets:[],cardio:[],notes:''};
 state.selectedDay=day;state.programDate=ymd;state.calendarDate=ymd;state.calendarMonth=ymd.slice(0,7);
 state.expandedId=dayById(day).exercises[0];state.view='program';persist();render();
 toast(`Day ${day} started for ${displayYMD(ymd,{month:'short',day:'numeric'})}.`);
}
function addSet(form){if(!data.active)return;const eId=form.dataset.ex;if(!dayById(data.active.day).exercises.includes(eId))return;const f=new FormData(form);const reps=Number(f.get('reps'));const weight=Number(f.get('weight'));const rpe=f.get('rpe')?Number(f.get('rpe')):null;if(!Number.isInteger(reps)||reps<1||reps>100||!Number.isFinite(weight)||weight<0||weight>3000){toast('Enter valid reps (1–100) and weight (0–3000).');return;}data.active.sets.push({id:cryptoId(),exerciseId:eId,reps,weightKg:toKg(weight),rpe,createdAt:new Date().toISOString()});persist();state.restTimerEnds=Date.now()+data.settings.restSeconds*1000;render();toast(`Saved ${reps} reps for ${exById(eId)?.name||'exercise'}.`);}
function addCardio(form){if(!data.active)return;const f=new FormData(form);const name=String(f.get('name')||'');const minutes=Number(f.get('minutes'));if(!name||!Number.isInteger(minutes)||minutes<1||minutes>300){toast('Enter a cardio activity and 1–300 minutes.');return;}data.active.cardio.push({id:cryptoId(),name,minutes});persist();render();toast(`${minutes} minutes of ${name} logged.`);}
function updateRestTime(){const widget=document.getElementById('rest-widget');if(!widget)return;if(!state.restTimerEnds){widget.hidden=true;return;}const s=Math.max(0,Math.ceil((state.restTimerEnds-Date.now())/1000));if(s===0){state.restTimerEnds=null;widget.hidden=true;toast('Rest finished. Continue when ready.');return;}widget.hidden=false;const lab=document.getElementById('rest-remaining');if(lab)lab.textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')} remaining`;}
function finishSession(){
 if(!data.active)return;
 if(data.active.sets.length===0&&!confirm('No sets have been logged. Finish this session anyway?'))return;
 const note=document.querySelector('[data-input="notes"]');
 if(note)data.active.notes=note.value.slice(0,2000);
 data.active.finishedAt=new Date().toISOString();
 state.calendarDate=sessionDate(data.active);state.calendarMonth=state.calendarDate.slice(0,7);state.editSessionId=null;
 data.sessions.push(data.active);data.active=null;state.restTimerEnds=null;
 persist();setView('calendar');toast('Workout saved on your calendar. You can edit any set later.');
}
function exportData(){const backup={app:'Form Journal',schemaVersion:SCHEMA_VERSION,exportedAt:new Date().toISOString(),data};const b=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});const url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download=`form-journal-backup-${localYMD(new Date())}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),800);toast('Backup downloaded. Save it to a safe location.');}
async function importData(file){if(!file)return;if(file.size>10_000_000){toast('Backup file is too large.');return;}try{const obj=JSON.parse(await file.text());if(!obj||obj.app!=='Form Journal'||![1,2].includes(Number(obj.schemaVersion))||!obj.data){throw new Error('Unsupported backup format.');}if(!confirm('Replace all workout data on this device with the selected backup?'))return;data=normalizeData(obj.data);persist();setView('today');toast('Backup imported successfully.');}catch(err){toast('Could not import backup: '+err.message);}}
function getRecordedSession(id){return data.sessions.find(s=>s.id===id);}
function formValues(form){const f=new FormData(form),reps=Number(f.get('reps')),weight=Number(f.get('weight')),rpe=f.get('rpe')?Number(f.get('rpe')):null;
  if(!Number.isInteger(reps)||reps<1||reps>100||!Number.isFinite(weight)||weight<0||weight>3000||(rpe!==null&&(!Number.isInteger(rpe)||rpe<1||rpe>10))){toast('Check reps (1–100), weight (0–3000) and effort.');return null;}
  return {reps,weightKg:toKg(weight),rpe};
}
function editRecordedSet(form){const s=getRecordedSession(form.dataset.sid),x=s?.sets.find(x=>x.id===form.dataset.setid);if(!x)return;const v=formValues(form);if(!v)return;Object.assign(x,v);persist();render();toast('Historical set updated.');}
function addRecordedSet(form){const s=getRecordedSession(form.dataset.sid);if(!s)return;const v=formValues(form);if(!v)return;const exId=String(new FormData(form).get('exerciseId')||'');if(!exById(exId)){toast('Choose an exercise.');return;}s.sets.push({id:cryptoId(),exerciseId:exId,...v,createdAt:new Date().toISOString()});persist();render();toast('Set added to your workout history.');}
function saveRecordedSession(form){const s=getRecordedSession(form.dataset.sid);if(!s)return;const f=new FormData(form),ymd=String(f.get('workoutDate')||''),day=String(f.get('day')||'');if(!isValidYMD(ymd)||!['A','B','C','D'].includes(day)){toast('Choose a valid date and workout group.');return;}s.workoutDate=ymd;s.day=day;state.calendarDate=ymd;state.calendarMonth=ymd.slice(0,7);persist();render();toast('Workout date and group saved.');}
function addRecordedCardio(form){const s=getRecordedSession(form.dataset.sid);if(!s)return;const f=new FormData(form),name=String(f.get('name')||'').slice(0,80),minutes=Number(f.get('minutes'));if(!name||!Number.isInteger(minutes)||minutes<1||minutes>300){toast('Enter an activity and 1–300 minutes.');return;}s.cardio.push({id:cryptoId(),name,minutes});persist();render();toast('Cardio added to this date.');}
function handleClick(ev){
 const el=ev.target.closest('[data-action], [data-nav], [data-selectday]');
 if(!el)return;
 if(el.dataset.nav){setView(el.dataset.nav);return;}
 if(el.dataset.selectday){state.selectedDay=el.dataset.selectday;state.expandedId=null;setView('program');return;}
 const action=el.dataset.action;
 switch(action){
  case 'open-day':state.selectedDay=el.dataset.day;state.expandedId=null;setView('program');break;
  case 'start':startSession(el.dataset.day,document.getElementById('workout-date')?.value||state.programDate);break;
  case 'toggle-ex':state.expandedId=state.expandedId===el.dataset.ex?null:el.dataset.ex;render();break;
  case 'delete-set':{
    if(!data.active)return;
    data.active.sets=data.active.sets.filter(s=>s.id!==el.dataset.sid);persist();render();toast('Set removed.');break;
  }
  case 'delete-cardio':{
    if(!data.active)return;
    data.active.cardio=data.active.cardio.filter(x=>x.id!==el.dataset.cid);persist();render();toast('Cardio entry removed.');break;
  }
  case 'finish':finishSession();break;
  case 'discard':if(confirm('Discard your current unfinished workout? This cannot be undone.')){data.active=null;state.restTimerEnds=null;persist();render();toast('Unfinished workout discarded.');}break;
  case 'start-rest':state.restTimerEnds=Date.now()+data.settings.restSeconds*1000;updateRestTime();break;
  case 'skip-rest':state.restTimerEnds=null;updateRestTime();break;
  case 'unit':data.settings.unit=el.dataset.unit==='kg'?'kg':'lb';persist();render();toast(`Weights now shown in ${data.settings.unit}.`);break;
  case 'export':exportData();break;
  case 'reset':if(confirm('Permanently erase all workouts, calendar plans and settings from this device? This cannot be undone.')){data=initialData();persist();state.editSessionId=null;setView('today');toast('Local data erased.');}break;
  case 'delete-session':if(confirm('Delete this completed workout and all its sets?')){data.sessions=data.sessions.filter(s=>s.id!==el.dataset.sid);state.editSessionId=null;persist();render();toast('Workout deleted.');}break;
  case 'calendar-today':chooseDate(localYMD(new Date()));break;
  case 'calendar-go-date':chooseDate(el.dataset.date);if(state.view!=='calendar')setView('calendar');break;
  case 'calendar-prev':case 'calendar-next':{
    const [y,m]=state.calendarMonth.split('-').map(Number),d=new Date(y,m-1+(action==='calendar-next'?1:-1),1);
    if(d.getFullYear()<1900||d.getFullYear()>2100)return;
    chooseDate(localYMD(d));break;
  }
  case 'plan-date':{
    const ymd=el.dataset.date,day=el.dataset.day;
    if(!isValidYMD(ymd)||!['A','B','C','D','rest'].includes(day))return;
    data.plans[ymd]=day;persist();render();toast(day==='rest'?'Rest day saved.':`Day ${day} planned for ${displayYMD(ymd,{month:'short',day:'numeric'})}.`);break;
  }
  case 'clear-plan':{
    const ymd=el.dataset.date;if(!isValidYMD(ymd))return;
    delete data.plans[ymd];persist();render();toast('Workout plan cleared. History remains unchanged.');break;
  }
  case 'calendar-start':{
    const day=document.getElementById('calendar-workout-select')?.value;
    startSession(day,state.calendarDate);break;
  }
  case 'toggle-session-edit':state.editSessionId=state.editSessionId===el.dataset.sid?null:el.dataset.sid;render();break;
  case 'calendar-open-session':{
    const ss=getRecordedSession(el.dataset.sid);if(!ss)return;
    state.calendarDate=sessionDate(ss);state.calendarMonth=state.calendarDate.slice(0,7);state.editSessionId=ss.id;setView('calendar');break;
  }
  case 'history-delete-set':{
    const ss=getRecordedSession(el.dataset.sid);if(!ss)return;
    if(!confirm('Remove this set from workout history?'))return;
    ss.sets=ss.sets.filter(x=>x.id!==el.dataset.setid);persist();render();toast('Set removed from history.');break;
  }
  case 'history-delete-cardio':{
    const ss=getRecordedSession(el.dataset.sid);if(!ss)return;
    ss.cardio=ss.cardio.filter(x=>x.id!==el.dataset.cid);persist();render();toast('Cardio removed from history.');break;
  }
 }
}
document.addEventListener('click',handleClick);
document.addEventListener('submit',ev=>{
 const form=ev.target.closest('[data-form]');if(!form)return;
 ev.preventDefault();
 switch(form.dataset.form){
  case 'set':addSet(form);break;
  case 'cardio':addCardio(form);break;
  case 'edit-session':saveRecordedSession(form);break;
  case 'edit-history-set':editRecordedSet(form);break;
  case 'history-add-set':addRecordedSet(form);break;
  case 'history-add-cardio':addRecordedCardio(form);break;
 }
});
document.addEventListener('change',ev=>{
 const el=ev.target;
 if(el.id==='backup-file'){importData(el.files?.[0]);el.value='';}
 if(el.dataset.setting==='restSeconds'){data.settings.restSeconds=Number(el.value);persist();toast('Rest timer updated.');}
 if(el.dataset.setting==='clinicianReviewed'){data.settings.clinicianReviewed=el.checked;persist();toast('Clinician review setting saved.');}
 if(el.dataset.setting==='programDate' && isValidYMD(el.value)){state.programDate=el.value;}
});
document.addEventListener('input',ev=>{
 const el=ev.target;
 if(el.dataset.input==='notes'&&data.active){data.active.notes=el.value.slice(0,2000);persist();}
 if(el.dataset.input==='history-notes'){
   const ss=getRecordedSession(el.dataset.sid);if(ss){ss.notes=el.value.slice(0,2000);persist();}
 }
});
window.addEventListener('hashchange',()=>{const view=location.hash.replace('#','');if(['today','program','calendar','history','progress','settings'].includes(view)&&view!==state.view){state.view=view;render();}});
setInterval(updateRestTime,500);
async function bootstrap(){try{const response=await fetch(programURL);if(!response.ok)throw Error(`HTTP ${response.status}`);program=await response.json();if(!program?.days?.length||!program.exercises?.length)throw Error('Missing exercises.');if(['today','program','calendar','history','progress','settings'].includes(location.hash.slice(1)))state.view=location.hash.slice(1);state.selectedDay=data.active?.day||suggestedDay();sidebarUpdate();render();if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Service worker unavailable',err)));}}catch(err){document.getElementById('main-content').innerHTML=`<section class="loading-screen"><h1>Unable to load the guide.</h1><p>This site needs to be served over HTTPS or localhost. Opening index.html directly from Files will not load its program data.</p><p class="small">${escapeHTML(err.message)}</p></section>`;}}
bootstrap();
