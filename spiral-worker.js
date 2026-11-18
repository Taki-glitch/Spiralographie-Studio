/* Spiralographie Studio V6 — moteur géométrique, analyse Sobel & color sampling */
self.onmessage = ({data}) => {
  try {
    const {gray,width,height,settings,style}=data;
    const paths=build(gray,width,height,settings,style);
    self.postMessage({paths});
  } catch(error) { self.postMessage({error:String(error?.message||error)}); }
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function build(gray,w,h,s,style){
 const SIZE=1000,C=500,R=465,turns=+s.turns,density=+s.density/100,fidelity=+s.fidelity/100,rot=+s.rotation*Math.PI/180,line=+s.line/10;
 const cx=+s.centerX||0,cy=+s.centerY||0,detail=(+s.detail||55)/100,edgeBoost=(+s.edges||55)/100,paths=[];
 
 // Carte de contour Sobel
 const edge=new Float32Array(w*h);
 for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){
   const i=y*w+x;
   const gx=-gray[i-w-1]+gray[i-w+1]-2*gray[i-1]+2*gray[i+1]-gray[i+w-1]+gray[i+w+1];
   const gy=-gray[i-w-1]-2*gray[i-w]-gray[i-w+1]+gray[i+w-1]+2*gray[i+w]+gray[i+w+1];
   edge[i]=Math.min(1,Math.hypot(gx,gy)*1.8);
 }
 const raw=(x,y)=>{const ix=clamp(Math.round((x/SIZE+.5)*(w-1)),0,w-1),iy=clamp(Math.round((y/SIZE+.5)*(h-1)),0,h-1),i=iy*w+ix;let v=gray[i];if(s.invert)v=1-v;return v;};
 const sample=(x,y)=>{
   const ix=clamp(Math.round((x/SIZE+.5)*(w-1)),1,w-2),iy=clamp(Math.round((y/SIZE+.5)*(h-1)),1,h-2),i=iy*w+ix;
   let v=raw(x,y);
   const local=(raw(x-8,y)+raw(x+8,y)+raw(x,y-8)+raw(x,y+8))/4;
   const enhanced=clamp(.5+(v-local)*(.65+detail*1.25)+(v-.5)*(.7+detail*.55),0,1);
   return clamp(enhanced+(edge[i]-.12)*edgeBoost*.23,0,1);
 };
 const polar=(r,a,ox=0,oy=0)=>[C+cx+ox+r*Math.cos(a),C+cy+oy+r*Math.sin(a)];
 const add=(points,width=line,opacity=1)=>{if(points.length>1)paths.push({points,width,opacity});};
 const thetaMax=turns*Math.PI*2,steps=Math.max(9000,turns*430);

 if(style==='single'){
   const pts=[];for(let i=0;i<=steps;i++){const t=i/steps,a=t*thetaMax+rot,r=5+(R-5)*t,[x,y]=polar(r,a),lum=sample(x-C,y-C),contrast=(.5-lum)*2;const edgeWarp=(lum-.5)*edgeBoost*10;const warped=r+contrast*density*fidelity*25*Math.sin(t*thetaMax*.17)+edgeWarp;pts.push(polar(warped,a));}add(pts);
 }
 if(style==='ripple'||style==='topo'){
   const count=Math.round(turns*(style==='topo'?2.1:1.65)),per=Math.max(260,Math.round(steps/count));
   for(let k=0;k<count;k++){const pts=[],base=10+(R-10)*(k/count);for(let j=0;j<=per;j++){const a=j/per*Math.PI*2+rot,[x,y]=polar(base,a),lum=sample(x-C,y-C),dark=1-lum,mod=(dark-.35)*density*fidelity*(style==='topo'?31:21),ripple=style==='topo'?Math.sin(a*3+k*.07)*2.5:Math.sin(a*5+k*.15)*1.8;pts.push(polar(base+mod+ripple,a));}add(pts,line*(.65+.5*(1-k/count)),.85);}
 }
 if(style==='guilloche'){
   const count=Math.max(3,Math.round(4+density*10)),ptsPer=Math.max(250,Math.round(steps/count));
   for(let arm=0;arm<count;arm++){const pts=[];for(let i=0;i<=ptsPer;i++){const t=i/ptsPer,a=t*thetaMax+rot+arm*2*Math.PI/count,r=R*t,[x,y]=polar(r,a),lum=sample(x-C,y-C),mod=(.5-lum)*density*fidelity*25,guill=Math.sin(a*2+arm*.8)*5+Math.sin(a*7)*2;pts.push(polar(r+mod+guill,a));}add(pts,line*.58,.9);}
 }
 if(style==='woven'){
   for(let arm=0;arm<2;arm++){const pts=[];for(let i=0;i<=steps;i++){const t=i/steps,a=t*thetaMax+rot+arm*Math.PI,r=5+(R-5)*t,[x,y]=polar(r,a),lum=sample(x-C,y-C);pts.push(polar(r+(1-lum-.5)*density*fidelity*30,a));}add(pts,line*.82,.9);}
 }
 if(style==='radial'){
   const rays=Math.round(75+density*145),per=Math.round(95+turns*1.5);
   for(let k=0;k<rays;k++){const pts=[],base=k/rays*Math.PI*2+rot;for(let j=0;j<=per;j++){const t=j/per,r=R*t,[x,y]=polar(r,base),lum=sample(x-C,y-C),bend=(.5-lum)*density*fidelity*40*Math.sin(t*thetaMax*.28);pts.push(polar(r+bend,base+Math.sin(t*thetaMax)*.014));}add(pts,line*.52,.88);}
 }
 if(style==='contour'){
   const count=Math.round(25+turns*1.4),per=480;
   for(let k=0;k<count;k++){const pts=[],base=12+(R-12)*k/count;for(let j=0;j<=per;j++){const a=j/per*Math.PI*2+rot,[x,y]=polar(base,a),lum=sample(x-C,y-C),d=(.5-lum)*density*fidelity*39,organic=Math.sin(a*2.3+k*.23)*4+Math.cos(a*5-k*.11)*2;pts.push(polar(base+d+organic,a));}add(pts,line*.72,.9);}
 }
 if(style==='multi'){
   const centres=[[-112,-62],[112,-62],[0,112]],localR=315,localSteps=Math.max(5200,turns*300);
   centres.forEach(([ox,oy],idx)=>{const pts=[];for(let i=0;i<=localSteps;i++){const t=i/localSteps,a=t*thetaMax+rot+idx*2.094,r=4+(localR-4)*t,[x,y]=polar(r,a,ox,oy),lum=sample(x-C,y-C),warp=(.5-lum)*density*fidelity*24*Math.sin(t*thetaMax*.14)+(lum-.5)*edgeBoost*8;pts.push(polar(clamp(r+warp,2,localR+24),a,ox,oy));}add(pts,line*.78,.92);});
 }
 return paths;
}
