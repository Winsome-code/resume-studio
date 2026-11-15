const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const K='resume-studio-v1',uid=()=>Math.random().toString(36).slice(2,9),today=()=>new Date().toISOString().slice(0,10);
const ST=['Saved','Interested','Preparing','Ready to Apply','Applied','Assessment','Interview','Offer','Rejected','Withdrawn','On Hold','Closed'];
const DONE=['Rejected','Withdrawn','Closed','Offer'];
let S=JSON.parse(localStorage.getItem(K)||'null')||{p:{name:'',location:'',phone:'',email:'',linkedin:'',edu:'',lang:'',skills:'',certs:'',exp:'',summary:''},v:[],a:[],endpoint:''};
let D=null,jd={title:'',company:'',text:''},view='profile',q='';
const save=()=>{localStorage.setItem(K,JSON.stringify(S));$('#st').textContent='Saved '+new Date().toLocaleTimeString()};
const lines=t=>(t||'').split('\n').map(x=>x.trim()).filter(Boolean);
const words=t=>(t.toLowerCase().match(/[a-z][a-z0-9+#.\-]+/g)||[]).map(w=>w.replace(/[.\-]+$/,'')).filter(w=>w.length>1);
const STOP=new Set('we need plus is of to in on or as at be by it an the and for with you our are will have that this from your their who all can has not but about into more such other than also any use new work role team job per etc able must may should experience skills ability strong responsibilities including required preferred knowledge understanding years working looking candidate position company based related using good excellent'.split(' '));
const dateRx=/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}/i;
// Experience: "Employer | Title | Location | Dates", then "- bullet" lines; blank line between roles. Evidence IDs: e1b1, e1b2...
function roles(){return (S.p.exp||'').split(/\n\s*\n/).map((b,i)=>{const l=lines(b);if(!l.length)return null;const [emp,title,loc,dates]=l[0].split('|').map(x=>x.trim());
 return{emp,title,loc,dates,bullets:l.slice(1).map((x,j)=>({id:`e${i+1}b${j+1}`,text:x.replace(/^[-•]\s*/,'')}))}}).filter(Boolean)}
const groups=()=>lines(S.p.skills).map(l=>{const i=l.indexOf(':');return{cat:i>0?l.slice(0,i).trim():'Skills',items:(i>0?l.slice(i+1):l).split(',').map(x=>x.trim()).filter(Boolean)}});
const skills=()=>groups().flatMap(g=>g.items);
const kw=()=>{const f={};words(jd.text).filter(w=>!STOP.has(w)).forEach(w=>f[w]=(f[w]||0)+1);return Object.entries(f).sort((a,b)=>b[1]-a[1]).map(x=>x[0]).slice(0,30)};
const arrange=o=>{const ix=s=>{const i=o.indexOf(s);return i<0?999:i};return groups().map(x=>({cat:x.cat,items:[...x.items].sort((a,b)=>ix(a)-ix(b))})).sort((a,b)=>Math.min(...a.items.map(ix))-Math.min(...b.items.map(ix)))};
function localTailor(){const k=kw(),js=new Set(k),sc=t=>words(t).filter(w=>js.has(w)).length,pw=new Set(words([S.p.skills,S.p.exp,S.p.summary,S.p.certs].join(' '))),ord=[...skills()].sort((a,b)=>sc(b)-sc(a));
 return{title:jd.title,headline:ord.filter(s=>sc(s)).slice(0,4).join(' | ').toUpperCase(),summary:S.p.summary||'',roles:roles().map(r=>({...r,bullets:[...r.bullets].sort((a,b)=>sc(b.text)-sc(a.text)).slice(0,6)})),
 skills:arrange(ord),certs:lines(S.p.certs),matched:k.filter(w=>pw.has(w)),missing:k.filter(w=>!pw.has(w)),warnings:['Local mode only reorders your verified content. Use AI tailoring to rewrite the summary for this job.'],model:'local-keywords'}}
function tailor(){if(!jd.text.trim())return alert('Paste a job description first.');if(!roles().length)return alert('Add experience in Profile first.');D=localTailor();draw()}
async function aiTailor(){if(!jd.text.trim())return alert('Paste a job description first.');if(!S.endpoint)return alert('Add your Worker URL in Settings first.');
 const base=localTailor();if(!confirm('Sent to AI: target title, job description, master summary, skills, certifications and experience bullets.\nNOT sent: name, contact details, education, languages.\nContinue?'))return;
 try{const r=await fetch(S.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:jd.title,jd:jd.text,summary:S.p.summary,skills:skills(),certs:base.certs,roles:roles().map(r=>({emp:r.emp,title:r.title,bullets:r.bullets}))})});
 if(!r.ok)throw new Error(r.status);D=validate(await r.json(),base)}catch(e){alert('AI unavailable ('+e.message+'). Using local keyword match instead.');D=base}draw()}
