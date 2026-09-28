import { launch } from './_pw.mjs';
const b = await launch(); const p = await b.newPage();
await p.goto('http://127.0.0.1:8765/', { waitUntil: 'networkidle' });
const r = await p.evaluate(async () => {
  const out = {};
  for (const n of ['player_idle','player_attack']) {
    const img = new Image(); img.src = 'art/v3b/anim/sprites/' + n + '.png'; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const res = [];
    for (let f = 0; f < 6; f++) {
      const d = g.getImageData(f*142, 0, 142, 60).data;
      let sx=0, sy=0, n2=0;
      for (let y=0;y<60;y++) for (let x=0;x<70;x++) {
        const i=(y*142+x)*4; const R=d[i],G=d[i+1],B=d[i+2],A=d[i+3];
        if (A>200 && B>140 && G<120 && B>R && R>60) { sx+=x; sy+=y; n2++; }
      }
      res.push(n2 ? [+(sx/n2).toFixed(1), +(sy/n2).toFixed(1), n2] : null);
    }
    out[n] = res;
  }
  const body = document.querySelector('#player-avatar .cb-body');
  const av = document.getElementById('player-avatar');
  const ar = document.getElementById('arena') || document.querySelector('.arena');
  out.body = body ? (({left,top,width,height}) => ({left,top,width,height}))(body.getBoundingClientRect()) : null;
  out.av = (({left,top,width,height}) => ({left,top,width,height}))(av.getBoundingClientRect());
  out.arena = ar ? (({left,top,width,height}) => ({left,top,width,height}))(ar.getBoundingClientRect()) : null;
  out.arenaId = ar && ar.id;
  return out;
});
console.log(JSON.stringify(r));
await b.close();
