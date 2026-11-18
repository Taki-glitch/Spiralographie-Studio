(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const canvas = $("artCanvas"), ctx = canvas.getContext("2d");
  const SIZE = 1000, C = SIZE/2, R = 465;
  const state = { image:null, style:"single", paths:[], original:false, rendering:false, renderToken:0 };
  const defaults = {turns:38,density:72,line:11,fidelity:80,rotation:0,centerX:0,centerY:0,softness:25,detail:55,edges:55,ink:"#171923",paper:"#f5f1e9",invert:false,fitMode:"cover"};
  const styleNames = {single:"SPIRALE CONTINUE",ripple:"ONDES CONCENTRIQUES",guilloche:"GUILLOCHÉ",topo:"TOPOGRAPHIE",radial:"RAYONNEMENT",woven:"ENTRELACS",contour:"COURBES ORGANIQUES",multi:"SPIRALES MULTICENTRIQUES"};
  const rangeIds = ["turns","density","line","fidelity","rotation","centerX","centerY","softness","detail","edges"];
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  let renderTimer = null;

  function updateLabels(){
    $("turnsVal").value=$("turns").value;
    $("densityVal").value=$("density").value;
    $("lineVal").value=(+$("line").value/10).toFixed(1);
    $("fidelityVal").value=$("fidelity").value;
    $("rotationVal").value=$("rotation").value+"°";
    $("centerXVal").value=$("centerX").value;
    $("centerYVal").value=$("centerY").value;
    $("softnessVal").value=$("softness").value;
    $("detailVal").value=$("detail").value;
    $("edgesVal").value=$("edges").value;
  }
  function scheduleRender(){updateLabels();if(state.image){clearTimeout(renderTimer);renderTimer=setTimeout(render,180);}}
  rangeIds.forEach(id=>$(id).addEventListener("input",scheduleRender));
  ["ink","paper","invert","fitMode"].forEach(id=>$(id).addEventListener("change",scheduleRender));

  function loadImage(img){state.image=img;state.original=false;$("empty").hidden=true;$("compareBtn").disabled=false;$("status").textContent="Image chargée · prête à créer";render();}
  function fileToImage(file){
    if(!file || !file.type.startsWith("image/")){alert("Choisissez un fichier image valide.");return;}
    if(file.size>30*1024*1024){alert("Image trop volumineuse (maximum 30 Mo). Réduisez-la avant importation.");return;}
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{loadImage(img);URL.revokeObjectURL(url);};
    img.onerror=()=>{URL.revokeObjectURL(url);alert("Cette image n'a pas pu être ouverte.");};
    img.src=url;
  }
  $("fileInput").addEventListener("change",e=>fileToImage(e.target.files[0]));
  const drop=$("dropzone");
  ["dragenter","dragover"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add("drag");}));
  ["dragleave","drop"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove("drag");}));
  drop.addEventListener("drop",e=>fileToImage(e.dataTransfer.files[0]));

  $("sampleBtn").onclick=()=>{
    const c=document.createElement("canvas");c.width=c.height=700;const x=c.getContext("2d");
    const g=x.createLinearGradient(0,0,700,700);g.addColorStop(0,"#d8c4ad");g.addColorStop(1,"#625c61");x.fillStyle=g;x.fillRect(0,0,700,700);
    x.fillStyle="#28252b";x.beginPath();x.ellipse(350,345,205,270,0,0,Math.PI*2);x.fill();
    x.fillStyle="#c99e7c";x.beginPath();x.ellipse(350,365,160,218,0,0,Math.PI*2);x.fill();
    x.fillStyle="#322b2c";x.beginPath();x.ellipse(292,340,22,12,0,0,Math.PI*2);x.ellipse(408,340,22,12,0,0,Math.PI*2);x.fill();
    x.strokeStyle="#4c3034";x.lineWidth=10;x.beginPath();x.moveTo(350,350);x.lineTo(335,405);x.lineTo(365,408);x.stroke();
    x.strokeStyle="#753e43";x.lineWidth=8;x.beginPath();x.arc(350,448,48,.2,Math.PI-.2);x.stroke();
    x.fillStyle="#252329";x.beginPath();x.ellipse(350,235,135,85,0,Math.PI,Math.PI*2);x.fill();
    const img=new Image();img.onload=()=>loadImage(img);img.src=c.toDataURL("image/png");
  };
  $("removeBtn").onclick=()=>{state.image=null;state.paths=[];state.original=false;ctx.clearRect(0,0,SIZE,SIZE);$("empty").hidden=false;$("status").textContent="En attente d'une image";$("compareBtn").disabled=true;$("pngBtn").disabled=$("svgBtn").disabled=$("pltBtn").disabled=true;$("metaCurves").textContent="0 tracé";$("fileInput").value="";};
  $("styleList").addEventListener("click",e=>{const b=e.target.closest("[data-style]");if(!b)return;state.style=b.dataset.style;document.querySelectorAll(".style-option").forEach(el=>el.classList.toggle("selected",el===b));$("metaStyle").textContent=styleNames[state.style];if(state.image)render();});
  $("resetBtn").onclick=()=>{Object.entries(defaults).forEach(([k,v])=>{const el=$(k);if(!el)return;if(el.type==="checkbox")el.checked=v;else el.value=v;});updateLabels();if(state.image)render();};
  $("generateBtn").onclick=()=>{if(!state.image){$("fileInput").click();return;}render();};
  $("compareBtn").onclick=()=>{if(!state.image)return;state.original=!state.original;if(state.original){drawOriginal();$("compareBtn").textContent="Voir la création";$("status").textContent="Photographie originale";}else{paintPaths();$("compareBtn").textContent="Voir l'original";$("status").textContent="Aperçu de votre création";}};
  $("fullscreenBtn").onclick=()=>{const el=$("artboard");if(!document.fullscreenElement)el.requestFullscreen?.();else document.exitFullscreen?.();};
  $("helpBtn").onclick=()=>$("helpDialog").showModal();

  function imageSampler(){
    const tmp=document.createElement("canvas");tmp.width=tmp.height=600;const t=tmp.getContext("2d",{willReadFrequently:true});
    const iw=state.image.naturalWidth||state.image.width,ih=state.image.naturalHeight||state.image.height;
    const mode=$("fitMode").value,scale=mode==="cover"?Math.max(600/iw,600/ih):Math.min(600/iw,600/ih);
    const dw=iw*scale,dh=ih*scale;t.fillStyle="#fff";t.fillRect(0,0,600,600);t.drawImage(state.image,(600-dw)/2,(600-dh)/2,dw,dh);
    const d=t.getImageData(0,0,600,600).data,gray=new Float32Array(360000),soft=+$("softness").value/100;
    for(let i=0,j=0;i<d.length;i+=4,j++)gray[j]=(0.299*d[i]+0.587*d[i+1]+0.114*d[i+2])/255;
    // A small box blur reduces noisy detail without needing external libraries.
    if(soft>.02){const copy=gray.slice(),rad=soft>.7?2:1;for(let y=rad;y<600-rad;y++)for(let x=rad;x<600-rad;x++){let sum=0,n=0;for(let yy=-rad;yy<=rad;yy++)for(let xx=-rad;xx<=rad;xx++){sum+=copy[(y+yy)*600+x+xx];n++;}gray[y*600+x]=sum/n;}}
    const sampler=(x,y)=>{const ix=clamp(Math.round((x/SIZE+.5)*599),0,599),iy=clamp(Math.round((y/SIZE+.5)*599),0,599);let v=gray[iy*600+ix];if($("invert").checked)v=1-v;return v;};sampler.gray=gray;return sampler;
  }
  const polar=(r,a)=>[C+(+$("centerX").value||0)+r*Math.cos(a),C+(+$("centerY").value||0)+r*Math.sin(a)];
  function buildPaths(){
    const sample=imageSampler(),turns=+$("turns").value,density=+$("density").value/100,fidelity=+$("fidelity").value/100,rot=+$("rotation").value*Math.PI/180;
    const width=+$("line").value/10,paths=[];
    const add=(points,w=width,opacity=1)=>{if(points.length>1)paths.push({points,width:w,opacity});};
    const thetaMax=turns*Math.PI*2,steps=Math.max(9000,turns*430);
    if(state.style==="single"){
      const pts=[];for(let i=0;i<=steps;i++){const t=i/steps,a=t*thetaMax+rot,r=5+(R-5)*t,[x,y]=polar(r,a),lum=sample(x-C,y-C);const contrast=(.5-lum)*2;const warped=r+contrast*density*fidelity*22*Math.sin(t*thetaMax*.17);pts.push(polar(warped,a));}add(pts,width);
    }
    if(state.style==="ripple"||state.style==="topo"){
      const count=Math.round(turns*(state.style==="topo"?2.1:1.65)),per=Math.max(260,Math.round(steps/count));
      for(let k=0;k<count;k++){const pts=[],base=10+(R-10)*(k/count);for(let j=0;j<=per;j++){const a=j/per*Math.PI*2+rot;const [x,y]=polar(base,a),lum=sample(x-C,y-C),dark=1-lum;const modulation=(dark-.35)*density*fidelity*(state.style==="topo"?29:19);const ripple=state.style==="topo"?Math.sin(a*3+k*.07)*2.5:Math.sin(a*5+k*.15)*1.8;pts.push(polar(base+modulation+ripple,a));}add(pts,width*(.65+.5*(1-k/count)),.85);}
    }
    if(state.style==="guilloche"){
      const count=Math.max(3,Math.round(4+density*10)),ptsPer=Math.max(250,Math.round(steps/count));
      for(let arm=0;arm<count;arm++){const pts=[];for(let i=0;i<=ptsPer;i++){const t=i/ptsPer,a=t*thetaMax+rot+arm*2*Math.PI/count,r=R*t,[x,y]=polar(r,a),lum=sample(x-C,y-C),mod=(.5-lum)*density*fidelity*24;const guill=Math.sin(a*2+arm*.8)*5+Math.sin(a*7)*2;pts.push(polar(r+mod+guill,a));}add(pts,width*.58,.9);}
    }
    if(state.style==="woven"){
      for(let arm=0;arm<2;arm++){const pts=[];for(let i=0;i<=steps;i++){const t=i/steps,a=t*thetaMax+rot+arm*Math.PI,r=5+(R-5)*t,[x,y]=polar(r,a),lum=sample(x-C,y-C);pts.push(polar(r+(1-lum-.5)*density*fidelity*28,a));}add(pts,width*.82,.9);}
    }
    if(state.style==="radial"){
      const rays=Math.round(75+density*145),per=Math.round(95+turns*1.5);
      for(let k=0;k<rays;k++){const pts=[],base=k/rays*Math.PI*2+rot;for(let j=0;j<=per;j++){const t=j/per,r=R*t,[x,y]=polar(r,base),lum=sample(x-C,y-C),bend=(.5-lum)*density*fidelity*38*Math.sin(t*thetaMax*.28);pts.push(polar(r+bend,base+Math.sin(t*thetaMax)*.014));}add(pts,width*.52,.88);}
    }
    if(state.style==="contour"){
      const count=Math.round(25+turns*1.4),per=480;
      for(let k=0;k<count;k++){const pts=[],base=12+(R-12)*k/count;for(let j=0;j<=per;j++){const a=j/per*Math.PI*2+rot,[x,y]=polar(base,a),lum=sample(x-C,y-C),d=(.5-lum)*density*fidelity*35;const organic=Math.sin(a*2.3+k*.23)*4+Math.cos(a*5-k*.11)*2;pts.push(polar(base+d+organic,a));}add(pts,width*.72,.9);}
    }
    if(state.style==="multi"){
      const centres=[[-112,-62],[112,-62],[0,112]],localR=315,localSteps=Math.max(5200,turns*300);
      centres.forEach(([ox,oy],idx)=>{const pts=[];for(let i=0;i<=localSteps;i++){const t=i/localSteps,a=t*thetaMax+rot+idx*2.094,r=4+(localR-4)*t,[x,y]=polar(r,a),lum=sample(x-C-ox,y-C-oy),warp=(.5-lum)*density*fidelity*24*Math.sin(t*thetaMax*.14);pts.push([C+ox+r*Math.cos(a)+warp*Math.cos(a),C+oy+r*Math.sin(a)+warp*Math.sin(a)]);}add(pts,width*.78,.92);});
    }
    return paths;
  }
  function paintPaths(){
    const bg=$("paper").value,ink=$("ink").value;ctx.clearRect(0,0,SIZE,SIZE);ctx.fillStyle=bg;ctx.fillRect(0,0,SIZE,SIZE);ctx.strokeStyle=ink;ctx.lineCap="round";ctx.lineJoin="round";
    for(const p of state.paths){const pts=p.points;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.globalAlpha=p.opacity;ctx.lineWidth=p.width;ctx.stroke();}
    ctx.globalAlpha=1;
  }
  function drawOriginal(){
    ctx.fillStyle=$("paper").value;ctx.fillRect(0,0,SIZE,SIZE);
    const iw=state.image.naturalWidth||state.image.width,ih=state.image.naturalHeight||state.image.height,scale=$("fitMode").value==="cover"?Math.max(SIZE/iw,SIZE/ih):Math.min(SIZE/iw,SIZE/ih);
    const dw=iw*scale,dh=ih*scale;ctx.drawImage(state.image,(SIZE-dw)/2,(SIZE-dh)/2,dw,dh);
  }
  let spiralWorker=null;
  function getWorker(){
    if(!("Worker" in window)) return null;
    if(!spiralWorker){try{spiralWorker=new Worker("spiral-worker.js");}catch(e){console.warn("Worker indisponible",e);return null;}}
    return spiralWorker;
  }
  function buildPathsInWorker(){
    const sample=imageSampler();
    // Annule le calcul précédent : un seul rendu actif à la fois.
    if(spiralWorker){spiralWorker.terminate();spiralWorker=null;}
    const worker=getWorker();
    if(!worker) return Promise.resolve(buildPaths());
    const settings={};[...rangeIds,"invert"].forEach(id=>{const el=$(id);settings[id]=el.type==="checkbox"?el.checked:el.value;});
    const gray=sample.gray;
    return new Promise((resolve,reject)=>{
      const onMessage=e=>{cleanup();if(e.data.error)reject(new Error(e.data.error));else resolve(e.data.paths);};
      const onError=e=>{cleanup();reject(e.error||new Error("Erreur du moteur de calcul"));};
      const cleanup=()=>{worker.removeEventListener("message",onMessage);worker.removeEventListener("error",onError);};
      worker.addEventListener("message",onMessage,{once:true});worker.addEventListener("error",onError,{once:true});
      worker.postMessage({gray,width:600,height:600,settings,style:state.style});
    });
  }
  function render(){
    if(!state.image)return;
    const token=++state.renderToken;
    $("busy").classList.add("visible");$("status").textContent="Calcul des courbes en arrière-plan…";state.rendering=true;
    setTimeout(async()=>{
      if(token!==state.renderToken)return;
      try{
        const nextPaths=await buildPathsInWorker();
        if(token!==state.renderToken)return;
        state.paths=nextPaths;paintPaths();state.original=false;
        $("compareBtn").textContent="Voir l'original";$("status").textContent="Création terminée · moteur V4";
        $("metaStyle").textContent=styleNames[state.style];
        const points=state.paths.reduce((n,p)=>n+p.points.length,0);
        $("metaCurves").textContent=state.paths.length.toLocaleString("fr-FR")+" tracé(s) · "+points.toLocaleString("fr-FR")+" points";
        $("pngBtn").disabled=$("svgBtn").disabled=$("pltBtn").disabled=false;
      }catch(err){console.error(err);$("status").textContent="Erreur de génération";alert("Le rendu a rencontré un problème. Essaie de réduire le nombre de tours ou la taille de l'image.");}
      finally{if(token===state.renderToken){$("busy").classList.remove("visible");state.rendering=false;}}
    },10);
  }
  function svgString(){
    const ink=$("ink").value,bg=$("paper").value;
    const paths=state.paths.map(p=>{let d="";p.points.forEach((pt,i)=>{d+=(i?" L ":"M ")+pt[0].toFixed(2)+" "+pt[1].toFixed(2);});return `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${p.width.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" opacity="${p.opacity}"/>`;}).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="4000" viewBox="0 0 ${SIZE} ${SIZE}"><rect width="${SIZE}" height="${SIZE}" fill="${bg}"/>${paths}</svg>`;
  }
  $("svgBtn").onclick=()=>{if(!state.paths.length)return;const blob=new Blob([svgString()],{type:"image/svg+xml;charset=utf-8"});downloadBlob(blob,"spiralographie-studio-v5.svg");};
  $("pngBtn").onclick=()=>{
    if(!state.paths.length)return;const res=+$("resolution").value;
    const out=document.createElement("canvas");out.width=out.height=res;const ox=out.getContext("2d");ox.scale(res/SIZE,res/SIZE);ox.fillStyle=$("paper").value;ox.fillRect(0,0,SIZE,SIZE);ox.strokeStyle=$("ink").value;ox.lineCap="round";ox.lineJoin="round";
    for(const p of state.paths){ox.beginPath();ox.moveTo(p.points[0][0],p.points[0][1]);for(let i=1;i<p.points.length;i++)ox.lineTo(p.points[i][0],p.points[i][1]);ox.globalAlpha=p.opacity;ox.lineWidth=p.width;ox.stroke();}ox.globalAlpha=1;
    out.toBlob(blob=>{if(blob)downloadBlob(blob,`spiralographie-studio-v5-${res}px.png`);else alert("L'export PNG a échoué.");},"image/png");
  };
  function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}

  // HPGL/PLT export for pen plotters. Coordinates are mapped to a 40,000-unit square.
  $("pltBtn").onclick=()=>{
    if(!state.paths.length)return;
    const scale=40,commands=["IN;","SP1;"];
    for(const path of state.paths){
      const pts=path.points;if(pts.length<2)continue;
      const xy=pt=>`${Math.round(clamp(pt[0],0,SIZE)*scale)},${Math.round(clamp(pt[1],0,SIZE)*scale)}`;
      commands.push(`PU${xy(pts[0])};`);
      for(let start=1;start<pts.length;start+=400){commands.push(`PD${pts.slice(start,start+400).map(xy).join(",")};`);}
      commands.push("PU;");
    }
    commands.push("SP0;",";\n");downloadBlob(new Blob([commands.join("\n")],{type:"application/vnd.hp-hpgl"}),"spiralographie-studio-v5.plt");
  };

  const presets={
    portrait:{style:"single",turns:48,density:82,line:9,fidelity:92,rotation:0,centerX:0,centerY:0,softness:34},
    paysage:{style:"topo",turns:34,density:68,line:7,fidelity:78,rotation:0,centerX:0,centerY:12,softness:42},
    fin:{style:"guilloche",turns:56,density:55,line:4,fidelity:88,rotation:0,centerX:0,centerY:0,softness:18},
    detail:{style:"multi",turns:42,density:78,line:8,fidelity:96,rotation:0,centerX:0,centerY:0,softness:22,detail:82,edges:88}
  };
  function applySettings(values){
    Object.entries(values).forEach(([key,value])=>{if(key==="style"){state.style=value;return;}const el=$(key);if(!el)return;if(el.type==="checkbox")el.checked=!!value;else el.value=value;});
    document.querySelectorAll(".style-option").forEach(el=>el.classList.toggle("selected",el.dataset.style===state.style));
    $("metaStyle").textContent=styleNames[state.style];updateLabels();if(state.image)render();
  }
  document.querySelectorAll("[data-preset]").forEach(btn=>btn.addEventListener("click",()=>applySettings(presets[btn.dataset.preset])));
  $("saveSettingsBtn").onclick=()=>{
    const values={style:state.style};Object.keys(defaults).forEach(key=>{const el=$(key);values[key]=el.type==="checkbox"?el.checked:el.value;});
    try{localStorage.setItem("spiralographie-studio-v5-settings",JSON.stringify(values));$("status").textContent="Réglages enregistrés sur cet appareil";}
    catch(err){alert("Le navigateur ne permet pas d'enregistrer les réglages.");}
  };
  $("loadSettingsBtn").onclick=()=>{
    try{const raw=localStorage.getItem("spiralographie-studio-v5-settings");if(!raw){alert("Aucun réglage enregistré pour le moment.");return;}applySettings(JSON.parse(raw));$("status").textContent="Réglages personnels rechargés";}
    catch(err){alert("Impossible de recharger les réglages enregistrés.");}
  };
  window.addEventListener("pagehide",()=>{if(spiralWorker)spiralWorker.terminate();});
  updateLabels();
})();