function validate(o,base){const w=[...(o.warnings||[])],m=new Map(),R=roles().map(r=>({...r,bullets:[]}));roles().forEach((r,i)=>r.bullets.forEach(b=>m.set(b.id,i)));
 (o.bullets||[]).forEach(b=>m.has(b.id)?R[m.get(b.id)].bullets.push({id:b.id,text:String(b.text||'')}):w.push('Dropped bullet with unknown evidence ID: '+b.id));
 const ok=(a,src)=>{const mm=new Map(src.map(x=>[x.toLowerCase(),x]));return[...new Set((a||[]).map(x=>mm.get(String(x).toLowerCase())||(w.push('Removed unsupported item: '+x),null)).filter(Boolean))]};
 const sk=ok(o.skills,skills()),ct=ok(o.certs,base.certs),ev=(o.summary_evidence||[]).filter(i=>m.has(i));
 if(!ev.length)w.push('Summary has no valid evidence references. Check every claim against your profile.');
 R.forEach((r,i)=>{if(!r.bullets.length)r.bullets=base.roles[i].bullets});
 return{...base,headline:o.headline||base.headline,summary:o.summary||base.summary,roles:R,skills:arrange([...sk,...skills()]),certs:ct.length?ct:base.certs,matched:o.matched||base.matched,missing:o.missing||base.missing,warnings:w,evidence:ev,model:'gemini via proxy @ '+new Date().toISOString()}}
function sync(){if(!D||!$('#sheet'))return;document.querySelectorAll('#sheet [data-k]').forEach(e=>D[e.dataset.k]=e.innerText.trim());
 document.querySelectorAll('#sheet [data-c]').forEach(e=>D.skills[+e.dataset.c].items=e.innerText.split(',').map(x=>x.trim()).filter(Boolean));
 document.querySelectorAll('#sheet li[data-id]').forEach(li=>D.roles.forEach(r=>r.bullets.forEach(b=>{if(b.id===li.dataset.id)b.text=li.innerText.trim()})))}
const strip=u=>(u||'').replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,'');
const rw=(a,d)=>{const i=a.indexOf(' - ');return`<p class="rw"><span>${i>0?`<b>${esc(a.slice(0,i))}</b>${esc(a.slice(i))}`:`<b>${esc(a)}</b>`}</span><span>${esc(d)}</span></p>`};
const ent=l=>l.includes('|')?rw(...l.split('|').map(x=>x.trim())):`<p><i>${esc(l)}</i></p>`;
function sheet(){const p=S.p,d=D,li=strip(p.linkedin),c=[esc(p.location),esc(p.phone),p.email&&`<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>`,li&&`<a href="https://${esc(li)}">${esc(li)}</a>`].filter(Boolean).join(' | '),H=t=>`<h3>${t}</h3>`;
 return`<article id="sheet"><h1>${esc(p.name)}</h1><p class="ct">${c}</p><h2 class="jt" contenteditable data-k="title">${esc(d.title)}</h2><p class="hl" contenteditable data-k="headline">${esc(d.headline)}</p>
${H('Professional Summary')}<p class="sm" contenteditable data-k="summary">${esc(d.summary)}</p>${H('Professional Experience')}
${d.roles.filter(r=>r.bullets.length).map(r=>`<div>${rw(r.title+' - '+r.emp,r.dates)}<p><i>${esc(r.loc)}</i></p><ul>${r.bullets.map(b=>`<li contenteditable data-id="${b.id}" title="Evidence: ${b.id}">${esc(b.text)}</li>`).join('')}</ul></div>`).join('')}
${H('Skills')}<ul>${d.skills.map((g,i)=>`<li><b>${esc(g.cat)}:</b> <span contenteditable data-c="${i}">${esc(g.items.join(', '))}</span></li>`).join('')}</ul>
${H('Education')}${lines(p.edu).map(ent).join('')}${H('Certifications')}${d.certs.map(ent).join('')}${H('Languages')}${lines(p.lang).map(l=>`<p>${esc(l)}</p>`).join('')}</article>`}
function ats(){const t=[D.title,D.headline,D.summary,D.roles.map(r=>r.bullets.map(b=>b.text).join(' ')).join(' '),D.skills.map(g=>g.items.join(' ')).join(' '),D.certs.join(' ')].join(' '),rs=new Set(words(t)),k=kw(),hit=k.filter(w=>rs.has(w)),p=S.p,tw=words(jd.title||''),
 dts=[...D.roles.map(r=>r.dates),...lines(p.certs).map(l=>l.split('|')[1])].filter(Boolean);
 return[[!k.length||hit.length/k.length>=.6,`Keyword coverage: ${hit.length} of ${k.length} top job terms appear (estimate, not an employer ATS score)`],
 [!tw.length||tw.every(x=>words(D.title+' '+D.headline).includes(x)),'Job title wording appears in the title or headline'],
 [D.summary.split(/\s+/).filter(Boolean).length>=30,'Summary present (30+ words)'],[!!(p.email&&p.phone&&p.location),'Email, phone and location present'],
 [!p.linkedin||/linkedin\.com/i.test(p.linkedin),'LinkedIn shown as visible URL text'],[dts.every(x=>dateRx.test(x)),'All role and certification dates include month and year (e.g. Jan 2023 - Present)']]}
