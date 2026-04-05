var COL=['#e8913a','#e06c60','#2dd4a8','#58a6ff','#7ee787','#f0c040','#ff7eb3','#79c0ff','#56d4dd','#ffa657'];
var NW=200,NH=92,GR=20,BW=4000,BH=3000,MAXUNDO=60;
var STORAGE_KEY='orgchart5';
var FILE_NAME={json:'organigrama.json',png:'organigrama.png',html:'organigrama.html'};

var ID={
  btnUn:'btnUn',btnRe:'btnRe',toasts:'toasts',cw:'cw',zwrap:'zwrap',zLbl:'zLbl',board:'board',asvg:'asvg',
  pList:'pList',rList:'rList',prC:'prC',mov:'mov',mdl:'mdl',sDrop:'sDrop',sIn:'sIn',mm:'mm',gearDrop:'gearDrop',
  sidebar:'sidebar',btnLk:'btnLk',btnGr:'btnGr',btnTheme:'btnTheme',ndTip:'ndTip'
};

function el(id){return document.getElementById(id)}
function onEl(id,evt,fn,opts){el(id).addEventListener(evt,fn,opts)}
function qa(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel))}
function cssVar(name){return getComputedStyle(document.body).getPropertyValue(name).trim()}

var S={
  people:[
    {id:1,name:'Carlos Mendoza',dept:'Dirección General',roleId:1,parentId:null,x:590,y:50,collapsed:false},
    {id:2,name:'Ana Rodríguez',dept:'Servicios',roleId:2,parentId:1,x:300,y:220,collapsed:false},
    {id:3,name:'Luis Fernández',dept:'Logística',roleId:2,parentId:1,x:860,y:220,collapsed:false},
    {id:4,name:'María López',dept:'Servicios',roleId:3,parentId:2,x:140,y:400,collapsed:false},
    {id:5,name:'Pedro Sánchez',dept:'Logística',roleId:3,parentId:2,x:480,y:400,collapsed:false},
    {id:6,name:'Sofia Torres',dept:'Tecnología',roleId:3,parentId:3,x:750,y:400,collapsed:false},
    {id:7,name:'Diego Ramírez',dept:'Servicios',roleId:4,parentId:4,x:40,y:570,collapsed:false},
    {id:8,name:'Laura Martínez',dept:'Logística',roleId:5,parentId:5,x:400,y:570,collapsed:false},
    {id:9,name:'Jorge Castillo',dept:'Tecnología',roleId:5,parentId:6,x:700,y:570,collapsed:false},
    {id:10,name:'Valentina Cruz',dept:'Logística',roleId:4,parentId:3,x:980,y:400,collapsed:false},
    {id:11,name:'Andrés Morales',dept:'Logística',roleId:5,parentId:10,x:920,y:570,collapsed:false}
  ],
  roles:[
    {id:1,name:'CEO',level:1,color:null},
    {id:2,name:'Director',level:2,color:null},
    {id:3,name:'Gerente',level:3,color:null},
    {id:4,name:'Coordinador',level:4,color:null},
    {id:5,name:'Staff',level:5,color:null}
  ],
  sel:null,selIds:[],locked:false,grid:true,tab:'people',drag:null,sbOn:true,nPid:12,nRid:6,zoom:1,theme:'dark',
  shiftDown:false,shiftHoverId:null,clipboard:null,
  tip:{pendingId:null,nodeId:null,visible:false,timer:null,swapTimer:null,lastX:0,lastY:0}
};

function getSel(){return S.selIds.slice()}
function hasSel(id){return S.selIds.indexOf(id)!==-1}
function clearSel(){S.selIds=[];S.sel=null;S.shiftHoverId=null}
function setSel(ids,focusId){
  var uniq=[];
  ids.forEach(function(id){if(uniq.indexOf(id)===-1)uniq.push(id)});
  S.selIds=uniq;
  if(!uniq.length){S.sel=null;return}
  if(focusId!==undefined&&uniq.indexOf(focusId)!==-1){S.sel=focusId;return}
  S.sel=S.sel!==null&&uniq.indexOf(S.sel)!==-1?S.sel:uniq[0];
}
function selNode(id){setSel([id],id);render()}
function isEditableTarget(t){return !!(t&&t.closest&&t.closest('input,textarea,select,[contenteditable="true"],.nn[contenteditable="true"]'))}
function canCoexistInSel(id,selIds){
  return !selIds.some(function(sid){return sid===id||isDes(sid,id)||isDes(id,sid)})
}
function toggleSelNode(id){
  var ids=getSel();
  if(hasSel(id)){setSel(ids.filter(function(x){return x!==id}));return true}
  if(!canCoexistInSel(id,ids))return false;
  ids.push(id);setSel(ids,id);return true;
}
function copyBaseName(name){return String(name||'').replace(/\s+\(copia(?:\s+\d+)?\)$/i,'').trim()}
function nextCopyName(name,taken){
  var base=copyBaseName(name)||'Sin nombre';
  var i=1;
  var candidate=base+' (copia)';
  while(taken.has(candidate)){i++;candidate=base+' (copia '+i+')'}
  taken.add(candidate);
  return candidate;
}
function getCanvasVisiblePoint(){
  var cw=el(ID.cw);
  return{x:(cw.scrollLeft+cw.clientWidth/2)/S.zoom,y:(cw.scrollTop+cw.clientHeight/2)/S.zoom}
}
function hasCoarsePointer(){return window.matchMedia('(hover: none), (pointer: coarse)').matches}
function clearTipTimer(){if(S.tip.timer){clearTimeout(S.tip.timer);S.tip.timer=null}}
function clearTipSwapTimer(){if(S.tip.swapTimer){clearTimeout(S.tip.swapTimer);S.tip.swapTimer=null}}
function isTipExcludedTarget(t){return !!(t&&t.closest&&t.closest('.nab,.na,.ncol,.nn'))}
function isAnyNodeEditing(){return !!document.querySelector('.nn[contenteditable="true"]')}
function canShowTipNow(id){
  if(hasCoarsePointer()||S.drag||isAnyNodeEditing())return false;
  if(!el(ID.mov).classList.contains('hid'))return false;
  var hov=document.elementFromPoint(S.tip.lastX,S.tip.lastY);
  if(!hov)return false;
  var nd=hov.closest('.nd');
  if(!nd||+nd.dataset.id!==id)return false;
  if(isTipExcludedTarget(hov))return false;
  return true;
}
function buildTipHtml(id){
  var p=S.people.find(function(x){return x.id===id});
  if(!p)return '';
  var parent=p.parentId!==null?S.people.find(function(x){return x.id===p.parentId}):null;
  var parentName=parent?parent.name:'Ninguno';
  var kids=ch(id).length;
  var desc=cntD(id);
  var colText=p.collapsed?'Contraído ('+desc+' ocultos)':'';
  return '<div class="nd-tip-sec">'+
      '<div class="nd-tip-row nd-tip-name" title="'+esc(p.name)+'">'+esc(p.name)+'</div>'+
      (p.dept?'<div class="nd-tip-row nd-tip-muted" title="'+esc(p.dept)+'">'+esc(p.dept)+'</div>':'')+
      '<div class="nd-tip-row" title="'+esc(rNm(p.roleId))+'">'+esc(rNm(p.roleId))+'</div>'+
    '</div>'+
    '<div class="nd-tip-div"></div>'+
    '<div class="nd-tip-sec">'+
      '<div class="nd-tip-row nd-tip-muted" title="'+esc(parentName)+'">Reporta a: '+esc(parentName)+'</div>'+
      '<div class="nd-tip-row nd-tip-fg2">Subordinados directos: '+kids+'</div>'+
      '<div class="nd-tip-row nd-tip-fg2">Total descendientes: '+desc+'</div>'+
      (p.collapsed?'<div class="nd-tip-row nd-tip-err">'+colText+'</div>':'')+
    '</div>';
}
function updateTipPosition(){
  if(!S.tip.visible||S.tip.nodeId===null)return;
  var tip=el(ID.ndTip);
  var nd=document.querySelector('.nd[data-id="'+S.tip.nodeId+'"]');
  if(!tip||!nd){hideTip(true);return}
  var nr=nd.getBoundingClientRect();
  tip.style.visibility='hidden';
  tip.classList.remove('hid');
  var tw=Math.min(240,tip.offsetWidth||240),th=tip.offsetHeight||90;
  var cx=nr.left+nr.width/2;
  var x=Math.round(cx-tw/2);
  var minX=8,maxX=Math.max(8,window.innerWidth-tw-8);
  x=Math.max(minX,Math.min(maxX,x));
  var y=Math.max(8,Math.round(nr.top-th-20));
  var arrowX=Math.max(12,Math.min(tw-12,Math.round(cx-x)));
  tip.style.left=x+'px';
  tip.style.top=y+'px';
  tip.style.maxWidth='240px';
  tip.style.setProperty('--nd-tip-arrow-x',arrowX+'px');
  tip.style.visibility='visible';
}
function showTip(id,swap){
  var tip=el(ID.ndTip);
  if(!tip)return;
  clearTipTimer();
  clearTipSwapTimer();
  S.tip.pendingId=null;
  var apply=function(){
    tip.innerHTML=buildTipHtml(id);
    S.tip.nodeId=id;
    S.tip.visible=true;
    tip.classList.remove('hid');
    updateTipPosition();
  };
  if(swap&&S.tip.visible&&S.tip.nodeId!==null){
    tip.classList.add('swap');
    S.tip.swapTimer=setTimeout(function(){apply();requestAnimationFrame(function(){tip.classList.remove('swap')})},25);
    return;
  }
  tip.classList.remove('swap');
  apply();
}
function hideTip(force){
  var tip=el(ID.ndTip);
  clearTipTimer();
  clearTipSwapTimer();
  S.tip.pendingId=null;
  if(force){S.tip.nodeId=null;S.tip.visible=false}
  if(!tip)return;
  tip.classList.add('hid');
  tip.classList.remove('swap');
}
function startTipDelay(id,cx,cy){
  S.tip.lastX=cx;S.tip.lastY=cy;
  clearTipTimer();
  S.tip.pendingId=id;
  S.tip.timer=setTimeout(function(){
    S.tip.timer=null;
    if(S.tip.pendingId!==id)return;
    if(!canShowTipNow(id))return;
    showTip(id,S.tip.visible&&S.tip.nodeId!==id);
  },400);
}

