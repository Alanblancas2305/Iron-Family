import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { validateMember } from '../src/shared.js';

const ENV = ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','ADMIN_USER','ADMIN_PASSWORD','SESSION_SECRET'];
function configuration() {
  const count = ENV.filter(k => process.env[k]).length;
  if (!count) return 'demo';
  if (count !== ENV.length || !/^https:\/\//.test(process.env.SUPABASE_URL) || process.env.ADMIN_PASSWORD.length < 12 || process.env.SESSION_SECRET.length < 32) {
    const error = new Error('La conexión está incompleta. Revisa las cinco variables indicadas en LEEME.md.'); error.status = 503; throw error;
  }
  return 'cloud';
}
const sign = text => createHmac('sha256', process.env.SESSION_SECRET).update(text).digest('base64url');
const safeEqual = (a,b) => { const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y); };
export function authenticated(req) {
  try {
    const token = (req.headers.cookie || '').split(';').map(x=>x.trim()).find(x=>x.startsWith('iron_session='))?.slice(13);
    if (!token) return false;
    const [payload,signature,extra] = token.split('.');
    if (extra || !signature || !safeEqual(sign(payload),signature)) return false;
    const value=JSON.parse(Buffer.from(payload,'base64url').toString());
    return value.user===process.env.ADMIN_USER && value.exp>Date.now() && value.exp<Date.now()+9*3600000;
  } catch { return false; }
}
function cookie(req,value,maxAge) {
  const secure=process.env.VERCEL || req.headers['x-forwarded-proto']==='https';
  return `iron_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure?'; Secure':''}`;
}
async function db(path,{method='GET',body}={}) {
  const response=await fetch(process.env.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/'+path,{
    method,headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json',Prefer:'return=representation'},
    ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)
  });
  if(!response.ok){const e=new Error('No se pudo acceder a los registros. Verifica la conexión y que se haya ejecutado database.sql.');e.status=503;throw e;}
  const content=await response.text();return content?JSON.parse(content):null;
}
async function budget(req,kind,max) {
  const ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'local').split(',')[0].trim();
  const key=sign(kind+':'+ip);
  const allowed=await db('rpc/iron_take_budget',{method:'POST',body:{p_key:key,p_limit:max,p_seconds:900}});
  if(!allowed){const e=new Error('Demasiados intentos. Espera 15 minutos antes de volver a intentar.');e.status=429;throw e;}
}
const validId = value => Number.isSafeInteger(Number(value)) && Number(value)>0 && Number(value)<1e12;
function requireMethod(req,allowed) { if(!allowed.includes(req.method)){const e=new Error('Método no permitido.');e.status=405;throw e;} }
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  try {
    const mode=configuration(),action=req.query?.action||new URL(req.url,'http://localhost').searchParams.get('action');
    if(action==='config'){requireMethod(req,['GET']);return res.status(200).json({mode});}
    if(mode!=='cloud')return res.status(503).json({error:'Esta instalación está en modo de demostración local.'});
    if(!['GET','HEAD'].includes(req.method)){
      const origin=req.headers.origin;
      const expected=process.env.APP_ORIGIN||((process.env.VERCEL?'https':'http')+'://'+req.headers.host);
      if(origin&&origin!==expected)return res.status(403).json({error:'Origen no autorizado.'});
      if(req.headers['sec-fetch-site']==='cross-site')return res.status(403).json({error:'Origen no autorizado.'});
      if(!(req.headers['content-type']||'').includes('application/json'))return res.status(415).json({error:'Se requiere JSON.'});
    }
    if(action==='session'){requireMethod(req,['GET']);return res.status(200).json({authenticated:authenticated(req)});}
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    if(JSON.stringify(body).length>16000)return res.status(413).json({error:'Solicitud demasiado grande.'});
    if(action==='login'){
      requireMethod(req,['POST']);await budget(req,'login',12);
      if(!safeEqual(body.user,process.env.ADMIN_USER)||!safeEqual(body.password,process.env.ADMIN_PASSWORD))return res.status(401).json({error:'Usuario o contraseña incorrectos.'});
      const payload=Buffer.from(JSON.stringify({user:process.env.ADMIN_USER,exp:Date.now()+8*3600000,nonce:randomBytes(12).toString('hex')})).toString('base64url');
      res.setHeader('Set-Cookie',cookie(req,payload+'.'+sign(payload),8*3600));return res.status(200).json({ok:true});
    }
    if(action==='logout'){requireMethod(req,['POST']);res.setHeader('Set-Cookie',cookie(req,'',0));return res.status(200).json({ok:true});}
    if(action==='lookup'){
      requireMethod(req,['POST']);await budget(req,'lookup',30);
      if(!validId(body.id)||typeof body.code!=='string'||!/^[A-Z0-9]{6,64}$/i.test(body.code))return res.status(400).json({error:'Revisa tu número y código de acceso.'});
      const result=await db(`iron_members?id=eq.${Number(body.id)}&access_code=eq.${encodeURIComponent(body.code.toUpperCase())}&select=id,name,area,start,months&limit=1`);
      if(!result?.length)return res.status(404).json({error:'No encontramos una membresía con esos datos. Verifica tu número y código en recepción.'});
      return res.status(200).json(result[0]);
    }
    if(!authenticated(req))return res.status(401).json({error:'Inicia sesión para administrar los socios.'});
    if(action!=='members')return res.status(404).json({error:'Ruta no encontrada.'});
    requireMethod(req,['GET','POST','PATCH','DELETE']);
    if(req.method==='GET'){
      // Supabase limits each response; fetch pages so a growing gym never loses rows.
      let rows=[],offset=0;
      while(true){const page=await db(`iron_members?select=*&order=id.desc&limit=500&offset=${offset}`);rows.push(...page);if(page.length<500)break;offset+=500;}
      return res.status(200).json(rows);
    }
    if(req.method==='DELETE'){
      if(!validId(body.id))return res.status(400).json({error:'Número de socio inválido.'});
      const result=await db('iron_members?id=eq.'+Number(body.id),{method:'DELETE'});
      if(!result?.length)return res.status(404).json({error:'Este socio ya no existe.'});
      return res.status(200).json({ok:true});
    }
    let member;try{member=validateMember(body);}catch(e){return res.status(400).json({error:e.message});}
    let result;
    if(req.method==='PATCH'){
      if(!validId(body.id))return res.status(400).json({error:'Número de socio inválido.'});
      result=await db('iron_members?id=eq.'+Number(body.id),{method:'PATCH',body:member});
      if(!result?.length)return res.status(404).json({error:'Este socio ya no existe.'});
    }else result=await db('iron_members',{method:'POST',body:{...member,access_code:randomBytes(10).toString('hex').toUpperCase()}});
    return res.status(req.method==='POST'?201:200).json(result[0]);
  }catch(error){return res.status(error.status||500).json({error:error.status?error.message:'No se pudo completar la solicitud. Inténtalo de nuevo.'});}
}
