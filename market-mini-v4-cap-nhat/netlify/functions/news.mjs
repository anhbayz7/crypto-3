// Latest relevant headlines. Only links and timestamps from actual providers; no generated news.
const ALIASES={BTC:'Bitcoin BTC',ETH:'Ethereum ETH',SOL:'Solana SOL',XRP:'XRP Ripple',BNB:'BNB Binance',DOGE:'Dogecoin DOGE',ADA:'Cardano ADA',SUI:'Sui crypto',TRX:'Tron TRX',AVAX:'Avalanche AVAX',LINK:'Chainlink LINK',PEPE:'Pepe token',SHIB:'Shiba Inu SHIB',TON:'Toncoin TON',LTC:'Litecoin LTC',DOT:'Polkadot DOT',BCH:'Bitcoin Cash',NEAR:'NEAR Protocol crypto',APT:'Aptos crypto',UNI:'Uniswap UNI'};
const FOREX={ 'EUR/USD':'euro US dollar ECB Federal Reserve', 'GBP/USD':'pound sterling US dollar Bank of England Fed','USD/JPY':'yen US dollar Bank of Japan Fed','AUD/USD':'Australian dollar RBA Fed','USD/CAD':'Canadian dollar Bank of Canada Fed','USD/CHF':'Swiss franc SNB Fed','NZD/USD':'New Zealand dollar RBNZ Fed','EUR/JPY':'euro yen ECB Bank of Japan','GBP/JPY':'pound yen BoE BoJ','XAU/USD':'gold price XAU USD Federal Reserve yields' };
const enc=s=>s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]*>/g,'').trim();
const tag=(s,n)=>{const m=s.match(new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${n}>`,'i'));return m?enc(m[1]):'';};
const get=(url,timeout=7500)=>{const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeout);return fetch(url,{signal:c.signal,headers:{'User-Agent':'Mozilla/5.0 (compatible; MarketMini/4.0)','Accept':'application/rss+xml, application/xml, application/json;q=0.8'}}).then(async r=>{if(!r.ok)throw Error(`HTTP ${r.status}`);return r.text()}).finally(()=>clearTimeout(timer));};
function parseRSS(xml){const items=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(x=>x[1]).map(raw=>{
 const title=tag(raw,'title'),source=tag(raw,'source')||title.split(' - ').at(-1)||'Google News'; const link=tag(raw,'link');const date=Date.parse(tag(raw,'pubDate'));
 return {title,source,link,publishedAt:Number.isFinite(date)?new Date(date).toISOString():null};
 });return items;}
function impact(title){
 const t=title.toLowerCase();
 const topics=[];
 if(/etf|fund inflow|fund outflow|dòng vốn|flows?/.test(t))topics.push('Quỹ ETF/dòng vốn có thể làm thay đổi cung cầu, cần xem số liệu gốc');
 if(/federal reserve|\bfed\b|cpi|inflation|nfp|jobs report|payroll|interest rates?|\becb\b|\bboj\b|bank of england|central bank/.test(t))topics.push('Lãi suất và dữ liệu vĩ mô có thể ảnh hưởng USD, lợi suất và tâm lý thị trường');
 if(/hacked?|exploit|lawsuit|sec |regulat|crackdown|sanction|fraud/.test(t))topics.push('Rủi ro pháp lý/an ninh có thể gây biến động bất thường');
 if(/approv|adoption|partnership/.test(t))topics.push('Tin ứng dụng/chính sách có thể đổi kỳ vọng, chưa xác minh phản ứng giá');
 const positive=/approv|inflow|rally|surge|rises?|gains?|rebound|rate cut|adoption|breakout|soars?|tăng mạnh|dòng vốn vào|được phê duyệt/.test(t);
 const negative=/outflow|hack|lawsuit|crackdown|slump|fall[s]?|plunge|drop|selloff|tariff|inflation jump|rate hike|giảm mạnh|tấn công|bị phạt/.test(t);
 if(!topics.length)topics.push(positive&&negative?'Tin có tín hiệu hai chiều':positive?'Có yếu tố hỗ trợ cần xác minh':negative?'Có yếu tố rủi ro cần xác minh':'Chưa thể xác định chiều tác động');
 return topics.join(' • ');
}
const valid=(list)=>{const now=Date.now(),seen=new Set();return list.filter(n=>{const t=Date.parse(n.publishedAt||'');if(!n.title||!/^https:\/\//.test(n.link||'')||!Number.isFinite(t)||t>now+300000||t<now-72*3600000)return false;const k=n.title.toLowerCase().replace(/\s+/g,' ');if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,8).map(n=>({...n,impact:impact(n.title)}));};
async function google(q){const query=`${q} when:3d`,url='https://news.google.com/rss/search?'+new URLSearchParams({q:query,hl:'en-US',gl:'US',ceid:'US:en'});return valid(parseRSS(await get(url)));}
async function gdelt(q){const u='https://api.gdeltproject.org/api/v2/doc/doc?'+new URLSearchParams({query:'('+q.split(' ').slice(0,3).join(' OR ')+')',mode:'artlist',format:'json',timespan:'3d',maxrecords:'25',sort:'datedesc'});const response=JSON.parse(await get(u));return valid((response.articles||[]).map(a=>({title:a.title,source:a.domain||'GDELT',link:a.url,publishedAt:/^\d{14}$/.test(a.seendate||'')?`${a.seendate.slice(0,4)}-${a.seendate.slice(4,6)}-${a.seendate.slice(6,8)}T${a.seendate.slice(8,10)}:${a.seendate.slice(10,12)}:${a.seendate.slice(12,14)}Z`:a.seendate})));}
export default async function handler(request){
 if(request.method!=='GET')return new Response('Method not allowed',{status:405});
 const u=new URL(request.url),market=u.searchParams.get('market'),sym=(u.searchParams.get('symbol')||'').toUpperCase();
 let q;if(market==='forex')q=FOREX[sym];else if(market==='crypto'&&/^[A-Z0-9]{2,16}USDT$/.test(sym))q=ALIASES[sym.replace(/USDT$/,'')]||sym.replace(/USDT$/,'')+' cryptocurrency';
 if(!q)return json({error:'Mã không hợp lệ',items:[]},400);
 const errs=[];
 for(const [name,fn] of [['Google News RSS',google],['GDELT',gdelt]]){
   try{const items=await fn(q);if(items.length)return json({items,source:name,query:q,asOf:new Date().toISOString(),coverage:'Tin được xuất bản trong 72 giờ; đánh giá tác động chỉ dựa trên tiêu đề.'},200,240);errs.push(name+': không có bài phù hợp trong 72 giờ');}
   catch(e){errs.push(name+': '+e.message)}
 }
 return json({items:[],source:'Không có nguồn',query:q,asOf:new Date().toISOString(),message:'Chưa lấy được tin phù hợp và có thời gian xác thực. '+errs.join(' · ')},200,90);
}
function json(body,status=200,cache=0){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':`public, max-age=${cache}`, 'Netlify-CDN-Cache-Control':`public, max-age=${cache}`, 'X-Content-Type-Options':'nosniff'}})}