const fn=()=>((S.p.name||'Resume')+'_'+(jd.company||jd.title||'Tailored')).replace(/\W+/g,'_');
const dl=(b,n)=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=n;a.click()};
async function docx(){sync();const{Document,Packer,Paragraph,TextRun,AlignmentType,BorderStyle,TabStopType,Tab,ExternalHyperlink}=window.docx,p=S.p,d=D,BL='2E75B5',bd={bottom:{style:BorderStyle.SINGLE,size:4,space:1,color:'000000'}},R=(t,o)=>new TextRun({text:t,...o});
 const P=(ch,o)=>new Paragraph({children:ch,...o}),C=(ch,o)=>P(ch,{alignment:AlignmentType.CENTER,...o}),H=t=>P([R(t.toUpperCase(),{bold:true,color:BL,size:26})],{border:bd,spacing:{before:240,after:120}});
 const rw=(a,dt)=>{const i=a.indexOf(' - ');return P([R(i>0?a.slice(0,i):a,{bold:true}),...(i>0?[R(a.slice(i))]:[]),...(dt?[new TextRun({children:[new Tab(),dt]})]:[])],{tabStops:[{type:TabStopType.RIGHT,position:10466}],spacing:{before:80}})};
 const lk=(t,l)=>new ExternalHyperlink({link:l,children:[R(t,{color:'0000FF',underline:{}})]}),li=strip(p.linkedin),ct=[R([p.location,p.phone].filter(Boolean).join(' | '))];
 if(p.email)ct.push(R(' | '),lk(p.email,'mailto:'+p.email));if(li)ct.push(R(' | '),lk(li,'https://'+li));
 const c=[C([R(p.name,{bold:true,size:50,color:'353744'})],{border:bd,spacing:{before:120}}),C(ct,{spacing:{before:120}}),C([R(d.title,{bold:true,size:26,color:BL})],{border:bd,spacing:{before:240,after:120}}),C([R(d.headline.toUpperCase(),{bold:true})],{spacing:{after:120}}),H('Professional Summary'),P([R(d.summary)],{alignment:AlignmentType.JUSTIFIED}),H('Professional Experience')];
 d.roles.forEach(r=>{if(!r.bullets.length)return;c.push(rw(r.title+' - '+r.emp,r.dates),P([R(r.loc,{italics:true})]));r.bullets.forEach(b=>c.push(P([R(b.text)],{bullet:{level:0}})))});
 const e=l=>l.includes('|')?rw(...l.split('|').map(x=>x.trim())):P([R(l,{italics:true})]);
 c.push(H('Skills'),...d.skills.map(g=>P([R(g.cat+': ',{bold:true}),R(g.items.join(', '))],{bullet:{level:0}})),H('Education'),...lines(p.edu).map(e),H('Certifications'),...d.certs.map(e),H('Languages'),...lines(p.lang).map(l=>P([R(l)])));
 dl(await Packer.toBlob(new Document({styles:{default:{document:{run:{font:'Cambria',size:22}}}},sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:720,right:720,bottom:720,left:720}}},children:c}]})),fn()+'.docx')}