/* ===== UNDO / REDO ===== */
var uStack=[],rStack=[];
function snapState(){return JSON.stringify({p:S.people,r:S.roles,np:S.nPid,nr:S.nRid})}
function pushU(){uStack.push(snapState());if(uStack.length>MAXUNDO)uStack.shift();rStack=[];uBtn()}
function undo(){if(!uStack.length)return;rStack.push(snapState());var s=JSON.parse(uStack.pop());S.people=s.p;S.roles=s.r;S.nPid=s.np;S.nRid=s.nr;clearSel();render();toast('Deshacer','in')}
function redo(){if(!rStack.length)return;uStack.push(snapState());var s=JSON.parse(rStack.pop());S.people=s.p;S.roles=s.r;S.nPid=s.np;S.nRid=s.nr;clearSel();render();toast('Rehacer','in')}
function uBtn(){el(ID.btnUn).disabled=!uStack.length;el(ID.btnRe).disabled=!rStack.length}

/* ===== GUARDAR / CARGAR ===== */
function autoSave(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({p:S.people,r:S.roles,np:S.nPid,nr:S.nRid,z:S.zoom,g:S.grid,l:S.locked,t:S.theme}))}catch(e){}}
function autoLoad(){
  try{
    var d=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(!d)return false;
    if(d.t==='light'||d.t==='dark')S.theme=d.t;
    if(d&&d.p&&d.p.length){
      S.people=d.p.map(function(p){if(p.collapsed===undefined)p.collapsed=false;if(p.dept===undefined)p.dept='';return p});
      S.roles=(d.r||S.roles).map(function(r){if(r.color===undefined)r.color=null;return r});
      S.nPid=d.np||S.nPid;
      S.nRid=d.nr||S.nRid;
      if(d.z)S.zoom=d.z;
      if(d.g!==undefined)S.grid=d.g;
      if(d.l!==undefined)S.locked=d.l;
      return true;
    }
  }catch(e){}
  return false;
}
function exportJSON(){var d=JSON.stringify({people:S.people,roles:S.roles},null,2);var b=new Blob([d],{type:'application/json'});var a=document.createElement('a');a.download=FILE_NAME.json;a.href=URL.createObjectURL(b);a.click();URL.revokeObjectURL(a.href);toast('JSON descargado','ok')}
function importJSON(){var inp=document.createElement('input');inp.type='file';inp.accept='.json';inp.onchange=function(e){var f=e.target.files[0];if(!f)return;var rd=new FileReader();rd.onload=function(ev){try{var d=JSON.parse(ev.target.result);if(!d.people||!d.roles)throw new Error('Formato inválido');pushU();S.people=d.people.map(function(p){if(p.collapsed===undefined)p.collapsed=false;if(p.dept===undefined)p.dept='';return p});S.roles=d.roles.map(function(r){if(r.color===undefined)r.color=null;return r});S.nPid=Math.max.apply(null,S.people.map(function(p){return p.id}))+1;S.nRid=Math.max.apply(null,S.roles.map(function(r){return r.id}))+1;clearSel();render();setTimeout(fitView,80);toast('Datos importados','ok')}catch(err){toast('Error: '+err.message,'er')}};rd.readAsText(f)};inp.click()}

/* ===== UTILIDADES ===== */
function rCol(rid){var r=S.roles.find(function(x){return x.id===rid});if(!r)return '#6e7a8a';return r.color||COL[(r.level-1)%COL.length]}
function rNm(rid){var r=S.roles.find(function(x){return x.id===rid});return r?r.name:'Sin rol'}
function rLv(rid){var r=S.roles.find(function(x){return x.id===rid});return r?r.level:99}
function ch(pid){return S.people.filter(function(p){return p.parentId===pid})}
function snp(v){return Math.round(v/GR)*GR}
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function isDes(a,d){var c=d;while(c!==null){if(c===a)return true;var p=S.people.find(function(x){return x.id===c});c=p?p.parentId:null}return false}
function cntD(id){var c=0;(function w(pid){c++;ch(pid).forEach(function(x){w(x.id)})})(id);return c-1}
function toast(m,t){t=t||'in';var c=el(ID.toasts),e=document.createElement('div');var ic=t==='ok'?'fa-check-circle':t==='er'?'fa-exclamation-circle':'fa-info-circle';e.className='toast '+t;e.innerHTML='<i class="fa-solid '+ic+'"></i>'+m;c.appendChild(e);setTimeout(function(){e.classList.add('out');setTimeout(function(){e.remove()},250)},2200)}

/* ===== TEMA ===== */
function setTheme(theme,quiet){
  S.theme=theme==='light'?'light':'dark';
  document.body.classList.toggle('light',S.theme==='light');
  updateThemeButton();
  updMarkerTheme();
  dMM();
  if(!quiet)toast(S.theme==='light'?'Tema claro activado':'Tema oscuro activado','in');
  autoSave();
}
function toggleTheme(){setTheme(S.theme==='dark'?'light':'dark',false)}
function updateThemeButton(){
  var btn=el(ID.btnTheme);
  if(!btn)return;
  var isLight=S.theme==='light';
  btn.innerHTML=isLight?'<i class="fa-solid fa-sun"></i>':'<i class="fa-solid fa-moon"></i>';
  btn.title=isLight?'Cambiar a tema oscuro':'Cambiar a tema claro';
  btn.classList.toggle('on',isLight);
}
function updMarkerTheme(){
  var normal=cssVar('--arrow')||'#3d4f65';
  var hi=cssVar('--arrow-hl')||cssVar('--acc')||'#e8913a';
  var p1=document.querySelector('#ah polygon');
  var p2=document.querySelector('#ahl polygon');
  if(p1)p1.setAttribute('fill',normal);
  if(p2)p2.setAttribute('fill',hi);
}

/* ===== VISIBILIDAD ===== */
function isVis(pid){var p=S.people.find(function(x){return x.id===pid});if(!p)return false;if(p.parentId===null)return true;var par=S.people.find(function(x){return x.id===p.parentId});if(!par)return true;if(par.collapsed)return false;return isVis(par.id)}
function toggleCol(id){pushU();var p=S.people.find(function(x){return x.id===id});if(!p)return;p.collapsed=!p.collapsed;render();toast(p.collapsed?'Rama contraída':'Rama expandida','in')}

/* ===== ZOOM ===== */
function setZoom(z,cx,cy){z=Math.max(0.15,Math.min(3,z));var cw=el(ID.cw);if(cx===undefined){cx=cw.scrollLeft+cw.clientWidth/2;cy=cw.scrollTop+cw.clientHeight/2}var bx=cx/S.zoom,by=cy/S.zoom;S.zoom=z;uZW();cw.scrollLeft=bx*z-cw.clientWidth/2;cw.scrollTop=by*z-cw.clientHeight/2;dMM();uZL()}
function uZW(){var w=el(ID.zwrap);w.style.width=(BW*S.zoom)+'px';w.style.height=(BH*S.zoom)+'px';el(ID.board).style.transform='scale('+S.zoom+')'}
function uZL(){el(ID.zLbl).textContent=Math.round(S.zoom*100)+'%'}
function m2b(cx,cy){var cw=el(ID.cw),r=cw.getBoundingClientRect();return{x:(cx-r.left+cw.scrollLeft)/S.zoom,y:(cy-r.top+cw.scrollTop)/S.zoom}}
function fitView(){var vis=S.people.filter(function(p){return isVis(p.id)});if(!vis.length)return;var x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity;vis.forEach(function(p){x1=Math.min(x1,p.x);y1=Math.min(y1,p.y);x2=Math.max(x2,p.x+NW);y2=Math.max(y2,p.y+NH)});var cw=el(ID.cw),pad=60;var zx=(cw.clientWidth-pad*2)/(x2-x1),zy=(cw.clientHeight-pad*2)/(y2-y1);var z=Math.min(zx,zy,1.5);z=Math.max(0.2,z);var ccx=(x1+x2)/2,ccy=(y1+y2)/2;S.zoom=z;uZW();cw.scrollLeft=ccx*z-cw.clientWidth/2;cw.scrollTop=ccy*z-cw.clientHeight/2;dMM();uZL()}

