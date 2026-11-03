// Market Mini v4 - server-side source fetcher.
// Public data only. No trading or order placement.
const OK_H = new Set(['1h','5h','12h','24h','1mo','1y']);
const H = {
  '1h': { bi:'5m', cb:300, kr:5, td:'5min', min:5, tv:'|5' },
  '5h': { bi:'15m', cb:900, kr:15, td:'15min', min:15, tv:'|15' },
  '12h': { bi:'1h', cb:3600, kr:60, td:'1h', min:60, tv:'|60' },
  '24h': { bi:'1h', cb:3600, kr:60, td:'1h', min:60, tv:'|60' },
  '1mo': { bi:'1d', cb:86400, kr:1440, td:'1day', min:1440, tv:'' },
  '1y': { bi:'1w', cb:86400, kr:10080, td:'1week', min:10080, tv:'|1W' }
};
const forexMap = {
 'EUR/USD':'FX_IDC:EURUSD', 'GBP/USD':'FX_IDC:GBPUSD', 'USD/JPY':'FX_IDC:USDJPY',
 'USD/CHF':'FX_IDC:USDCHF', 'AUD/USD':'FX_IDC:AUDUSD', 'USD/CAD':'FX_IDC:USDCAD',
 'NZD/USD':'FX_IDC:NZDUSD', 'EUR/JPY':'FX_IDC:EURJPY', 'GBP/JPY':'FX_IDC:GBPJPY',
 'XAU/USD':'OANDA:XAUUSD'
};
const safeFetch = async (url, options={}, timeout=7800) => {
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal:controller.signal, headers:{'Accept':'application/json','User-Agent':'MarketMini/3.0 (market-data-reader)',...(options.headers||{})} });
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data;
  } finally { clearTimeout(timer); }
};
function rowsValid(rows, min=210) {
  const now = Date.now();
  const valid = rows.filter(r => [r.t,r.o,r.h,r.l,r.c,r.v].every(Number.isFinite) && r.c>0 && r.o>0 && r.h>=Math.max(r.o,r.c) && r.l<=Math.min(r.o,r.c) && r.t>now-5*365*86400e3 && r.t<=now)
    .sort((a,b)=>a.t-b.t);
  const uniq=[];
  for(const r of valid) if (!uniq.length || r.t>uniq[uniq.length-1].t) uniq.push(r);
  if(uniq.length<min) throw Error(`Nguồn chỉ cung cấp ${uniq.length} nến đóng (cần ít nhất ${min} nến)`);
  return uniq;
}
async function binance(symbol,h) {
  const errors=[];
  for(const origin of ['https://data-api.binance.vision','https://api.binance.com']){
    try{
      const raw = await safeFetch(`${origin}/api/v3/klines?symbol=${symbol}&interval=${h.bi}&limit=330`);
      if(!Array.isArray(raw)) throw Error('Sai định dạng dữ liệu');
      const all=raw.map(r=>({t:+r[0],o:+r[1],h:+r[2],l:+r[3],c:+r[4],v:+r[5],end:+r[6]}));
      const rows=rowsValid(all.filter(r=>r.end<Date.now()-1000));
      const active=all.filter(r=>r.end>=Date.now()-1000).at(-1)||null;
      let price=rows.at(-1).c,change=null,priceTime=rows.at(-1).end||rows.at(-1).t;
      try{
        const t=await safeFetch(`${origin}/api/v3/ticker/24hr?symbol=${symbol}`,{},3500);
        if(Number.isFinite(+t.lastPrice)&& +t.lastPrice>0){price=+t.lastPrice;priceTime=+t.closeTime||Date.now();}
        if(Number.isFinite(+t.priceChangePercent))change=+t.priceChangePercent;
      }catch(_){}
      return {kind:'candles',rows,stream:'binance',pair:symbol,source:'Binance Spot',quote:'USDT',price,priceTime,change,active,intervalMin:h.min,asOf:Date.now()};
    }catch(e){errors.push(`${origin.includes('vision')?'Binance Data':'Binance API'}: ${e.message}`)}
  }
  throw Error(errors.join(' / '));
}
async function coinbase(symbol,h){
  const coin=symbol.slice(0,-4);
  const pair=`${coin}-USD`;
  const gran=h.bi==='1w'?86400:h.cb;
  const raw=await safeFetch(`https://api.exchange.coinbase.com/products/${pair}/candles?granularity=${gran}`,{},8500);
  if(!Array.isArray(raw))throw Error('Không có dữ liệu cho cặp này');
  const all=raw.map(r=>({t:+r[0]*1000,o:+r[3],h:+r[2],l:+r[1],c:+r[4],v:+r[5]}));
  const rows=rowsValid(all.filter(r=>r.t+gran*1000<Date.now()-1000));
  const active=all.filter(r=>r.t+gran*1000>=Date.now()-1000).at(-1)||null;
  let price=rows.at(-1).c,change=null,priceTime=rows.at(-1).end||rows.at(-1).t;
  try{const stats=await safeFetch(`https://api.exchange.coinbase.com/products/${pair}/stats`,{},3500);
    if(+stats.last>0)price=+stats.last;
    if(+stats.open>0)change=(price/(+stats.open)-1)*100;
  }catch(_){}
  return {kind:'candles',rows,stream:'coinbase',pair,source:'Coinbase Exchange',quote:'USD',price,change,active,intervalMin:gran/60,asOf:Date.now()};
}
async function kraken(symbol,h){
 const base=symbol.slice(0,-4),pair=(base==='BTC'?'XBT':base)+'USD';
 const raw=await safeFetch(`https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${h.kr}`,{},8500);
 if(raw.error?.length)throw Error(raw.error.join('; '));
 const key=Object.keys(raw.result||{}).find(k=>k!=='last');
 if(!key)throw Error('Không có dữ liệu cho cặp này');
 const all=raw.result[key].map(r=>({t:+r[0]*1000,o:+r[1],h:+r[2],l:+r[3],c:+r[4],v:+r[6]}));
 const rows=rowsValid(all.filter(r=>r.t+h.kr*60000<Date.now()-1000));
 const active=all.filter(r=>r.t+h.kr*60000>=Date.now()-1000).at(-1)||null;
 return {kind:'candles',rows,stream:'none',pair,source:'Kraken',quote:'USD',price:rows.at(-1).c,change:null,active,intervalMin:h.kr,asOf:Date.now()};
}
async function crypto(symbol,h){
 const errors=[];
 for(const [name,fn] of [['Binance',binance],['Coinbase',coinbase],['Kraken',kraken]]){
  try{return await fn(symbol,h)}catch(e){errors.push(name+': '+e.message.slice(0,120))}
 }
 throw Error('Các nguồn Crypto không trả nến: '+errors.join(' • '));
}
const keys=['close','change','open','high','low','SMA20','SMA50','SMA100','SMA200','RSI','ATR','ADX','MACD.macd','MACD.signal','BB.upper','BB.lower','Pivot.M.Classic.S1','Pivot.M.Classic.S2','Pivot.M.Classic.R1','Pivot.M.Classic.R2','Recommend.All'];
async function tradingview(symbol,h){
 const ticker=forexMap[symbol];
 const suffix=h.tv;
 const body={symbols:{tickers:[ticker],query:{types:[]}},columns:keys.map(k=>k+suffix)};
 let raw, err;
 for(const scanner of (symbol==='XAU/USD'?['forex','cfd']:['forex'])){
  try{
   raw=await safeFetch(`https://scanner.tradingview.com/${scanner}/scan`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)},8500);
   if(raw?.data?.length)break;
  }catch(e){err=e}
 }
 if(!raw?.data?.length)throw Error('TradingView không trả dữ liệu: '+(err?.message||'Không tìm thấy mã'));
 if(!Array.isArray(raw.data)||!raw.data[0]||!Array.isArray(raw.data[0].d))throw Error('TradingView không trả bộ chỉ báo cho mã này');
 const entry=raw.data[0].d,indicators={};
 for(let i=0;i<keys.length;i++)indicators[keys[i]]=entry[i]===null?null:Number(entry[i]);
 if(!Number.isFinite(indicators.close) || indicators.close<=0 || !Number.isFinite(indicators.RSI) || !Number.isFinite(indicators.SMA20))throw Error('Bộ chỉ báo chưa đầy đủ, không thể đánh giá');
 return {kind:'snapshot',symbol,source:'TradingView Scanner (tham khảo)',provider:ticker,interval:suffix||'1D',indicators,price:indicators.close,quote:symbol==='XAU/USD'?'USD':symbol.slice(-3),asOf:Date.now()};
}
async function twelve(symbol,h,key){
 if(!/^[A-Za-z0-9_-]{6,80}$/.test(key))throw Error('API key không hợp lệ');
 const params=new URLSearchParams({symbol,interval:h.td,outputsize:'330',apikey:key,format:'JSON',timezone:'UTC'});
 const raw=await safeFetch('https://api.twelvedata.com/time_series?'+params,{},9500);
 if(!Array.isArray(raw.values))throw Error(raw.message||'Twelve Data chưa cung cấp nến');
 const rows=rowsValid(raw.values.map(v=>({t:Date.parse(v.datetime.replace(' ','T')+'Z'),o:+v.open,h:+v.high,l:+v.low,c:+v.close,v:+(v.volume||0)})).filter(r=>r.t+h.min*60000<Date.now()-1000));
 return {kind:'candles',rows,stream:'none',pair:symbol,source:'Twelve Data (thời gian theo nguồn)',quote:symbol==='XAU/USD'?'USD':symbol.slice(-3),price:rows.at(-1).c,change:null,intervalMin:h.min,asOf:Date.now()};
}
function json(obj,status=200){return new Response(JSON.stringify(obj),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
export default async function handler(request){
 if(request.method==='GET' && new URL(request.url).searchParams.get('health')==='1') return json({ok:true,service:'Market Mini API v4',time:new Date().toISOString()});
 if(request.method==='GET' && new URL(request.url).searchParams.get('quote')==='1'){
  const s=String(new URL(request.url).searchParams.get('symbol')||'').toUpperCase();
  if(!/^[A-Z0-9]{2,16}USDT$/.test(s))return json({error:'Mã không hợp lệ'},400);
  try {const r=await safeFetch('https://data-api.binance.vision/api/v3/ticker/price?symbol='+s,{},5500);if(!(Number(r.price)>0))throw Error('Giá không hợp lệ');return json({price:Number(r.price),source:'Binance Spot',asOf:Date.now()});}
  catch(e){return json({error:'Không lấy được giá: '+e.message},503)}
 }
 if(request.method!=='POST')return json({error:'Chỉ hỗ trợ POST'},405);
 let body;
 try{body=await request.json()}catch(_){return json({error:'Dữ liệu yêu cầu không hợp lệ'},400)}
 const market=body.market,horizon=body.horizon;
 if(!OK_H.has(horizon) || !['crypto','forex'].includes(market))return json({error:'Thị trường hoặc khung thời gian không hợp lệ'},400);
 const symbol=String(body.symbol||'').toUpperCase(),h=H[horizon];
 if(market==='crypto'&&!/^[A-Z0-9]{2,16}USDT$/.test(symbol))return json({error:'Mã Crypto không hợp lệ'},400);
 if(market==='forex'&&!forexMap[symbol])return json({error:'Mã Forex chưa được hỗ trợ trong bản mini'},400);
 try{
  if(market==='crypto')return json(await crypto(symbol,h));
  const k=String(process.env.TWELVE_DATA_KEY||body.key||'');
  if(k){try{return json(await twelve(symbol,h,k))}catch(e){return json({error:'Twelve Data: '+e.message},503)}}
  return json(await tradingview(symbol,h));
 }catch(e){return json({error:`Nguồn dữ liệu chưa khả dụng: ${e.message}`},503)}
}