function saveVer(){sync();const n=prompt('Version name',(D.title||'Resume')+(jd.company?' - '+jd.company:''));if(!n)return;const id=uid();S.v.push({id,name:n,created:Date.now(),jd:{...jd,snapshot:jd.text},d:structuredClone(D)});save();alert('Saved as new version. Nothing else was overwritten.')}
// ---- views
function profile(){const f=(k,l,t,h)=>`<label>${l}</label>${h?`<p class="hint">${h}</p>`:''}${t?`<textarea oninput="S.p.${k}=this.value;save()">${esc(S.p[k])}</textarea>`:`<input value="${esc(S.p[k])}" oninput="S.p.${k}=this.value;save()">`}`;
 return`<div class="card"><h2>Master profile</h2><p class="hint">Source of truth. AI never edits it; education, languages and contact details are never changed by tailoring.</p>${f('name','Full name')}${f('location','Location (City, State, Country)')}${f('phone','Phone')}${f('email','Email')}${f('linkedin','LinkedIn URL (shown as visible text)')}
${f('summary','Master summary (AI rewrites a copy per job)',1)}${f('skills','Skills',1,'One category per line: Category: skill, skill, skill. Write acronyms with the full term, e.g. SEO (Search Engine Optimization).')}
${f('edu','Education (locked)',1,'Degree - Subject | Dates, then the institution on the next line.')}${f('certs','Certifications',1,'Title - Issuer | Month Year - Month Year. One per line.')}${f('lang','Languages (locked)',1)}
<label>Experience</label><p class="hint">Role line: Employer | Title | Location | Month Year - Present, then "- bullet" lines. Blank line between roles.</p><textarea style="min-height:260px" oninput="S.p.exp=this.value;save()">${esc(S.p.exp)}</textarea></div>`}
function builder(){const t=(k,l)=>`<label>${l}</label><input value="${esc(jd[k])}" oninput="jd.${k}=this.value">`;
 return`<div class="split"><div><div class="card">${t('title','Target job title')}${t('company','Company')}<label>Job description</label><textarea style="min-height:200px" oninput="jd.text=this.value">${esc(jd.text)}</textarea>
<div class="row"><button class="pri" onclick="aiTailor()">Tailor with AI</button><button onclick="tailor()">Tailor locally (no AI)</button></div></div>
${D?`<div class="card"><div class="row"><button class="pri" onclick="saveVer()">Save version</button><button onclick="sync();window.print()">Export PDF</button><button onclick="docx()">Export DOCX</button><button onclick="sync();draw()">Re-check ATS</button></div>
<p class="hint">Click text in the preview to edit it. PDF: choose "Save as PDF" in the print dialog (turn off headers and footers).</p>
<h3>ATS checks</h3>${ats().map(([c,m])=>`<p class="${c?'':'warn'}">${c?'✓':'⚠'} ${esc(m)}</p>`).join('')}
<p><b>Matched:</b> ${esc(D.matched.join(', '))||'none'}</p><p class="bad">Gaps (no evidence in profile): ${esc(D.missing.join(', '))||'none'}</p>${D.warnings.map(w=>`<p class="warn">${esc(w)}</p>`).join('')}<p class="hint">Source: ${esc(D.model)}</p></div>`:''}</div>
<div>${D?sheet():'<div class="card">Paste a job description and tailor to see the A4 preview.</div>'}</div></div>`}
function library(){return`<div class="card"><h2>Resume library</h2>${S.v.length?`<table><tr><th>Name</th><th>Created</th><th></th></tr>${S.v.map(v=>`<tr><td>${esc(v.name)}</td><td>${new Date(v.created).toLocaleDateString()}</td><td><button onclick="openV('${v.id}')">Open</button> <button onclick="dupV('${v.id}')">Duplicate</button> <button onclick="delV('${v.id}')">Delete</button></td></tr>`).join('')}</table>`:'<p>No saved versions yet.</p>'}</div>`}
const openV=id=>{const v=S.v.find(x=>x.id===id);D=structuredClone(v.d);jd={title:v.jd.title,company:v.jd.company,text:v.jd.snapshot};view='builder';draw()};
const dupV=id=>{const v=structuredClone(S.v.find(x=>x.id===id));v.id=uid();v.name+=' (copy)';v.created=Date.now();S.v.push(v);save();draw()};
const delV=id=>{if(confirm('Delete this version? Applications keep their record but lose the link.')){S.v=S.v.filter(x=>x.id!==id);save();draw()}};
function tracker(){const t=today(),cnt=s=>S.a.filter(a=>s.includes(a.status)).length,soon=S.a.filter(a=>a.closing&&a.closing>=t&&a.closing<=new Date(Date.now()+7*864e5).toISOString().slice(0,10)).length,od=S.a.filter(a=>a.follow&&a.follow<t&&!DONE.includes(a.status)).length;
 const rows=S.a.filter(a=>(a.company+a.role+a.status+a.source).toLowerCase().includes(q.toLowerCase()));
 return`<div class="kpi"><div><b>${S.a.length}</b>Opportunities</div><div><b>${cnt(['Applied','Assessment','Interview','Offer','Rejected'])}</b>Applied</div><div><b>${cnt(['Interview'])}</b>Interviews</div><div><b>${cnt(['Offer'])}</b>Offers</div><div><b>${cnt(['Rejected'])}</b>Rejections</div><div><b>${soon}</b>Closing in 7 days</div><div><b class="${od?'bad':''}">${od}</b>Overdue follow-ups</div></div>
<div class="card" style="margin-top:12px"><h3>Add application</h3><div class="row">${['company','role','link','source'].map(k=>`<input id="n_${k}" placeholder="${k}">`).join('')}<select id="n_status">${ST.map(s=>`<option>${s}</option>`).join('')}</select>
<label class="hint">Closing <input id="n_closing" type="date"></label><label class="hint">Follow-up <input id="n_follow" type="date"></label><select id="n_ver"><option value="">Resume version</option>${S.v.map(v=>`<option value="${v.id}">${esc(v.name)}</option>`).join('')}</select><button class="pri" onclick="addApp()">Add</button></div></div>
<input placeholder="Search company, role, status or source" value="${esc(q)}" oninput="q=this.value;draw();$('#main input[placeholder^=Search]').focus()" style="margin-bottom:8px">
<table><tr><th>Company</th><th>Role</th><th>Status</th><th>Applied</th><th>Closing</th><th>Follow-up</th><th>Resume</th><th></th></tr>${rows.map(a=>`<tr><td>${esc(a.company)}</td><td>${a.link?`<a href="${esc(a.link)}" target="_blank" rel="noopener">${esc(a.role)}</a>`:esc(a.role)}</td>
<td><select onchange="setSt('${a.id}',this.value)">${ST.map(s=>`<option ${s==a.status?'selected':''}>${s}</option>`).join('')}</select></td><td>${a.applied||''}</td><td>${a.closing||''}</td><td class="${a.follow&&a.follow<t&&!DONE.includes(a.status)?'bad':''}">${a.follow||''}</td><td>${esc((S.v.find(v=>v.id===a.ver)||{}).name||'')}</td><td><button onclick="delA('${a.id}')">Delete</button></td></tr>`).join('')}</table>`}
function addApp(){const g=k=>$('#n_'+k).value.trim(),a={id:uid(),company:g('company'),role:g('role'),link:g('link'),source:g('source'),status:g('status'),closing:g('closing'),follow:g('follow'),ver:g('ver'),applied:'',hist:[]};
 if(!a.company||!a.role)return alert('Company and role are required.');if(a.status==='Applied')a.applied=today();a.hist.push({at:new Date().toISOString(),to:a.status});S.a.push(a);save();draw()}
