(async()=>{
  try{
    const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js');
    const host=document.getElementById('three-stage');
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.set(0,1.2,7.2);
    const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setClearColor(0x000000,0);host.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xfff0c7,0x163326,2.2));
    const key=new THREE.DirectionalLight(0xffc857,4.5);key.position.set(3,5,4);scene.add(key);
    const rim=new THREE.PointLight(0x68b7e8,22,12);rim.position.set(-3,1,3);scene.add(rim);
    function faceTexture(n,bg,fg){
      const c=document.createElement('canvas');c.width=c.height=160;const x=c.getContext('2d');
      x.fillStyle=bg;x.fillRect(0,0,160,160);x.strokeStyle='#c66f4b';x.lineWidth=6;x.setLineDash([7,8]);x.strokeRect(13,13,134,134);
      x.fillStyle=fg;x.font='900 88px IBM Plex Mono,monospace';x.textAlign='center';x.textBaseline='middle';x.fillText(n,80,84);
      const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
    }
    function die(bg,fg){
      const mats=Array.from({length:6},(_,i)=>new THREE.MeshStandardMaterial({map:faceTexture(i+1,bg,fg),roughness:.38,metalness:.08}));
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(1.65,1.65,1.65,3,3,3),mats);return mesh;
    }
    const group=new THREE.Group();const d1=die('#f6efd8','#163025'),d2=die('#e17c52','#fff4db');d1.position.x=-1.2;d2.position.x=1.2;group.add(d1,d2);scene.add(group);
    const trophyGroup=new THREE.Group(),gold=new THREE.MeshStandardMaterial({color:0xf4c758,metalness:.82,roughness:.22}),darkGold=new THREE.MeshStandardMaterial({color:0x8f6922,metalness:.72,roughness:.28});
    const cup=new THREE.Mesh(new THREE.CylinderGeometry(.72,.38,.86,48,1,true),gold);cup.position.y=.48;
    const lip=new THREE.Mesh(new THREE.TorusGeometry(.72,.075,14,48),gold);lip.rotation.x=Math.PI/2;lip.position.y=.91;
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.12,.17,.66,28),gold);stem.position.y=-.23;
    const base1=new THREE.Mesh(new THREE.CylinderGeometry(.58,.68,.22,40),darkGold);base1.position.y=-.68;
    const base2=new THREE.Mesh(new THREE.CylinderGeometry(.42,.55,.18,40),gold);base2.position.y=-.49;
    const handleGeo=new THREE.TorusGeometry(.36,.07,14,38,Math.PI*1.25),h1=new THREE.Mesh(handleGeo,gold),h2=new THREE.Mesh(handleGeo,gold);h1.position.set(-.63,.48,0);h1.rotation.z=-.62;h2.position.set(.63,.48,0);h2.rotation.z=Math.PI+.62;
    const halo=new THREE.Mesh(new THREE.TorusGeometry(1.35,.025,10,72),new THREE.MeshBasicMaterial({color:0xffd66d,transparent:true,opacity:.75}));halo.rotation.x=Math.PI/2;halo.position.y=.18;
    trophyGroup.add(cup,lip,stem,base1,base2,h1,h2,halo);trophyGroup.visible=false;trophyGroup.scale.setScalar(.7);scene.add(trophyGroup);
    const retireGroup=new THREE.Group(),ivory=new THREE.MeshStandardMaterial({color:0xf3ead2,roughness:.58,metalness:.04}),wood=new THREE.MeshStandardMaterial({color:0xb86d3d,roughness:.5}),red=new THREE.MeshBasicMaterial({color:0xc94f45}),retireGold=new THREE.MeshStandardMaterial({color:0xe7bd5a,metalness:.55,roughness:.3});
    const plateShape=new THREE.Shape();plateShape.moveTo(-.82,.52);plateShape.lineTo(.82,.52);plateShape.lineTo(.82,-.12);plateShape.lineTo(0,-.78);plateShape.lineTo(-.82,-.12);plateShape.closePath();const plate=new THREE.Mesh(new THREE.ShapeGeometry(plateShape),ivory);plate.rotation.x=-Math.PI/2;plate.position.set(0,-1.02,.12);
    const ball=new THREE.Mesh(new THREE.SphereGeometry(.5,42,28),ivory);ball.position.set(.48,.05,.12);const seam1=new THREE.Mesh(new THREE.TorusGeometry(.405,.018,8,60),red),seam2=seam1.clone();seam1.position.copy(ball.position);seam1.rotation.set(0,.28,.34);seam2.position.copy(ball.position);seam2.rotation.set(Math.PI/2,-.25,-.34);
    const bat=new THREE.Mesh(new THREE.CylinderGeometry(.09,.17,2.55,28),wood);bat.position.set(-.72,.05,-.08);bat.rotation.z=-.55;const knob=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.12,24),wood);knob.position.set(-1.39,-1.02,-.08);knob.rotation.z=-.55;
    const retireRing=new THREE.Mesh(new THREE.TorusGeometry(1.56,.035,12,80),retireGold);retireRing.rotation.x=Math.PI/2;retireRing.position.y=-.9;const lightCone=new THREE.Mesh(new THREE.ConeGeometry(2.3,4.2,48,1,true),new THREE.MeshBasicMaterial({color:0xf4d98a,transparent:true,opacity:.055,side:THREE.DoubleSide,depthWrite:false}));lightCone.position.y=.85;lightCone.rotation.z=Math.PI;
    retireGroup.add(plate,ball,seam1,seam2,bat,knob,retireRing,lightCone);retireGroup.visible=false;retireGroup.scale.setScalar(.76);scene.add(retireGroup);
    const tradeGroup=new THREE.Group();
    function tradeTexture(code,label,color,player){
      const c=document.createElement('canvas');c.width=900;c.height=520;const x=c.getContext('2d'),accent=/^#[0-9a-f]{6}$/i.test(color||'')?color:'#6ba98a';
      const g=x.createLinearGradient(0,0,c.width,c.height);g.addColorStop(0,'#13251e');g.addColorStop(1,'#050b08');x.fillStyle=g;x.fillRect(0,0,c.width,c.height);x.fillStyle=accent;x.fillRect(0,0,22,c.height);x.fillRect(0,0,c.width,13);
      x.strokeStyle='#6f8378';x.lineWidth=2;x.strokeRect(48,48,c.width-96,c.height-96);x.fillStyle='#9bb0a4';x.font='800 28px IBM Plex Mono,monospace';x.textAlign='left';x.fillText(label,78,105);x.textAlign='right';x.fillText('OFFICIAL',c.width-78,105);
      x.fillStyle='#f5f7f6';x.font='900 210px IBM Plex Mono,monospace';x.textAlign='center';x.textBaseline='middle';x.fillText(String(code||'NEW').slice(0,4),c.width/2,278);
      x.fillStyle=accent;x.fillRect(78,416,c.width-156,4);x.fillStyle='#c9d5cf';x.font='700 30px Noto Sans TC,sans-serif';x.textBaseline='alphabetic';x.fillText(String(player||'PLAYER'),c.width/2,474);
      const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;
    }
    function tradeCard(code,label,color,player){
      const edge=new THREE.MeshStandardMaterial({color:0x102019,metalness:.5,roughness:.3}),face=new THREE.MeshBasicMaterial({map:tradeTexture(code,label,color,player),transparent:true,opacity:1,side:THREE.DoubleSide}),body=new THREE.Mesh(new THREE.BoxGeometry(3.05,1.76,.1),edge),front=new THREE.Mesh(new THREE.PlaneGeometry(2.98,1.69),face),card=new THREE.Group();front.position.z=.056;card.add(body,front);card.userData={face,front,body};return card;
    }
    const oldTradeCard=tradeCard('FROM','DEPARTING CLUB','#829187','PLAYER'),newTradeCard=tradeCard('NEW','ACQUIRED BY','#62c18b','PLAYER');
    const tradeFrameMat=new THREE.MeshStandardMaterial({color:0x537062,metalness:.68,roughness:.28}),tradeFrame=new THREE.Mesh(new THREE.BoxGeometry(3.42,2.08,.035),tradeFrameMat);tradeFrame.position.z=-.12;
    const tradeLine=new THREE.Mesh(new THREE.BoxGeometry(5.9,.035,.035),new THREE.MeshBasicMaterial({color:0xb6c8be,transparent:true,opacity:.42}));tradeLine.position.set(0,-1.12,-.1);
    const tradePulse=new THREE.Mesh(new THREE.PlaneGeometry(5.5,2.7),new THREE.MeshBasicMaterial({color:0x62c18b,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));tradePulse.position.z=-.25;
    const tradeLight=new THREE.PointLight(0x62c18b,8,8);tradeLight.position.set(0,.25,2.4);
    tradeGroup.add(tradeFrame,tradeLine,tradePulse,oldTradeCard,newTradeCard,tradeLight);tradeGroup.visible=false;tradeGroup.scale.setScalar(1.18);scene.add(tradeGroup);
    const floor=new THREE.Mesh(new THREE.CircleGeometry(3.4,64),new THREE.MeshBasicMaterial({color:0x163b2b,transparent:true,opacity:.3}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.45;scene.add(floor);
    const points=new Float32Array(120*3);for(let i=0;i<points.length;i+=3){points[i]=(Math.random()-.5)*9;points[i+1]=(Math.random()-.5)*4;points[i+2]=(Math.random()-.5)*5;}
    const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(points,3));const stars=new THREE.Points(pg,new THREE.PointsMaterial({color:0xffc857,size:.035,transparent:true,opacity:.7}));scene.add(stars);
    let spinning=false,mode='idle',last=performance.now(),tradeStarted=last;
    function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
    new ResizeObserver(resize).observe(host);resize();
    renderer.setAnimationLoop(now=>{const dt=Math.min(.04,(now-last)/1000);last=now;
      if(spinning){d1.rotation.x+=dt*8.2;d1.rotation.y+=dt*11.4;d2.rotation.x-=dt*10.1;d2.rotation.z+=dt*8.8;group.rotation.y+=dt*2.3;}
      else{group.rotation.y+=dt*.22;d1.rotation.y+=dt*.15;d2.rotation.y-=dt*.12;}
      group.position.y=Math.sin(now*.004)*.13;if(mode==='award'){trophyGroup.rotation.y+=dt*.75;trophyGroup.position.y=Math.sin(now*.003)*.08;halo.rotation.z+=dt*.8;}if(mode==='retire'){retireGroup.rotation.y=Math.sin(now*.00055)*.13;retireGroup.position.y=Math.sin(now*.0022)*.045;retireRing.rotation.z+=dt*.32;ball.rotation.y+=dt*.42;lightCone.material.opacity=.045+(Math.sin(now*.002)+1)*.018;}if(mode==='trade'){const elapsed=now-tradeStarted,p=Math.min(1,elapsed/1650),smooth=v=>v*v*(3-2*v),out=smooth(Math.min(1,p/.42)),incoming=smooth(Math.max(0,Math.min(1,(p-.22)/.58)));oldTradeCard.position.x=-4.2*out;oldTradeCard.rotation.y=-1.15*out;oldTradeCard.userData.face.opacity=Math.max(0,1-out*1.25);oldTradeCard.visible=out<.92;newTradeCard.position.x=4.2*(1-incoming);newTradeCard.rotation.y=1.18*(1-incoming);newTradeCard.userData.face.opacity=incoming;newTradeCard.visible=p>.16;tradeFrame.visible=incoming>.78;tradeFrame.scale.setScalar(.88+.12*incoming);tradePulse.material.opacity=Math.max(0,.3-Math.abs(p-.78)*1.4);tradeLight.intensity=6+18*Math.max(0,1-Math.abs(p-.78)*5);if(p===1){newTradeCard.position.y=Math.sin(now*.0021)*.035;newTradeCard.rotation.y=Math.sin(now*.0008)*.035;}tradeGroup.rotation.y=Math.sin(now*.00065)*.02;}stars.rotation.z+=dt*(mode==='award'?.11:mode==='retire'?.055:mode==='trade'?.04:.025);renderer.render(scene,camera);
    });
    window.DiceFX={
      begin(count){mode='dice';tradeGroup.visible=false;retireGroup.visible=false;trophyGroup.visible=false;group.visible=true;d1.visible=true;d2.visible=count>1;spinning=true;group.scale.setScalar(.88);setTimeout(()=>group.scale.setScalar(1),120);},
      settle(value){spinning=false;const a=(value%6)*Math.PI/2;d1.rotation.set(a,a*.7,0);d2.rotation.set(a*.45,-a,.2);},
      award(kind){spinning=false;mode='award';tradeGroup.visible=false;retireGroup.visible=false;group.visible=false;trophyGroup.visible=true;trophyGroup.rotation.set(0,0,0);trophyGroup.scale.setScalar(.72);halo.material.color.set(kind==='mlb'?0x79b9ee:kind==='championship'?0xffd45f:0xffd66d);setTimeout(()=>trophyGroup.scale.setScalar(1),90);},
      retire(){spinning=false;mode='retire';tradeGroup.visible=false;group.visible=false;trophyGroup.visible=false;retireGroup.visible=true;retireGroup.rotation.set(0,0,0);retireGroup.scale.setScalar(.72);stars.material.opacity=.82;setTimeout(()=>retireGroup.scale.setScalar(1),180);},
      trade(info={}){spinning=false;mode='trade';group.visible=false;trophyGroup.visible=false;retireGroup.visible=false;tradeGroup.visible=true;tradeGroup.rotation.set(0,0,0);tradeGroup.scale.setScalar(1.18);const replace=(card,code,label,color,player)=>{if(card.userData.face.map)card.userData.face.map.dispose();card.userData.face.map=tradeTexture(code,label,color,player);card.userData.face.needsUpdate=true;};replace(oldTradeCard,info.fromCode||'FROM','DEPARTING CLUB',info.fromColor||'#829187',info.player);replace(newTradeCard,info.toCode||'NEW','ACQUIRED BY',info.toColor||'#62c18b',info.player);tradeFrameMat.color.set(info.toColor||'#537062');tradePulse.material.color.set(info.toColor||'#62c18b');tradeLight.color.set(info.toColor||'#62c18b');oldTradeCard.position.set(0,0,0);oldTradeCard.rotation.set(0,0,0);oldTradeCard.visible=true;oldTradeCard.userData.face.opacity=1;newTradeCard.position.set(4.2,0,0);newTradeCard.rotation.set(0,1.18,0);newTradeCard.visible=false;newTradeCard.userData.face.opacity=0;tradeFrame.visible=false;tradePulse.material.opacity=0;tradeStarted=performance.now()-(info.instant?1800:0);stars.material.opacity=.62;}
    };
    const legacyHost=document.getElementById('legacy-three-stage');
    if(legacyHost){
      const hallScene=new THREE.Scene();hallScene.fog=new THREE.FogExp2(0x07130f,.038);
      const hallCamera=new THREE.PerspectiveCamera(42,1,.1,160);hallCamera.position.set(0,2.4,9);
      const hallRenderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});hallRenderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));hallRenderer.setClearColor(0x07130f,1);legacyHost.appendChild(hallRenderer.domElement);
      hallScene.add(new THREE.HemisphereLight(0xc9e0d3,0x07110d,1.7));const hallKey=new THREE.DirectionalLight(0xf0c86b,3.4);hallKey.position.set(3,8,5);hallScene.add(hallKey);
      const hallFloor=new THREE.Mesh(new THREE.PlaneGeometry(180,34,40,8),new THREE.MeshStandardMaterial({color:0x0b1c16,roughness:.86,metalness:.08}));hallFloor.rotation.x=-Math.PI/2;hallFloor.position.y=-1.45;hallScene.add(hallFloor);
      const grid=new THREE.GridHelper(180,90,0x315943,0x173328);grid.position.y=-1.43;grid.rotation.z=Math.PI/2;hallScene.add(grid);
      const beams=new THREE.Group();for(let i=-8;i<=8;i++){const beam=new THREE.Mesh(new THREE.BoxGeometry(.055,7,.055),new THREE.MeshBasicMaterial({color:i%4===0?0xd3ac57:0x285440,transparent:true,opacity:i%4===0?.46:.25}));beam.position.set(i*5,2,-4);beams.add(beam);}hallScene.add(beams);
      const dustCount=320,dustPos=new Float32Array(dustCount*3);for(let i=0;i<dustCount;i++){dustPos[i*3]=(Math.random()-.5)*90;dustPos[i*3+1]=Math.random()*7-1.2;dustPos[i*3+2]=(Math.random()-.5)*14;}const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xe5c777,size:.035,transparent:true,opacity:.5}));hallScene.add(dust);
      const hallGroup=new THREE.Group();hallScene.add(hallGroup);let hallItems=[],hallTarget=0,hallCurrent=0,hallActive=false,hallLast=performance.now();
      function hallLabel(item,index){const c=document.createElement('canvas');c.width=640;c.height=240;const x=c.getContext('2d'),honor=item.kind==='榮譽';x.fillStyle='#0c1d17';x.fillRect(0,0,c.width,c.height);x.strokeStyle=honor?'#d4ae5d':'#54836c';x.lineWidth=7;x.strokeRect(8,8,c.width-16,c.height-16);x.fillStyle=honor?'#d9bd73':'#8fc3a5';x.font='700 42px IBM Plex Mono,monospace';x.fillText(String(item.year||'生涯'),36,64);x.fillStyle='#f2efe4';x.font='800 46px Noto Sans TC,sans-serif';let title=String(item.title||'生涯紀錄');if(title.length>17)title=title.slice(0,17)+'…';x.fillText(title,36,132);x.fillStyle='#91a89c';x.font='600 24px Noto Sans TC,sans-serif';x.fillText(String(item.kind||'球隊'),36,188);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
      function clearHall(){while(hallGroup.children.length){const node=hallGroup.children.pop();node.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if(m.map)m.map.dispose();m.dispose();});}});}}
      function monument(item,index){const g=new THREE.Group(),honor=item.kind==='榮譽',color=honor?0xd5ac50:0x77b28e,gold=new THREE.MeshStandardMaterial({color,metalness:.68,roughness:.26}),stone=new THREE.MeshStandardMaterial({color:0x183128,metalness:.15,roughness:.72});
        const base=new THREE.Mesh(new THREE.CylinderGeometry(1.08,1.28,.34,8),stone);base.position.y=-1.22;const pillar=new THREE.Mesh(new THREE.CylinderGeometry(.54,.72,1.4,10),stone);pillar.position.y=-.42;const ring=new THREE.Mesh(new THREE.TorusGeometry(.82,.055,12,64),gold);ring.position.y=.72;ring.rotation.x=Math.PI/2;
        let symbol;if(honor){symbol=new THREE.Group();const cup=new THREE.Mesh(new THREE.CylinderGeometry(.43,.24,.52,28,1,true),gold),lip=new THREE.Mesh(new THREE.TorusGeometry(.43,.045,10,36),gold),stem=new THREE.Mesh(new THREE.CylinderGeometry(.07,.11,.34,18),gold),foot=new THREE.Mesh(new THREE.CylinderGeometry(.3,.38,.12,24),gold);cup.position.y=.18;lip.position.y=.45;lip.rotation.x=Math.PI/2;stem.position.y=-.23;foot.position.y=-.44;symbol.add(cup,lip,stem,foot);}else{const plateShape=new THREE.Shape();plateShape.moveTo(-.5,.48);plateShape.lineTo(.5,.48);plateShape.lineTo(.5,-.05);plateShape.lineTo(0,-.55);plateShape.lineTo(-.5,-.05);plateShape.closePath();symbol=new THREE.Mesh(new THREE.ExtrudeGeometry(plateShape,{depth:.16,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:2}),gold);symbol.position.z=-.08;ring.visible=false;}symbol.position.y=.72;
        const boardMat=new THREE.MeshBasicMaterial({map:hallLabel(item,index),transparent:true}),board=new THREE.Mesh(new THREE.PlaneGeometry(2.45,.92),boardMat);board.position.set(0,1.95,.05);g.add(base,pillar,ring,symbol,board);g.position.x=index*4;g.userData={ring,symbol,index};return g;
      }
      function rebuild(items){clearHall();hallItems=items||[];hallItems.forEach((item,i)=>hallGroup.add(monument(item,i)));hallCurrent=hallTarget=0;hallCamera.position.x=0;}
      function hallResize(){const w=Math.max(1,legacyHost.clientWidth),h=Math.max(1,legacyHost.clientHeight);hallRenderer.setSize(w,h,false);hallCamera.aspect=w/h;hallCamera.updateProjectionMatrix();}
      new ResizeObserver(hallResize).observe(legacyHost);hallResize();
      hallRenderer.setAnimationLoop(now=>{if(!hallActive)return;const dt=Math.min(.05,(now-hallLast)/1000);hallLast=now;hallCurrent+=(hallTarget*4-hallCurrent)*Math.min(1,dt*3.8);hallCamera.position.x=hallCurrent;hallCamera.position.y=2.35+Math.sin(now*.00045)*.09;hallCamera.lookAt(hallCurrent,.35,0);hallGroup.children.forEach((g,i)=>{const active=i===hallTarget;g.userData.symbol.rotation.y+=dt*(active?1.2:.25);g.userData.symbol.position.y=.72+Math.sin(now*.0025+i)*.07;g.userData.ring.rotation.z+=dt*(active?.62:.12);const target=active?1.12:.82;g.scale.lerp(new THREE.Vector3(target,target,target),Math.min(1,dt*5));});dust.rotation.y+=dt*.008;hallRenderer.render(hallScene,hallCamera);});
      window.LegacyFX={open(items){rebuild(items);hallActive=true;hallLast=performance.now();hallResize();},set(index){hallTarget=Math.max(0,Math.min(hallItems.length-1,index||0));},close(){hallActive=false;}};
      const legacyOverlay=document.getElementById('legacy-overlay');if(legacyOverlay?.classList.contains('open')&&typeof window.legacyItems==='function')window.LegacyFX.open(window.legacyItems());
    }
    /* 模組若在告別視窗開啟後才載入，仍要立刻切到引退場景，避免停在預設骰子。 */
    const overlay=document.getElementById('roll-overlay');if(overlay?.classList.contains('retirement-mode'))window.DiceFX.retire();else if(overlay?.querySelector('.trade-reveal'))window.DiceFX.trade(window.__tradeFxPayload||{});
  }catch(err){console.warn('Three.js dice fallback active',err);}
})();