/* ===== FLECHAS PEINE ===== */
function addLn(svg,x1,y1,x2,y2,cls,mk){var p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d','M'+x1+' '+y1+' L'+x2+' '+y2);p.setAttribute('class',cls);if(mk)p.setAttribute('marker-end',mk);svg.appendChild(p)}
function rArrows(){
  var svg=el(ID.asvg);qa('path',svg).forEach(function(p){p.remove()});
  var groups={};
  S.people.forEach(function(p){if(p.parentId===null||!isVis(p.id)||!isVis(p.parentId))return;if(!groups[p.parentId])groups[p.parentId]=[];groups[p.parentId].push(p)});
  Object.keys(groups).forEach(function(pid){
    var parent=S.people.find(function(x){return x.id===+pid});var kids=groups[pid];
    if(!parent||!kids.length)return;kids.sort(function(a,b){return a.x-b.x});
    var px=parent.x+NW/2,py=parent.y+NH,minCY=Math.min.apply(null,kids.map(function(k){return k.y})),midY=py+(minCY-py)/2;
    var hl=hasSel(parent.id)||kids.some(function(k){return hasSel(k.id)});var cls=hl?'awl hl':'awl',mk=hl?'url(#ahl)':'url(#ah)';
    addLn(svg,px,py,px,midY,cls,null);
    if(kids.length===1){var kx=kids[0].x+NW/2;if(kx!==px)addLn(svg,px,midY,kx,midY,cls,null);addLn(svg,kx,midY,kx,kids[0].y,cls,mk)}
    else{var lx=kids[0].x+NW/2,rx=kids[kids.length-1].x+NW/2;addLn(svg,lx,midY,rx,midY,cls,null);kids.forEach(function(k){addLn(svg,k.x+NW/2,midY,k.x+NW/2,k.y,cls,mk)})}
  });
}

/* ===== RENDER ===== */
function render(){rNodes();rArrows();rSide();uTB();autoSave();dMM();syncTipAfterRender()}

function syncTipAfterRender(){
  if(!S.tip.visible)return;
  if(S.drag||!el(ID.mov).classList.contains('hid')||isAnyNodeEditing()){hideTip(true);return}
  var nd=document.querySelector('.nd[data-id="'+S.tip.nodeId+'"]');
  if(!nd){hideTip(true);return}
  updateTipPosition();
}

function rNodes(){
  var b=el(ID.board);qa('.nd',b).forEach(function(n){n.remove()});
  var srch=getSrch();
  S.people.forEach(function(p){
    if(!isVis(p.id))return;
    var col=rCol(p.roleId),rn=rNm(p.roleId),sel=hasSel(p.id),lk=S.locked,kids=ch(p.id),desc=cntD(p.id);
    var hint=S.shiftDown&&S.shiftHoverId===p.id&&!sel&&canCoexistInSel(p.id,getSel());
    var n=document.createElement('div');n.className='nd'+(sel?' sel':'')+(hint?' sel-hint':'')+(lk?' lk':'')+((srch&&srch.indexOf(p.id)!==-1)?' srh':'');
    n.setAttribute('data-id',p.id);n.style.left=p.x+'px';n.style.top=p.y+'px';
    var h='<div class="ns" style="background:'+col+'"></div><div class="nb">'+
      '<span class="nn" contenteditable="false">'+esc(p.name)+'</span>'+
      (p.dept?'<span class="ndept"><i class="fa-solid fa-building"></i>'+esc(p.dept)+'</span>':'')+
      '<span class="nrb" style="background:'+col+'1a;color:'+col+'">'+esc(rn)+'</span>'+
    '</div><div class="na"><button class="nab add-sub" title="Agregar subordinado"><i class="fa-solid fa-plus"></i> Sub</button><button class="nab dg del-n" title="Eliminar"><i class="fa-solid fa-trash"></i></button></div>';
    if(kids.length>0){h+='<div class="ncol" data-id="'+p.id+'" title="'+(p.collapsed?'Expandir':'Contraer')+'"><i class="fa-solid fa-chevron-'+(p.collapsed?'down':'up')+'"></i>';if(p.collapsed&&desc>0)h+='<span class="ncnt">'+desc+'</span>';h+='</div>'}
    n.innerHTML=h;
    n.addEventListener('mousedown',function(e){ndDown(e,p.id)});n.addEventListener('touchstart',function(e){ndTouch(e,p.id)},{passive:false});n.addEventListener('dblclick',function(e){ndDbl(e,p.id)});
    n.addEventListener('mouseenter',function(e){ndEnter(e,p.id)});
    n.addEventListener('mousemove',function(e){ndMove(e,p.id)});
    n.addEventListener('mouseleave',function(e){ndLeave(e,p.id)});
    n.querySelector('.add-sub').addEventListener('click',function(e){e.stopPropagation();openChild(p.id)});
    n.querySelector('.del-n').addEventListener('click',function(e){e.stopPropagation();delP(p.id)});
    var colBtn=n.querySelector('.ncol');if(colBtn)colBtn.addEventListener('click',function(e){e.stopPropagation();toggleCol(p.id)});
    b.appendChild(n);
  });
}

/* ===== SIDEBAR ===== */
function rSide(){qa('.sp').forEach(function(p){p.classList.remove('on')});el('p-'+S.tab).classList.add('on');if(S.tab==='people')rPeople();else if(S.tab==='roles')rRoles();else rProps()}
function rPeople(){
  var list=el(ID.pList);
  if(!S.people.length){list.innerHTML='<div class="pe"><i class="fa-solid fa-users"></i><p>Sin personas registradas</p></div>';return}
  var sorted=S.people.slice().sort(function(a,b){return rLv(a.roleId)-rLv(b.roleId)||a.name.localeCompare(b.name)});
  list.innerHTML=sorted.map(function(p){
    var col=rCol(p.roleId),vis=isVis(p.id);
    var sub=p.dept?' · '+esc(p.dept):'';
    return '<div class="pi'+(hasSel(p.id)?' sel':'')+'" data-id="'+p.id+'" style="opacity:'+(vis?1:.45)+'"><div class="pid" style="background:'+col+'"></div><div class="pii"><div class="pin">'+esc(p.name)+'</div><div class="pir">'+esc(rNm(p.roleId))+sub+(p.collapsed?' (contraído)':'')+'</div></div><button class="pix" data-id="'+p.id+'"><i class="fa-solid fa-xmark"></i></button></div>';
  }).join('');
  qa('.pi',list).forEach(function(i){i.addEventListener('click',function(e){if(e.target.closest('.pix'))return;selNode(+i.dataset.id);scrollTo(+i.dataset.id)})});
  qa('.pix',list).forEach(function(b){b.addEventListener('click',function(e){e.stopPropagation();delP(+b.dataset.id)})});
}

function rRoles(){
  var list=el(ID.rList);var sorted=S.roles.slice().sort(function(a,b){return a.level-b.level});
  list.innerHTML=sorted.map(function(r){
    var col=r.color||COL[(r.level-1)%COL.length],cnt=S.people.filter(function(p){return p.roleId===r.id}).length;
    var hasCustom=r.color!==null&&r.color!==undefined;
    return '<div class="ri" data-id="'+r.id+'"><span class="ril">'+r.level+'</span><input type="color" class="ricol" value="'+col+'" data-id="'+r.id+'" title="Cambiar color">'+(hasCustom?'<button class="rireset" data-id="'+r.id+'" title="Restaurar color"><i class="fa-solid fa-rotate-left"></i></button>':'<span style="width:14px;flex-shrink:0"></span>')+'<span class="rin" style="color:'+col+'">'+esc(r.name)+'</span><span class="ric">'+cnt+'</span><button class="rix" data-id="'+r.id+'"><i class="fa-solid fa-xmark"></i></button></div>';
  }).join('');
  qa('.ricol',list).forEach(function(inp){inp.addEventListener('input',function(e){pushU();var r=S.roles.find(function(x){return x.id===+e.target.dataset.id});if(r){r.color=e.target.value;render()}})});
  qa('.rireset',list).forEach(function(btn){btn.addEventListener('click',function(e){e.stopPropagation();pushU();var r=S.roles.find(function(x){return x.id===+e.target.dataset.id});if(r){r.color=null;render();toast('Color restaurado','in')}})});
  qa('.rix',list).forEach(function(b){b.addEventListener('click',function(){delR(+b.dataset.id)})});
}

function rProps(){
  var props=el(ID.prC);
  if(!S.selIds.length){props.innerHTML='<div class="pe"><i class="fa-solid fa-mouse-pointer"></i><p>Selecciona un nodo para ver sus propiedades</p></div>';return}
  if(S.selIds.length!==1){props.innerHTML='<div class="pe"><i class="fa-solid fa-layer-group"></i><p>Selección múltiple activa</p><p style="font-size:11px;margin-top:6px">Selecciona un solo nodo para editar propiedades.</p></div>';return}
  var p=S.people.find(function(x){return x.id===S.sel});
  if(!p){props.innerHTML='<div class="pe"><i class="fa-solid fa-mouse-pointer"></i><p>Selecciona un nodo</p></div>';return}
  var pOpts=S.people.filter(function(x){return x.id!==p.id&&!isDes(p.id,x.id)}).map(function(x){return '<option value="'+x.id+'"'+(x.id===p.parentId?' selected':'')+'>'+esc(x.name)+'</option>'}).join('');
  var rOpts=S.roles.slice().sort(function(a,b){return a.level-b.level}).map(function(r){return '<option value="'+r.id+'"'+(r.id===p.roleId?' selected':'')+'>'+esc(r.name)+' (Nv '+r.level+')</option>'}).join('');
  var kids=ch(p.id),desc=cntD(p.id);
  props.innerHTML=
    '<div class="fg"><label class="fl">Nombre</label><input type="text" class="fi" id="prN" value="'+esc(p.name)+'"></div>'+
    '<div class="fg"><label class="fl">Departamento / Área</label><input type="text" class="fi" id="prD" value="'+esc(p.dept||'')+'" placeholder="Ej: Recursos Humanos"></div>'+
    '<div class="fg"><label class="fl">Cargo (Rol jerárquico)</label><select class="fs" id="prR">'+rOpts+'</select></div>'+
    '<div class="fg"><label class="fl">Reporta a</label><select class="fs" id="prP"><option value="">Ninguno (raíz)</option>'+pOpts+'</select></div>'+
    '<div class="fg"><label class="fl">Posición (x, y)</label><div style="display:flex;gap:4px"><input type="number" class="fi" id="prX" value="'+p.x+'" style="flex:1"><input type="number" class="fi" id="prY" value="'+p.y+'" style="flex:1"></div></div>'+
    (kids.length>0?'<div class="fg"><label class="fl">Colapsar rama</label><button class="btn" style="width:100%" id="prCol"><i class="fa-solid fa-'+(p.collapsed?'chevron-down':'chevron-up')+'"></i> '+(p.collapsed?'Expandir ('+desc+' ocultos)':'Contraer ('+desc+' descendientes)')+'</button></div>':'')+
    '<div class="ps">Info</div><div style="font-size:11px;color:var(--mut);line-height:1.8"><div>Subordinados directos: <strong style="color:var(--fg)">'+kids.length+'</strong></div><div>Total descendientes: <strong style="color:var(--fg)">'+desc+'</strong></div></div>'+
    '<div style="margin-top:12px"><button class="btn btn-dng" style="width:100%" id="prDel"><i class="fa-solid fa-trash"></i> Eliminar persona</button></div>';

  var nameEd=false,deptEd=false;
  el('prN').addEventListener('focus',function(){if(!nameEd){pushU();nameEd=true}});
  el('prN').addEventListener('input',function(e){p.name=e.target.value||p.name;rNodes();rArrows();rPeople()});
  el('prD').addEventListener('focus',function(){if(!deptEd){pushU();deptEd=true}});
  el('prD').addEventListener('input',function(e){p.dept=e.target.value;rNodes();rArrows();rPeople()});
  el('prR').addEventListener('mousedown',function(){pushU()});
  el('prR').addEventListener('change',function(e){p.roleId=+e.target.value;render()});
  el('prP').addEventListener('mousedown',function(){pushU()});
  el('prP').addEventListener('change',function(e){p.parentId=e.target.value?+e.target.value:null;render()});
  el('prX').addEventListener('focus',function(){pushU()});
  el('prX').addEventListener('change',function(e){p.x=+e.target.value||0;rNodes();rArrows()});
  el('prY').addEventListener('focus',function(){pushU()});
  el('prY').addEventListener('change',function(e){p.y=+e.target.value||0;rNodes();rArrows()});
  var colBtn=el('prCol');if(colBtn)colBtn.addEventListener('click',function(){toggleCol(p.id)});
  el('prDel').addEventListener('click',function(){delP(p.id)});
}
function uTB(){var lb=el(ID.btnLk),gb=el(ID.btnGr);lb.innerHTML=S.locked?'<i class="fa-solid fa-lock"></i>':'<i class="fa-solid fa-lock-open"></i>';lb.classList.toggle('on',S.locked);gb.classList.toggle('on',S.grid);var b=el(ID.board);b.classList.toggle('gon',S.grid);b.classList.toggle('goff',!S.grid)}

/* ===== INTERACCIONES NODOS ===== */
function ndEnter(e,id){
  if(S.shiftDown&&!isAnyNodeEditing()&&S.shiftHoverId!==id){S.shiftHoverId=id;rNodes()}
  if(S.drag||isTipExcludedTarget(e.target)){hideTip(true);return}
  if(S.tip.visible&&S.tip.nodeId!==id){
    S.tip.lastX=e.clientX;S.tip.lastY=e.clientY;
    if(canShowTipNow(id))showTip(id,true);
    return;
  }
  startTipDelay(id,e.clientX,e.clientY);
}
function ndMove(e,id){
  var prevX=S.tip.lastX,prevY=S.tip.lastY;
  S.tip.lastX=e.clientX;S.tip.lastY=e.clientY;
  if(S.drag||isTipExcludedTarget(e.target)||isAnyNodeEditing()||!el(ID.mov).classList.contains('hid')){
    if(S.tip.pendingId===id)clearTipTimer();
    if(S.tip.visible&&S.tip.nodeId===id)hideTip(true);
    return;
  }
  if(S.tip.visible&&S.tip.nodeId===id){updateTipPosition();return}
  if(S.tip.visible&&S.tip.nodeId!==id){showTip(id,true);return}
  if(S.tip.pendingId!==id){startTipDelay(id,e.clientX,e.clientY);return}
  if(Math.abs(e.clientX-prevX)>2||Math.abs(e.clientY-prevY)>2)startTipDelay(id,e.clientX,e.clientY)
}
function ndLeave(e,id){
  S.tip.lastX=e.clientX;S.tip.lastY=e.clientY;
  if(S.shiftHoverId===id){S.shiftHoverId=null;rNodes()}
  if(S.tip.pendingId===id)clearTipTimer();
  var hov=document.elementFromPoint(S.tip.lastX,S.tip.lastY);
  var nextNd=hov&&hov.closest?hov.closest('.nd'):null;
  if(nextNd&&+nextNd.dataset.id!==id)return;
  if(S.tip.visible&&S.tip.nodeId===id)hideTip(true);
}
function scrollTo(id){var p=S.people.find(function(x){return x.id===id});if(!p)return;var cw=el(ID.cw);cw.scrollTo({left:p.x*S.zoom-cw.clientWidth/2+NW*S.zoom/2,top:p.y*S.zoom-cw.clientHeight/2+NH*S.zoom/2,behavior:'smooth'})}
function ndDown(e,id){
  if(e.target.closest('.nab')||e.target.closest('.nn[contenteditable="true"]')||e.target.closest('.ncol'))return;
  if(isEditableTarget(e.target))return;
  hideTip(true);
  e.preventDefault();
  if(e.shiftKey){
    if(!toggleSelNode(id))toast('No se puede seleccionar un nodo y su ancestro/descendiente','er');
    render();
    return;
  }
  if(S.locked){
    if(!hasSel(id)||S.selIds.length!==1){setSel([id],id);render()}
    return;
  }
  if(!hasSel(id)||S.selIds.length===0){setSel([id],id);render()}
  else if(S.selIds.length>1&&hasSel(id)){setSel(getSel(),id)}
  var lead=S.people.find(function(x){return x.id===id});
  if(!lead)return;
  var pos=m2b(e.clientX,e.clientY);
  var ids=hasSel(id)?getSel():[id];
  var start={};
  ids.forEach(function(pid){var p=S.people.find(function(x){return x.id===pid});if(p)start[pid]={x:p.x,y:p.y}});
  S.drag={id:id,ids:ids,start:start,ox:pos.x-lead.x,oy:pos.y-lead.y,moved:false,undoPushed:false};
  var leadNd=document.querySelector('.nd[data-id="'+id+'"]');
  if(leadNd)leadNd.classList.add('drg');
  ids.forEach(function(pid){if(pid===id)return;var nd=document.querySelector('.nd[data-id="'+pid+'"]');if(nd)nd.classList.add('grp-drg')});
}
function ndTouch(e,id){if(S.locked)return;e.preventDefault();if(!hasSel(id)||S.selIds.length!==1){setSel([id],id);render()}var t=e.touches[0],p=S.people.find(function(x){return x.id===id}),pos=m2b(t.clientX,t.clientY);if(!p)return;S.drag={id:id,ids:getSel(),start:(function(){var s={};getSel().forEach(function(pid){var pp=S.people.find(function(x){return x.id===pid});if(pp)s[pid]={x:pp.x,y:pp.y}});return s})(),ox:pos.x-p.x,oy:pos.y-p.y,moved:false,undoPushed:false};var leadNd=document.querySelector('.nd[data-id="'+id+'"]');if(leadNd)leadNd.classList.add('drg')}
function onMov(cx,cy){
  if(!S.drag)return;
  hideTip(true);
  var lead=S.people.find(function(x){return x.id===S.drag.id});
  if(!lead)return;
  var pos=m2b(cx,cy),nx=pos.x-S.drag.ox,ny=pos.y-S.drag.oy;
  nx=Math.max(0,Math.min(BW-NW,nx));ny=Math.max(0,Math.min(BH-NH,ny));
  if(S.grid){nx=snp(nx);ny=snp(ny)}
  var leadStart=S.drag.start[S.drag.id];
  if(!leadStart)return;
  var dx=nx-leadStart.x,dy=ny-leadStart.y;
  var minDx=-Infinity,maxDx=Infinity,minDy=-Infinity,maxDy=Infinity;
  S.drag.ids.forEach(function(pid){
    var st=S.drag.start[pid];if(!st)return;
    minDx=Math.max(minDx,-st.x);
    maxDx=Math.min(maxDx,BW-NW-st.x);
    minDy=Math.max(minDy,-st.y);
    maxDy=Math.min(maxDy,BH-NH-st.y);
  });
  dx=Math.max(minDx,Math.min(maxDx,dx));
  dy=Math.max(minDy,Math.min(maxDy,dy));
  if(!S.drag.moved&&(dx!==0||dy!==0)){
    if(!S.drag.undoPushed){pushU();S.drag.undoPushed=true}
    S.drag.moved=true;
  }
  S.drag.ids.forEach(function(pid){
    var p=S.people.find(function(x){return x.id===pid});
    var st=S.drag.start[pid];
    if(!p||!st)return;
    p.x=st.x+dx;p.y=st.y+dy;
    var nd=document.querySelector('.nd[data-id="'+pid+'"]');
    if(nd){nd.style.left=p.x+'px';nd.style.top=p.y+'px'}
  });
  rArrows();sMM();
}
function onUp(){
  if(!S.drag)return;
  var dragRef=S.drag;
  var leadNd=document.querySelector('.nd[data-id="'+S.drag.id+'"]');
  if(leadNd)leadNd.classList.remove('drg');
  S.drag.ids.forEach(function(pid){if(pid===S.drag.id)return;var nd=document.querySelector('.nd[data-id="'+pid+'"]');if(nd)nd.classList.remove('grp-drg')});
  S.drag=null;
  if(!dragRef.moved&&dragRef.ids.length>1){setSel([dragRef.id],dragRef.id);render();return}
  dMM();if(S.tab==='props'&&S.sel)rProps()
}
document.addEventListener('mousemove',function(e){onMov(e.clientX,e.clientY)});document.addEventListener('mouseup',onUp);
document.addEventListener('touchmove',function(e){if(S.drag){e.preventDefault();onMov(e.touches[0].clientX,e.touches[0].clientY)}},{passive:false});document.addEventListener('touchend',onUp);
function ndDbl(e,id){hideTip(true);e.stopPropagation();pushU();var nd=e.target.closest('.nd'),nm=nd.querySelector('.nn');nm.contentEditable='true';nm.focus();var rng=document.createRange();rng.selectNodeContents(nm);var sel=window.getSelection();sel.removeAllRanges();sel.addRange(rng);function done(){nm.contentEditable='false';var p=S.people.find(function(x){return x.id===id});if(p){p.name=nm.textContent.trim()||p.name;nm.textContent=p.name;rPeople();if(S.tab==='props')rProps()}nm.removeEventListener('blur',done);nm.removeEventListener('keydown',kh)}function kh(ev){if(ev.key==='Enter'){ev.preventDefault();nm.blur()}if(ev.key==='Escape'){var p=S.people.find(function(x){return x.id===id});nm.textContent=p.name;nm.blur()}}nm.addEventListener('blur',done);nm.addEventListener('keydown',kh)}
el(ID.board).addEventListener('click',function(e){if(e.target.id==='board'||e.target.closest('#asvg')){hideTip(true);clearSel();render()}});

/* ===== ELIMINACIÓN INTELIGENTE ===== */
function delP(id){
  var p=S.people.find(function(x){return x.id===id});if(!p)return;
  var kids=ch(id);
  if(kids.length===0){pushU();S.people=S.people.filter(function(x){return x.id!==id});setSel(getSel().filter(function(x){return x!==id}));render();toast('Persona eliminada','in');return}
  var parentName=p.parentId?S.people.find(function(x){return x.id===p.parentId}):null;
  var parentStr=parentName?'<strong>'+esc(parentName.name)+'</strong>':'la raíz del organigrama';
  var gpid=p.parentId,totalDesc=cntD(id)+1;
  showDelModal('Eliminar nodo',
    '<div class="mdesc"><strong>'+esc(p.name)+'</strong> tiene <strong>'+kids.length+'</strong> subordinado'+(kids.length>1?'s':'')+' <span class="warn">('+(totalDesc-1)+' persona'+((totalDesc-1)!==1?'s':'')+' en total)</span>.</div><div class="mdesc">¿Qué deseas hacer con sus subordinados?</div>',
    function(){pushU();S.people=S.people.filter(function(x){return x.id!==id});S.people.forEach(function(x){if(x.parentId===id)x.parentId=gpid});setSel(getSel().filter(function(x){return x!==id}));render();toast(kids.length+' subordinado'+(kids.length>1?'s':'')+' reconectad'+(kids.length>1?'os':'o')+' a '+parentStr,'ok')},
    function(){pushU();var del=new Set();(function w(pid){del.add(pid);ch(pid).forEach(function(c){w(c.id)})})(id);S.people=S.people.filter(function(x){return!del.has(x.id)});setSel(getSel().filter(function(x){return!del.has(x)}));render();toast(totalDesc+' persona'+(totalDesc!==1?'s':'')+' eliminada'+(totalDesc!==1?'s':''),'in')}
  );
}
function showDelModal(title,desc,onRecon,onDelete){
  hideTip(true);
  var ov=el(ID.mov),m=el(ID.mdl);
  m.innerHTML='<div class="mt">'+title+'</div>'+desc+'<div class="ma"><button class="btn" id="mC">Cancelar</button><button class="btn btn-dng" id="mD">Eliminar rama</button><button class="btn btn-warn" id="mR">Reconectar al padre</button></div>';
  ov.classList.remove('hid');
  el('mC').onclick=function(){ov.classList.add('hid')};
  el('mD').onclick=function(){ov.classList.add('hid');onDelete()};
  el('mR').onclick=function(){ov.classList.add('hid');onRecon()};
}

/* ===== CRUD PERSONAS ===== */
function openAdd(){
  if(!S.roles.length){toast('Agrega al menos un rol primero','er');return}
  var rOpts=S.roles.slice().sort(function(a,b){return a.level-b.level}).map(function(r){return '<option value="'+r.id+'">'+esc(r.name)+' (Nv '+r.level+')</option>'}).join('');
  var pOpts=S.people.map(function(p){return '<option value="'+p.id+'">'+esc(p.name)+'</option>'}).join('');
  showMdl('Agregar Persona',
    '<div class="fg"><label class="fl">Nombre</label><input type="text" class="fi" id="mN" placeholder="Nombre completo"></div>'+
    '<div class="fg"><label class="fl">Departamento / Área</label><input type="text" class="fi" id="mD" placeholder="Ej: Recursos Humanos"></div>'+
    '<div class="fg"><label class="fl">Cargo (Rol jerárquico)</label><select class="fs" id="mR">'+rOpts+'</select></div>'+
    '<div class="fg"><label class="fl">Reporta a</label><select class="fs" id="mP"><option value="">Ninguno (raíz)</option>'+pOpts+'</select></div>',
    function(){var n=el('mN').value.trim();if(!n){toast('Nombre obligatorio','er');return false}pushU();addP(n,(el('mD').value||'').trim(),+el('mR').value,el('mP').value?+el('mP').value:null);return true});
}
function openChild(pid){
  if(!S.roles.length){toast('Agrega al menos un rol primero','er');return}
  var par=S.people.find(function(x){return x.id===pid});if(!par)return;
  var rOpts=S.roles.slice().sort(function(a,b){return a.level-b.level}).map(function(r){return '<option value="'+r.id+'">'+esc(r.name)+' (Nv '+r.level+')</option>'}).join('');
  var sug=S.roles.find(function(r){return r.level===rLv(pid)+1}),sugId=sug?sug.id:S.roles[S.roles.length-1].id;
  showMdl('Subordinado de '+esc(par.name),
    '<div class="fg"><label class="fl">Nombre</label><input type="text" class="fi" id="mN" placeholder="Nombre completo"></div>'+
    '<div class="fg"><label class="fl">Departamento / Área</label><input type="text" class="fi" id="mD" placeholder="Ej: Recursos Humanos" value="'+esc(par.dept||'')+'"></div>'+
    '<div class="fg"><label class="fl">Cargo (Rol jerárquico)</label><select class="fs" id="mR">'+rOpts+'</select></div>',
    function(){var n=el('mN').value.trim();if(!n){toast('Nombre obligatorio','er');return false}pushU();var cc=ch(pid).length;addP(n,(el('mD').value||'').trim(),+el('mR').value,pid,par.x+cc*220,par.y+180);return true},sugId);
}
function addP(name,dept,roleId,parentId,x,y){if(x===undefined)x=400;if(y===undefined)y=100;S.people.push({id:S.nPid++,name:name,dept:dept||'',roleId:roleId,parentId:parentId,x:x,y:y,collapsed:false});render();toast(name+' agregado','ok')}

/* ===== CRUD ROLES ===== */
function addR(name,level){pushU();S.roles.push({id:S.nRid++,name:name,level:Math.max(1,+level),color:null});render();toast('Rol "'+name+'" creado','ok')}
function delR(id){if(S.people.some(function(p){return p.roleId===id})){toast('No se puede: hay personas con este rol','er');return}pushU();S.roles=S.roles.filter(function(r){return r.id!==id});render();toast('Rol eliminado','in')}

/* ===== MODAL ===== */
function showMdl(title,html,onOk,defR){
  hideTip(true);
  var ov=el(ID.mov),m=el(ID.mdl);
  m.innerHTML='<div class="mt">'+title+'</div>'+html+'<div class="ma"><button class="btn" id="mCan">Cancelar</button><button class="btn btn-a" id="mOk">Confirmar</button></div>';
  ov.classList.remove('hid');if(defR){var sel=el('mR');if(sel)sel.value=defR}
  setTimeout(function(){var inp=el('mN');if(inp)inp.focus()},50);
  el('mCan').onclick=function(){ov.classList.add('hid')};
  el('mOk').onclick=function(){if(onOk())ov.classList.add('hid')};
  var inp=el('mN');if(inp)inp.addEventListener('keydown',function(e){if(e.key==='Enter')el('mOk').click()});
}
function showConfirmDeleteModal(title,desc,onOk){
  hideTip(true);
  var ov=el(ID.mov),m=el(ID.mdl);
  m.innerHTML='<div class="mt">'+title+'</div><div class="mdesc">'+desc+'</div><div class="ma"><button class="btn" id="mCan">Cancelar</button><button class="btn btn-dng" id="mOk">Eliminar</button></div>';
  ov.classList.remove('hid');
  el('mCan').onclick=function(){ov.classList.add('hid')};
  el('mOk').onclick=function(){ov.classList.add('hid');onOk()};
}
function copySelection(){
  var ids=getSel();
  if(!ids.length)return;
  var nodes=ids.map(function(id){return S.people.find(function(p){return p.id===id})}).filter(Boolean);
  if(!nodes.length)return;
  var pids=[];
  nodes.forEach(function(n){if(pids.indexOf(n.parentId)===-1)pids.push(n.parentId)});
  var sourceParentId=pids.length===1?pids[0]:null;
  var ref={x:0,y:0};
  if(sourceParentId!==null){
    var parent=S.people.find(function(p){return p.id===sourceParentId});
    if(parent)ref={x:parent.x,y:parent.y};
  }else{
    ref={x:Math.min.apply(null,nodes.map(function(n){return n.x})),y:Math.min.apply(null,nodes.map(function(n){return n.y}))};
  }
  S.clipboard={
    copiedNodes:nodes.map(function(n){
      return{name:n.name,dept:n.dept||'',roleId:n.roleId,offsetX:n.x-ref.x,offsetY:n.y-ref.y,sourceParentId:n.parentId};
    }),
    sourceParentId:sourceParentId
  };
  toast(nodes.length+' nodo'+(nodes.length===1?'':'s')+' copiado'+(nodes.length===1?'':'s')+' al portapapeles','ok');
}
function pasteFromClipboard(targetParentId){
  if(!S.clipboard||!S.clipboard.copiedNodes||!S.clipboard.copiedNodes.length)return;
  pushU();
  var copied=S.clipboard.copiedNodes;
  var minOffX=Math.min.apply(null,copied.map(function(n){return n.offsetX}));
  var minOffY=Math.min.apply(null,copied.map(function(n){return n.offsetY}));
  var anchor=getCanvasVisiblePoint();
  if(targetParentId!==null){
    var parent=S.people.find(function(p){return p.id===targetParentId});
    if(parent){
      if(parent.collapsed)parent.collapsed=false;
      anchor={x:parent.x+40,y:parent.y+160};
    }
  }
  var taken=new Set(S.people.map(function(p){return p.name}));
  var created=[];
  copied.forEach(function(n){
    var x=Math.max(0,Math.min(BW-NW,anchor.x+(n.offsetX-minOffX)));
    var y=Math.max(0,Math.min(BH-NH,anchor.y+(n.offsetY-minOffY)));
    if(S.grid){x=snp(x);y=snp(y)}
    var id=S.nPid++;
    S.people.push({id:id,name:nextCopyName(n.name,taken),dept:n.dept||'',roleId:n.roleId,parentId:targetParentId,x:x,y:y,collapsed:false});
    created.push(id);
  });
  setSel(created,created[0]);
  render();
  toast(created.length+' nodo'+(created.length===1?'':'s')+' pegado'+(created.length===1?'':'s'),'ok');
}
function openPasteModal(){
  hideTip(true);
  if(!S.clipboard||!S.clipboard.copiedNodes||!S.clipboard.copiedNodes.length)return;
  var target=S.selIds.length===1?S.people.find(function(p){return p.id===S.selIds[0]}):null;
  var ov=el(ID.mov),m=el(ID.mdl);
  var underBtn=target?'<button class="btn btn-a" id="mPasteUnder">Pegar bajo '+esc(target.name)+'</button>':'';
  m.innerHTML='<div class="mt">Pegar nodos</div><div class="mdesc">Elige dónde crear los nodos copiados.</div><div class="ma"><button class="btn" id="mCan">Cancelar</button><button class="btn" id="mPasteRoot">Pegar en raíz</button>'+underBtn+'</div>';
  ov.classList.remove('hid');
  el('mCan').onclick=function(){ov.classList.add('hid')};
  el('mPasteRoot').onclick=function(){ov.classList.add('hid');pasteFromClipboard(null)};
  if(target){el('mPasteUnder').onclick=function(){ov.classList.add('hid');pasteFromClipboard(target.id)}}
}
function findSurvivorParent(pid,selectedSet){
  var cur=pid;
  while(cur!==null&&selectedSet.has(cur)){
    var np=S.people.find(function(p){return p.id===cur});
    cur=np?np.parentId:null;
  }
  return cur;
}
function deleteSelectionFlat(ids){
  var set=new Set(ids);
  pushU();
  S.people=S.people.filter(function(p){return !set.has(p.id)});
  setSel(getSel().filter(function(id){return !set.has(id)}));
  render();
  toast(ids.length+' persona'+(ids.length===1?'':'s')+' eliminada'+(ids.length===1?'':'s'),'in');
}
function deleteSelectionReconnect(ids){
  var set=new Set(ids);
  pushU();
  S.people.forEach(function(p){if(!set.has(p.id)&&set.has(p.parentId))p.parentId=findSurvivorParent(p.parentId,set)});
  S.people=S.people.filter(function(p){return !set.has(p.id)});
  setSel(getSel().filter(function(id){return !set.has(id)}));
  render();
  toast(ids.length+' nodo'+(ids.length===1?'':'s')+' eliminado'+(ids.length===1?'':'s')+' y subordinados reconectados','ok');
}
function deleteSelectionBranch(ids){
  var del=new Set();
  function walk(pid){del.add(pid);ch(pid).forEach(function(c){walk(c.id)})}
  ids.forEach(function(id){walk(id)});
  pushU();
  S.people=S.people.filter(function(p){return !del.has(p.id)});
  setSel(getSel().filter(function(id){return !del.has(id)}));
  render();
  toast(del.size+' persona'+(del.size===1?'':'s')+' eliminada'+(del.size===1?'':'s'),'in');
}
function deleteSelection(){
  var ids=getSel();
  if(!ids.length)return;
  if(ids.length===1){delP(ids[0]);return}
  var set=new Set(ids);
  var hasChildren=ids.some(function(id){return ch(id).some(function(k){return !set.has(k.id)})});
  if(hasChildren){
    showDelModal('Eliminar selección',
      '<div class="mdesc">Se eliminarán <strong>'+ids.length+'</strong> nodos seleccionados. ¿Qué deseas hacer con sus subordinados?</div>',
      function(){deleteSelectionReconnect(ids)},
      function(){deleteSelectionBranch(ids)}
    );
    return;
  }
  if(ids.length>2){
    showConfirmDeleteModal('Eliminar selección','Se eliminarán <strong>'+ids.length+'</strong> nodos seleccionados.',function(){deleteSelectionFlat(ids)});
    return;
  }
  deleteSelectionFlat(ids);
}
onEl(ID.mov,'click',function(e){if(e.target.id==='mov')e.target.classList.add('hid')});
document.addEventListener('keydown',function(e){
  var modalOpen=!el(ID.mov).classList.contains('hid');
  if(e.key==='Shift'&&!S.shiftDown&&!isEditableTarget(e.target)&&!isAnyNodeEditing()){S.shiftDown=true;rNodes()}
  if(e.key==='Escape'){
    if(modalOpen){el(ID.mov).classList.add('hid');return}
    if(S.selIds.length){clearSel();render();return}
  }
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='p'){e.preventDefault();runOptimizedPrint();return}
  if(modalOpen)return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!isEditableTarget(e.target)){e.preventDefault();if(e.shiftKey)redo();else undo();return}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'&&!isEditableTarget(e.target)){e.preventDefault();redo();return}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'){e.preventDefault();el(ID.sIn).focus();return}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c'&&!isEditableTarget(e.target)){e.preventDefault();copySelection();return}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='v'&&!isEditableTarget(e.target)){e.preventDefault();openPasteModal();return}
  if(e.key==='Delete'&&!isEditableTarget(e.target)){e.preventDefault();deleteSelection()}
});
document.addEventListener('keyup',function(e){if(e.key==='Shift'&&S.shiftDown&&!isAnyNodeEditing()){S.shiftDown=false;S.shiftHoverId=null;rNodes()}});

