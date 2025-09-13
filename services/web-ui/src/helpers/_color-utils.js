// https://github.com/PimpTrizkit/PJs/wiki/12.-Shade,-Blend-and-Convert-a-Web-Color-(pSBC.js)
// Has a nice screenshot https://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
// Lixpi fork    https://github.com/Lixpi/PJs

export const RgbLogShade=(p,c)=>{
  if(p && c) {
    var i=parseInt,r=Math.round,[a,b,c,d]=c.split(","),P=p<0,t=P?0:p*255**2,P=P?1+p:1-p;
    return"rgb"+(d?"a(":"(")+r((P*i(a[3]=="a"?a.slice(5):a.slice(4))**2+t)**0.5)+","+r((P*i(b)**2+t)**0.5)+","+r((P*i(c)**2+t)**0.5)+(d?","+d:")");
  }
}

export const RgbLinearShade=(p,c0)=>{
  if(p && c) {
  	var i=parseInt,r=Math.round,[a,b,c,d]=c0.split(","),n=p<0,t=n?0:255*p,P=n?1+p:1-p;
  	return"rgb"+(d?"a(":"(")+r(i(a[3]=="a"?a.slice(5):a.slice(4))*P+t)+","+r(i(b)*P+t)+","+r(i(c)*P+t)+(d?","+d:")");
  }
}
