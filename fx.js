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
    const floor=new THREE.Mesh(new THREE.CircleGeometry(3.4,64),new THREE.MeshBasicMaterial({color:0x163b2b,transparent:true,opacity:.3}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.45;scene.add(floor);
    const points=new Float32Array(120*3);for(let i=0;i<points.length;i+=3){points[i]=(Math.random()-.5)*9;points[i+1]=(Math.random()-.5)*4;points[i+2]=(Math.random()-.5)*5;}
    const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(points,3));const stars=new THREE.Points(pg,new THREE.PointsMaterial({color:0xffc857,size:.035,transparent:true,opacity:.7}));scene.add(stars);
    let spinning=false,mode='idle',last=performance.now();
    function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
    new ResizeObserver(resize).observe(host);resize();
    renderer.setAnimationLoop(now=>{const dt=Math.min(.04,(now-last)/1000);last=now;
      if(spinning){d1.rotation.x+=dt*8.2;d1.rotation.y+=dt*11.4;d2.rotation.x-=dt*10.1;d2.rotation.z+=dt*8.8;group.rotation.y+=dt*2.3;}
      else{group.rotation.y+=dt*.22;d1.rotation.y+=dt*.15;d2.rotation.y-=dt*.12;}
      group.position.y=Math.sin(now*.004)*.13;if(mode==='award'){trophyGroup.rotation.y+=dt*.75;trophyGroup.position.y=Math.sin(now*.003)*.08;halo.rotation.z+=dt*.8;}if(mode==='retire'){retireGroup.rotation.y=Math.sin(now*.00055)*.13;retireGroup.position.y=Math.sin(now*.0022)*.045;retireRing.rotation.z+=dt*.32;ball.rotation.y+=dt*.42;lightCone.material.opacity=.045+(Math.sin(now*.002)+1)*.018;}stars.rotation.z+=dt*(mode==='award'?.11:mode==='retire'?.055:.025);renderer.render(scene,camera);
    });
    window.DiceFX={
      begin(count){mode='dice';retireGroup.visible=false;trophyGroup.visible=false;group.visible=true;d1.visible=true;d2.visible=count>1;spinning=true;group.scale.setScalar(.88);setTimeout(()=>group.scale.setScalar(1),120);},
      settle(value){spinning=false;const a=(value%6)*Math.PI/2;d1.rotation.set(a,a*.7,0);d2.rotation.set(a*.45,-a,.2);},
      award(kind){spinning=false;mode='award';retireGroup.visible=false;group.visible=false;trophyGroup.visible=true;trophyGroup.rotation.set(0,0,0);trophyGroup.scale.setScalar(.72);halo.material.color.set(kind==='mlb'?0x79b9ee:kind==='championship'?0xffd45f:0xffd66d);setTimeout(()=>trophyGroup.scale.setScalar(1),90);},
      retire(){spinning=false;mode='retire';group.visible=false;trophyGroup.visible=false;retireGroup.visible=true;retireGroup.rotation.set(0,0,0);retireGroup.scale.setScalar(.72);stars.material.opacity=.82;setTimeout(()=>retireGroup.scale.setScalar(1),180);}
    };
    /* 模組若在告別視窗開啟後才載入，仍要立刻切到引退場景，避免停在預設骰子。 */
    if(document.getElementById('roll-overlay')?.classList.contains('retirement-mode'))window.DiceFX.retire();
  }catch(err){console.warn('Three.js dice fallback active',err);}
})();