/* ===== AUTO-ORDENAR ===== */
function autoSort(){pushU();var roots=S.people.filter(function(p){return p.parentId===null});if(!roots.length)return;qa('.nd').forEach(function(n){n.classList.add('anm')});var sp=230,lh=180,sx=100,sy=60;function subW(id){var c=ch(id);return c.length?c.reduce(function(s,x){return s+subW(x.id)},0):sp}function lay(id,cx,y){var p=S.people.find(function(x){return x.id===id});if(!p)return;p.x=cx-NW/2;p.y=y;var c=ch(id);if(!c.length)return;var tw=subW(id),cur=cx-tw/2;c.forEach(function(x){var w=subW(x.id);lay(x.id,cur+w/2,y+lh);cur+=w})}var xo=sx;roots.forEach(function(r){var w=subW(r.id);lay(r.id,xo+w/2,sy);xo+=w+60});rNodes();rArrows();setTimeout(function(){qa('.nd').forEach(function(n){n.classList.remove('anm')})},600);toast('Organigrama ordenado','ok')}

/* ===== BUSQUEDA ===== */
var srchIds=null;function getSrch(){return srchIds}
function doSearch(q){
  q=q.trim().toLowerCase();var drop=el(ID.sDrop);
  if(!q){srchIds=null;drop.classList.add('hid');rNodes();return}
  var matches=S.people.filter(function(p){return p.name.toLowerCase().indexOf(q)!==-1||rNm(p.roleId).toLowerCase().indexOf(q)!==-1||(p.dept||'').toLowerCase().indexOf(q)!==-1});
  srchIds=matches.map(function(p){return p.id});
  if(!matches.length){drop.innerHTML='<div class="si-empty">Sin resultados</div>';drop.classList.remove('hid');rNodes();return}
  drop.innerHTML=matches.map(function(p){var col=rCol(p.roleId);return '<div class="si" data-id="'+p.id+'"><div class="si-dot" style="background:'+col+'"></div><span>'+esc(p.name)+(p.dept?' · '+esc(p.dept):'')+'</span><span class="si-role">'+esc(rNm(p.roleId))+'</span></div>'}).join('');
  drop.classList.remove('hid');qa('.si',drop).forEach(function(i){i.addEventListener('click',function(){selNode(+i.dataset.id);scrollTo(+i.dataset.id);drop.classList.add('hid')})});rNodes();
}
onEl(ID.sIn,'input',function(e){doSearch(e.target.value)});
onEl(ID.sIn,'focus',function(){if(this.value.trim())doSearch(this.value)});
document.addEventListener('click',function(e){if(!e.target.closest('.sw')){el(ID.sDrop).classList.add('hid');if(srchIds){srchIds=null;rNodes()}}});

