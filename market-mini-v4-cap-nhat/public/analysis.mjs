// Market Mini v4 technical engine. Deterministic analysis of supplied real historical OHLCV.
export const HORIZONS={
 '1h':{label:'1 giờ',hours:1,iv:'5m',tv:'5'},'5h':{label:'5 giờ',hours:5,iv:'15m',tv:'15'},
 '12h':{label:'12 giờ',hours:12,iv:'1h',tv:'60'},'24h':{label:'24 giờ',hours:24,iv:'1h',tv:'60'},
 '1mo':{label:'1 tháng',hours:720,iv:'1d',tv:'D'},'1y':{label:'1 năm',hours:8760,iv:'1w',tv:'W'}
};
export function sma(a,n){const out=Array(a.length).fill(null);let sum=0;for(let i=0;i<a.length;i++){sum+=a[i];if(i>=n)sum-=a[i-n];if(i>=n-1)out[i]=sum/n}return out}
export function ema(a,n){const out=Array(a.length).fill(null);if(a.length<n)return out;let sum=0;for(let i=0;i<n;i++)sum+=a[i];out[n-1]=sum/n;const k=2/(n+1);for(let i=n;i<a.length;i++)out[i]=k*a[i]+(1-k)*out[i-1];return out}
export function rsi(a,n=14){if(a.length<=n)return null;let g=0,l=0;for(let i=1;i<=n;i++){let d=a[i]-a[i-1];g+=Math.max(0,d);l+=Math.max(0,-d)}g/=n;l/=n;for(let i=n+1;i<a.length;i++){let d=a[i]-a[i-1];g=(g*(n-1)+Math.max(0,d))/n;l=(l*(n-1)+Math.max(0,-d))/n}return l===0?(g===0?50:100):100-100/(1+g/l)}
export function atr(rows,n=14){if(rows.length<=n)return null;let total=0;const tr=i=>Math.max(rows[i].h-rows[i].l,Math.abs(rows[i].h-rows[i-1].c),Math.abs(rows[i].l-rows[i-1].c));for(let i=1;i<=n;i++)total+=tr(i);let a=total/n;for(let i=n+1;i<rows.length;i++)a=(a*(n-1)+tr(i))/n;return a}
export function macd(a){const fast=ema(a,12),slow=ema(a,26),line=fast.map((v,i)=>v===null||slow[i]===null?null:v-slow[i]);const signalValid=ema(line.filter(v=>v!==null),9);return {line:line.at(-1),signal:signalValid.at(-1),hist:line.at(-1)-signalValid.at(-1)}}
function candlePattern(rows){if(rows.length<3)return {label:'Chưa đủ dữ liệu',side:0};let p=rows.at(-2),c=rows.at(-1);const body=Math.abs(c.c-c.o),rang=Math.max(c.h-c.l,1e-15),lastBody=Math.abs(p.c-p.o);const low=Math.min(c.o,c.c)-c.l,upper=c.h-Math.max(c.o,c.c);if(body/rang<.12)return {label:'Doji (lưỡng lự)',side:0};if(c.c>c.o&&p.c<p.o&&c.o<=p.c&&c.c>=p.o&&body>=.7*lastBody)return {label:'Nhấn chìm tăng',side:1};if(c.c<c.o&&p.c>p.o&&c.o>=p.c&&c.c<=p.o&&body>=.7*lastBody)return {label:'Nhấn chìm giảm',side:-1};if(low>body*2.1&&upper<body)return {label:'Rút chân (hammer)',side:.5};if(upper>body*2.1&&low<body)return {label:'Rút bóng trên',side:-.5};return {label:c.c>=c.o?'Nến tăng thông thường':'Nến giảm thông thường',side:0}}
function swingLevels(rows,atrValue,price){
 const window=rows.slice(-150),pivotL=[],pivotH=[];
 for(let i=3;i<window.length-3;i++){
  if(window.slice(i-3,i+4).every((r,k)=>k===3||window[i].l<=r.l))pivotL.push(window[i].l);
  if(window.slice(i-3,i+4).every((r,k)=>k===3||window[i].h>=r.h))pivotH.push(window[i].h);
 }
 for(const n of [24,72,144]){const r=rows.slice(-n,-1);if(r.length){pivotL.push(Math.min(...r.map(x=>x.l)));pivotH.push(Math.max(...r.map(x=>x.h)))}}
 const tol=Math.max(price*.0003,atrValue*.3);
 function reduce(list,side){const arr=list.filter(v=>Number.isFinite(v)&&(side==='s'?v<price:v>price)).sort((a,b)=>Math.abs(a-price)-Math.abs(b-price));const found=[];for(const v of arr)if(!found.some(x=>Math.abs(v-x)<tol))found.push(v);return found.slice(0,4)}
 return {supports:reduce(pivotL,'s'),resistances:reduce(pivotH,'r')};
}
function addDynamic(levels,p,ma,A,side){if(Number.isFinite(ma)&&(side==='s'?ma<p:ma>p)&&Math.abs(ma-p)<A*12&&!levels.some(x=>Math.abs(x-ma)<A*.30))levels.push(ma);levels.sort((a,b)=>Math.abs(a-p)-Math.abs(b-p));return levels.slice(0,5)}
const levelText=x=>Number.isFinite(x)?Number(x.toPrecision(7)).toLocaleString('en-US',{maximumFractionDigits:x>=100?2:x>=1?4:x>=.01?6:10}):'—';
export function analyse(rows,horizon,market='crypto'){
 if(!Array.isArray(rows)||rows.length<210)throw Error('Thiếu 210 nến đã đóng để xác nhận MA200');
 for(let i=0;i<rows.length;i++){const r=rows[i];if(![r.t,r.o,r.h,r.l,r.c,r.v].every(Number.isFinite)||r.h<Math.max(r.o,r.c)||r.l>Math.min(r.o,r.c)||r.c<=0||(i&&r.t<=rows[i-1].t))throw Error('Dữ liệu nến không hợp lệ hoặc lặp thời gian')}
 const horizonDef=HORIZONS[horizon];if(!horizonDef)throw Error('Khung thời gian không hỗ trợ');
 const close=rows.map(r=>r.c),n=rows.length,p=close.at(-1),a=atr(rows),mac=macd(close),rv=rsi(close);if(!(a>0)||!Number.isFinite(mac.hist))throw Error('Chưa đủ biến động hoặc chỉ báo để kết luận');
 const ma={20:sma(close,20),50:sma(close,50),100:sma(close,100),200:sma(close,200)};
 const m=Object.fromEntries(Object.entries(ma).map(([k,v])=>[k,v.at(-1)]));
 const changes=rows.slice(-20).map(r=>r.v),volBase=rows.slice(-21,-1).reduce((s,r)=>s+r.v,0)/20,volRatio=volBase>0?rows.at(-1).v/volBase:null;
 const points=[];let score=0;const vote=(name,desc,val)=>{score+=val;points.push({name,desc,val})};
 vote('Cấu trúc MA20/50',`MA20 ${m[20]>=m[50]?'trên':'dưới'} MA50`,m[20]>=m[50]?1:-1);
 vote('Cấu trúc MA50/100',`MA50 ${m[50]>=m[100]?'trên':'dưới'} MA100`,m[50]>=m[100]?1:-1);
 vote('Cấu trúc MA100/200',`MA100 ${m[100]>=m[200]?'trên':'dưới'} MA200`,m[100]>=m[200]?1:-1);
 vote('Giá so với MA200',`Nến đóng ${p>=m[200]?'trên':'dưới'} MA200`,p>=m[200]?1:-1);
 vote('MACD',`MACD ${mac.line>=mac.signal?'trên':'dưới'} Signal; histogram ${mac.hist>=0?'dương':'âm'}`,mac.hist>0?1:mac.hist<0?-1:0);
 vote('RSI (14)',`RSI = ${rv.toFixed(1)}${rv>70?' · quá mua, cảnh giác điều chỉnh':rv<30?' · quá bán, dễ hồi kỹ thuật':''}`,rv>=55&&rv<75?1:rv<=45&&rv>25?-1:0);
 const pat=candlePattern(rows);points.push({name:'Nến đóng gần nhất',desc:pat.label,val:pat.side});score+=pat.side*.5;
 const bb20=m[20],std=Math.sqrt(close.slice(-20).reduce((v,x)=>v+(x-bb20)**2,0)/20);
 const raw=swingLevels(rows,a,p);const levels={supports:addDynamic(raw.supports,p,m[100],a,'s'),resistances:addDynamic(raw.resistances,p,m[100],a,'r')};addDynamic(levels.supports,p,m[200],a,'s');addDynamic(levels.resistances,p,m[200],a,'r');
 let direction=score>=4?'TĂNG MẠNH':score>=1.5?'TĂNG NHẸ':score<=-4?'GIẢM MẠNH':score<=-1.5?'GIẢM NHẸ':'ĐI NGANG / CHƯA RÕ';
 const side=direction.startsWith('TĂNG')?'up':direction.startsWith('GIẢM')?'down':'neutral';
 const hoursPerCandle=(rows.at(-1).t-rows.at(-2).t)/3600000;
 const steps=Math.max(1,horizonDef.hours/Math.max(hoursPerCandle,1/60));
 // sqrt-time approximation based on past single-bar ATR, not a probability distribution or guaranteed boundary.
 const estimatedMove=a*Math.sqrt(steps)*1.1;
 const lowRange=Math.max(p*.0000001,p-estimatedMove),highRange=p+estimatedMove;
 // Use true chart support/resistance as anchors. Do not label hypothetical volatility bands as actual pivots.
 const downside=levels.supports.find(v=>v>=lowRange*.96)||levels.supports.at(-1)||null;
 const upside=levels.resistances.find(v=>v<=highRange*1.04)||levels.resistances.at(-1)||null;
 const s=levels.supports[0]||null,r=levels.resistances[0]||null;
 const band=a*.2,buffer=a*.4;
 const idea=side==='up'?(s&&r?{
   action:'CANH MUA CÓ ĐIỀU KIỆN',zone:[Math.max(s-band,0),s+band],confirm:`Chỉ xét khi giá giữ vùng hỗ trợ và xuất hiện nến xác nhận tăng; RSI không tiếp tục suy yếu.`,stop:Math.max(0,s-buffer),target:r,
   reason:`Vùng mua dựa trên hỗ trợ swing ${levelText(s)}, khoảng đệm ATR(14); mục tiêu tại kháng cự swing ${levelText(r)}.`
 }:null):side==='down'?(s?{
   action:market==='crypto'?'CÂN NHẮC BÁN GIẢM RỦI RO NẾU MẤT HỖ TRỢ':'CÂN NHẮC LỆNH BÁN CÓ ĐIỀU KIỆN',zone:[Math.max(0,s-band),s],confirm:'Chỉ xét khi nến đóng dưới hỗ trợ, lực bán xác nhận; tránh bán đuổi khi RSI quá bán.',stop:s+buffer,target:levels.supports[1]||Math.max(p*.000001,s-1.5*a),
   reason:`Vùng bán dựa trên việc mất swing hỗ trợ ${levelText(s)}; đích ở hỗ trợ thấp hơn hoặc mức mở rộng 1,5 ATR (nếu chưa có swing).`
 }:null):null;
 const rr=idea&&side==='up'&&idea.target>idea.zone[1]&&idea.zone[1]>idea.stop?(idea.target-idea.zone[1])/(idea.zone[1]-idea.stop):idea&&side==='down'&&idea.zone[0]>idea.target&&idea.stop>idea.zone[0]?(idea.zone[0]-idea.target)/(idea.stop-idea.zone[0]):null;
 if(idea){idea.rr=rr;idea.quality=rr!==null&&rr>=1.5?'Có thể theo dõi khi đủ xác nhận':'Tỷ lệ lợi nhuận/rủi ro chưa hấp dẫn hoặc không đủ mức xác định; ưu tiên đứng ngoài';}
 const latest=rows.at(-1),prev=rows.at(-2);
 return {direction,side,score,points,ma:m,maArrays:ma,atr:a,atrPct:a/p*100,rsi:rv,macd:mac,bb:{upper:bb20+2*std,lower:bb20-2*std},levels,idea,price:p,volumeRatio:volRatio,pattern:pat.label,range:{lower:lowRange,upper:highRange,downside,upside,steps,hoursPerCandle},lastCandleTime:latest.t,previousCandle:prev,intervalMin:hoursPerCandle*60};
}
export function analyseSnapshot(data,market='forex'){
 const i=data.indicators||{},x=k=>Number.isFinite(i[k])?i[k]:null,p=x('close'),m20=x('SMA20'),m50=x('SMA50'),m100=x('SMA100'),m200=x('SMA200'),r=x('RSI'),sig=x('MACD.signal'),mac=x('MACD.macd'),atrV=x('ATR');
 if(![p,m20,m50,m100,m200,r].every(Number.isFinite)||!(p>0))throw Error('Nguồn Forex không trả đủ chỉ báo MA20/50/100/200 và RSI');
 const points=[];let score=0;function vote(name,desc,n){score+=n;points.push({name,desc,val:n})}
 vote('Giá / MA200',`Giá ${p>=m200?'trên':'dưới'} MA200`,p>=m200?1:-1);
 vote('MA100 / MA200',`MA100 ${m100>=m200?'trên':'dưới'} MA200`,m100>=m200?1:-1);
 vote('MA50 / MA100',`MA50 ${m50>=m100?'trên':'dưới'} MA100`,m50>=m100?1:-1);
 vote('MA20 / MA50',`MA20 ${m20>=m50?'trên':'dưới'} MA50`,m20>=m50?1:-1);
 if(mac!==null&&sig!==null)vote('MACD',`MACD ${mac>=sig?'trên':'dưới'} Signal`,mac>=sig?1:-1);
 vote('RSI',`RSI ${r.toFixed(1)}`,r>=55&&r<=75?1:r<=45&&r>=25?-1:0);
 const direction=score>=4?'TĂNG MẠNH':score>=1.5?'TĂNG NHẸ':score<=-4?'GIẢM MẠNH':score<=-1.5?'GIẢM NHẸ':'ĐI NGANG / CHƯA RÕ';
 const side=direction.startsWith('TĂNG')?'up':direction.startsWith('GIẢM')?'down':'neutral';
 const s=[x('Pivot.M.Classic.S1'),x('Pivot.M.Classic.S2')].filter(z=>z!==null&&z<p).sort((a,b)=>b-a);
 const rs=[x('Pivot.M.Classic.R1'),x('Pivot.M.Classic.R2')].filter(z=>z!==null&&z>p).sort((a,b)=>a-b);
 const idea=Number.isFinite(atrV)&&atrV>0&&s.length&&rs.length?(side==='up'?{action:'CANH MUA SAU XÁC NHẬN',zone:[s[0]-atrV*.15,s[0]+atrV*.15],stop:s[0]-atrV*.5,target:rs[0],confirm:'Nến giữ hỗ trợ Pivot S1 và tín hiệu đảo chiều tăng',reason:'Vùng Pivot S1; chưa có dữ liệu nến chi tiết để kiểm chứng swing.'}:side==='down'?{action:'CANH BÁN SAU XÁC NHẬN',zone:[s[0]-atrV*.15,s[0]],stop:s[0]+atrV*.5,target:s[1]||s[0]-atrV,confirm:'Nến đóng thủng hỗ trợ S1 và xác nhận tiếp diễn',reason:'Vùng Pivot S1; chưa có dữ liệu nến chi tiết để kiểm chứng swing.'}:null):null;
 return {direction,side,score,points,ma:{20:m20,50:m50,100:m100,200:m200},rsi:r,macd:{line:mac,signal:sig,hist:mac!==null&&sig!==null?mac-sig:null},atr:atrV,levels:{supports:s,resistances:rs},price:p,idea,range:null,source:'Snapshot TradingView (chỉ báo, không có nến gốc)'};
}
