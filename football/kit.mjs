export function kitIcon(team){
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox','0 0 48 48');svg.setAttribute('aria-hidden','true');svg.classList.add('kit-icon');
  for(const [d,color]of [['M14 7 5 14 10 24 16 20 16 41 32 41 32 20 38 24 43 14 34 7 29 9 24 12 19 9Z',team.secondaryColor],['M20 11 24 13 28 11 28 41 20 41Z',team.color]]){const path=document.createElementNS(ns,'path');path.setAttribute('d',d);path.setAttribute('fill',color);svg.append(path);}
  return svg;
}