/* ===== MINIMAPA ===== */
var MM={mnX:0,mnY:0,sc:1,oX:0,oY:0};var mmT=null;
function sMM(){if(mmT)return;mmT=setTimeout(function(){dMM();mmT=null},40)}
function dMM(){
  var cv=el(ID.mm),ctx=cv.getContext('2d'),mw=cv.width,mh=cv.height;
  var mmBg=cssVar('--mm-bg')||'#0d1117';
  var mmEmpty=cssVar('--mm-empty')||'#3d4f65';
  var mmLine=cssVar('--mm-line')||'rgba(61,79,101,0.4)';
  var mmNodeBg=cssVar('--mm-node-bg')||'#1c2333';
  var mmViewStroke=cssVar('--mm-view-stroke')||'rgba(232,145,58,0.7)';
  var mmViewFill=cssVar('--mm-view-fill')||'rgba(232,145,58,0.04)';
  var acc=cssVar('--acc')||'#e8913a';
  ctx.clearRect(0,0,mw,mh);ctx.fillStyle=mmBg;ctx.fillRect(0,0,mw,mh);
  var vis=S.people.filter(function(p){return isVis(p.id)});
  if(!vis.length){ctx.fillStyle=mmEmpty;ctx.font='11px DM Sans';ctx.textAlign='center';ctx.fillText('Sin nodos visibles',mw/2,mh/2);return}
  var x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity;
  vis.forEach(function(p){x1=Math.min(x1,p.x);y1=Math.min(y1,p.y);x2=Math.max(x2,p.x+NW);y2=Math.max(y2,p.y+NH)});
  var pad=50;x1-=pad;y1-=pad;x2+=pad;y2+=pad;
  var bw=Math.max(x2-x1,200),bh=Math.max(y2-y1,150),sc=Math.min(mw/bw,mh/bh),oX=(mw-bw*sc)/2,oY=(mh-bh*sc)/2;
  MM.mnX=x1;MM.mnY=y1;MM.sc=sc;MM.oX=oX;MM.oY=oY;
  ctx.strokeStyle=mmLine;ctx.lineWidth=1;
  vis.forEach(function(p){if(p.parentId===null)return;var pp=vis.find(function(x){return x.id===p.parentId});if(!pp)return;var ax=oX+(pp.x+NW/2-x1)*sc,ay=oY+(pp.y+NH-y1)*sc,bx=oX+(p.x+NW/2-x1)*sc,by=oY+(p.y-y1)*sc;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke()});
  vis.forEach(function(p){var col=rCol(p.roleId),nx=oX+(p.x-x1)*sc,ny=oY+(p.y-y1)*sc,nw=NW*sc,nh=NH*sc;if(p.collapsed)ctx.globalAlpha=0.35;ctx.fillStyle=col;ctx.fillRect(nx,ny,nw,Math.max(2,3*sc));ctx.fillStyle=mmNodeBg;ctx.fillRect(nx,ny+Math.max(2,3*sc),nw,Math.max(1,nh-Math.max(2,3*sc)));ctx.globalAlpha=1;if(hasSel(p.id)){ctx.strokeStyle=acc;ctx.lineWidth=1.5;ctx.strokeRect(nx-1,ny-1,nw+2,nh+2)}});
  var cw=el(ID.cw);var vx=oX+(cw.scrollLeft/S.zoom-x1)*sc,vy=oY+(cw.scrollTop/S.zoom-y1)*sc,vw=(cw.clientWidth/S.zoom)*sc,vh=(cw.clientHeight/S.zoom)*sc;
  ctx.strokeStyle=mmViewStroke;ctx.lineWidth=1.5;ctx.strokeRect(vx,vy,vw,vh);ctx.fillStyle=mmViewFill;ctx.fillRect(vx,vy,vw,vh);
}
onEl(ID.mm,'click',function(e){var r=this.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;var bx=(mx-MM.oX)/MM.sc+MM.mnX,by=(my-MM.oY)/MM.sc+MM.mnY;var cw=el(ID.cw);cw.scrollLeft=bx*S.zoom-cw.clientWidth/2;cw.scrollTop=by*S.zoom-cw.clientHeight/2;dMM()});

