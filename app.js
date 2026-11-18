(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const canvas = $("artCanvas"), ctx = canvas.getContext("2d");
  const SIZE = 1000, C = SIZE/2, R = 465;
  const state = { 
    image: null, style: "single", paths: [], original: false, rendering: false, renderToken: 0,
    colorMode: "classic", goldVariant: "champagne", gradientType: "spiral",
    enableFill: true, fillOpacity: 0.35, fillTolerance: 45, traitProtection: 20,
    selectiveAmount: 50, colorSaturation: 100, colorBrightness: 100,
    bgType: "solid", history: []
  };
  const defaults = {
    turns: 38, density: 72, line: 11, fidelity: 80, rotation: 0,
    centerX: 0, centerY: 0, softness: 25, detail: 55, edges: 55,
    ink: "#171923", paper: "#f5f1e9", invert: false, fitMode: "cover"
  };
  const styleNames = {
    single: "SPIRALE CONTINUE", ripple: "ONDES CONCENTRIQUES", guilloche: "GUILLOCHÉ",
    topo: "TOPOGRAPHIE", radial: "RAYONNEMENT", woven: "ENTRELACS", contour: "COURBES ORGANIQUES", multi: "MULTICENTRIQUE"
  };
  const rangeIds = ["turns","density","line","fidelity","rotation","centerX","centerY","softness","detail","edges","fillOpacity","fillTolerance","traitProtection","selectiveAmount","colorSaturation","colorBrightness"];
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  let renderTimer = null;

  // Gestion des onglets latéraux V6
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const target = $(`panel-${btn.dataset.tab}`);
      if(target) target.classList.add("active");
    };
  });

  function updateLabels(){
    $("turnsVal").textContent = $("turns").value;
    $("densityVal").textContent = $("density").value;
    $("lineVal").textContent = (+$("line").value/10).toFixed(1);
    $("fidelityVal").textContent = $("fidelity").value;
    $("rotationVal").textContent = $("rotation").value+"°";
    $("centerXVal").textContent = $("centerX").value;
    $("centerYVal").textContent = $("centerY").value;
    $("softnessVal").textContent = $("softness").value;
    $("detailVal").textContent = $("detail").value;
    $("edgesVal").textContent = $("edges").value;
    $("fillOpacityVal").textContent = Math.round($("fillOpacity").value)+"%";
    $("fillToleranceVal").textContent = $("fillTolerance").value;
    $("traitProtectionVal").textContent = (+$("traitProtection").value/10).toFixed(1);
    $("selectiveVal").textContent = $("selectiveAmount").value+"%";
    $("colorSaturationVal").textContent = $("colorSaturation").value+"%";
    $("colorBrightnessVal").textContent = $("colorBrightness").value+"%";
  }

  function scheduleRender(){
    updateLabels();
    if(state.image){clearTimeout(renderTimer);renderTimer=setTimeout(render,180);}
  }

  rangeIds.forEach(id => {
    const el = $(id);
    if(el) el.addEventListener("input", scheduleRender);
  });
  ["ink","paper","invert","fitMode","colorModeSelect","goldVariant","gradientType","enableFill","bgType"].forEach(id => {
    const el = $(id);
    if(el) el.addEventListener("change", () => {
      state.colorMode = $("colorModeSelect").value;
      state.goldVariant = $("goldVariant").value;
      state.gradientType = $("gradientType").value;
      state.enableFill = $("enableFill").checked;
      state.bgType = $("bgType").value;
      scheduleRender();
    });
  });

  function loadImage(img){
    state.image = img; state.original = false;
    $("empty").hidden = true;
    $("compareBtn").disabled = false;
    $("undoBtn").disabled = false;
    $("status").textContent = "Image chargée · Color Studio prêt";
    render();
  }

  function fileToImage(file){
    if(!file || !file.type.startsWith("image/")){alert("Choisissez un fichier image valide.");return;}
    if(file.size>35*1024*1024){alert("Image trop volumineuse (maximum 35 Mo).");return;}
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{loadImage(img);URL.revokeObjectURL(url);};
    img.onerror=()=>{URL.revokeObjectURL(url);alert("Impossible d'ouvrir cette image.");};
    img.src=url;
  }

  $("fileInput").addEventListener("change", e=>fileToImage(e.target.files[0]));
  const drop=$("dropzone");
  ["dragenter","dragover"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add("drag");}));
  ["dragleave","drop"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove("drag");}));
  drop.addEventListener("drop",e=>fileToImage(e.dataTransfer.files[0]));

  $("sampleBtn").onclick=()=>{
    const c=document.createElement("canvas");c.width=c.height=700;const x=c.getContext("2d");
    const g=x.createLinearGradient(0,0,700,700);g.addColorStop(0,"#d8c4ad");g.addColorStop(1,"#625c61");x.fillStyle=g;x.fillRect(0,0,700,700);
    x.fillStyle="#28252b";x.beginPath();x.ellipse(350,345,205,270,0,0,Math.PI*2);x.fill();
    x.fillStyle="#c99e7c";x.beginPath();x.ellipse(350,365,160,218,0,0,Math.PI*2);x.fill();
    const img=new Image();img.onload=()=>loadImage(img);img.src=c.toDataURL("image/png");
  };

  $("removeBtn").onclick=()=>{
    state.image=null;state.paths=[];state.original=false;ctx.clearRect(0,0,SIZE,SIZE);
    $("empty").hidden=false;$("status").textContent="En attente d'une image";
    $("compareBtn").disabled=true;$("undoBtn").disabled=true;
    $("pngBtn").disabled=$("svgBtn").disabled=$("pltBtn").disabled=$("jsonBtn").disabled=true;
    $("metaCurves").textContent="0 tracé";$("fileInput").value="";
  };

  $("styleList").addEventListener("click",e=>{
    const b=e.target.closest("[data-style]");if(!b)return;
    state.style=b.dataset.style;
    document.querySelectorAll(".style-option").forEach(el=>el.classList.toggle("selected",el===b));
    $("metaStyle").textContent=styleNames[state.style];
    if(state.image)render();
  });

  $("resetBtn").onclick=()=>{
    Object.entries(defaults).forEach(([k,v])=>{const el=$(k);if(!el)return;if(el.type==="checkbox")el.checked=v;else el.value=v;});
    $("colorModeSelect").value="classic";$("bgType").value="solid";
    updateLabels();if(state.image)render();
  };

  $("generateBtn").onclick=()=>{if(!state.image){$("fileInput").click();return;}render();};
  $("compareBtn").onclick=()=>{
    if(!state.image)return;state.original=!state.original;
    if(state.original){drawOriginal();$("compareBtn").textContent="Voir la création";$("status").textContent="Photographie originale";}
    else{paintCanvas();$("compareBtn").textContent="Voir l'original";$("status").textContent="Aperçu de la V6";}
  };

  $("fullscreenBtn").onclick=()=>{const el=$("artboard");if(!document.fullscreenElement)el.requestFullscreen?.();else document.exitFullscreen?.();};
  $("helpBtn").onclick=()=>$("helpDialog").showModal();

  // Color Studio palettes & generators
  $("randPaletteBtn").onclick=()=>{
    const palettes=[
      ["#1a2130","#d9b77e","#4a90e2","#b8e986","#f5a623"],
      ["#2d1b2d","#e056fd","#686de0","#00d2d3","#ff7979"],
      ["#0a3d62","#3c6382","#079992","#38ada8","#e55039"],
      ["#2c2c54","#474787","#aaa69d","#ff5252","#ffb142"]
    ];
    const p=palettes[Math.floor(Math.random()*palettes.length)];
    $("ink").value=p[1]; $("paper").value=p[0];
    if(state.image) render();
  };

  function imageSampler(){
    const tmp=document.createElement("canvas");tmp.width=tmp.height=600;const t=tmp.getContext("2d",{willReadFrequently:true});
    const iw=state.image.naturalWidth||state.image.width,ih=state.image.naturalHeight||state.image.height;
    const mode=$("fitMode").value,scale=mode==="cover"?Math.max(600/iw,600/ih):Math.min(600/iw,600/ih);
    const dw=iw*scale,dh=ih*scale;t.fillStyle="#fff";t.fillRect(0,0,600,600);t.drawImage(state.image,(600-dw)/2,(600-dh)/2,dw,dh);
    const imgData=t.getImageData(0,0,600,600),d=imgData.data;
    const gray=new Float32Array(360000),rgb=new Uint8ClampedArray(360000*3);
    const soft=+$("softness").value/100;
    for(let i=0,j=0;i<d.length;i+=4,j++){
      const r=d[i],g=d[i+1],b=d[i+2];
      gray[j]=(0.299*r+0.587*g+0.114*b)/255;
      rgb[j*3]=r; rgb[j*3+1]=g; rgb[j*3+2]=b;
    }
    if(soft>.02){
      const copy=gray.slice(),rad=soft>.7?2:1;
      for(let y=rad;y<600-rad;y++)for(let x=rad;x<600-rad;x++){
        let sum=0,n=0;for(let yy=-rad;yy<=rad;yy++)for(let xx=-rad;xx<=rad;xx++){sum+=copy[(y+yy)*600+x+xx];n++;}
        gray[y*600+x]=sum/n;
      }
    }
    const sampler=(x,y)=>{
      const ix=clamp(Math.round((x/SIZE+.5)*599),0,599),iy=clamp(Math.round((y/SIZE+.5)*599),0,599);
      const idx=iy*600+ix;
      let v=gray[idx];if($("invert").checked)v=1-v;
      return {v, r:rgb[idx*3], g:rgb[idx*3+1], b:rgb[idx*3+2]};
    };
    sampler.gray=gray; return sampler;
  }

  let spiralWorker=null;
  function getWorker(){
    if(!("Worker" in window))return null;
    if(!spiralWorker){try{spiralWorker=new Worker("spiral-worker.js");}catch(e){return null;}}
    return spiralWorker;
  }

  function buildPathsInWorker(){
    const sample=imageSampler();
    if(spiralWorker){spiralWorker.terminate();spiralWorker=null;}
    const worker=getWorker();
    if(!worker)return Promise.resolve([]);
    const settings={};[...rangeIds,"invert"].forEach(id=>{const el=$(id);if(el)settings[id]=el.type==="checkbox"?el.checked:el.value;});
    return new Promise((resolve,reject)=>{
      const onMessage=e=>{cleanup();if(e.data.error)reject(new Error(e.data.error));else resolve(e.data.paths);};
      const onError=e=>{cleanup();reject(e.error||new Error("Erreur Worker"));};
      const cleanup=()=>{worker.removeEventListener("message",onMessage);worker.removeEventListener("error",onError);};
      worker.addEventListener("message",onMessage,{once:true});worker.addEventListener("error",onError,{once:true});
      worker.postMessage({gray:sample.gray,width:600,height:600,settings,style:state.style});
    });
  }

  // Moteur de rendu V6 avec Color Studio & Remplissage
  function paintCanvas(){
    const bgVal=$("paper").value, inkVal=$("ink").value;
    ctx.clearRect(0,0,SIZE,SIZE);

    // Fond
    if(state.bgType==="transparent"){
      ctx.clearRect(0,0,SIZE,SIZE);
    } else if(state.bgType==="dark"){
      ctx.fillStyle="#0d1117"; ctx.fillRect(0,0,SIZE,SIZE);
    } else if(state.bgType==="paper"){
      ctx.fillStyle="#f5f1e9"; ctx.fillRect(0,0,SIZE,SIZE);
    } else {
      ctx.fillStyle=bgVal; ctx.fillRect(0,0,SIZE,SIZE);
    }

    // 1. Moteur de remplissage des espaces (si activé)
    if(state.enableFill && state.paths.length > 0){
      ctx.save();
      ctx.globalAlpha = +$("fillOpacity").value / 100;
      const tol = +$("fillTolerance").value;
      const prot = +$("traitProtection").value / 10;
      
      // Remplissage polygonal par lots ou masquage intelligent
      ctx.fillStyle = inkVal;
      for(let i=0; i<state.paths.length; i+=2){
        const p = state.paths[i];
        if(!p || p.points.length < 3) continue;
        ctx.beginPath();
        ctx.moveTo(p.points[0][0], p.points[0][1]);
        for(let j=1; j<p.points.length; j+=3) ctx.lineTo(p.points[j][0], p.points[j][1]);
        ctx.closePath();
        
        // Couleur selon le mode Color Studio
        if(state.colorMode === "gold"){
          ctx.fillStyle = state.goldVariant === "bronze" ? "#cd7f32" : (state.goldVariant === "copper" ? "#b87333" : "#d9b77e");
        } else if(state.colorMode === "multicolor"){
          const hue = (i * 35) % 360;
          ctx.fillStyle = `hsl(${hue}, 70%, 55%)`;
        } else {
          ctx.fillStyle = inkVal;
        }
        ctx.fill();
      }
      ctx.restore();
    }

    // 2. Traçage des spirales (Color Studio & Modes)
    for(let idx=0; idx<state.paths.length; idx++){
      const p = state.paths[idx];
      const pts = p.points;
      if(pts.length < 2) continue;

      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for(let i=1; i<pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);

      ctx.globalAlpha = p.opacity || 0.9;
      ctx.lineWidth = p.width || 1;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Application des modes de couleur V6
      if(state.colorMode === "gold"){
        const golds = {champagne:"#f0d6a8", metallic:"#d9b77e", bronze:"#cd7f32", copper:"#b87333"};
        ctx.strokeStyle = golds[state.goldVariant] || "#d9b77e";
      } else if(state.colorMode === "multicolor"){
        const hue = (idx * 28 + (pts[0][0]*0.1)) % 360;
        ctx.strokeStyle = `hsl(${hue}, 80%, 52%)`;
      } else if(state.colorMode === "gradient"){
        const grad = ctx.createLinearGradient(0,0,SIZE,SIZE);
        grad.addColorStop(0, inkVal);
        grad.addColorStop(0.5, "#d9b77e");
        grad.addColorStop(1, "#4a90e2");
        ctx.strokeStyle = grad;
      } else {
        ctx.strokeStyle = inkVal;
      }

      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawOriginal(){
    ctx.fillStyle=$("paper").value;ctx.fillRect(0,0,SIZE,SIZE);
    const iw=state.image.naturalWidth||state.image.width,ih=state.image.naturalHeight||state.image.height;
    const scale=$("fitMode").value==="cover"?Math.max(SIZE/iw,SIZE/ih):Math.min(SIZE/iw,SIZE/ih);
    const dw=iw*scale,dh=ih*scale;ctx.drawImage(state.image,(SIZE-dw)/2,(SIZE-dh)/2,dw,dh);
  }

  function render(){
    if(!state.image)return;
    const token=++state.renderToken;
    $("busy").classList.add("visible");
    $("status").textContent="Calcul V6 Color Studio & Worker…";
    state.rendering=true;

    setTimeout(async()=>{
      if(token!==state.renderToken)return;
      try{
        const nextPaths=await buildPathsInWorker();
        if(token!==state.renderToken)return;
        state.paths=nextPaths;
        paintCanvas();
        state.original=false;
        $("compareBtn").textContent="Voir l'original";
        $("status").textContent="Création V6 terminée · Prête";
        $("metaStyle").textContent=styleNames[state.style];
        const points=state.paths.reduce((n,p)=>n+p.points.length,0);
        $("metaCurves").textContent=state.paths.length.toLocaleString("fr-FR")+" tracé(s) · "+points.toLocaleString("fr-FR")+" pts";
        $("pngBtn").disabled=$("svgBtn").disabled=$("pltBtn").disabled=$("jsonBtn").disabled=false;
      }catch(err){
        console.error(err);
        $("status").textContent="Erreur de rendu";
      }finally{
        if(token===state.renderToken){$("busy").classList.remove("visible");state.rendering=false;}
      }
    },10);
  }

  // Exports V6
  function svgString(){
    const ink=$("ink").value, bg=$("paper").value;
    const paths=state.paths.map((p,idx)=>{
      let d="";p.points.forEach((pt,i)=>{d+=(i?" L ":"M ")+pt[0].toFixed(2)+" "+pt[1].toFixed(2);});
      let col = ink;
      if(state.colorMode==="gold") col = "#d9b77e";
      else if(state.colorMode==="multicolor") col = `hsl(${(idx*28)%360}, 80%, 52%)`;
      return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${p.width.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" opacity="${p.opacity}"/>`;
    }).join("");
    const bgRect = state.bgType==="transparent" ? "" : `<rect width="${SIZE}" height="${SIZE}" fill="${bg}"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="4000" viewBox="0 0 ${SIZE} ${SIZE}">${bgRect}${paths}</svg>`;
  }

  $("svgBtn").onclick=()=>{if(!state.paths.length)return;downloadBlob(new Blob([svgString()],{type:"image/svg+xml;charset=utf-8"}),"spiralographie-studio-v6.svg");};
  $("pngBtn").onclick=()=>{
    if(!state.paths.length)return;
    const res=+$("resolution").value;
    const out=document.createElement("canvas");out.width=out.height=res;const ox=out.getContext("2d");
    ox.scale(res/SIZE,res/SIZE);
    // Redessiner dans le canvas d'export
    const oldCtx=ctx;
    // On peut utiliser une passe de rendu directe sur 'ox' si besoin, ici on simplifie via l'artboard ou un clone
    out.toBlob(blob=>{if(blob)downloadBlob(blob,`spiralographie-studio-v6-${res}px.png`);else alert("Export PNG échoué.");},"image/png");
  };

  $("jsonBtn").onclick=()=>{
    const config = {
      version: "V6",
      style: state.style,
      colorMode: state.colorMode,
      goldVariant: state.goldVariant,
      enableFill: state.enableFill,
      settings: defaults
    };
    downloadBlob(new Blob([JSON.stringify(config, null, 2)],{type:"application/json"}),"spiralographie-studio-v6-config.json");
  };

  function downloadBlob(blob,name){
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }

  // HPGL/PLT Export
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
    commands.push("SP0;",";\n");downloadBlob(new Blob([commands.join("\n")],{type:"application/vnd.hp-hpgl"}),"spiralographie-studio-v6.plt");
  };

  const presets={
    portrait:{style:"single",turns:48,density:82,line:9,fidelity:92,softness:34},
    paysage:{style:"topo",turns:34,density:68,line:7,fidelity:78,softness:42},
    fin:{style:"guilloche",turns:56,density:55,line:4,fidelity:88,softness:18},
    luxe:{style:"single",turns:42,density:75,line:10,fidelity:90,colorMode:"gold"}
  };

  document.querySelectorAll("[data-preset]").forEach(btn=>btn.addEventListener("click",()=>{
    const p=presets[btn.dataset.preset];
    if(!p)return;
    Object.entries(p).forEach(([k,v])=>{if(k==="colorMode"){$("colorModeSelect").value=v;state.colorMode=v;}else{const el=$(k);if(el)el.value=v;}});
    updateLabels();if(state.image)render();
  }));

  $("saveSettingsBtn").onclick=()=>{
    const values={style:state.style, colorMode:state.colorMode};
    Object.keys(defaults).forEach(key=>{const el=$(key);if(el)values[key]=el.type==="checkbox"?el.checked:el.value;});
    try{localStorage.setItem("spiralographie-studio-v6-settings",JSON.stringify(values));$("status").textContent="Réglages V6 enregistrés";}
    catch(err){alert("Sauvegarde locale impossible.");}
  };

  $("loadSettingsBtn").onclick=()=>{
    try{const raw=localStorage.getItem("spiralographie-studio-v6-settings");if(!raw){alert("Aucun réglage.");return;const dat=JSON.parse(raw);}}catch(e){}
  };

  window.addEventListener("pagehide",()=>{if(spiralWorker)spiralWorker.terminate();});
  updateLabels();
})();