const setSt=(id,s)=>{const a=S.a.find(x=>x.id===id);a.hist.push({at:new Date().toISOString(),from:a.status,to:s});a.status=s;if(s==='Applied'&&!a.applied)a.applied=prompt('Applied date',today())||today();save();draw()};
const delA=id=>{if(confirm('Delete this application and its history?')){S.a=S.a.filter(x=>x.id!==id);save();draw()}};
function settings(){return`<div class="card"><h2>AI proxy</h2><p class="hint">Paste your Cloudflare Worker URL (see README). The AI key lives only in the Worker, never in this site.</p><input value="${esc(S.endpoint)}" placeholder="https://resume-ai.yourname.workers.dev" oninput="S.endpoint=this.value.trim();save()"></div>
<div class="card"><h2>Backup</h2><p class="hint">Data is stored only in this browser. Export a backup regularly.</p><div class="row"><button class="pri" onclick="dl(new Blob([JSON.stringify(S,null,2)],{type:'application/json'}),'resume-studio-backup.json')">Export JSON</button><button onclick="csv()">Export applications CSV</button><input type="file" accept=".json" onchange="imp(this.files[0])"></div></div>`}
function csv(){const c=['company','role','link','source','status','applied','closing','follow'],e=v=>`"${String(v??'').replace(/"/g,'""')}"`;dl(new Blob([[c.join(',')].concat(S.a.map(a=>c.map(k=>e(a[k])).join(','))).join('\n')],{type:'text/csv'}),'applications.csv')}
async function imp(f){if(!f)return;try{const o=JSON.parse(await f.text());if(!o.p||!o.v||!o.a)throw 0;if(confirm('Replace ALL current data with this backup?')){S=o;save();draw()}}catch{alert('Not a valid Resume Studio backup.')}}
const V={profile,builder,library,tracker,settings};
function draw(){$('#nav').innerHTML=Object.keys(V).map(k=>`<button class="${k==view?'on':''}" onclick="go('${k}')">${k[0].toUpperCase()+k.slice(1)}</button>`).join('');$('#main').innerHTML=V[view]()}
const go=v=>{sync();view=v;draw()};draw();