/* ===== EXPORTAR PNG ===== */
async function exportPNG(){toast('Generando imagen...','in');var vis=S.people.filter(function(p){return isVis(p.id)});if(!vis.length){toast('No hay nodos visibles','er');return}var x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity;vis.forEach(function(p){x1=Math.min(x1,p.x);y1=Math.min(y1,p.y);x2=Math.max(x2,p.x+NW);y2=Math.max(y2,p.y+NH)});var pad=50,oldZ=S.zoom;var bg=cssVar('--canvas-bg')||cssVar('--bg')||'#0d1117';S.zoom=1;uZW();await new Promise(function(r){requestAnimationFrame(r)});try{var c=await html2canvas(el(ID.board),{backgroundColor:bg,x:x1-pad,y:y1-pad,width:x2-x1+pad*2,height:y2-y1+pad*2,scale:2,useCORS:true});var a=document.createElement('a');a.download=FILE_NAME.png;a.href=c.toDataURL('image/png');a.click();toast('Imagen descargada','ok')}catch(e){toast('Error al generar imagen','er');console.error(e)}S.zoom=oldZ;uZW();dMM()}

/* ===== EXPORTAR HTML ===== */
function exportHTML(){
  toast('Generando HTML...','in');
  var rj=JSON.stringify(S.roles),pj=JSON.stringify(S.people.map(function(p){return{name:p.name,dept:p.dept||'',roleId:p.roleId,parentId:p.parentId,x:p.x,y:p.y,collapsed:p.collapsed}})),cj=JSON.stringify(COL);
  var sc='<'+'/script>';
  var html='<!DOCTYPE html>\n<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Organigrama</title>\n'+
  '<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">\n'+
  '<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" rel="stylesheet">\n'+
  '<style>\n*{margin:0;padding:0;box-sizing:border-box}body{font-family:"DM Sans",sans-serif;background:#0d1117;color:#e6edf3;overflow:auto;min-height:100vh}\n'+
  '.hdr{padding:16px 24px;border-bottom:1px solid #2a3446}h1{font-family:"Space Grotesk",sans-serif;font-size:16px;color:#e8913a}\n'+
  '#board{position:relative;width:4000px;height:3000px}#svg{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none}\n'+
  '.ar{fill:none;stroke:#3d4f65;stroke-width:2}\n'+
  '.nd{position:absolute;width:200px;background:#1c2333;border:1.5px solid #2a3446;border-radius:10px;cursor:grab;user-select:none;transition:box-shadow .2s}\n'+
  '.nd:hover{border-color:#3d4f65;box-shadow:0 4px 16px rgba(0,0,0,.25)}.nd.drag{cursor:grabbing;box-shadow:0 10px 32px rgba(0,0,0,.4);transform:scale(1.03);z-index:30}\n'+
  '.ns{height:4px;border-radius:9px 9px 0 0}.nb{padding:10px 13px 8px}\n'+
  '.nn{display:block;font-family:"Space Grotesk",sans-serif;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n'+
  '.ndept{display:block;font-size:11px;color:#c0c8d4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;padding:0 3px}\n'+
  '.ndept i{font-size:9px;margin-right:3px;opacity:.6}\n'+
  '.nrb{display:inline-block;margin-top:4px;padding:1.5px 6px;border-radius:4px;font-size:10px;font-weight:600}\n'+
  '.ncol{position:absolute;bottom:-12px;left:50%;transform:translateX(-50%);width:22px;height:22px;border-radius:50%;background:#1c2333;border:1.5px solid #2a3446;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:9px;color:#6e7a8a;z-index:12}\n'+
  '.ncol:hover{background:#232e42;border-color:#e8913a;color:#e8913a}\n'+
  '.ncnt{position:absolute;top:-7px;right:-7px;background:#e8913a;color:#fff;font-size:8.5px;font-weight:700;width:17px;height:17px;border-radius:50%;display:flex;align-items:center;justify-content:center}\n'+
  '</style></head>\n<body>\n<div class="hdr"><h1>Organigrama</h1></div>\n<div id="board"><svg id="svg"><defs><marker id="ah" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#3d4f65"/></marker></defs></svg></div>\n'+
  '<script>\n'+
  'var roles='+rj+',people='+pj+',colors='+cj+',NW=200,NH=92;\n'+
  'function rc(rid){var r=roles.find(function(x){return x.id===rid});if(!r)return"#6e7a8a";return r.color||colors[(r.level-1)%colors.length]}\n'+
  'function rn(rid){var r=roles.find(function(x){return x.id===rid});return r?r.name:"Sin rol"}\n'+
  'function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}\n'+
  'function ch(pid){return people.filter(function(p){return p.parentId===pid})}\n'+
  'function cntD(id){var c=0;(function w(pid){c++;ch(pid).forEach(function(x){w(x.id)})})(id);return c-1}\n'+
  'function isVis(pid){var p=people.find(function(x){return x.id===pid});if(!p)return false;if(p.parentId===null)return true;var par=people.find(function(x){return x.id===p.parentId});if(!par)return true;if(par.collapsed)return false;return isVis(par.id)}\n'+
  'function toggleCol(id){var p=people.find(function(x){return x.id===id});if(!p)return;p.collapsed=!p.collapsed;render()}\n'+
  'function addLn(svg,x1,y1,x2,y2,cls,mk){var p=document.createElementNS("http://www.w3.org/2000/svg","path");p.setAttribute("d","M"+x1+" "+y1+" L"+x2+" "+y2);p.setAttribute("class",cls);if(mk)p.setAttribute("marker-end",mk);svg.appendChild(p)}\n'+
  'function render(){\n'+
  '  var b=document.getElementById("board");b.querySelectorAll(".nd").forEach(function(n){n.remove()});\n'+
  '  var svg=document.getElementById("svg");svg.querySelectorAll("path").forEach(function(p){p.remove()});\n'+
  '  var groups={};people.forEach(function(p){if(p.parentId===null||!isVis(p.id)||!isVis(p.parentId))return;if(!groups[p.parentId])groups[p.parentId]=[];groups[p.parentId].push(p)});\n'+
  '  Object.keys(groups).forEach(function(pid){var parent=people.find(function(x){return x.id===+pid}),kids=groups[pid];if(!parent||!kids.length)return;kids.sort(function(a,b){return a.x-b.x});var px=parent.x+NW/2,py=parent.y+NH,minCY=Math.min.apply(null,kids.map(function(k){return k.y})),midY=py+(minCY-py)/2;addLn(svg,px,py,px,midY,"ar",null);if(kids.length===1){var kx=kids[0].x+NW/2;if(kx!==px)addLn(svg,px,midY,kx,midY,"ar",null);addLn(svg,kx,midY,kx,kids[0].y,"ar","url(#ah)")}else{var lx=kids[0].x+NW/2,rx=kids[kids.length-1].x+NW/2;addLn(svg,lx,midY,rx,midY,"ar",null);kids.forEach(function(k){addLn(svg,k.x+NW/2,midY,k.x+NW/2,k.y,"ar","url(#ah)")})}});\n'+
  '  people.forEach(function(p){if(!isVis(p.id))return;var col=rc(p.roleId),rn2=rn(p.roleId),kids=ch(p.id),desc=cntD(p.id);var n=document.createElement("div");n.className="nd";n.setAttribute("data-id",p.id);n.style.left=p.x+"px";n.style.top=p.y+"px";var h=\'<div class="ns" style="background:\'+col+\'"></div><div class="nb"><span class="nn">\'+esc(p.name)+\'</span>\';if(p.dept)h+=\'<span class="ndept"><i class="fa-solid fa-building"></i>\'+esc(p.dept)+\'</span>\';h+=\'<span class="nrb" style="background:\'+col+"1a;color:"+col+\'">\'+esc(rn2)+\'</span></div>\';if(kids.length>0){h+=\'<div class="ncol" data-id="\'+p.id+\'"><i class="fa-solid fa-chevron-\'+(p.collapsed?"down":"up")+\'"></i>\';if(p.collapsed&&desc>0)h+=\'<span class="ncnt">\'+desc+\'</span>\';h+=\'</div>\'}n.innerHTML=h;n.addEventListener("mousedown",function(e){if(e.target.closest(".ncol"))return;startDrag(e,p.id)});n.addEventListener("touchstart",function(e){if(e.target.closest(".ncol"))return;startDragTouch(e,p.id)},{passive:false});var cb=n.querySelector(".ncol");if(cb)cb.addEventListener("click",function(e){e.stopPropagation();toggleCol(p.id)});b.appendChild(n)});\n'+
  '}\n'+
  'var drag=null;\n'+
  'function startDrag(e,id){e.preventDefault();var p=people.find(function(x){return x.id===id});var b=document.getElementById("board"),br=b.getBoundingClientRect();drag={id:id,ox:e.clientX-br.left-p.x,oy:e.clientY-br.top-p.y};b.querySelector(".nd[data-id=\\""+id+"\\"]").classList.add("drag")}\n'+
  'function startDragTouch(e,id){e.preventDefault();var t=e.touches[0];var p=people.find(function(x){return x.id===id});var b=document.getElementById("board"),br=b.getBoundingClientRect();drag={id:id,ox:t.clientX-br.left-p.x,oy:t.clientY-br.top-p.y};b.querySelector(".nd[data-id=\\""+id+"\\"]").classList.add("drag")}\n'+
  'function onM(cx,cy){if(!drag)return;var p=people.find(function(x){return x.id===drag.id});if(!p)return;var b=document.getElementById("board"),br=b.getBoundingClientRect();p.x=Math.max(0,Math.min(4000-NW,cx-br.left-drag.ox));p.y=Math.max(0,Math.min(3000-NH,cy-br.top-drag.oy));var el=b.querySelector(".nd[data-id=\\""+p.id+"\\"]");if(el){el.style.left=p.x+"px";el.style.top=p.y+"px"}render()}\n'+
  'function onU(){if(!drag)return;var b=document.getElementById("board");var el=b.querySelector(".nd[data-id=\\""+drag.id+"\\"]");if(el)el.classList.remove("drag");drag=null}\n'+
  'document.addEventListener("mousemove",function(e){onM(e.clientX,e.clientY)});document.addEventListener("mouseup",onU);\n'+
  'document.addEventListener("touchmove",function(e){if(drag){e.preventDefault();onM(e.touches[0].clientX,e.touches[0].clientY)}},{passive:false});document.addEventListener("touchend",onU);\n'+
  'render();\n'+sc+'\n</body></html>';
  var blob=new Blob([html],{type:'text/html'});var a=document.createElement('a');a.download=FILE_NAME.html;a.href=URL.createObjectURL(blob);a.click();URL.revokeObjectURL(a.href);toast('HTML descargado','ok');
}

