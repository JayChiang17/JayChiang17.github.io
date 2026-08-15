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
    const tradeGroup=new THREE.Group(),tradeIvory=new THREE.MeshStandardMaterial({color:0xf4edd9,roughness:.52}),tradeRed=new THREE.MeshBasicMaterial({color:0xc94f45}),fromMat=new THREE.MeshStandardMaterial({color:0x829187,metalness:.32,roughness:.42}),toMat=new THREE.MeshStandardMaterial({color:0x62c18b,metalness:.36,roughness:.38});
    const tradeBaseGeo=new THREE.BoxGeometry(.78,.08,.78),fromBase=new THREE.Mesh(tradeBaseGeo,fromMat),toBase=new THREE.Mesh(tradeBaseGeo,toMat);fromBase.position.set(-1.58,-.72,0);toBase.position.set(1.58,-.72,0);fromBase.rotation.y=toBase.rotation.y=Math.PI/4;
    const fromGate=new THREE.Mesh(new THREE.TorusGeometry(.78,.045,12,64),fromMat),toGate=new THREE.Mesh(new THREE.TorusGeometry(.78,.045,12,64),toMat);fromGate.position.set(-1.58,.08,-.12);toGate.position.set(1.58,.08,-.12);
    const tradeBall=new THREE.Mesh(new THREE.SphereGeometry(.34,36,24),tradeIvory),tradeSeam1=new THREE.Mesh(new THREE.TorusGeometry(.275,.014,8,54),tradeRed),tradeSeam2=tradeSeam1.clone();tradeSeam1.rotation.set(0,.3,.3);tradeSeam2.rotation.set(Math.PI/2,-.25,-.3);tradeBall.add(tradeSeam1,tradeSeam2);tradeBall.position.set(-1.58,-.35,.2);
    const routeGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.58,-.48,0),new THREE.Vector3(1.58,-.48,0)]),routeLine=new THREE.Line(routeGeo,new THREE.LineBasicMaterial({color:0xe8d89f,transparent:true,opacity:.48}));
    const tradeLight=new THREE.PointLight(0x79d6a1,10,5);tradeLight.position.set(1.58,.2,1.5);tradeGroup.add(fromBase,toBase,fromGate,toGate,tradeBall,routeLine,tradeLight);tradeGroup.visible=false;tradeGroup.scale.setScalar(.8);scene.add(tradeGroup);
    const floor=new THREE.Mesh(new THREE.CircleGeometry(3.4,64),new THREE.MeshBasicMaterial({color:0x163b2b,transparent:true,opacity:.3}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.45;scene.add(floor);
    const points=new Float32Array(120*3);for(let i=0;i<points.length;i+=3){points[i]=(Math.random()-.5)*9;points[i+1]=(Math.random()-.5)*4;points[i+2]=(Math.random()-.5)*5;}
    const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(points,3));const stars=new THREE.Points(pg,new THREE.PointsMaterial({color:0xffc857,size:.035,transparent:true,opacity:.7}));scene.add(stars);
    let spinning=false,mode='idle',last=performance.now(),tradeStarted=last;
    function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
    new ResizeObserver(resize).observe(host);resize();
    renderer.setAnimationLoop(now=>{const dt=Math.min(.04,(now-last)/1000);last=now;
      if(spinning){d1.rotation.x+=dt*8.2;d1.rotation.y+=dt*11.4;d2.rotation.x-=dt*10.1;d2.rotation.z+=dt*8.8;group.rotation.y+=dt*2.3;}
      else{group.rotation.y+=dt*.22;d1.rotation.y+=dt*.15;d2.rotation.y-=dt*.12;}
      group.position.y=Math.sin(now*.004)*.13;if(mode==='award'){trophyGroup.rotation.y+=dt*.75;trophyGroup.position.y=Math.sin(now*.003)*.08;halo.rotation.z+=dt*.8;}if(mode==='retire'){retireGroup.rotation.y=Math.sin(now*.00055)*.13;retireGroup.position.y=Math.sin(now*.0022)*.045;retireRing.rotation.z+=dt*.32;ball.rotation.y+=dt*.42;lightCone.material.opacity=.045+(Math.sin(now*.002)+1)*.018;}if(mode==='trade'){const p=((now-tradeStarted)%1900)/1900,e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;tradeBall.position.x=-1.58+3.16*e;tradeBall.position.y=-.35+Math.sin(Math.PI*p)*1.12;tradeBall.rotation.x+=dt*5.8;tradeBall.rotation.y+=dt*7.2;fromGate.scale.setScalar(1+Math.max(0,.14-p)*1.8);toGate.scale.setScalar(1+Math.max(0,p-.72)*.72);tradeLight.intensity=7+Math.max(0,p-.62)*20;tradeGroup.rotation.y=Math.sin(now*.0011)*.055;}stars.rotation.z+=dt*(mode==='award'?.11:mode==='retire'?.055:mode==='trade'?.085:.025);renderer.render(scene,camera);
    });
    window.DiceFX={
      begin(count){mode='dice';tradeGroup.visible=false;retireGroup.visible=false;trophyGroup.visible=false;group.visible=true;d1.visible=true;d2.visible=count>1;spinning=true;group.scale.setScalar(.88);setTimeout(()=>group.scale.setScalar(1),120);},
      settle(value){spinning=false;const a=(value%6)*Math.PI/2;d1.rotation.set(a,a*.7,0);d2.rotation.set(a*.45,-a,.2);},
      award(kind){spinning=false;mode='award';tradeGroup.visible=false;retireGroup.visible=false;group.visible=false;trophyGroup.visible=true;trophyGroup.rotation.set(0,0,0);trophyGroup.scale.setScalar(.72);halo.material.color.set(kind==='mlb'?0x79b9ee:kind==='championship'?0xffd45f:0xffd66d);setTimeout(()=>trophyGroup.scale.setScalar(1),90);},
      retire(){spinning=false;mode='retire';tradeGroup.visible=false;group.visible=false;trophyGroup.visible=false;retireGroup.visible=true;retireGroup.rotation.set(0,0,0);retireGroup.scale.setScalar(.72);stars.material.opacity=.82;setTimeout(()=>retireGroup.scale.setScalar(1),180);},
      trade(){spinning=false;mode='trade';group.visible=false;trophyGroup.visible=false;retireGroup.visible=false;tradeGroup.visible=true;tradeGroup.rotation.set(0,0,0);tradeGroup.scale.setScalar(.68);tradeStarted=performance.now();stars.material.opacity=.88;setTimeout(()=>tradeGroup.scale.setScalar(.92),150);}
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
      function hallLabel(item,index){const c=document.createElement('canvas');c.width=640;c.height=240;const x=c.getContext('2d');x.fillStyle='#0c1d17';x.fillRect(0,0,c.width,c.height);x.strokeStyle=index===0?'#d4ae5d':'#456b59';x.lineWidth=7;x.strokeRect(8,8,c.width-16,c.height-16);x.fillStyle='#d9bd73';x.font='700 42px IBM Plex Mono,monospace';x.fillText(String(item.year||'生涯'),36,64);x.fillStyle='#f2efe4';x.font='800 46px Noto Sans TC,sans-serif';let title=String(item.title||'生涯時刻');if(title.length>17)title=title.slice(0,17)+'…';x.fillText(title,36,132);x.fillStyle='#91a89c';x.font='600 24px Noto Sans TC,sans-serif';x.fillText(String(item.kind||'里程碑'),36,188);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
      function clearHall(){while(hallGroup.children.length){const node=hallGroup.children.pop();node.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if(m.map)m.map.dispose();m.dispose();});}});}}
      function monument(item,index){const g=new THREE.Group(),color=/榮譽|紀錄/.test(item.kind)?0xd5ac50:/人物|人生/.test(item.kind)?0xd1846c:/抉擇|志向/.test(item.kind)?0x6fa8c4:0x77b28e,gold=new THREE.MeshStandardMaterial({color,metalness:.68,roughness:.26}),stone=new THREE.MeshStandardMaterial({color:0x183128,metalness:.15,roughness:.72});
        const base=new THREE.Mesh(new THREE.CylinderGeometry(1.08,1.28,.34,8),stone);base.position.y=-1.22;const pillar=new THREE.Mesh(new THREE.CylinderGeometry(.54,.72,1.4,10),stone);pillar.position.y=-.42;const ring=new THREE.Mesh(new THREE.TorusGeometry(.82,.055,12,64),gold);ring.position.y=.72;ring.rotation.x=Math.PI/2;
        let symbol;if(/榮譽|紀錄/.test(item.kind)){symbol=new THREE.Mesh(new THREE.OctahedronGeometry(.52,1),gold);}else if(/人物|人生/.test(item.kind)){symbol=new THREE.Mesh(new THREE.SphereGeometry(.48,28,18),gold);}else{symbol=new THREE.Mesh(new THREE.IcosahedronGeometry(.5,1),gold);}symbol.position.y=.72;
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
    const overlay=document.getElementById('roll-overlay');if(overlay?.classList.contains('retirement-mode'))window.DiceFX.retire();else if(overlay?.querySelector('.trade-route'))window.DiceFX.trade();
  }catch(err){console.warn('Three.js dice fallback active',err);}
})();