/* ===== IMPRESION ===== */
var PRN={active:false};
function getVisibleBounds(){
  var vis=S.people.filter(function(p){return isVis(p.id)});
  if(!vis.length)return null;
  var x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity;
  vis.forEach(function(p){x1=Math.min(x1,p.x);y1=Math.min(y1,p.y);x2=Math.max(x2,p.x+NW);y2=Math.max(y2,p.y+NH)});
  return{x:x1,y:y1,w:x2-x1,h:y2-y1,cx:(x1+x2)/2,cy:(y1+y2)/2,count:vis.length};
}
function getPrintTitle(){
  return 'Organigrama';
}
function ensurePrintCss(){
  var css=el('print-css');
  if(css)return css;
  css=document.createElement('style');
  css.id='print-css';
  css.textContent='@page { size: landscape; margin: 12mm; }'+
  '@media print {'+
    'body.printing,body.printing.light{background:#fff!important;color:#111827!important;--fg:#111827;--fg2:#1f2937;--mut:#4b5563;--card:#ffffff;--bdr:#c5ccd6;height:auto!important;min-height:0!important;overflow:visible!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}' +
    'body.printing-large{--nw:170px!important;--nh:74px!important;}' +
    '#toolbar,#sidebar,#mmW,#toasts,#mov,#ndTip{display:none!important;}' +
    '#cw{left:0!important;overflow:visible!important;position:static!important;height:auto!important;min-height:0!important;width:100%!important;background:#fff!important;background-image:none!important;}' +
    '#zwrap{overflow:visible!important;width:100%!important;display:flex!important;justify-content:center!important;align-items:flex-start!important;}' +
    '#board{transform-origin:0 0!important;background:#fff!important;background-image:none!important;}' +
    '.nd{break-inside:avoid;box-shadow:none!important;border:1px solid #c5ccd6!important;background:#fff!important;}' +
    '.nn{color:#111827!important;font-weight:700!important;font-size:13.5px!important;}' +
    '.ndept{color:#4b5563!important;font-size:11px!important;}' +
    '.nrb{background:#e8edf3!important;color:#1f2937!important;border:1px solid #c5ccd6!important;font-size:10.5px!important;}' +
    '.ns{opacity:.95!important;}' +
    '.nd:hover,.nd.sel,.nd.srh,.nd.drg,.nd.grp-drg{box-shadow:none!important;transform:none!important;opacity:1!important;}' +
    '.na,.ncol,.ncnt{display:none!important;opacity:0!important;}' +
    'body.printing-large .ndept,body.printing-large .nrb{display:none!important;}' +
    'body.printing-large .nb{padding:8px 10px!important;}' +
    'body.printing-large .nn{font-size:14.5px!important;line-height:1.2!important;}' +
    '.awl{stroke:#374151!important;stroke-width:1.8!important;}' +
    '.print-frame,.print-label{display:none!important;}' +
  '}';
  document.head.appendChild(css);
  return css;
}
function addPrintFrame(bounds,title){
  var board=el(ID.board);
  if(!board||!bounds)return null;
  var frame=document.createElement('div');
  frame.id='print-frame';
  frame.className='print-frame';
  frame.style.left='0px';
  frame.style.top='0px';
  frame.style.width=bounds.w+'px';
  frame.style.height=bounds.h+'px';
  var label=document.createElement('div');
  label.className='print-label';
  label.textContent=title;
  frame.appendChild(label);
  board.insertBefore(frame,board.firstChild);
  return frame;
}
function runOptimizedPrint(){
  if(PRN.active)return;
  PRN.active=true;
  hideTip(true);
  el(ID.gearDrop).classList.add('hid');
  var cw=el(ID.cw);
  var board=el(ID.board);
  var zw=el(ID.zwrap);
  var prev={zoom:S.zoom,left:cw.scrollLeft,top:cw.scrollTop};
  var prevBoard={transform:board.style.transform,transformOrigin:board.style.transformOrigin,width:board.style.width,height:board.style.height};
  var prevWrap={width:zw.style.width,height:zw.style.height};
  var bounds=getVisibleBounds();
  var printBox=null;
  var largeMode=!!(bounds&&bounds.count>=45);
  if(bounds){
    var pad=largeMode?12:20;
    var fullW=bounds.w+pad*2;
    var fullH=bounds.h+pad*2;
    var tx=-bounds.x+pad;
    var ty=-bounds.y+pad;
    board.style.transformOrigin='0 0';
    board.style.transform='translate('+tx+'px,'+ty+'px)';
    board.style.width=fullW+'px';
    board.style.height=fullH+'px';
    zw.style.width=fullW+'px';
    zw.style.height=fullH+'px';
    cw.scrollLeft=0;
    cw.scrollTop=0;
    printBox={w:fullW,h:fullH};
  }
  var css=ensurePrintCss();
  document.body.classList.add('printing');
  if(largeMode)document.body.classList.add('printing-large');
  var frame=null;
  var mql=window.matchMedia('print');
  var done=false;
  function cleanup(){
    if(done)return;
    done=true;
    window.removeEventListener('afterprint',cleanup);
    if(mql.removeEventListener)mql.removeEventListener('change',mqHandler);else if(mql.removeListener)mql.removeListener(mqHandler);
    if(frame&&frame.parentNode)frame.parentNode.removeChild(frame);
    if(css&&css.parentNode)css.parentNode.removeChild(css);
    document.body.classList.remove('printing');
    document.body.classList.remove('printing-large');
    board.style.transform=prevBoard.transform;
    board.style.transformOrigin=prevBoard.transformOrigin;
    board.style.width=prevBoard.width;
    board.style.height=prevBoard.height;
    zw.style.width=prevWrap.width;
    zw.style.height=prevWrap.height;
    S.zoom=prev.zoom;uZW();
    cw.scrollLeft=prev.left;
    cw.scrollTop=prev.top;
    PRN.active=false;
  }
  function mqHandler(ev){if(!ev.matches)cleanup()}
  window.addEventListener('afterprint',cleanup);
  if(mql.addEventListener)mql.addEventListener('change',mqHandler);else if(mql.addListener)mql.addListener(mqHandler);
  setTimeout(function(){window.print()},40);
}

/* ===== GEAR DROPDOWN ===== */
onEl('btnGear','click',function(e){e.stopPropagation();el(ID.gearDrop).classList.toggle('hid')});
document.addEventListener('click',function(e){if(!e.target.closest('.tb-r'))el(ID.gearDrop).classList.add('hid')});
onEl('btnPrn','click',function(){el(ID.gearDrop).classList.add('hid');runOptimizedPrint()});
onEl('btnPng','click',function(){el(ID.gearDrop).classList.add('hid');exportPNG()});
onEl('btnHtm','click',function(){el(ID.gearDrop).classList.add('hid');exportHTML()});
onEl('btnJE','click',function(){el(ID.gearDrop).classList.add('hid');exportJSON()});
onEl('btnJI','click',function(){el(ID.gearDrop).classList.add('hid');importJSON()});

/* ===== EVENTOS ===== */
onEl('btnSb','click',function(){S.sbOn=!S.sbOn;el(ID.sidebar).classList.toggle('off',!S.sbOn);el(ID.cw).classList.toggle('ex',!S.sbOn)});
onEl('btnAdd','click',openAdd);
onEl('btnTheme','click',toggleTheme);
onEl('btnLk','click',function(){S.locked=!S.locked;render();toast(S.locked?'Layout bloqueado':'Layout desbloqueado','in')});
onEl('btnGr','click',function(){S.grid=!S.grid;render();toast(S.grid?'Cuadrícula activada':'Cuadrícula desactivada','in')});
onEl('btnSo','click',autoSort);
onEl('btnUn','click',undo);
onEl('btnRe','click',redo);
onEl('btnZM','click',function(){setZoom(S.zoom-0.15)});
onEl('btnZO','click',function(){setZoom(S.zoom+0.15)});
onEl('btnZF','click',fitView);
onEl(ID.cw,'wheel',function(e){if(e.ctrlKey||e.metaKey){e.preventDefault();var d=e.deltaY>0?-0.1:0.1;var r=el(ID.cw).getBoundingClientRect();setZoom(S.zoom+d,e.clientX-r.left,e.clientY-r.top)}},{passive:false});
onEl(ID.cw,'scroll',function(){sMM();updateTipPosition()});
qa('.stb').forEach(function(b){b.addEventListener('click',function(){S.tab=b.dataset.t;qa('.stb').forEach(function(x){x.classList.remove('on')});b.classList.add('on');rSide()})});
onEl('nrA','click',function(){var n=el('nrN').value.trim(),l=parseInt(el('nrL').value)||1;if(!n){toast('Nombre de rol obligatorio','er');return}addR(n,Math.max(1,l));el('nrN').value='';el('nrL').value='1'});
onEl('nrN','keydown',function(e){if(e.key==='Enter')el('nrA').click()});
window.addEventListener('resize',function(){dMM();updateTipPosition()});

/* ===== INICIO ===== */
var loaded=autoLoad();
setTheme(S.theme,true);
uZW();render();setTimeout(function(){fitView();if(loaded)toast('Estado restaurado','in')},80);
