const encoder = new TextEncoder();

const schema = [
  `CREATE TABLE IF NOT EXISTS tools (id TEXT PRIMARY KEY, name TEXT NOT NULL, workflow_id TEXT, credit_cost INTEGER NOT NULL DEFAULT 20, enabled INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT, credits INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active', subscription_expires_at TEXT, active_credit_scope TEXT NOT NULL DEFAULT 'personal', active_team_id TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS teams (id TEXT PRIMARY KEY,name TEXT NOT NULL,owner_id INTEGER NOT NULL,credits INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS team_members (team_id TEXT NOT NULL,user_id INTEGER NOT NULL,role TEXT NOT NULL DEFAULT 'editor',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(team_id,user_id))`,
  `CREATE TABLE IF NOT EXISTS team_credit_ledger (id INTEGER PRIMARY KEY AUTOINCREMENT,team_id TEXT NOT NULL,user_id INTEGER NOT NULL,amount INTEGER NOT NULL,reason TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id, team_id)`,
  `CREATE INDEX IF NOT EXISTS idx_team_credit_ledger_team ON team_credit_ledger(team_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, tool_id TEXT, user_email TEXT, status TEXT NOT NULL DEFAULT 'pending', credit_cost INTEGER NOT NULL DEFAULT 0, provider_task_id TEXT, result_url TEXT, error TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS credit_ledger (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, amount INTEGER NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, admin_email TEXT NOT NULL, action TEXT NOT NULL, target_type TEXT, target_id TEXT, detail TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS user_credentials (user_id INTEGER PRIMARY KEY,password_hash TEXT NOT NULL,password_salt TEXT NOT NULL,email_verified INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS user_sessions (id TEXT PRIMARY KEY,user_id INTEGER NOT NULL,token_hash TEXT NOT NULL UNIQUE,csrf_token TEXT NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL DEFAULT '',password_hash TEXT NOT NULL,password_salt TEXT NOT NULL,permissions TEXT NOT NULL DEFAULT '[]',is_owner INTEGER NOT NULL DEFAULT 0,disabled INTEGER NOT NULL DEFAULT 0,created_by TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS canvases (id TEXT PRIMARY KEY,owner_id INTEGER NOT NULL,team_id TEXT,title TEXT NOT NULL DEFAULT '未命名画布',current_revision INTEGER NOT NULL DEFAULT 0,snapshot_json TEXT NOT NULL DEFAULT '{}',visibility TEXT NOT NULL DEFAULT 'private',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,deleted_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS canvas_members (canvas_id TEXT NOT NULL,user_id INTEGER NOT NULL,role TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(canvas_id,user_id))`,
  `CREATE TABLE IF NOT EXISTS canvas_versions (id TEXT PRIMARY KEY,canvas_id TEXT NOT NULL,revision INTEGER NOT NULL,label TEXT,snapshot_json TEXT NOT NULL,created_by INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(canvas_id,revision))`,
  `CREATE TABLE IF NOT EXISTS canvas_shares (id TEXT PRIMARY KEY,canvas_id TEXT NOT NULL,token_hash TEXT NOT NULL UNIQUE,role TEXT NOT NULL DEFAULT 'viewer',expires_at TEXT,revoked_at TEXT,created_by INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS inspiration_favorites (user_id INTEGER NOT NULL,template_id TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(user_id,template_id))`,
  `CREATE INDEX IF NOT EXISTS idx_inspiration_favorites_user ON inspiration_favorites(user_id,created_at)`,
  `CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY,owner_id INTEGER NOT NULL,canvas_id TEXT,name TEXT NOT NULL,mime_type TEXT NOT NULL,size_bytes INTEGER NOT NULL,object_key TEXT NOT NULL UNIQUE,thumbnail_key TEXT,source TEXT NOT NULL DEFAULT 'upload',visibility TEXT NOT NULL DEFAULT 'personal',favorite INTEGER NOT NULL DEFAULT 0,folder TEXT,task_id TEXT,provider_url TEXT,derived_from TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,deleted_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS node_definitions (type TEXT PRIMARY KEY,name TEXT NOT NULL,provider_mode TEXT NOT NULL DEFAULT 'standard',endpoint TEXT,workflow_id TEXT,input_schema TEXT NOT NULL DEFAULT '{}',output_schema TEXT NOT NULL DEFAULT '{}',parameter_mapping TEXT NOT NULL DEFAULT '{}',credit_cost INTEGER NOT NULL DEFAULT 0,timeout_seconds INTEGER NOT NULL DEFAULT 300,enabled INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS canvas_tasks (id TEXT PRIMARY KEY,canvas_id TEXT NOT NULL,node_id TEXT NOT NULL,user_id INTEGER NOT NULL,definition_type TEXT NOT NULL,idempotency_key TEXT NOT NULL UNIQUE,provider_task_id TEXT,status TEXT NOT NULL DEFAULT 'queued',visibility TEXT NOT NULL DEFAULT 'new',input_json TEXT NOT NULL DEFAULT '{}',output_json TEXT NOT NULL DEFAULT '{}',credit_cost INTEGER NOT NULL DEFAULT 0,billing_scope TEXT NOT NULL DEFAULT 'personal',billing_team_id TEXT,error TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS payment_orders (id TEXT PRIMARY KEY,user_id INTEGER NOT NULL,provider TEXT NOT NULL,provider_order_id TEXT,amount_cents INTEGER NOT NULL,credits INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'pending',idempotency_key TEXT NOT NULL UNIQUE,plan_type TEXT,expires_at TEXT,credit_scope TEXT NOT NULL DEFAULT 'personal',team_id TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS media_tasks (id TEXT PRIMARY KEY,user_id INTEGER NOT NULL,kind TEXT NOT NULL,model TEXT NOT NULL,provider TEXT NOT NULL,provider_task_id TEXT,status TEXT NOT NULL DEFAULT 'queued',output_json TEXT NOT NULL DEFAULT '{}',error TEXT,credit_cost INTEGER NOT NULL DEFAULT 0,billing_scope TEXT NOT NULL DEFAULT 'personal',billing_team_id TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS idx_media_tasks_user ON media_tasks(user_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS user_music (id TEXT PRIMARY KEY,owner_id INTEGER NOT NULL,name TEXT NOT NULL,mime_type TEXT NOT NULL DEFAULT 'audio/mpeg',size_bytes INTEGER NOT NULL DEFAULT 0,object_key TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS idx_user_music_owner ON user_music(owner_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS verification_codes (identifier TEXT NOT NULL,purpose TEXT NOT NULL DEFAULT 'login',code_hash TEXT,attempts INTEGER NOT NULL DEFAULT 0,used INTEGER NOT NULL DEFAULT 0,biz_id TEXT,expires_at TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(identifier,purpose))`,
  `CREATE TABLE IF NOT EXISTS model_usage (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,model TEXT NOT NULL,endpoint TEXT,source TEXT,detail TEXT,credits INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS idx_model_usage_user ON model_usage(user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_model_usage_model ON model_usage(model, created_at)`,
  `CREATE TABLE IF NOT EXISTS user_identities (user_id INTEGER NOT NULL,provider TEXT NOT NULL,identifier TEXT NOT NULL,meta TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(provider,identifier))`,
  `CREATE TABLE IF NOT EXISTS oauth_states (state TEXT PRIMARY KEY,provider TEXT NOT NULL,redirect TEXT,expires_at TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS provider_balance_cache (provider TEXT PRIMARY KEY,payload TEXT NOT NULL,fetched_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS provider_manual_balance (provider TEXT PRIMARY KEY,balance REAL NOT NULL,note TEXT NOT NULL DEFAULT '',updated_by TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
];

/* ================= 积分套餐（会员中心） =================
 * 定价规则：平台模型按「厂商参考价 + 0.2 元/次」折算成积分，
 * 1 积分 ≈ 0.01 元；套餐按整数价格 + 赠送积分设计。
 */
const CREDIT_PACKAGES = [
  { id: 'lite', name: '轻享包', priceCents: 990, credits: 1000, tag: '新人首选' },
  { id: 'starter', name: '入门包', priceCents: 2900, credits: 3000, tag: '最受欢迎' },
  { id: 'basic', name: '基础包', priceCents: 4900, credits: 5000, tag: '' },
  { id: 'pro', name: '专业包', priceCents: 9900, credits: 10000, tag: '送 200 积分' },
  { id: 'proplus', name: '专业包Plus', priceCents: 19900, credits: 20000, tag: '送 500 积分' },
  { id: 'elite', name: '优享包', priceCents: 29900, credits: 30000, tag: '送 1000 积分' },
  { id: 'ultimate', name: '至尊包', priceCents: 49900, credits: 50000, tag: '送 2000 积分' },
  { id: 'ultimateplus', name: '超能包', priceCents: 99900, credits: 100000, tag: '送 5000 积分' },
];

const SUBSCRIPTION_PLANS = [
  { id: 'light_monthly', name: '轻享版·月租', priceCents: 3300, days: 30, perks: ['AI 助手免积分无限聊', '画布实时云端同步'], cycle: 'month' },
  { id: 'light_yearly', name: '轻享版·年租', priceCents: 24900, days: 365, perks: ['AI 助手免积分无限聊', '画布实时云端同步', '比月付立省 ¥147'], cycle: 'year' },
  { id: 'monthly', name: '标准版·月租', priceCents: 9900, days: 30, perks: ['AI 助手免积分无限聊', '画布实时云端同步', '生成队列优先'], cycle: 'month' },
  { id: 'yearly', name: '标准版·年租', priceCents: 99000, days: 365, perks: ['AI 助手免积分无限聊', '画布实时云端同步', '生成队列优先', '比月付立省 ¥198'], cycle: 'year' },
  { id: 'pro_monthly', name: '专业版·月租', priceCents: 19900, days: 30, perks: ['标准版全部权益', '生成任务双倍并发', '全模型优先通道'], cycle: 'month' },
  { id: 'pro_yearly', name: '专业版·年租', priceCents: 199000, days: 365, perks: ['标准版全部权益', '生成任务双倍并发', '全模型优先通道', '比月付立省 ¥398'], cycle: 'year' },
  { id: 'elite_monthly', name: '优享版·月租', priceCents: 49900, days: 30, perks: ['专业版全部权益', '独占加速队列', '专属客服通道'], cycle: 'month' },
  { id: 'elite_yearly', name: '优享版·年租', priceCents: 499000, days: 365, perks: ['专业版全部权益', '独占加速队列', '专属客服通道', '比月付立省 ¥998'], cycle: 'year' },
];

const seedTools = [
  ['image-generate', '文生图', 50], ['image-edit', '图片编辑', 45],
  ['video-generate', '文生视频', 100], ['image-video', '图生视频', 80],
  ['digital-human', '数字人', 120], ['lip-sync', '口型同步', 100],
  ['canvas-workflow', 'AI 画布工作流', 120],
];
const seedNodeDefinitions = [
  ['image','图片生成','standard','rhart-image-n-pro/text-to-image',50], ['video','视频生成','standard','kling-v2-1/image-to-video',100],
  ['app','AI 应用','workflow','',30], ['tool','图片工具','standard','rhart-image-n-pro/image-to-image',45],
  ['movie','智能成片','workflow','',80], ['outfit','动作穿搭','workflow','',50], ['video-process','视频处理','workflow','',40], ['supervisor','AI 监工','workflow','',10],
];
const imageModelCredits = new Map([
  ['美梦-Banana-V2',50],['即梦5.0-PRO',50],['美梦G2-低价',35],['美梦-G2-Lite',45],
  ['美梦-Banana-Pro-official',50],['美梦-Bnana-V2-official',50],['美梦-Banana-Pro',50],
  ['美梦-G2',50],['即梦5.0',50],['Midjourney',50],
]);

function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return '*';
  const configured = (env.ALLOWED_ORIGIN || '').split(',').map((v) => v.trim()).filter(Boolean);
  if (configured.includes(origin) || /^https:\/\/[\w-]+\.github\.io$/.test(origin)) return origin;
  return configured[0] || origin;
}

function response(request, env, value, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': allowedOrigin(request, env),
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers': 'Content-Type,Authorization,X-CSRF-Token,X-File-Name,X-File-Size,X-Canvas-Id,X-Visibility,Idempotency-Key,If-Match',
      'access-control-allow-credentials': 'true',
      'vary': 'Origin',
      ...extraHeaders,
    },
  });
}

function openClawGatewayBase(env) {
  return String(env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789').replace(/\/+$/, '');
}

async function openClawHealth(env) {
  const base = openClawGatewayBase(env);
  const headers = {};
  if (env.OPENCLAW_GATEWAY_TOKEN) {
    headers.authorization = `Bearer ${env.OPENCLAW_GATEWAY_TOKEN}`;
    headers['x-openclaw-token'] = env.OPENCLAW_GATEWAY_TOKEN;
  }
  const res = await fetch(`${base}/health`, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(3500),
  });
  const type = res.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await res.json().catch(() => ({})) : { text: await res.text().catch(() => '') };
  if (!res.ok) throw Object.assign(new Error(data?.error || data?.message || `OpenClaw 网关返回 ${res.status}`), { status: res.status });
  return { base, data };
}

function htmlPage(title, message, target, extraHeaders = {}) {
  const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const redirectScript = target
    ? `<script>location.replace(${JSON.stringify(target)})</script><meta http-equiv="refresh" content="0;url=${encodeURIComponent(target)}">`
    : '';
  return new Response(
    `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${esc(title)}</title>${redirectScript}<style>body{font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;background:#0d0d12;color:#f2efe8;min-height:100vh;display:grid;place-items:center;margin:0}main{text-align:center;padding:32px}h2{margin:0 0 10px}p{color:#a8a29a;margin:0}</style></head><body><main><h2>${esc(message)}</h2><p>${target ? "正在跳转回网站…" : "请关闭本窗口返回网站"}</p></main></body></html>`,
    { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', ...extraHeaders } },
  );
}

const allowedMediaTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']);
const parseCookies = (request) => Object.fromEntries((request.headers.get('cookie') || '').split(';').map((item) => item.trim().split('=').map(decodeURIComponent)).filter((pair) => pair.length === 2));
const randomToken = () => toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
const sha256 = async (value) => toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));

async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return toBase64Url(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256)));
}


const normalizePhone = (value) => String(value || '').replace(/[\s-]/g, '').replace(/^\+?86/, '');
const adminAccountToEmail = (value) => {
  const account = String(value || '').trim().toLowerCase();
  const phone = normalizePhone(account);
  return /^1\d{10}$/.test(phone) ? `p${phone}@emeng.local` : account;
};
async function passwordLoginUser(env, account) {
  const raw = String(account || '').trim().toLowerCase();
  const phone = normalizePhone(raw);
  let row = null;
  if (/^1\d{10}$/.test(phone)) {
    const schema = await userIdentitySchema(env);
    const identity = await env.DB.prepare(`SELECT user_id FROM user_identities WHERE provider='phone' AND ${schema.col}=?`).bind(phone).first();
    if (identity) row = await env.DB.prepare(`SELECT u.*,c.password_hash,c.password_salt FROM users u JOIN user_credentials c ON c.user_id=u.id WHERE u.id=?`).bind(identity.user_id).first();
    if (!row) row = await env.DB.prepare(`SELECT u.*,c.password_hash,c.password_salt FROM users u JOIN user_credentials c ON c.user_id=u.id WHERE u.email=?`).bind(`p${phone}@emeng.local`).first();
    if (row) row.phone = phone;
    return row;
  }
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw)) {
    row = await env.DB.prepare(`SELECT u.*,c.password_hash,c.password_salt FROM users u JOIN user_credentials c ON c.user_id=u.id WHERE u.email=?`).bind(raw).first();
    if (row) {
      const schema = await userIdentitySchema(env);
      const identity = await env.DB.prepare(`SELECT ${schema.col} AS identifier FROM user_identities WHERE provider='phone' AND user_id=? LIMIT 1`).bind(row.id).first();
      if (identity?.identifier) row.phone = identity.identifier;
    }
  }
  return row;
}
const rfc3986Encode = (value) => encodeURIComponent(value).replace(/\+/g, '%20').replace(/\*/g, '%2A').replace(/%7E/g, '~');


async function checkActiveSubscription(env, userId) {
  // 测试 bypass：仅当 env 显式声明 __test_bypass_subscription 时生效，production 永远不会有这个 key。
  if (env.__test_bypass_subscription === true) {
    return { active: true, expires_at: new Date(Date.now() + 30 * 86400000).toISOString() };
  }
  const row = await env.DB.prepare(`SELECT subscription_expires_at, status FROM users WHERE id=?`).bind(userId).first();
  if (!row) return { active: false, code: 'NO_USER', message: '账号不存在' };
  if (row.status && row.status !== 'active') return { active: false, code: 'ACCOUNT_DISABLED', message: '账号已被停用' };
  const exp = row.subscription_expires_at;
  if (!exp) return { active: false, code: 'SUBSCRIPTION_EXPIRED', message: '尚未订阅，请先购买月租' };
  if (new Date(exp).getTime() <= Date.now()) return { active: false, code: 'SUBSCRIPTION_EXPIRED', message: '订阅已到期，请续费后继续使用', expires_at: exp };
  return { active: true, expires_at: exp };
}

async function userIsPremium(env, userId) {
  // 累计充值满 30 元（3000 分）解锁高级模型；测试环境可显式覆盖
  if (env.__test_force_premium === true) return true;
  try {
    if (!env.DB || !userId) return false;
    const row = await env.DB.prepare(`SELECT COALESCE(SUM(amount_cents),0) AS paid_cents FROM payment_orders WHERE user_id=? AND status='paid'`).bind(userId).first();
    return Number(row?.paid_cents || 0) >= 3000;
  } catch {
    return false;
  }
}

async function userIdentitySchema(env) {
  // 生产/本地表结构漂移兼容：老库用 provider_subject，新库用 identifier
  if (env.__identitySchema) return env.__identitySchema;
  const schema = { col: 'identifier', hasMeta: true };
  try {
    const res = await env.DB.prepare('PRAGMA table_info(user_identities)').all();
    const names = (res.results || []).map((c) => String(c.name || ''));
    if (!names.includes('identifier') && names.includes('provider_subject')) schema.col = 'provider_subject';
    schema.hasMeta = names.includes('meta');
  } catch {}
  env.__identitySchema = schema;
  return schema;
}

async function recordModelUsage(env, userId, model, endpoint, source, detail, credits = 0) {
  // 测试 bypass：__test_bypass_usage=true 时直接跳过写流水，避免测试环境缺少 DB 时抛错。
  if (env.__test_bypass_usage === true) return;
  if (!env.DB || !userId) return;
  await env.DB.prepare(`INSERT INTO model_usage (user_id,model,endpoint,source,detail,credits) VALUES (?,?,?,?,?,?)`)
    .bind(userId, String(model || '').slice(0, 120), String(endpoint || '').slice(0, 200), String(source || '').slice(0, 60), String(detail || '').slice(0, 200), credits | 0).run();
}

async function aliyunSignedPost(env, params, host) {
  const accessKeyId = String(env.SMS_ACCESS_KEY_ID || '').trim();
  const accessKeySecret = String(env.SMS_ACCESS_KEY_SECRET || '').trim();
  if (!accessKeyId || !accessKeySecret) return { ok: false, status: 0, error: '短信服务密钥未配置，请在环境变量中设置 SMS_ACCESS_KEY_ID / SMS_ACCESS_KEY_SECRET' };
  const merged = {
    Format: 'JSON',
    RegionId: 'cn-hangzhou',
    SignatureMethod: 'HMAC-SHA1',
    SignatureVersion: '1.0',
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    AccessKeyId: accessKeyId,
    ...params,
  };
  merged.SignatureNonce = crypto.randomUUID();
  const canonicalized = Object.keys(merged).sort().map((key) => `${rfc3986Encode(key)}=${rfc3986Encode(String(merged[key]))}`).join('&');
  const stringToSign = `POST&${rfc3986Encode('/')}&${rfc3986Encode(canonicalized)}`;
  const key = await crypto.subtle.importKey('raw', encoder.encode(`${accessKeySecret}&`), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sigBytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(stringToSign)));
  merged.Signature = btoa(String.fromCharCode(...sigBytes));
  const body = Object.keys(merged).sort().map((k) => `${k}=${encodeURIComponent(String(merged[k]))}`).join('&');
  try {
    const res = await fetch(`https://${host}/`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: true, status: res.status, data };
  } catch (error) {
    return { ok: false, status: 0, error: `短信网关请求失败：${error.message}` };
  }
}

async function aliyunSendSms(env, phone, code) {
  const signName = String(env.SMS_SIGN_NAME || '').trim();
  const templateCode = String(env.SMS_TEMPLATE_CODE || '').trim();
  if (!signName || !templateCode) return { ok: false, status: 0, config: true, error: '短信通道未配置完整：请在服务器环境变量设置 SMS_SIGN_NAME 和 SMS_TEMPLATE_CODE，或先使用邮箱密码注册/登录' };
  const params = {
    Action: 'SendSms',
    Version: '2017-05-25',
    PhoneNumbers: phone,
    SignName: signName,
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify({ code }),
  };
  const result = await aliyunSignedPost(env, params, 'dysmsapi.aliyuncs.com');
  if (!result.ok) return result;
  if (result.data.Code === 'OK') return { ok: true };
  const raw = result.data.Message || result.data.Code || `短信发送失败（HTTP ${result.status}）`;
  const error = /not authorized|Unauthorized|NoPermission/i.test(raw)
    ? '阿里云短信账号无权发送当前签名/模板，请检查 RAM 权限、短信签名 SMS_SIGN_NAME 和模板 SMS_TEMPLATE_CODE'
    : raw;
  return { ok: false, error };
}

async function dypnsSendVerifyCode(env, phone) {
  const schemeName = String(env.SMS_DYPNS_SCHEME_NAME || '').trim();
  if (!schemeName) return { ok: false, error: '短信认证方案未配置：请在 dypns 控制台创建方案后，把 SchemeName 写入环境变量 SMS_DYPNS_SCHEME_NAME' };
  const params = {
    Action: 'SendSmsVerifyCode',
    Version: '2017-05-25',
    SchemeName: schemeName,
    PhoneNumber: phone,
    CountryCode: '86',
    SignName: String(env.SMS_DYPNS_SIGN_NAME || '恒创联众').trim(),
    TemplateCode: String(env.SMS_DYPNS_TEMPLATE_CODE || '100001').trim(),
    TemplateParam: JSON.stringify({ code: '##code##', min: 5 }),
    CodeType: 1,
    CodeLength: 6,
    ValidTime: 300,
    ReturnVerifyCode: false,
  };
  const result = await aliyunSignedPost(env, params, 'dypnsapi.aliyuncs.com');
  if (!result.ok) return result;
  if (result.data.Code === 'OK') {
    return { ok: true, bizId: String(result.data.Model?.BizId || '').slice(0, 120) };
  }
  const raw = result.data.Message || result.data.Code || `短信认证下发失败（HTTP ${result.status}）`;
  const error = /not authorized|Unauthorized|NoPermission/i.test(raw)
    ? '阿里云短信认证账号无权发送当前方案，请检查 RAM 权限和 SMS_DYPNS_SCHEME_NAME'
    : raw;
  return { ok: false, error };
}

async function dypnsCheckVerifyCode(env, phone, code) {
  const schemeName = String(env.SMS_DYPNS_SCHEME_NAME || '').trim();
  if (!schemeName) return { ok: false, error: '短信认证方案未配置，请联系管理员设置 SMS_DYPNS_SCHEME_NAME' };
  const params = {
    Action: 'CheckSmsVerifyCode',
    Version: '2017-05-25',
    SchemeName: schemeName,
    PhoneNumber: phone,
    VerifyCode: String(code || '').trim(),
    CountryCode: '86',
  };
  const result = await aliyunSignedPost(env, params, 'dypnsapi.aliyuncs.com');
  if (!result.ok) return result;
  if (result.data.Code !== 'OK') return { ok: false, error: result.data.Message || result.data.Code || `验证码校验失败（HTTP ${result.status}）` };
  const verifyResult = result.data.Model?.VerifyResult;
  if (verifyResult === 'PASS') return { ok: true };
  if (verifyResult === 'UNKNOWN') return { ok: false, error: '验证码错误或已过期' };
  return { ok: false, error: `验证码校验结果未知（VerifyResult=${verifyResult}）` };
}

const setSessionCookie = (session) => `emeng_session=${encodeURIComponent(session.token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${new Date(session.expires).toUTCString()}`;

async function createUserSession(env, userId) {
  const token = randomToken(), csrf = randomToken(), id = crypto.randomUUID();
  const expires = new Date(Date.now() + 30 * 86400000).toISOString();
  await env.DB.prepare(`INSERT INTO user_sessions (id,user_id,token_hash,csrf_token,expires_at) VALUES (?,?,?,?,?)`).bind(id, userId, await sha256(token), csrf, expires).run();
  return { token, csrf, expires };
}

async function requireUser(request, env, csrf = false) {
  // 测试 bypass：仅当 env 显式声明 __test_session_user_id 时生效，production 永远不会有这个 key。
  // 同时一并跳过 CSRF 校验（测试环境不模拟完整 token/csrf 关系）。
  if (env.__test_session_user_id) {
    const future = new Date(Date.now() + 30 * 86400000).toISOString();
    return {
      user_id: Number(env.__test_session_user_id),
      email: 'test@example.com',
      name: 'test',
      credits: 0,
      status: 'active',
      subscription_expires_at: future,
      csrf_token: 'test-csrf',
    };
  }
  const token = parseCookies(request).emeng_session;
  if (!token) return null;
  const session = await env.DB.prepare(`SELECT s.*,u.email,u.name,u.credits,u.status,u.subscription_expires_at FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>CURRENT_TIMESTAMP`).bind(await sha256(token)).first();
  if (!session || session.status !== 'active') return null;
  if (csrf && request.headers.get('x-csrf-token') !== session.csrf_token) return null;
  return session;
}

async function canvasAccess(env, canvasId, userId, write = false) {
  const item = await env.DB.prepare(`
    SELECT c.*,COALESCE(cm.role,tm.role) AS role,t.name AS team_name
    FROM canvases c
    LEFT JOIN canvas_members cm ON cm.canvas_id=c.id AND cm.user_id=?
    LEFT JOIN team_members tm ON tm.team_id=c.team_id AND tm.user_id=?
    LEFT JOIN teams t ON t.id=c.team_id
    WHERE c.id=? AND c.deleted_at IS NULL AND (cm.user_id IS NOT NULL OR tm.user_id IS NOT NULL)
  `).bind(userId, userId, canvasId).first();
  if (!item || (write && !['owner', 'admin', 'editor'].includes(item.role))) return null;
  return item;
}

async function ensureDefaultTeam(env, userId) {
  let team = await env.DB.prepare(`
    SELECT t.id,t.name,t.credits,t.owner_id,t.status,tm.role
    FROM teams t JOIN team_members tm ON tm.team_id=t.id
    WHERE tm.user_id=? AND t.status='active'
    ORDER BY CASE tm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,t.created_at
    LIMIT 1
  `).bind(userId).first();
  if (team) return team;
  const user = await env.DB.prepare(`SELECT id,name,email FROM users WHERE id=?`).bind(userId).first();
  if (!user) return null;
  const id = `team-${userId}`;
  const baseName = String(user.name || user.email || `用户${userId}`).trim().slice(0, 40) || `用户${userId}`;
  await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO teams (id,name,owner_id,credits) VALUES (?,?,?,0)`).bind(id, `${baseName}的团队`, userId),
    env.DB.prepare(`INSERT OR IGNORE INTO team_members (team_id,user_id,role) VALUES (?,?,?)`).bind(id, userId, 'owner'),
  ]);
  return env.DB.prepare(`SELECT t.id,t.name,t.credits,t.owner_id,t.status,tm.role FROM teams t JOIN team_members tm ON tm.team_id=t.id WHERE t.id=? AND tm.user_id=?`).bind(id, userId).first();
}

async function walletsForUser(env, userId) {
  await ensureDefaultTeam(env, userId);
  const account = await env.DB.prepare(`SELECT id,credits,active_credit_scope,active_team_id FROM users WHERE id=?`).bind(userId).first();
  if (!account) return null;
  const rows = await env.DB.prepare(`
    SELECT t.id,t.name,t.credits,tm.role
    FROM teams t JOIN team_members tm ON tm.team_id=t.id
    WHERE tm.user_id=? AND t.status='active'
    ORDER BY CASE tm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,t.created_at
  `).bind(userId).all();
  const teams = (rows.results || []).map((team) => ({ id: team.id, name: team.name, credits: Number(team.credits) || 0, role: team.role }));
  const requestedTeam = teams.find((team) => team.id === account.active_team_id);
  const active = account.active_credit_scope === 'team' && requestedTeam
    ? { scope: 'team', teamId: requestedTeam.id, name: requestedTeam.name, credits: requestedTeam.credits }
    : { scope: 'personal', teamId: null, name: '个人积分', credits: Number(account.credits) || 0 };
  return { personal: { scope: 'personal', credits: Number(account.credits) || 0 }, teams, active };
}

async function resolveBillingWallet(env, userId, requestedScope = '', requestedTeamId = '') {
  const wallets = await walletsForUser(env, userId);
  if (!wallets) return null;
  const scope = requestedScope || wallets.active.scope;
  if (scope === 'team') {
    const teamId = requestedTeamId || wallets.active.teamId;
    const team = wallets.teams.find((item) => item.id === teamId);
    return team ? { scope: 'team', teamId: team.id, name: team.name, credits: team.credits, role: team.role } : null;
  }
  return { scope: 'personal', teamId: null, name: '个人积分', credits: wallets.personal.credits, role: 'owner' };
}

async function authorizeCollaborationRequest(request, env, canvasId, knownUser = null) {
  const user = knownUser || await requireUser(request, env, false);
  if (!user) return { ok: false, status: 401, error: '请先登录或刷新会话' };
  const canvas = await canvasAccess(env, canvasId, user.user_id);
  if (!canvas) return { ok: false, status: 403, error: '无画布权限' };
  return {
    ok: true,
    user: { user_id: Number(user.user_id), name: String(user.name || '协作者'), email: String(user.email || '') },
    canvas,
  };
}

function validateCanvasDocument(value) {
  if (!value || typeof value !== 'object') throw new Error('画布数据必须是对象');
  if (value.schema && value.schema !== 'emeng-canvas/v1') throw new Error('不支持的画布版本');
  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges) || !Array.isArray(value.pages)) throw new Error('画布缺少 nodes、edges 或 pages');
  if (value.nodes.length > 5000 || value.edges.length > 10000 || value.pages.length > 200) throw new Error('画布内容超过上限');
  const ids = new Set(value.nodes.map((node) => String(node.id)));
  if (ids.size !== value.nodes.length) throw new Error('节点 ID 重复');
  for (const edge of value.edges) {
    const from = String(edge.from ?? edge.source), to = String(edge.to ?? edge.target);
    if (!ids.has(from) || !ids.has(to)) throw new Error('连线引用了不存在的节点');
  }
  if (value.groups !== undefined) {
    if (!Array.isArray(value.groups) || value.groups.length > 1000) throw new Error('画布分组数据无效');
    const groupIds = new Set(), groupedNodes = new Set();
    for (const group of value.groups) {
      const groupId = String(group?.id || '');
      if (!groupId || groupIds.has(groupId) || !Array.isArray(group.nodeIds)) throw new Error('画布分组数据无效');
      groupIds.add(groupId);
      for (const nodeId of group.nodeIds) {
        const id = String(nodeId);
        if (!ids.has(id)) throw new Error('分组引用了不存在的节点');
        if (groupedNodes.has(id)) throw new Error('节点不能同时属于多个分组');
        groupedNodes.add(id);
      }
    }
  }
  return value;
}

function topologicalOrder(nodes, edges) {
  const ids = nodes.map((node) => String(node.id)), indegree = new Map(ids.map((id) => [id, 0])), next = new Map(ids.map((id) => [id, []]));
  for (const edge of edges) { const from = String(edge.from ?? edge.source), to = String(edge.to ?? edge.target); if (!indegree.has(from) || !indegree.has(to)) throw new Error('连线引用了不存在的节点'); indegree.set(to, indegree.get(to) + 1); next.get(from).push(to); }
  const queue = ids.filter((id) => indegree.get(id) === 0), result = [];
  while (queue.length) { const id = queue.shift(); result.push(id); for (const to of next.get(id)) { indegree.set(to, indegree.get(to) - 1); if (indegree.get(to) === 0) queue.push(to); } }
  if (result.length !== ids.length) throw new Error('工作流存在循环连线');
  return result;
}

const toBase64Url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const encodePart = (value) => toBase64Url(encoder.encode(JSON.stringify(value)));

async function signature(message, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message))));
}

const ADMIN_PERMISSIONS = ['users', 'nodes', 'tools', 'tasks', 'runninghub', 'logs', 'settings', 'admins'];
const can = (admin, perm) => Boolean(admin && (admin.is_owner || (admin.permissions || []).includes('*') || (admin.permissions || []).includes(perm)));

async function issueToken(admin, secret) {
  const body = encodePart({ email: admin.email, admin_id: admin.id, name: admin.name, permissions: admin.permissions, is_owner: admin.is_owner, exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60 });
  return `${body}.${await signature(body, secret)}`;
}

async function requireAdmin(request, env) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token || !env.SESSION_SECRET) return null;
  const [body, supplied] = token.split('.');
  if (!body || !supplied || supplied !== await signature(body, env.SESSION_SECRET)) return null;
  try {
    const normalized = body.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')));
    if (payload.exp <= Date.now() / 1000) return null;
    const row = await env.DB.prepare(`SELECT id,email,name,permissions,is_owner,disabled FROM admins WHERE email=?`).bind(payload.email).first();
    if (!row || Number(row.disabled) === 1) return null;
    let permissions = [];
    try { permissions = JSON.parse(row.permissions || '[]'); } catch {}
    return { email: row.email, admin_id: row.id, name: row.name, permissions, is_owner: Number(row.is_owner) === 1 };
  } catch { return null; }
}

async function ensureOwnerAdmin(env) {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return;
  const email = String(env.ADMIN_EMAIL).trim().toLowerCase();
  const existing = await env.DB.prepare(`SELECT id,is_owner FROM admins WHERE email=?`).bind(email).first();
  if (!existing) {
    const salt = randomToken();
    const hash = await passwordHash(String(env.ADMIN_PASSWORD), salt);
    await env.DB.prepare(`INSERT INTO admins (email,name,password_hash,password_salt,permissions,is_owner) VALUES (?,?,?,?,?,1)`)
      .bind(email, '超级管理员', hash, salt, JSON.stringify(['*'])).run();
  } else if (Number(existing.is_owner) !== 1) {
    await env.DB.prepare(`UPDATE admins SET is_owner=1,permissions=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(JSON.stringify(['*']), existing.id).run();
  }
}

async function ensureColumn(env, table, name, ddl) {
  const info = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
  if (!info.results.some((column) => column.name === name)) {
    await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${ddl}`).run();
  }
}

async function runColumnMigrations(env) {
  await ensureColumn(env, 'assets', 'visibility', "visibility TEXT NOT NULL DEFAULT 'personal'");
  await ensureColumn(env, 'assets', 'favorite', 'favorite INTEGER NOT NULL DEFAULT 0');
  await ensureColumn(env, 'assets', 'folder', 'folder TEXT');
  await ensureColumn(env, 'assets', 'task_id', 'task_id TEXT');
  await ensureColumn(env, 'assets', 'provider_url', 'provider_url TEXT');
  await ensureColumn(env, 'assets', 'derived_from', 'derived_from TEXT');
  await ensureColumn(env, 'canvas_tasks', 'visibility', "visibility TEXT NOT NULL DEFAULT 'new'");
  await ensureColumn(env, 'canvas_tasks', 'billing_scope', "billing_scope TEXT NOT NULL DEFAULT 'personal'");
  await ensureColumn(env, 'canvas_tasks', 'billing_team_id', 'billing_team_id TEXT');
  await ensureColumn(env, 'media_tasks', 'billing_scope', "billing_scope TEXT NOT NULL DEFAULT 'personal'");
  await ensureColumn(env, 'media_tasks', 'billing_team_id', 'billing_team_id TEXT');
  await ensureColumn(env, 'canvases', 'team_id', 'team_id TEXT');
  await ensureColumn(env, 'users', 'subscription_expires_at', 'subscription_expires_at TEXT');
  await ensureColumn(env, 'users', 'active_credit_scope', "active_credit_scope TEXT NOT NULL DEFAULT 'personal'");
  await ensureColumn(env, 'users', 'active_team_id', 'active_team_id TEXT');
  await ensureColumn(env, 'payment_orders', 'plan_type', 'plan_type TEXT');
  await ensureColumn(env, 'payment_orders', 'expires_at', 'expires_at TEXT');
  await ensureColumn(env, 'payment_orders', 'credit_scope', "credit_scope TEXT NOT NULL DEFAULT 'personal'");
  await ensureColumn(env, 'payment_orders', 'team_id', 'team_id TEXT');
  await ensureColumn(env, 'verification_codes', 'biz_id', 'biz_id TEXT');
  await ensureColumn(env, 'credit_ledger', 'reference_id', 'reference_id TEXT');
  await ensureColumn(env, 'team_credit_ledger', 'reference_id', 'reference_id TEXT');
  await ensureOwnerAdmin(env);
}

async function initialize(env) {
  if (!env.DB) throw new Error('D1 database binding DB is missing');
  const SCHEMA_VERSION = 54;
  const g = globalThis;
  g.__emengSchemaInit = g.__emengSchemaInit || new WeakMap();
  const entry = g.__emengSchemaInit.get(env.DB);
  if (entry && entry.version === SCHEMA_VERSION) return;
  if (entry && entry.promise) {
    try { await entry.promise; } catch (error) { g.__emengSchemaInit.delete(env.DB); throw error; }
    return;
  }
  // 冷实例快速体检：关键表齐全就直接跳过整套建表 DDL，但列迁移（PRAGMA+条件 ALTER，成本极低）仍然每次执行
  try {
    const required = ['assets', 'users', 'tools', 'tasks', 'canvas_tasks', 'node_definitions', 'provider_balance_cache', 'provider_manual_balance', 'verification_codes', 'user_identities', 'user_credentials', 'user_music', 'teams', 'team_members', 'team_credit_ledger', 'inspiration_favorites'];
    const rows = await env.DB.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name IN (${required.map(() => '?').join(',')})`).bind(...required).all();
    if (rows.results.length === required.length) {
      await runColumnMigrations(env);
      g.__emengSchemaInit.set(env.DB, { version: SCHEMA_VERSION });
      return;
    }
  } catch (_) { /* 体检失败走完整初始化 */ }
  const promise = (async () => {
      try {
        if (typeof env.DB.batch === 'function' && !env.DB.__sequentialInit) {
          await env.DB.batch(schema.map((sql) => env.DB.prepare(sql)));
        } else {
          throw new Error('sequential fallback');
        }
      } catch (_) {
        for (const sql of schema) {
          await env.DB.prepare(sql).run();
        }
      }
      await runColumnMigrations(env);
      for (const [id, name, cost] of seedTools) {
        await env.DB.prepare(`INSERT OR IGNORE INTO tools (id,name,credit_cost) VALUES (?,?,?)`).bind(id, name, cost).run();
      }
      for (const [type,name,mode,endpoint,cost] of seedNodeDefinitions) {
        await env.DB.prepare(`INSERT OR IGNORE INTO node_definitions (type,name,provider_mode,endpoint,credit_cost) VALUES (?,?,?,?,?)`).bind(type,name,mode,endpoint,cost).run();
      }
  })();
  g.__emengSchemaInit.set(env.DB, { promise });
  try {
    await promise;
    g.__emengSchemaInit.set(env.DB, { version: SCHEMA_VERSION });
  } catch (error) {
    g.__emengSchemaInit.delete(env.DB);
    throw error;
  }
}

async function audit(env, admin, action, type, id, detail = '') {
  await env.DB.prepare(`INSERT INTO audit_logs (admin_email,action,target_type,target_id,detail) VALUES (?,?,?,?,?)`)
    .bind(admin, action, type, id, detail).run();
}

async function runningHubPost(env, path, payload, account = false) {
  if (!env.RUNNINGHUB_API_KEY) throw new Error('RunningHub API Key 尚未配置');
  const url = account ? 'https://www.runninghub.cn/uc/openapi/accountStatus' : `https://www.runninghub.cn/openapi/v2${path}`;
  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.RUNNINGHUB_API_KEY}` },
    body: JSON.stringify(payload),
  });
  const data = await upstream.json().catch(() => ({ message: `RunningHub 返回非 JSON：${upstream.status}` }));
  if (!upstream.ok || (data.code !== undefined && data.code !== 0)) throw new Error(data.msg || data.message || `RunningHub 请求失败：${upstream.status}`);
  return data;
}

async function runningHubLegacyPost(env, path, payload) {
  if (!env.RUNNINGHUB_API_KEY) throw new Error('RunningHub API Key 尚未配置');
  const upstream = await fetch(`https://www.runninghub.cn${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.RUNNINGHUB_API_KEY}` },
    body: JSON.stringify({ apiKey: env.RUNNINGHUB_API_KEY, ...payload }),
  });
  const data = await upstream.json().catch(() => ({ msg: `RunningHub 返回非 JSON：${upstream.status}` }));
  if (!upstream.ok || data.code !== 0) throw new Error(data.msg || `RunningHub 请求失败：${upstream.status}`);
  return data;
}

async function runningHubUploadBinary(env, fileBlob, fileName) {
  if (!env.RUNNINGHUB_API_KEY) throw new Error('RunningHub API Key 尚未配置');
  const form = new FormData();
  form.append('file', fileBlob, fileName);
  const upstream = await fetch('https://www.runninghub.cn/openapi/v2/media/upload/binary', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RUNNINGHUB_API_KEY}` },
    body: form,
  });
  const data = await upstream.json().catch(() => ({ message: `RunningHub 返回非 JSON：${upstream.status}` }));
  if (!upstream.ok || (data.code !== undefined && data.code !== 0)) throw new Error(data.msg || data.message || `RunningHub 上传失败：${upstream.status}`);
  return data.data?.download_url || data.download_url;
}

function inferAssetMime(raw, hint) {
  const text = String(hint || raw || '').toLowerCase();
  if (text.includes('video') || /\.(mp4|webm|mov|m4v|avi)(\?|$)/i.test(raw || '')) return 'video/mp4';
  if (/\.jpe?g(\?|$)/i.test(raw || '')) return 'image/jpeg';
  if (/\.webp(\?|$)/i.test(raw || '')) return 'image/webp';
  if (/\.gif(\?|$)/i.test(raw || '')) return 'image/gif';
  if (/\.svg(\?|$)/i.test(raw || '')) return 'image/svg+xml';
  if (/\.png(\?|$)/i.test(raw || '')) return 'image/png';
  return 'image/png';
}

function assetExt(mime) {
  const map = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/webm': 'webm', 'audio/mp4': 'm4a' };
  return map[mime] || 'png';
}

async function storeGeneratedAsset(env, assetId, rawUrl, mime) {
  if (!env.MEDIA || !rawUrl) return;
  const response = await fetch(rawUrl, { redirect: 'follow' }).catch(() => null);
  if (!response || !response.ok) return;
  const buffer = await response.arrayBuffer();
  if (!buffer.byteLength) return;
  const row = await env.DB.prepare(`SELECT id,name,owner_id FROM assets WHERE id=?`).bind(assetId).first();
  if (!row) return;
  const key = `generated/${row.owner_id}/${assetId}/${String(row.name).replace(/[^\w.\-\u4e00-\u9fa5]/g, '_')}`;
  await env.MEDIA.put(key, buffer, { httpMetadata: { contentType: mime } });
  await env.DB.prepare(`UPDATE assets SET object_key=?,size_bytes=?,provider_url=? WHERE id=?`).bind(key, buffer.byteLength, rawUrl, assetId).run();
}

const inspirationMediaHosts = ['runninghub.cn', 'runninghub.ai', 'xiaoyaoyou.com', 'myqcloud.com'];
const inspirationMediaTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4']);
function inspirationMediaUrl(raw) {
  let url;
  try { url = new URL(String(raw || '')); } catch { throw new Error('模板素材地址无效'); }
  if (url.protocol !== 'https:' || !inspirationMediaHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) throw new Error('模板素材域名不在白名单');
  return url;
}

async function copyInspirationAsset(env, userId, templateId, rawUrl, fallbackName, expectedKind) {
  if (!env.MEDIA) throw new Error('本站素材存储尚未配置');
  const sourceUrl = inspirationMediaUrl(rawUrl);
  const existing = await env.DB.prepare(`SELECT id,name,mime_type,size_bytes FROM assets WHERE owner_id=? AND source='inspiration' AND provider_url=? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`).bind(userId, sourceUrl.href).first();
  if (existing) return { id: existing.id, name: existing.name, mimeType: existing.mime_type, sizeBytes: existing.size_bytes, url: `/api/assets/${existing.id}` };
  let currentUrl = sourceUrl, upstream;
  for (let redirects = 0; redirects < 4; redirects += 1) {
    upstream = await fetch(currentUrl, { redirect: 'manual', signal: AbortSignal.timeout(20_000) });
    if (upstream.status < 300 || upstream.status >= 400) break;
    const location = upstream.headers.get('location');
    if (!location) throw new Error('模板素材重定向缺少地址');
    currentUrl = inspirationMediaUrl(new URL(location, currentUrl).href);
  }
  if (!upstream || (upstream.status >= 300 && upstream.status < 400)) throw new Error('模板素材重定向过多');
  if (!upstream.ok) throw new Error(`模板素材下载失败：HTTP ${upstream.status}`);
  const mime = String(upstream.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!inspirationMediaTypes.has(mime) || (expectedKind && !mime.startsWith(`${expectedKind}/`))) throw new Error('模板素材类型不受支持');
  const maxBytes = mime.startsWith('video/') ? 80 * 1024 * 1024 : mime.startsWith('audio/') ? 30 * 1024 * 1024 : 15 * 1024 * 1024;
  const declaredSize = Number(upstream.headers.get('content-length') || 0);
  if (!declaredSize || declaredSize > maxBytes) throw new Error(`模板素材缺少有效大小或超过 ${Math.round(maxBytes / 1024 / 1024)}MB`);
  const buffer = await upstream.arrayBuffer();
  if (!buffer.byteLength || buffer.byteLength > maxBytes) throw new Error('模板素材为空或超过大小限制');
  const assetId = crypto.randomUUID();
  const safeName = String(fallbackName || `模板素材.${assetExt(mime)}`).replace(/[^\w.\-\u4e00-\u9fa5]/g, '_').slice(0, 120) || `模板素材.${assetExt(mime)}`;
  const key = `inspiration/${userId}/${templateId}/${assetId}.${assetExt(mime)}`;
  await env.MEDIA.put(key, buffer, { httpMetadata: { contentType: mime } });
  try {
    await env.DB.prepare(`INSERT INTO assets (id,owner_id,name,mime_type,size_bytes,object_key,source,visibility,provider_url) VALUES (?,?,?,?,?,?,'inspiration','personal',?)`).bind(assetId, userId, safeName, mime, buffer.byteLength, key, sourceUrl.href).run();
  } catch (error) {
    try { await env.MEDIA.delete?.(key); } catch {}
    throw error;
  }
  return { id: assetId, name: safeName, mimeType: mime, sizeBytes: buffer.byteLength, url: `/api/assets/${assetId}` };
}

// 画布积分定价（1 积分 = ¥0.01）：售价 = 厂商参考价 + ¥0.2，每档比厂商贵两毛。
// 文生图 ¥0.3→¥0.5；图编辑 ¥0.25→¥0.45；放大 ¥0.15→¥0.35；文生视频 ¥0.8→¥1.0；
// 图生视频 ¥0.6→¥0.8；参考/首尾帧视频 ¥1.0→¥1.2；运动控制 ¥1.2→¥1.4；短视频 ¥2.0→¥2.2；
// 音乐 ¥0.6→¥0.8；音频 ¥0.4→¥0.6；文本/看图 ¥0.02→¥0.22；3D ¥0.6→¥0.8。
const runningHubCreditEstimate = new Map([
  ['text-to-image', 50], ['image-to-image', 45], ['image-edit', 45], ['image-upscale', 35],
  ['image-to-video', 80], ['text-to-video', 100], ['reference-to-video', 120], ['start-end-to-video', 120],
  ['video-generation', 100], ['multimodal-video', 120], ['short-play-video', 220], ['motion-control', 140],
  ['lip-sync-video', 100], ['image-to-world', 140],
  ['music-generation', 80], ['audio-generation', 60], ['song-extend', 80], ['lyrics-generation', 60],
  ['text-generation', 22], ['image-to-text', 22],
  ['3d', 80], ['image-to-3d', 80],
]);
const runningHubGroupLabels = {
  'text-to-image': '文生图', 'image-to-image': '图生图', 'image-edit': '图片编辑',
  'image-other': '图片工具', 'image-upscale': '图片放大', 'image-to-text': '图片理解',
  'image-to-video': '图生视频', 'text-to-video': '文生视频', 'reference-to-video': '参考生视频',
  'start-end-to-video': '首尾帧视频', 'multimodal-video': '多模态视频', 'short-play-video': '短剧视频',
  'motion-control': '动作控制', 'lip-sync-video': '口型同步', 'video-edit': '视频编辑',
  'video-extend': '视频延长', 'video-upscale': '视频放大', 'video-denoise': '视频降噪',
  'video-frame-interpolation': '视频补帧', 'video-fps-increase': '视频提帧', 'video-effects': '视频特效',
  'video-transition': '视频转场', 'video-translate': '视频翻译', 'video-subtitle-erase': '字幕擦除',
  'video-to-text': '视频理解', 'video-other': '视频工具',
  'music-generation': '音乐生成', 'audio-generation': '音频生成', 'text-to-speech': '语音合成',
  'voice-clone': '声音克隆', 'voice-design': '声音设计', 'song-extend': '歌曲延长',
  'lyrics-generation': '歌词生成', 'text-to-text': '文本生成', 'text-generation': '文本生成',
  'image-to-3d': '图片转 3D', 'multi-image-to-3d': '多图转 3D', 'text-to-3d': '文本转 3D',
  'image-to-world': '图片转世界', 'multi-image-to-world': '多图转世界', 'text-to-world': '文本转世界',
  'video-to-world': '视频转世界', 'upload-character': '角色上传', '3d': '3D 生成', 'other': '其他能力',
};

function runningHubEstimatedCredits(catalog, endpoint, task, outputType) {
  const entry = catalog?.endpoints?.find((item) => item.endpoint === endpoint);
  const key = String(entry?.task || task || '').toLowerCase();
  if (runningHubCreditEstimate.has(key)) return runningHubCreditEstimate.get(key);
  if (entry) {
    if (entry.output_type === 'video') return 100;
    if (entry.output_type === 'audio') return 60;
    if (entry.output_type === '3d') return 80;
  }
  if (outputType === 'video') return 100;
  if (outputType === 'audio') return 60;
  if (outputType === '3d') return 80;
  return 50;
}

function canvasNodeAssetIds(nodeData = {}) {
  const ids = [
    nodeData.assetId,
    nodeData.asset?.id,
    nodeData.asset?.assetId,
    nodeData.params?.assetId,
  ];
  for (const item of Array.isArray(nodeData.assets) ? nodeData.assets : []) {
    ids.push(typeof item === 'string' ? item : item?.id || item?.assetId);
  }
  for (const item of Array.isArray(nodeData.params?.assetIds) ? nodeData.params.assetIds : []) ids.push(item);
  return [...new Set(ids.filter((id) => typeof id === 'string' && id.length > 0).map(String))];
}

/* 当前节点优先，其次按离目标节点由近到远沿入边查找素材。
   React Flow 的连线过去只参与拓扑排序，没有把上传节点的数据送进生成节点。 */
function collectCanvasInputAssetIds(snapshot, nodeId) {
  const nodes = new Map(snapshot.nodes.map((node) => [String(node.id), node]));
  const incoming = new Map();
  for (const edge of snapshot.edges) {
    const source = String(edge.from ?? edge.source);
    const target = String(edge.to ?? edge.target);
    if (!incoming.has(target)) incoming.set(target, []);
    incoming.get(target).push(source);
  }
  const result = [];
  const seenAssets = new Set();
  const seenNodes = new Set();
  const queue = [String(nodeId)];
  while (queue.length && result.length < 10) {
    const current = queue.shift();
    if (seenNodes.has(current)) continue;
    seenNodes.add(current);
    const node = nodes.get(current);
    for (const assetId of canvasNodeAssetIds(node?.data || {})) {
      if (!seenAssets.has(assetId)) {
        seenAssets.add(assetId);
        result.push(assetId);
      }
    }
    for (const source of incoming.get(current) || []) queue.push(source);
  }
  return result;
}

async function resolveCanvasAsset(env, assetId, userId, canvasId) {
  if (!assetId || !env.MEDIA) return null;
  const item = await env.DB.prepare(`SELECT * FROM assets WHERE id=? AND deleted_at IS NULL`).bind(String(assetId)).first();
  if (!item) return null;
  const ownsAsset = Number(item.owner_id) === Number(userId);
  if (!ownsAsset && (!item.canvas_id || String(item.canvas_id) !== String(canvasId))) return null;
  const object = await env.MEDIA.get(item.object_key);
  if (!object) return null;
  const buffer = typeof object.arrayBuffer === 'function'
    ? await object.arrayBuffer()
    : await new Response(object.body).arrayBuffer();
  return { id: item.id, name: item.name, mime: item.mime_type, blob: new Blob([buffer], { type: item.mime_type }) };
}

async function capabilities(env, request) {
  const url = new URL('/runninghub/capabilities.json', request.url);
  const asset = await env.ASSETS.fetch(new Request(url));
  if (!asset.ok) throw new Error('RunningHub 能力目录未随站点发布');
  return asset.json();
}

const CREATIVE_CHAT_TIMEOUT_MS = 60_000;
const CREATIVE_CHAT_PROVIDERS = {
  qianfan: { label: '百度千帆聚合', endpoint: 'https://qianfan.baidubce.com/v2/chat/completions', key: (env) => env.QIANFAN_TOKEN || (env.QIANFAN_AK && env.QIANFAN_SK ? `bce-v3/${env.QIANFAN_AK}/${env.QIANFAN_SK}` : '') },
  ark: { label: '火山方舟 / 豆包', endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', key: (env) => env.ARK_API_KEY || '' },
  dashscope: { label: '阿里百炼', endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', key: (env) => env.DASHSCOPE_API_KEY || '' },
  siliconflow: { label: '硅基流动', endpoint: 'https://api.siliconflow.cn/v1/chat/completions', key: (env) => env.SILICONFLOW_API_KEY || '' },
  miniMax: { label: 'MiniMax', endpoint: 'https://api.minimaxi.com/v1/chat/completions', anthropicEndpoint: 'https://api.minimaxi.com/anthropic/v1/messages', key: (env) => env.MINIMAX_API_KEY || env.MINIMAX_KEY || '' },
};
const CREATIVE_CHAT_MODELS = [
  // ===== 机器人精选 10 个主流模型（bot:true）=====
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', provider: 'qianfan', note: '千帆聚合 · 推理旗舰', tier: 'pro', bot: true },
  { id: 'deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'qianfan', note: '千帆聚合 · 已实测', tier: 'free', bot: true },
  { id: 'kimi-k2.6', name: 'Kimi K2.6', provider: 'qianfan', note: '长文本 · 千帆聚合', tier: 'free', bot: true },
  { id: 'glm-5.2', name: '智谱 GLM 5.2', provider: 'qianfan', note: '千帆聚合', tier: 'free', bot: true },
  { id: 'qwen3.8-max', name: '通义千问 3.8 Max', provider: 'dashscope', note: '阿里百炼 · 旗舰推理', tier: 'pro', bot: true },
  { id: 'qwen3.7-flash', name: '通义千问 3.7 Flash', provider: 'dashscope', note: '阿里百炼 · 极速低价', tier: 'free', bot: true },
  { id: 'doubao-seed-2-1-pro-260628', name: '豆包 Seed 2.1 Pro', provider: 'ark', note: '火山方舟 · 旗舰', tier: 'pro', bot: true },
  { id: 'doubao-seed-2-0-mini-260428', name: '豆包 Seed 2.0 Mini', provider: 'ark', note: '火山方舟 · 轻量', tier: 'free', bot: true },
  { id: 'MiniMax-M3', name: 'MiniMax M3', provider: 'miniMax', note: '推理强 · 官方直连', tier: 'pro', bot: true },
  { id: 'MiniMax-M2.5', name: 'MiniMax M2.5', provider: 'miniMax', note: '官方直连', tier: 'free', bot: true },
  // ===== 画布全量模型（bot:false 仅画布可选）=====
  { id: 'deepseek-v4-pro-0813', name: 'DeepSeek V4 Pro 0813', provider: 'qianfan', note: '千帆聚合 · 已实测', tier: 'pro' },
  { id: 'deepseek-v3.2-think', name: 'DeepSeek V3.2 Think', provider: 'qianfan', note: '深度推理 · 千帆聚合', tier: 'free' },
  { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', provider: 'qianfan', note: '极速低价 · 千帆聚合', tier: 'free' },
  { id: 'deepseek-v4-flash-0731', name: 'DeepSeek V4 Flash 0731', provider: 'qianfan', note: '极速低价 · 千帆聚合', tier: 'free' },
  { id: 'MiniMax-M2.7', name: 'MiniMax M2.7', provider: 'miniMax', note: '官方直连', tier: 'pro' },
  { id: 'MiniMax-M2.7-highspeed', name: 'MiniMax M2.7 极速版', provider: 'miniMax', note: '官方直连 · 响应快', tier: 'pro' },
  { id: 'MiniMax-M2.5-highspeed', name: 'MiniMax M2.5 极速版', provider: 'miniMax', note: '官方直连 · 响应快', tier: 'free' },
  { id: 'MiniMax-M2.1', name: 'MiniMax M2.1', provider: 'miniMax', note: '官方直连', tier: 'free' },
  { id: 'MiniMax-M2.1-highspeed', name: 'MiniMax M2.1 极速版', provider: 'miniMax', note: '官方直连 · 响应快', tier: 'free' },
  { id: 'MiniMax-M2', name: 'MiniMax M2', provider: 'miniMax', note: '官方直连', tier: 'free' },
  { id: 'ernie-5.1', name: '文心 ERNIE 5.1', provider: 'qianfan', note: '千帆聚合', tier: 'free' },
  { id: 'qwen3.5-35b-a3b', name: '通义 Qwen3.5', provider: 'qianfan', note: '千帆聚合', tier: 'free' },
  { id: 'qwen3.7-max', name: '通义千问 3.7 Max', provider: 'dashscope', note: '阿里百炼 · 已实测可用', tier: 'pro' },
  { id: 'qwen3.7-plus', name: '通义千问 3.7 Plus', provider: 'dashscope', note: '阿里百炼 · 均衡 · 已实测', tier: 'pro' },
  { id: 'qwen3.6-flash', name: '通义千问 3.6 Flash', provider: 'dashscope', note: '阿里百炼 · 极速低价 · 已实测', tier: 'free' },
  { id: 'qwen3.5-omni-flash', name: '通义千问 3.5 Omni Flash', provider: 'dashscope', note: '阿里百炼 · 多模态 · 已实测', tier: 'free' },
  { id: 'qwen3-coder-plus', name: '通义千问 Coder Plus', provider: 'dashscope', note: '阿里百炼 · 代码 · 已实测', tier: 'free' },
  { id: 'qwen3-vl-plus', name: '通义千问 VL Plus', provider: 'dashscope', note: '阿里百炼 · 视觉理解 · 已实测', tier: 'free' },
  { id: 'qwen3-max', name: '通义千问 3 Max', provider: 'dashscope', note: '阿里百炼 · 已实测', tier: 'free' },
  { id: 'qwen-long', name: '通义千问 Long', provider: 'dashscope', note: '阿里百炼 · 超长文本 · 已实测', tier: 'free' },
  { id: 'qwen-mt-turbo', name: '通义千问 MT Turbo', provider: 'dashscope', note: '阿里百炼 · 多语翻译 · 已实测', tier: 'free' },
  { id: 'qwen-plus', name: '通义千问 Plus', provider: 'dashscope', note: '阿里百炼 · 已实测', tier: 'free' },
  { id: 'qwen-turbo', name: '通义千问 Turbo', provider: 'dashscope', note: '阿里百炼 · 低价', tier: 'free' },
  { id: 'doubao-seed-2-1-turbo-260628', name: '豆包 Seed 2.1 Turbo', provider: 'ark', note: '火山方舟 · 极速 · 已实测', tier: 'free' },
  { id: 'doubao-seed-2-0-pro-260215', name: '豆包 Seed 2.0 Pro', provider: 'ark', note: '火山方舟 · 已实测', tier: 'free' },
  { id: 'doubao-seed-2-0-lite-260428', name: '豆包 Seed 2.0 Lite', provider: 'ark', note: '火山方舟 · 低价', tier: 'free' },
  { id: 'deepseek-v4-pro-260425', name: 'DeepSeek V4 Pro（方舟）', provider: 'ark', note: '火山方舟 · 已实测', tier: 'pro' },
  { id: 'deepseek-v4-flash-ga-260731', name: 'DeepSeek V4 Flash GA（方舟）', provider: 'ark', note: '火山方舟 · 极速', tier: 'free' },
  { id: 'qwen3-32b-20250429', name: '通义 Qwen3 32B（方舟）', provider: 'ark', note: '火山方舟', tier: 'free' },
  { id: 'glm-5-2-260617', name: '智谱 GLM 5.2（方舟）', provider: 'ark', note: '火山方舟', tier: 'free' },
  { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', provider: 'siliconflow', note: '硅基流动', tier: 'free' },
  { id: 'Qwen/Qwen3-8B', name: 'Qwen3 8B', provider: 'siliconflow', note: '硅基流动 · 低价', tier: 'free' },
];
const creativeModels = (env) => CREATIVE_CHAT_MODELS.map((m) => {
  const provider = CREATIVE_CHAT_PROVIDERS[m.provider];
  const id = m.provider === 'ark' && env.ARK_DEFAULT_MODEL ? env.ARK_DEFAULT_MODEL : m.id;
  return { id, name: m.name, provider: m.provider, providerLabel: provider.label, note: m.note || '', configured: Boolean(provider.key(env)), tier: m.tier || 'free', bot: Boolean(m.bot) };
});

// 服务端联网搜索：DuckDuckGo Lite（无需 key），解析前 5 条标题+摘要注入上下文。
async function duckSearch(query) {
  const q = String(query || '').trim().slice(0, 200);
  if (!q) return '';
  const res = await fetch(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}`, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      accept: 'text/html',
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return '';
  const html = await res.text();
  const titles = [...html.matchAll(/<a[^>]*class=['"]result-link['"][^>]*>(.*?)<\/a>/gis)]
    .map((m) => m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").trim())
    .filter(Boolean);
  const snippets = [...html.matchAll(/<td[^>]*class=['"]result-snippet['"][^>]*>(.*?)<\/td>/gis)]
    .map((m) => m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").trim())
    .filter(Boolean);
  const lines = [];
  for (let i = 0; i < Math.min(5, titles.length); i += 1) {
    const snip = snippets[i] ? `：${snippets[i]}` : '';
    lines.push(`${i + 1}. ${titles[i]}${snip}`);
  }
  return lines.join('\n');
}

async function creativeChat(env, body) {
  const modelId = String(body.model || '');
  const model = CREATIVE_CHAT_MODELS.find((m) => m.id === modelId);
  if (!model) throw Object.assign(new Error('未知模型，请从模型列表中选择'), { status: 400 });
  const provider = CREATIVE_CHAT_PROVIDERS[model.provider];
  const apiKey = provider.key(env);
  if (!apiKey) throw Object.assign(new Error(`${provider.label} 的密钥尚未配置，请联系管理员`), { status: 503 });
  const effectiveId = model.provider === 'ark' && env.ARK_DEFAULT_MODEL ? env.ARK_DEFAULT_MODEL : model.id;
  const raw = Array.isArray(body.messages) ? body.messages.filter((m) => m && typeof m.content === 'string').slice(-20) : [];
  const messages = raw.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content.slice(0, 6000) }));
  if (!messages.length || !messages[messages.length - 1].content.trim()) throw Object.assign(new Error('消息不能为空'), { status: 400 });
  // 图片分析：MiniMax-M3 官方支持 OpenAI 兼容的 image_url 多模态输入
  const image = typeof body.image === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(body.image) ? body.image : '';
  if (image) {
    if (model.id !== 'MiniMax-M3') throw Object.assign(new Error('当前模型不支持图片分析，请切换到 MiniMax-M3'), { status: 400 });
    if (image.length > 10_000_000) throw Object.assign(new Error('图片太大，请压缩后重试（上限约 7MB）'), { status: 400 });
    const last = messages[messages.length - 1];
    messages[messages.length - 1] = { role: last.role, content: [{ type: 'text', text: last.content }, { type: 'image_url', image_url: { url: image, detail: 'default' } }] };
  }
  // 联网搜索：MiniMax 走官方 Anthropic Messages API 原生 web_search；
  // 其他模型走服务端 DuckDuckGo 抓取结果注入上下文。图片消息时不附加搜索。
  const wantSearch = body.search === true;
  const miniMaxNativeSearch = wantSearch && !image && model.provider === 'miniMax';
  if (wantSearch && !image && !miniMaxNativeSearch) {
    const last = messages[messages.length - 1];
    if (last && last.content.trim()) {
      try {
        const searchContext = await duckSearch(last.content);
        if (searchContext) {
          messages.unshift({ role: 'user', content: `[联网搜索到的实时资料]\n${searchContext}\n\n请结合上面的资料回答我的问题；如果资料与问题无关，就按你的知识正常回答。` });
        }
      } catch {
        // 搜索失败不阻断正常对话
      }
    }
  }
  const temperature = Math.min(2, Math.max(0, Number(body.temperature) || 0.7));
  const maxTokens = Math.min(2048, Math.max(64, Number(body.maxTokens) || 1024));
  if (miniMaxNativeSearch) {
    const anthropicMessages = [];
    for (const m of messages) {
      const role = m.role === 'assistant' ? 'assistant' : 'user';
      const prev = anthropicMessages[anthropicMessages.length - 1];
      if (prev && prev.role === role) prev.content += `\n\n${m.content}`;
      else anthropicMessages.push({ role, content: String(m.content) });
    }
    const upstream = await fetch(provider.anthropicEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: effectiveId, max_tokens: maxTokens, temperature, messages: anthropicMessages, tools: [{ type: 'web_search_20250305', name: 'web_search' }], stream: false }),
      signal: AbortSignal.timeout(CREATIVE_CHAT_TIMEOUT_MS),
    });
    const data = await upstream.json().catch(() => ({ message: `上游返回非 JSON：${upstream.status}` }));
    if (!upstream.ok) {
      const detail = data.error?.message || data.message || data.msg || `上游错误 ${upstream.status}`;
      throw Object.assign(new Error(`${provider.label}：${detail}`), { status: 502 });
    }
    const blocks = Array.isArray(data.content) ? data.content : [];
    const rawReply = blocks.filter((b) => b && b.type === 'text').map((b) => b.text || '').join('').trim();
    const reply = rawReply.replace(/<think>[\s\S]*?<\/think>/g, "").trim() || rawReply;
    if (!reply) throw Object.assign(new Error(`${provider.label} 返回了空内容，请换个模型或稍后再试`), { status: 502 });
    return { reply, model: effectiveId, provider: model.provider, providerLabel: provider.label, usage: data.usage || null, searched: true };
  }
  const upstream = await fetch(provider.endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: effectiveId, messages, temperature, max_tokens: maxTokens, stream: false }),
    signal: AbortSignal.timeout(CREATIVE_CHAT_TIMEOUT_MS),
  });
  const data = await upstream.json().catch(() => ({ message: `上游返回非 JSON：${upstream.status}` }));
  if (!upstream.ok) {
    const detail = data.error?.message || data.message || data.msg || `上游错误 ${upstream.status}`;
    throw Object.assign(new Error(`${provider.label}：${detail}`), { status: 502 });
  }
  const rawContent = data.choices?.[0]?.message?.content ?? '';
  const rawReply = typeof rawContent === 'string' ? rawContent : Array.isArray(rawContent) ? rawContent.map((b) => (b && b.type === 'text' ? b.text : '')).join('').trim() : String(rawContent);
  const reply = rawReply.replace(/<think>[\s\S]*?<\/think>/g, "").trim() || rawReply;
  if (!reply) throw Object.assign(new Error(`${provider.label} 返回了空内容，请换个模型或稍后再试`), { status: 502 });
  return { reply, model: effectiveId, provider: model.provider, providerLabel: provider.label, usage: data.usage || null, searched: wantSearch && !image };
}

/* ================= 图片 / 视频生成（积分制） ================= */
const MEDIA_TIMEOUT_MS = 90_000;
const MEDIA_PROVIDER_KEYS = {
  openai: (env) => env.OPENAI_API_KEY || '',
  gemini: (env) => env.GEMINI_API_KEY || '',
  minimax: (env) => env.MINIMAX_API_KEY || env.MINIMAX_KEY || '',
  siliconflow: (env) => env.SILICONFLOW_API_KEY || '',
  dashscope: (env) => env.DASHSCOPE_API_KEY || '',
};
const MEDIA_IMAGE_MODELS = [
  { id: 'siliconflow/flux-schnell', name: 'FLUX.1 Schnell', provider: 'siliconflow', model: 'black-forest-labs/FLUX.1-schnell', kind: 'image', credits: 1, note: '免费/极低价 · 推荐先用' },
  { id: 'gemini/gemini-2.5-flash-image', name: 'Gemini 2.5 Flash 绘图', provider: 'gemini', model: 'gemini-2.5-flash-image', kind: 'image', credits: 10, note: 'Google 免费额度 · 低价', i2i: true },
  { id: 'dashscope/wanx2.1-t2i-turbo', name: '通义万相 2.1 Turbo', provider: 'dashscope', model: 'wanx2.1-t2i-turbo', kind: 'image', credits: 12, note: '阿里百炼 · 国产' },
  { id: 'minimax/image-01', name: 'MiniMax Image-01', provider: 'minimax', model: 'image-01', kind: 'image', credits: 20, note: 'MiniMax' },
  { id: 'openai/gpt-image-1.5', name: 'OpenAI GPT-Image 1.5', provider: 'openai', model: env => env.OPENAI_IMAGE_MODEL || 'gpt-image-1.5', kind: 'image', credits: 32, note: 'OpenAI · 高配', i2i: true },
  { id: 'openai/gpt-image-2', name: 'OpenAI GPT-Image 2', provider: 'openai', model: env => env.OPENAI_IMAGE_MODEL || 'gpt-image-2', kind: 'image', credits: 35, note: 'OpenAI · 旗舰', i2i: true },
  { id: 'openai/gpt-image-1', name: 'OpenAI GPT-Image 1', provider: 'openai', model: env => env.OPENAI_IMAGE_MODEL || 'gpt-image-1', kind: 'image', credits: 30, note: 'OpenAI · 高质量', i2i: true },
];
const MEDIA_VIDEO_MODELS = [
  { id: 'minimax/i2v-01', name: 'MiniMax 图生视频 I2V-01', provider: 'minimax', model: 'I2V-01', kind: 'video', image: true, credits: 35, note: '图生视频' },
  { id: 'minimax/hailuo-2.3-fast', name: 'MiniMax Hailuo 2.3 Fast', provider: 'minimax', model: 'MiniMax-Hailuo-2.3-Fast', kind: 'video', credits: 42, note: '快速出片' },
  { id: 'minimax/hailuo-02', name: 'MiniMax Hailuo 02', provider: 'minimax', model: 'MiniMax-Hailuo-02', kind: 'video', credits: 45, note: '文生视频' },
  { id: 'minimax/hailuo-2.3', name: 'MiniMax Hailuo 2.3', provider: 'minimax', model: 'MiniMax-Hailuo-2.3', kind: 'video', credits: 50, note: '最新版' },
  { id: 'gemini/veo-3.1-fast', name: 'Google Veo 3.1 Fast', provider: 'gemini', model: 'veo-3.1-fast', kind: 'video', credits: 60, note: 'Google' },
  { id: 'openai/sora-2', name: 'OpenAI Sora 2', provider: 'openai', model: 'sora-2', kind: 'video', credits: 80, note: 'OpenAI' },
  { id: 'openai/sora-2-pro', name: 'OpenAI Sora 2 Pro', provider: 'openai', model: 'sora-2-pro', kind: 'video', credits: 100, note: 'OpenAI · 旗舰' },
];
const RH_DISPLAY_IMAGES=[
  { id:"rh/2046514150500524034", name:"全能图片G-2.0-文生图-官方版", provider:"runninghub", kind:"image" },
  { id:"rh/2046514150500524035", name:"全能图片G-2.0-图生图-官方版", provider:"runninghub", kind:"image" },
  { id:"rh/2133000000000504074", name:"seedream-v5-pro-图生图", provider:"runninghub", kind:"image" },
  { id:"rh/2133000000000504073", name:"seedream-v5-pro-文生图", provider:"runninghub", kind:"image" },
  { id:"rh/2046514150500524033", name:"全能图片G-2.0-文生图-低价版", provider:"runninghub", kind:"image" },
  { id:"rh/2046503667076751361", name:"全能图片G-2.0-图生图-低价版", provider:"runninghub", kind:"image" },
  { id:"rh/2133000000000504060", name:"全能图片V2-lite-图生图-官方稳定版", provider:"runninghub", kind:"image" },
  { id:"rh/2133000000000504059", name:"全能图片V2-lite-文生图-官方稳定版", provider:"runninghub", kind:"image" },
  { id:"rh/2072152391396130818", name:"全能图片V2-lite-文生图-低价渠道版", provider:"runninghub", kind:"image" },
  { id:"rh/2072152437223096321", name:"全能图片V2-lite-图生图-低价渠道版", provider:"runninghub", kind:"image" },
  { id:"rh/2054086928526929955", name:"全能图片X -Pro-文生图-官方版", provider:"runninghub", kind:"image" },
  { id:"rh/2054086928526929954", name:"全能图片X -Pro-图生图-官方版", provider:"runninghub", kind:"image" },
  { id:"rh/2046514150500524053", name:"全能图片X-文生图片-官方版", provider:"runninghub", kind:"image" },
  { id:"rh/2046514150500524052", name:"全能图片X-图生图-官方版", provider:"runninghub", kind:"image" },
  { id:"rh/2004544597055029250", name:"全能图片Pro-文生图-官方版", provider:"runninghub", kind:"image" },
  { id:"rh/2004544343584849921", name:"全能图片Pro-图生图-官方版", provider:"runninghub", kind:"image" },
  { id:"rh/2004543847939751938", name:"全能图片Pro-文生图-低价版", provider:"runninghub", kind:"image" },
  { id:"rh/2004543527918551041", name:"全能图片Pro-图生图-低价版", provider:"runninghub", kind:"image" },
  { id:"rh/2027658953443524610", name:"全能图片V2-文生图-官方版", provider:"runninghub", kind:"image" },
  { id:"rh/2027661818379649025", name:"全能图片V2-图生图-官方版", provider:"runninghub", kind:"image" },
  { id:"rh/2027192837726294017", name:"全能图片V2-文生图-低价版", provider:"runninghub", kind:"image" },
  { id:"rh/2027196343409463297", name:"全能图片V2-图生图-低价版", provider:"runninghub", kind:"image" },
  { id:"rh/2055229427329323016", name:"Seedream 4.6-图生图", provider:"runninghub", kind:"image" },
  { id:"rh/2055229427329323015", name:"Seedream 4.6-文生图", provider:"runninghub", kind:"image" },
  { id:"rh/2026214940576337921", name:"Seedream 5.0 Lite-文生图", provider:"runninghub", kind:"image" },
  { id:"rh/2026215209183760386", name:"Seedream 5.0 Lite-图生图", provider:"runninghub", kind:"image" },
  { id:"rh/2013061949732220929", name:"Seedream 4.0-文生图", provider:"runninghub", kind:"image" },
  { id:"rh/2013062293031809026", name:"Seedream 4.0-图生图", provider:"runninghub", kind:"image" },
];
const RH_DISPLAY_VIDEOS=[
  { id:"rh/2034917373414539277", name:"Seedance2.0", provider:"runninghub", kind:"video" },
  { id:"rh/2034917373414539275", name:"Seedance2.0-首尾帧", provider:"runninghub", kind:"video" },
  { id:"rh/2133100000000700022", name:"seedance2.5/多模态视频 Token", provider:"runninghub", kind:"video" },
  { id:"rh/2133100000000700021", name:"seedance2.5/图生视频 Token", provider:"runninghub", kind:"video" },
  { id:"rh/2133100000000700020", name:"seedance2.5/文生视频 Token", provider:"runninghub", kind:"video" },
  { id:"rh/2133100000000504203", name:"MiniMax-H3 图生视频（首尾帧）", provider:"runninghub", kind:"video" },
  { id:"rh/2133100000000504202", name:"MiniMax-H3 文生视频", provider:"runninghub", kind:"video" },
  { id:"rh/2133100000000504201", name:"MiniMax-H3 多模态参考生视频", provider:"runninghub", kind:"video" },
  { id:"rh/2133000000000504043", name:"seedance2.0-Mini/多模态视频", provider:"runninghub", kind:"video" },
  { id:"rh/2133000000000504042", name:"seedance2.0-Mini/图生视频", provider:"runninghub", kind:"video" },
  { id:"rh/2133000000000504041", name:"seedance2.0-Mini/文生视频", provider:"runninghub", kind:"video" },
  { id:"rh/2034917373414539278", name:"Seedance2.0-Fast", provider:"runninghub", kind:"video" },
  { id:"rh/2034917373414539276", name:"Seedance2.0-首尾帧", provider:"runninghub", kind:"video" },
  { id:"rh/2132764885651525693", name:"happyhorse-1.1/reference-to-video", provider:"runninghub", kind:"video" },
  { id:"rh/2132764885651525691", name:"happyhorse-1.1/text-to-video", provider:"runninghub", kind:"video" },
  { id:"rh/2132764885651525692", name:"happyhorse-1.1/image-to-video", provider:"runninghub", kind:"video" },
  { id:"rh/2133000000000504057", name:"可灵图生视频v3-turbo-std", provider:"runninghub", kind:"video" },
  { id:"rh/2069321552501190658", name:"可灵文生视频v3-turbo-std", provider:"runninghub", kind:"video" },
  { id:"rh/2133000000000504056", name:"可灵文生视频v3-turbo-pro", provider:"runninghub", kind:"video" },
  { id:"rh/2133000000000504058", name:"可灵图生视频v3-turbo-pro", provider:"runninghub", kind:"video" },
  { id:"rh/2028306154142318593", name:"全能视频X 1.5-图生视频-官方版", provider:"runninghub", kind:"video" },
  { id:"rh/2019380112598044674", name:"全能视频X 1.5-图生视频-低价版", provider:"runninghub", kind:"video" },
  { id:"rh/2132764885651525659", name:"全能视频Omni-Flash-图生视频", provider:"runninghub", kind:"video" },
  { id:"rh/2132764885651525658", name:"全能视频Omni-Flash-文生视频", provider:"runninghub", kind:"video" },
  { id:"rh/2047563851324841986", name:"可灵图生视频v3-4k", provider:"runninghub", kind:"video" },
  { id:"rh/2047563851324841987", name:"可灵文生视频v3-4k", provider:"runninghub", kind:"video" },
  { id:"rh/2047563851324841990", name:"可灵参考生视频o3-4k", provider:"runninghub", kind:"video" },
  { id:"rh/2047563851324841989", name:"可灵图生视频o3-4k", provider:"runninghub", kind:"video" },
  { id:"rh/2047563851324841988", name:"可灵文生视频o3-4k", provider:"runninghub", kind:"video" },
  { id:"rh/2019638479950254081", name:"可灵O3-Pro", provider:"runninghub", kind:"video" },
  { id:"rh/2019620511153459202", name:"可灵O3-Pro-文生视频", provider:"runninghub", kind:"video" },
  { id:"rh/2019634451799412737", name:"可灵O3-Std", provider:"runninghub", kind:"video" },
  { id:"rh/2019608799960436737", name:"可灵O3-Std-文生视频", provider:"runninghub", kind:"video" },
  { id:"rh/2012067220412493827", name:"可灵O1-参考", provider:"runninghub", kind:"video" },
  { id:"rh/2012030892408893442", name:"可灵O1", provider:"runninghub", kind:"video" },
  { id:"rh/2012004604507910146", name:"可灵O1-图生视频", provider:"runninghub", kind:"video" },
  { id:"rh/2039648613636050945", name:"万相2.7-参考", provider:"runninghub", kind:"video" },
  { id:"rh/2039618329897144322", name:"万相2.7-图生视频", provider:"runninghub", kind:"video" },
  { id:"rh/2039544460993695745", name:"万相2.7-文生视频", provider:"runninghub", kind:"video" },
  { id:"rh/2041408069159936003", name:"PixVerseV6-图生视频", provider:"runninghub", kind:"video" },
  { id:"rh/2041408069159936002", name:"PixVerseV6-文生视频", provider:"runninghub", kind:"video" },
  { id:"rh/2048623940504719363", name:"HappyHorse1.0-Reference", provider:"runninghub", kind:"video" },
  { id:"rh/2046514150500524037", name:"happyhorse-1.0/image-to-video", provider:"runninghub", kind:"video" },
  { id:"rh/2046514150500524036", name:"happyhorse-1.0/text-to-video", provider:"runninghub", kind:"video" },
  { id:"rh/2018599147311271938", name:"全能视频V-Pro-低价版", provider:"runninghub", kind:"video" },
  { id:"rh/2005884653783007234", name:"全能视频V-Pro-文生视频-低价版", provider:"runninghub", kind:"video" },
  { id:"rh/2054086928526929953", name:"全能视频V-Fast-参考-官方版", provider:"runninghub", kind:"video" },
  { id:"rh/2022225870330286082", name:"全能视频V-Fast-图生视频-官方版", provider:"runninghub", kind:"video" },
  { id:"rh/2022220635650150401", name:"全能视频V-Fast-文生视频-官方版", provider:"runninghub", kind:"video" },
  { id:"rh/2016052223404204034", name:"全能视频V-Fast-低价版", provider:"runninghub", kind:"video" },
  { id:"rh/2005884261993070594", name:"全能视频V-Fast-文生视频-低价版", provider:"runninghub", kind:"video" },
  { id:"rh/2011758831593648131", name:"海螺2.3-图生视频-pro", provider:"runninghub", kind:"video" },
  { id:"rh/2011999330699112450", name:"海螺2.3-文生视频-pro", provider:"runninghub", kind:"video" },
  { id:"rh/2019687963136692226", name:"ViduQ3-Pro", provider:"runninghub", kind:"video" },
  { id:"rh/2017148354741735426", name:"ViduQ3-Pro-文生视频", provider:"runninghub", kind:"video" },
  { id:"rh/2034917373414539268", name:"ViduQ3-Pro-Fast", provider:"runninghub", kind:"video" },
  { id:"rh/2034917373414539266", name:"ViduQ3-Pro-Fast-文生视频", provider:"runninghub", kind:"video" },
];

const allMediaModels = [...MEDIA_IMAGE_MODELS, ...MEDIA_VIDEO_MODELS];
const mediaModelDef = (id) => allMediaModels.find((m) => m.id === id);
const mediaModelConfigured = (env, def) => Boolean(MEDIA_PROVIDER_KEYS[def.provider](env));
const displayModel = (m) => ({ id: m.id, name: m.name, provider: m.provider, kind: m.kind, credits: null, note: '即将上线 · RunningHub 同款', configured: false, comingSoon: true });
const mediaGenModels = (env) => ({
  images: [...MEDIA_IMAGE_MODELS.map((m) => ({ id: m.id, name: m.name, provider: m.provider, model: typeof m.model === 'function' ? m.model(env) : m.model, kind: m.kind, credits: m.credits, note: m.note || '', i2i: Boolean(m.i2i), configured: mediaModelConfigured(env, m) })), ...RH_DISPLAY_IMAGES.map(displayModel)],
  videos: [...MEDIA_VIDEO_MODELS.map((m) => ({ id: m.id, name: m.name, provider: m.provider, model: typeof m.model === 'function' ? m.model(env) : m.model, kind: m.kind, image: Boolean(m.image), credits: m.credits, note: m.note || '', configured: mediaModelConfigured(env, m) })), ...RH_DISPLAY_VIDEOS.map(displayModel)],
});

/* ================= 模型额度看板（厂商余额 / 消耗 / 充值入口） ================= */
const QUOTA_PROVIDERS = {
  qianfan: { label: '百度千帆聚合', rechargeUrl: 'https://console.bce.baidu.com/iam/#/account/billing/recharge', consoleUrl: 'https://console.bce.baidu.com/qianfan/ais/console/onlineService', balance: false },
  ark: { label: '火山方舟 / 豆包', rechargeUrl: 'https://console.volcengine.com/finance/wallet/recharge', consoleUrl: 'https://console.volcengine.com/ark/region:cn-beijing/openManagement', balance: false },
  dashscope: { label: '阿里百炼', rechargeUrl: 'https://usercenter2.aliyun.com/finance/fund-management/recharge', consoleUrl: 'https://bailian.console.aliyun.com/', balance: false },
  siliconflow: { label: '硅基流动', rechargeUrl: 'https://cloud.siliconflow.cn/account/balance', consoleUrl: 'https://cloud.siliconflow.cn/account/balance', balance: true },
  miniMax: { label: 'MiniMax', rechargeUrl: 'https://platform.minimaxi.com/user-center/billing', consoleUrl: 'https://platform.minimaxi.com/', balance: true },
  openai: { label: 'OpenAI', rechargeUrl: 'https://platform.openai.com/settings/organization/billing', consoleUrl: 'https://platform.openai.com/', balance: false },
  gemini: { label: 'Google Gemini', rechargeUrl: 'https://aistudio.google.com/', consoleUrl: 'https://aistudio.google.com/', balance: false },
  deepseek: { label: 'DeepSeek 官方', rechargeUrl: 'https://platform.deepseek.com/top_up', consoleUrl: 'https://platform.deepseek.com/', balance: true },
  runninghub: { label: 'RunningHub', rechargeUrl: 'https://www.runninghub.cn/user-center?tab=wallet', consoleUrl: 'https://www.runninghub.cn/user-center', balance: true },
  unknown: { label: '未知来源', rechargeUrl: null, consoleUrl: null, balance: false },
};

const providerConfigured = (env, key) => {
  switch (key) {
    case 'qianfan': return Boolean(CREATIVE_CHAT_PROVIDERS.qianfan.key(env));
    case 'ark': return Boolean(CREATIVE_CHAT_PROVIDERS.ark.key(env));
    case 'dashscope': return Boolean(CREATIVE_CHAT_PROVIDERS.dashscope.key(env) || MEDIA_PROVIDER_KEYS.dashscope(env));
    case 'siliconflow': return Boolean(CREATIVE_CHAT_PROVIDERS.siliconflow.key(env) || MEDIA_PROVIDER_KEYS.siliconflow(env));
    case 'miniMax': return Boolean(CREATIVE_CHAT_PROVIDERS.miniMax.key(env) || MEDIA_PROVIDER_KEYS.minimax(env));
    case 'openai': return Boolean(MEDIA_PROVIDER_KEYS.openai(env));
    case 'gemini': return Boolean(MEDIA_PROVIDER_KEYS.gemini(env));
    case 'deepseek': return Boolean(env.DEEPSEEK_API_KEY || env.DEEPSEEK_KEY);
    case 'runninghub': return Boolean(env.RUNNINGHUB_API_KEY);
    default: return false;
  }
};

const BALANCE_CACHE_TTL_MS = 10 * 60 * 1000;

async function readBalanceCache(env, provider) {
  if (!env.DB) return null;
  try {
    const row = await env.DB.prepare(`SELECT payload, fetched_at FROM provider_balance_cache WHERE provider=?`).bind(provider).first();
    if (!row) return null;
    const age = Date.now() - new Date(String(row.fetched_at || '').replace(' ', 'T')).getTime();
    if (!Number.isFinite(age) || age > BALANCE_CACHE_TTL_MS) return null;
    const payload = JSON.parse(row.payload);
    return payload && payload.available ? payload : null;
  } catch { return null; }
}

async function writeBalanceCache(env, provider, payload) {
  if (!env.DB || !payload || !payload.available) return;
  try {
    await env.DB.prepare(`INSERT INTO provider_balance_cache (provider,payload,fetched_at) VALUES (?,?,?) ON CONFLICT(provider) DO UPDATE SET payload=excluded.payload,fetched_at=excluded.fetched_at`)
      .bind(provider, JSON.stringify(payload), new Date().toISOString()).run();
  } catch {}
}

async function readManualBalance(env, provider) {
  if (!env.DB) return null;
  try {
    const row = await env.DB.prepare(`SELECT provider, balance, note, updated_by, updated_at FROM provider_manual_balance WHERE provider=?`).bind(provider).first();
    if (!row) return null;
    return { provider: row.provider, balance: Number(row.balance) || 0, note: row.note || '', updatedBy: row.updated_by || '', updatedAt: row.updated_at || null };
  } catch { return null; }
}

async function fetchProviderBalance(env, key) {
  try {
    const cached = await readBalanceCache(env, key);
    if (cached) return cached;
    let result = { available: false };
    if (key === 'siliconflow') {
      const apiKey = String(env.SILICONFLOW_API_KEY || '').trim().replace(/^["']|["']$/g, '');
      if (!apiKey) return { available: false, error: '未配置密钥' };
      const res = await fetch('https://api.siliconflow.cn/v1/user/info', {
        headers: { authorization: `Bearer ${apiKey}`, accept: 'application/json' },
        signal: AbortSignal.timeout(8_000),
      });
      const data = await res.json().catch(() => null);
      const balance = Number(data?.data?.balance);
      if (!res.ok || !Number.isFinite(balance)) return { available: false, error: `查询失败 HTTP ${res.status || '?'}` };
      const total = Number(data?.data?.totalBalance) || balance;
      result = { available: true, balance, totalBalance: total, unit: 'CNY', fetchedAt: new Date().toISOString(), low: balance < 10, empty: balance <= 0 };
    } else if (key === 'runninghub') {
      const apiKey = String(env.RUNNINGHUB_API_KEY || '').trim().replace(/^["']|["']$/g, '');
      if (!apiKey) return { available: false, error: '未配置密钥' };
      const res = await fetch('https://www.runninghub.cn/uc/openapi/accountStatus', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ apikey: apiKey }),
        signal: AbortSignal.timeout(8_000),
      });
      const data = await res.json().catch(() => null);
      const balance = Number(data?.data?.remainMoney);
      if (!res.ok || !Number.isFinite(balance)) return { available: false, error: `查询失败 HTTP ${res.status || '?'}` };
      result = { available: true, balance, totalBalance: balance, unit: String(data?.data?.currency || 'CNY'), runningTasks: Number(data?.data?.currentTaskCounts) || 0, fetchedAt: new Date().toISOString(), low: balance < 10, empty: balance <= 0 };
    } else if (key === 'miniMax') {
      const apiKey = String(env.MINIMAX_API_KEY || env.MINIMAX_KEY || '').trim().replace(/^["']|["']$/g, '');
      if (!apiKey) return { available: false, error: '未配置密钥' };
      const res = await fetch('https://api.minimaxi.com/v1/token_plan/remains', {
        headers: { authorization: `Bearer ${apiKey}`, accept: 'application/json' },
        signal: AbortSignal.timeout(8_000),
      });
      const data = await res.json().catch(() => null);
      const plans = Array.isArray(data?.model_remains) ? data.model_remains.map((it) => ({
        model: String(it.model_name || ''),
        intervalRemainingPercent: Number(it.current_interval_remaining_percent) || 0,
        weeklyRemainingPercent: Number(it.current_weekly_remaining_percent) || 0,
        intervalUsage: Number(it.current_interval_usage_count) || 0,
        weeklyUsage: Number(it.current_weekly_usage_count) || 0,
      })) : [];
      if (!res.ok || plans.length === 0) return { available: false, error: `查询失败 HTTP ${res.status || '?'}` };
      const minPercent = Math.min(...plans.map((pl) => pl.weeklyRemainingPercent));
      result = { available: true, kind: 'quota', balance: minPercent, totalBalance: 100, unit: '%', plans, fetchedAt: new Date().toISOString(), low: minPercent < 10, empty: minPercent <= 0 };
    } else if (key === 'deepseek') {
      const apiKey = String(env.DEEPSEEK_API_KEY || env.DEEPSEEK_KEY || '').trim().replace(/^["']|["']$/g, '');
      if (!apiKey) return { available: false, error: '未配置密钥' };
      const res = await fetch('https://api.deepseek.com/user/balance', {
        headers: { authorization: `Bearer ${apiKey}`, accept: 'application/json' },
        signal: AbortSignal.timeout(8_000),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return { available: false, error: `查询失败 HTTP ${res.status || '?'}` };
      const infos = Array.isArray(data?.balance_infos) ? data.balance_infos : [];
      const balance = infos.reduce((sum, it) => sum + (Number(it.balance) || 0), 0);
      const total = infos.reduce((sum, it) => sum + (Number(it.total_balance) || 0), 0);
      if (!Number.isFinite(balance) || infos.length === 0) return { available: false, error: `查询失败 HTTP ${res.status || '?'}` };
      result = { available: true, balance, totalBalance: total || balance, unit: 'CNY', fetchedAt: new Date().toISOString(), low: balance < 10, empty: balance <= 0 };
    }
    await writeBalanceCache(env, key, result);
    return result;
  } catch (error) {
    return { available: false, error: error.message };
  }
}

async function deductCredits(env, userId, amount, reason, billing = {}, referenceId = '') {
  const cost = Math.max(0, Math.round(Number(amount) || 0));
  const wallet = await resolveBillingWallet(env, userId, billing.scope, billing.teamId);
  if (!wallet) {
    const error = new Error('团队不存在或你已不是团队成员');
    error.status = 403;
    error.code = 'TEAM_ACCESS_DENIED';
    throw error;
  }
  if (cost === 0) return { ...wallet, creditsLeft: wallet.credits };
  // 幂等：同一 referenceId 已经写过负 ledger 则跳过扣费（防重：用户连点 / submit-failure retry / 双触发）
  if (referenceId) {
    const existing = wallet.scope === 'team'
      ? await env.DB.prepare(`SELECT id FROM team_credit_ledger WHERE reference_id=? AND team_id=? AND amount<0 LIMIT 1`).bind(referenceId, wallet.teamId).first()
      : await env.DB.prepare(`SELECT id FROM credit_ledger WHERE reference_id=? AND user_id=? AND amount<0 LIMIT 1`).bind(referenceId, userId).first();
    if (existing) return { ...wallet, creditsLeft: wallet.credits, dedup: true };
  }
  const result = wallet.scope === 'team'
    ? await env.DB.prepare(`UPDATE teams SET credits=credits-?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND credits>=?`).bind(cost, wallet.teamId, cost).run()
    : await env.DB.prepare(`UPDATE users SET credits=credits-? WHERE id=? AND credits>=?`).bind(cost, userId, cost).run();
  if (!Number(result?.meta?.changes || 0)) {
    const error = new Error(`${wallet.name}不足：本次需要 ${cost} 积分`);
    error.status = 402;
    error.code = 'INSUFFICIENT_CREDITS';
    error.cost = cost;
    throw error;
  }
  if (wallet.scope === 'team') {
    await env.DB.prepare(`INSERT INTO team_credit_ledger (team_id,user_id,amount,reason,reference_id) VALUES (?,?,?,?,?)`).bind(wallet.teamId, userId, -cost, String(reason).slice(0, 200), referenceId || null).run();
  } else {
    await env.DB.prepare(`INSERT INTO credit_ledger (user_id,amount,reason,reference_id) VALUES (?,?,?,?)`).bind(userId, -cost, String(reason).slice(0, 200), referenceId || null).run();
  }
  return { ...wallet, creditsLeft: Math.max(0, wallet.credits - cost) };
}
async function refundCredits(env, userId, amount, reason, billing = {}, referenceId = '') {
  const value = Math.max(0, Math.round(Number(amount) || 0));
  if (!value) return;
  const wallet = await resolveBillingWallet(env, userId, billing.scope, billing.teamId);
  if (!wallet) return;
  // 幂等：同一 referenceId 已经退过（正 ledger）则跳过（防重：submit-failure + poll-failure 双触发 / 并发轮询）
  if (referenceId) {
    const existing = wallet.scope === 'team'
      ? await env.DB.prepare(`SELECT id FROM team_credit_ledger WHERE reference_id=? AND team_id=? AND amount>0 LIMIT 1`).bind(referenceId, wallet.teamId).first()
      : await env.DB.prepare(`SELECT id FROM credit_ledger WHERE reference_id=? AND user_id=? AND amount>0 LIMIT 1`).bind(referenceId, userId).first();
    if (existing) return;
  }
  if (wallet.scope === 'team') {
    await env.DB.batch([
      env.DB.prepare(`UPDATE teams SET credits=credits+?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(value, wallet.teamId),
      env.DB.prepare(`INSERT INTO team_credit_ledger (team_id,user_id,amount,reason,reference_id) VALUES (?,?,?,?,?)`).bind(wallet.teamId, userId, value, String(reason).slice(0, 200), referenceId || null),
    ]);
  } else {
    await env.DB.batch([
      env.DB.prepare(`UPDATE users SET credits=credits+? WHERE id=?`).bind(value, userId),
      env.DB.prepare(`INSERT INTO credit_ledger (user_id,amount,reason,reference_id) VALUES (?,?,?,?)`).bind(userId, value, String(reason).slice(0, 200), referenceId || null),
    ]);
  }
}
async function persistGeneratedBuffer(env, assetId, mime, buffer) {
  if (!env.MEDIA) return;
  const row = await env.DB.prepare(`SELECT id,name,owner_id FROM assets WHERE id=?`).bind(assetId).first();
  if (!row) return;
  const key = `generated/${row.owner_id}/${assetId}/${String(row.name).replace(/[^\w.\-\u4e00-\u9fa5]/g, '_')}`;
  await env.MEDIA.put(key, buffer, { httpMetadata: { contentType: mime } });
  await env.DB.prepare(`UPDATE assets SET object_key=?,size_bytes=? WHERE id=?`).bind(key, buffer.byteLength, assetId).run();
}
async function createGeneratedAsset(env, userId, canvasId, kind, modelId, rawUrl, mime, taskId) {
  const assetId = crypto.randomUUID();
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  const name = `AI${kind === 'video' ? '视频' : '绘图'}_${stamp}.${assetExt(mime)}`;
  await env.DB.prepare(`INSERT INTO assets (id,owner_id,canvas_id,name,mime_type,size_bytes,object_key,source,visibility,task_id,provider_url) VALUES (?,?,?,?,?,0,?,'generated','personal',?,?)`)
    .bind(assetId, userId, canvasId || null, name, mime, `pending:${assetId}`, taskId || null, rawUrl || null).run();
  if (rawUrl) void storeGeneratedAsset(env, assetId, rawUrl, mime).catch(() => {});
  return { id: assetId, name, mimeType: mime, url: `/api/assets/${assetId}` };
}
async function pollDashscopeTask(env, taskId, timeoutMs = 60_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const res = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${encodeURIComponent(taskId)}`, {
      headers: { authorization: `Bearer ${env.DASHSCOPE_API_KEY}` },
      signal: AbortSignal.timeout(20_000),
    });
    const data = await res.json().catch(() => ({}));
    const status = String(data.output?.task_status || '').toUpperCase();
    if (status === 'SUCCEEDED') return data.output?.results?.[0]?.url || '';
    if (['FAILED', 'CANCELED', 'CANCELLED'].includes(status)) throw new Error(data.output?.message || data.message || '通义万相生成失败');
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  throw new Error('通义万相生成超时，请稍后重试');
}
const IMAGE_SIZE_MAP = {
  '1:1': [1024, 1024], '3:4': [1024, 1365], '4:3': [1365, 1024], '2:3': [1024, 1536], '3:2': [1536, 1024],
  '4:5': [1024, 1280], '5:4': [1280, 1024], '9:16': [768, 1365], '16:9': [1365, 768], '21:9': [1792, 768],
};
const WANX_SIZE_MAP = { '1:1': '1024*1024', '9:16': '720*1280', '16:9': '1280*720', '3:4': '960*1280', '4:3': '1280*960', '3:2': '1280*960', '2:3': '960*1280', '4:5': '960*1280', '5:4': '1280*960', '21:9': '1280*720' };
const imageSizeFor = (aspectRatio, resolution) => {
  const px = resolution === '4k' ? 2048 : resolution === '2k' ? 1536 : 1024;
  const [w, h] = IMAGE_SIZE_MAP[aspectRatio] || [1024, 1024];
  return `${w >= h ? px : Math.max(1024, Math.round(px * w / h))}x${h >= w ? px : Math.max(1024, Math.round(px * h / w))}`;
};
async function generateImage(env, def, prompt, opts = {}) {
  const aspectRatio = /^\d+:\d+$/.test(String(opts.aspectRatio || '')) ? String(opts.aspectRatio) : '1:1';
  const resolution = ['1k', '2k', '4k'].includes(String(opts.resolution || '')) ? String(opts.resolution) : '1k';
  const refImage = /^data:image\/(png|jpe?g|webp);base64,/i.test(String(opts.image || '')) && String(opts.image).length <= 10_000_000 ? String(opts.image) : '';

  const key = MEDIA_PROVIDER_KEYS[def.provider](env);
  if (!key) throw Object.assign(new Error('该模型的密钥尚未配置，请联系管理员'), { status: 503 });
  const model = typeof def.model === 'function' ? def.model(env) : def.model;
  const throwUpstream = (label, res, data) => {
    const detail = data?.error?.message || data?.message || data?.msg || (data?.error && typeof data.error === 'string' ? data.error : '') || `上游错误 ${res.status}`;
    throw Object.assign(new Error(`${label}：${detail}`), { status: 502 });
  };
  if (def.provider === 'openai') {
    if (refImage) {
      const mime = refImage.match(/^data:image\/(png|jpe?g|webp);/)?.[1] === 'png' ? 'image/png' : 'image/jpeg';
      const bytes = Uint8Array.from(atob(refImage.split(',')[1].replace(/\s/g, '')), (c) => c.charCodeAt(0));
      const fd = new FormData();
      fd.append('model', model);
      fd.append('prompt', prompt);
      fd.append('size', env.OPENAI_IMAGE_SIZE || imageSizeFor(aspectRatio, resolution));
      fd.append('image', new Blob([bytes], { type: mime }), 'ref.png');
      const res = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { authorization: `Bearer ${key}` },
        body: fd,
        signal: AbortSignal.timeout(MEDIA_TIMEOUT_MS),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throwUpstream('OpenAI', res, data);
      const b64 = data.data?.[0]?.b64_json || data.data?.[0]?.base64;
      if (b64) return { mime: 'image/png', dataBase64: b64 };
      const url = data.data?.[0]?.url;
      if (url) return { mime: 'image/png', rawUrl: url };
      throw Object.assign(new Error('OpenAI 未返回图片内容'), { status: 502 });
    }
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, prompt, n: 1, size: env.OPENAI_IMAGE_SIZE || imageSizeFor(aspectRatio, resolution), response_format: 'b64_json' }),
      signal: AbortSignal.timeout(MEDIA_TIMEOUT_MS),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throwUpstream('OpenAI', res, data);
    const b64 = data.data?.[0]?.b64_json || data.data?.[0]?.base64;
    if (b64) return { mime: 'image/png', dataBase64: b64 };
    const url = data.data?.[0]?.url;
    if (url) return { mime: 'image/png', rawUrl: url };
    throw Object.assign(new Error('OpenAI 未返回图片内容'), { status: 502 });
  }
  if (def.provider === 'gemini') {
    const candidates = [model, 'gemini-2.5-flash-image'].filter((value, index, arr) => value && arr.indexOf(value) === index);
    let lastError = null;
    for (const candidate of candidates) {
      const parts = [];
      if (refImage) {
        const mime = refImage.match(/^data:image\/(png|jpe?g|webp);/)?.[1] === 'png' ? 'image/png' : 'image/jpeg';
        parts.push({ inlineData: { mimeType: mime, data: refImage.split(',')[1] } });
      }
      parts.push({ text: prompt });
      const generationConfig = { responseModalities: ['IMAGE'] };
      if (!refImage && /^\d+:\d+$/.test(aspectRatio)) generationConfig.aspectRatio = aspectRatio;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidate)}:generateContent?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }], generationConfig }),
        signal: AbortSignal.timeout(MEDIA_TIMEOUT_MS),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { lastError = data?.error?.message || data?.message || `上游错误 ${res.status}`; continue; }
      const part = data.candidates?.[0]?.content?.parts?.find((p) => p && p.inlineData);
      if (!part?.inlineData?.data) throw Object.assign(new Error('Gemini 未返回图片内容'), { status: 502 });
      return { mime: part.inlineData.mimeType || 'image/png', dataBase64: part.inlineData.data };
    }
    throw Object.assign(new Error(`Gemini：${lastError || '生成失败'}`), { status: 502 });
  }
  if (def.provider === 'minimax') {
    const base = env.MINIMAX_API_BASE || 'https://api.minimaxi.com';
    const res = await fetch(`${base}/v1/image_generation`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, prompt, n: 1, aspect_ratio: aspectRatio, response_format: 'url' }),
      signal: AbortSignal.timeout(MEDIA_TIMEOUT_MS),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throwUpstream('MiniMax', res, data);
    const url = data?.data?.image_urls?.[0] || data?.image_urls?.[0] || data?.url;
    if (!url) throw Object.assign(new Error('MiniMax 未返回图片地址'), { status: 502 });
    return { mime: inferAssetMime(url), rawUrl: url };
  }
  if (def.provider === 'siliconflow') {
    const res = await fetch('https://api.siliconflow.cn/v1/images/generations', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, prompt, n: 1, image_size: env.SILICONFLOW_IMAGE_SIZE || imageSizeFor(aspectRatio, resolution), response_format: 'url' }),
      signal: AbortSignal.timeout(MEDIA_TIMEOUT_MS),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throwUpstream('硅基流动', res, data);
    const url = data?.images?.[0]?.url || data?.data?.[0]?.url;
    if (!url) throw Object.assign(new Error('硅基流动未返回图片地址'), { status: 502 });
    return { mime: inferAssetMime(url), rawUrl: url };
  }
  if (def.provider === 'dashscope') {
    const res = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}`, 'x-dashscope-async': 'enable' },
      body: JSON.stringify({ model, input: { prompt }, parameters: { size: WANX_SIZE_MAP[aspectRatio] || '1024*1024', n: 1 } }),
      signal: AbortSignal.timeout(20_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throwUpstream('通义万相', res, data);
    const taskId = data?.output?.task_id;
    if (!taskId) throw Object.assign(new Error('通义万相未返回任务 ID'), { status: 502 });
    const url = await pollDashscopeTask(env, taskId);
    if (!url) throw Object.assign(new Error('通义万相未返回图片地址'), { status: 502 });
    return { mime: inferAssetMime(url), rawUrl: url };
  }
  throw Object.assign(new Error('不支持的图片提供商'), { status: 400 });
}
async function submitVideo(env, def, prompt, imageDataUrl, opts = {}) {
  const aspectRatio = /^\d+:\d+$/.test(String(opts.aspectRatio || '')) ? String(opts.aspectRatio) : '';
  const duration = String(opts.duration || '').trim();
  const key = MEDIA_PROVIDER_KEYS[def.provider](env);
  if (!key) throw Object.assign(new Error('该模型的密钥尚未配置，请联系管理员'), { status: 503 });
  const model = typeof def.model === 'function' ? def.model(env) : def.model;
  if (def.image && !imageDataUrl) throw Object.assign(new Error('该模型需要先上传一张图片（图生视频）'), { status: 400 });
  if (def.provider === 'minimax') {
    const base = env.MINIMAX_API_BASE || 'https://api.minimaxi.com';
    const body = { model, prompt };
    if (imageDataUrl) body.first_frame_image = imageDataUrl;
    if (aspectRatio) body.aspect_ratio = aspectRatio;
    if (duration) body.duration = duration;
    const res = await fetch(`${base}/v1/video_generation`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = data?.base_resp?.status_msg || data?.message || data?.msg || `上游错误 ${res.status}`;
      throw Object.assign(new Error(`MiniMax：${detail}`), { status: 502 });
    }
    const taskId = data?.task_id;
    if (!taskId) throw Object.assign(new Error('MiniMax 未返回任务 ID'), { status: 502 });
    return taskId;
  }
  if (def.provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/videos', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, prompt, n: 1, ...(aspectRatio ? { aspect_ratio: aspectRatio } : {}) }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = data?.error?.message || data?.message || `上游错误 ${res.status}`;
      throw Object.assign(new Error(`OpenAI：${detail}`), { status: 502 });
    }
    const id = data?.id;
    if (!id) throw Object.assign(new Error('OpenAI 未返回视频任务 ID'), { status: 502 });
    return id;
  }
  if (def.provider === 'gemini') {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:predictLongRunning?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ instances: [{ prompt }], parameters: { numberOfVideos: 1, ...(aspectRatio ? { aspectRatio } : {}) } }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = data?.error?.message || data?.message || `上游错误 ${res.status}`;
      throw Object.assign(new Error(`Gemini：${detail}`), { status: 502 });
    }
    const opName = data?.name;
    if (!opName) throw Object.assign(new Error('Gemini 未返回操作 ID'), { status: 502 });
    return opName;
  }
  throw Object.assign(new Error('不支持的视频提供商'), { status: 400 });
}
async function pollVideo(env, def, providerTaskId) {
  const key = MEDIA_PROVIDER_KEYS[def.provider](env);
  if (!key) return { status: 'FAILED', error: '模型密钥未配置' };
  const model = typeof def.model === 'function' ? def.model(env) : def.model;
  if (def.provider === 'minimax') {
    const base = env.MINIMAX_API_BASE || 'https://api.minimaxi.com';
    const res = await fetch(`${base}/v1/query/video_generation?task_id=${encodeURIComponent(providerTaskId)}`, {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(20_000),
    });
    const data = await res.json().catch(() => ({}));
    const status = String(data?.status || data?.task_status || '').toUpperCase();
    if (/SUCCESS|COMPLETE|DONE|FINISH/i.test(status)) {
      const fileId = data?.file_id || data?.fileId;
      if (!fileId) return { status: 'PROCESSING' };
      const fileRes = await fetch(`${base}/v1/files/retrieve?file_id=${encodeURIComponent(fileId)}`, {
        headers: { authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(20_000),
      });
      const fileData = await fileRes.json().catch(() => ({}));
      const url = fileData?.file?.download_url || fileData?.download_url || fileData?.url;
      if (!url) return { status: 'PROCESSING' };
      return { status: 'COMPLETED', url };
    }
    if (/FAIL|CANCEL|ERROR/i.test(status)) return { status: 'FAILED', error: data?.base_resp?.status_msg || data?.message || data?.msg || 'MiniMax 视频生成失败' };
    return { status: 'PROCESSING' };
  }
  if (def.provider === 'openai') {
    const res = await fetch(`https://api.openai.com/v1/videos/${encodeURIComponent(providerTaskId)}`, {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(20_000),
    });
    const data = await res.json().catch(() => ({}));
    const status = String(data?.status || '').toUpperCase();
    if (/COMPLETE|SUCCEED|DONE/i.test(status)) {
      const contentRes = await fetch(`https://api.openai.com/v1/videos/${encodeURIComponent(providerTaskId)}/content`, {
        headers: { authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(20_000),
      });
      const content = await contentRes.json().catch(() => ({}));
      const url = content?.content?.[0]?.uri || content?.uri || content?.url || content?.asset_url;
      if (!url) return { status: 'PROCESSING' };
      return { status: 'COMPLETED', url };
    }
    if (/FAIL|CANCEL/i.test(status)) return { status: 'FAILED', error: data?.error?.message || data?.message || 'OpenAI 视频生成失败' };
    return { status: 'PROCESSING' };
  }
  if (def.provider === 'gemini') {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${providerTaskId.startsWith('operations/') ? providerTaskId : `operations/${providerTaskId}`}?key=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(20_000),
    });
    const data = await res.json().catch(() => ({}));
    if (data?.done) {
      const video = data?.response?.generatedVideos?.[0];
      const url = video?.video?.uri || video?.uri || video?.contentUri;
      if (!url) return { status: 'FAILED', error: 'Gemini 视频生成完成但未取到地址' };
      return { status: 'COMPLETED', url };
    }
    if (data?.error) return { status: 'FAILED', error: data.error.message || 'Gemini 视频生成失败' };
    return { status: 'PROCESSING' };
  }
  return { status: 'FAILED', error: '不支持的视频提供商' };
}


async function serveMusicObject(request, env, objectKey, cacheControl = 'public, max-age=31536000, immutable') {
  if (!env.MEDIA) return response(request, env, { error: '音乐存储不可用' }, 503);
  const range = request.headers.get('range');
  let object = null;
  if (range) {
    const match = range.match(/bytes=(\d*)-(\d*)/);
    try {
      if (match && match[1] !== '') {
        const start = Number(match[1]);
        const end = match[2] !== '' ? Number(match[2]) : undefined;
        object = await env.MEDIA.get(objectKey, end !== undefined ? { range: { offset: start, end } } : { range: { offset: start } });
      } else {
        object = await env.MEDIA.get(objectKey);
      }
    } catch {
      object = await env.MEDIA.get(objectKey);
    }
  } else {
    object = await env.MEDIA.get(objectKey);
  }
  if (!object) return response(request, env, { error: '音乐文件不存在' }, 404);
  const headers = {
    'content-type': 'audio/mpeg',
    'cache-control': cacheControl,
    'accept-ranges': 'bytes',
    'content-length': String(object.size),
  };
  if (object.range) {
    const start = object.range.offset;
    const end = object.range.end ?? object.size - 1;
    headers['content-range'] = `bytes ${start}-${end}/${object.size}`;
    headers['content-length'] = String(end - start + 1);
    return new Response(object.body, { status: 206, headers });
  }
  return new Response(object.body, { status: 200, headers });
}

async function api(request, env, url) {
  if (request.method === 'OPTIONS') return response(request, env, {}, 204);
  if (url.pathname === '/api/health') {
    return response(request, env, { ok: true, database: Boolean(env.DB), storage: Boolean(env.MEDIA), collaboration: Boolean(env.CANVAS_ROOMS || env.COLLABORATION_AVAILABLE), runninghub: Boolean(env.RUNNINGHUB_API_KEY) });
  }
  if (url.pathname === '/api/rh-cases' && request.method === 'GET') {
    try {
      const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
      const size = Math.min(200, Math.max(1, Number(url.searchParams.get('size')) || 24));
      const body = { page, size, sortType: url.searchParams.get('sortType') || 'HOT' };
      const categoryCode = url.searchParams.get('categoryCode');
      const keyword = url.searchParams.get('keyword');
      if (categoryCode && categoryCode !== 'ALL') body.categoryCode = categoryCode;
      if (keyword && keyword.trim()) body.keyword = keyword.trim();
      const upstream = await fetch('https://pre-cn.runninghub.cn/canvas/community/composition/list', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0' },
        body: JSON.stringify(body),
      });
      const j = await upstream.json();
      if (!upstream.ok || j.code !== 0) {
        return response(request, env, { error: j.msg || 'RunningHub 案例接口异常' }, 502);
      }
      return response(request, env, {
        total: j.data.total,
        page: j.data.current,
        size: j.data.size,
        pages: j.data.pages,
        items: j.data.records || [],
      }, 200, { 'Cache-Control': 'public, max-age=60' });
    } catch (error) {
      return response(request, env, { error: error.message }, 502);
    }
  }
  if (url.pathname === '/api/runninghub/models' && request.method === 'GET') {
    try {
      const catalog = await capabilities(env, request);
      const task = url.searchParams.get('task') || '';
      const output = url.searchParams.get('output') || '';
      const q = (url.searchParams.get('q') || '').toLowerCase().trim();
      const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
      const pageSize = Math.min(500, Math.max(1, Number(url.searchParams.get('pageSize')) || 200));
      const items = catalog.endpoints
        .filter((item) => (!task || item.task === task) && (!output || item.output_type === output) && (!q || JSON.stringify(item).toLowerCase().includes(q)))
        .map((item) => ({
          endpoint: item.endpoint,
          name: item.name_cn || item.name_en || item.endpoint,
          nameEn: item.name_en || '',
          task: item.task || 'other',
          outputType: item.output_type || 'image',
          category: item.category || '',
          popularity: item.popularity || 0,
          tags: item.tags || [],
          params: item.params || [],
          estimatedCredits: runningHubEstimatedCredits(catalog, item.endpoint, item.task, item.output_type),
        }));
      const taskCounts = new Map();
      for (const item of catalog.endpoints) {
        const key = item.task || 'other';
        taskCounts.set(key, (taskCounts.get(key) || 0) + 1);
      }
      const groups = [...taskCounts.entries()]
        .map(([key, count]) => ({ task: key, label: runningHubGroupLabels[key] || key, count }))
        .sort((a, b) => b.count - a.count);
      return response(request, env, { version: catalog.version, total: items.length, page, pageSize, groups, items: items.slice((page - 1) * pageSize, page * pageSize) });
    } catch (error) {
      return response(request, env, { error: error.message }, 502);
    }
  }

  if (url.pathname === '/api/openclaw/status' && request.method === 'GET') {
    try {
      await initialize(env);
      const user = await requireUser(request, env, false);
      if (!user) return response(request, env, { error: '请先登录后再查看 AI 管理状态', code: 'AUTH_REQUIRED' }, 401);
      const gatewayUrl = openClawGatewayBase(env);
      const localOnly = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(gatewayUrl);
      const { data } = await openClawHealth(env);
      return response(request, env, {
        online: true,
        status: data?.status || (data?.ok ? 'live' : 'unknown'),
        gateway: localOnly ? 'local-loopback' : 'remote',
        controlUrl: localOnly ? gatewayUrl : null,
        productionReady: !localOnly,
        note: localOnly
          ? 'OpenClaw 当前只绑定本机回环地址。公网服务器需要配置安全隧道、内网专线或把网关部署到同一台服务器后才能调用。'
          : 'OpenClaw 网关已配置为服务器可访问地址。',
      });
    } catch (error) {
      return response(request, env, {
        online: false,
        status: 'offline',
        gateway: 'unavailable',
        controlUrl: null,
        productionReady: false,
        error: error.message || 'OpenClaw 网关不可用',
        note: '请确认 OpenClaw gateway 正在运行，或配置 OPENCLAW_GATEWAY_URL 指向可访问的网关地址。',
      }, error.status && error.status >= 400 && error.status < 600 ? error.status : 503);
    }
  }

  if (url.pathname === '/api/creative/models' && request.method === 'GET') {
    return response(request, env, { models: creativeModels(env) });
  }
  if (url.pathname === '/api/creative/chat' && request.method === 'POST') {
    try {
      const user = await requireUser(request, env, false);
      if (!user) return response(request, env, { error: '请先登录后再使用 AI 助手', code: 'AUTH_REQUIRED' }, 401);
      const body = await request.json().catch(() => ({}));
      const wantModel = CREATIVE_CHAT_MODELS.find((m) => m.id === String(body.model || ''));
      if (wantModel && wantModel.tier === 'pro' && !(await userIsPremium(env, user.user_id))) {
        return response(request, env, { error: '高级模型需累计充值满 30 元后解锁，当前为免费用户', code: 'UPGRADE_REQUIRED', upgrade: true }, 402);
      }
      const sub = await checkActiveSubscription(env, user.user_id);
      if (!sub.active) {
        // 无月租时走积分通道：每次 AI 对话扣 1 积分，积分不足才拦截
        await deductCredits(env, user.user_id, 1, 'AI 对话消耗');
      }
      const result = await creativeChat(env, body);
      await recordModelUsage(env, user.user_id, result.model || body.model || 'unknown', '/api/creative/chat', 'creative_chat', body.messages?.[body.messages.length - 1]?.content?.slice(0, 100) || '');
      return response(request, env, result);
    } catch (error) {
      return response(request, env, { error: error.message }, error.status || 502);
    }
  }
  if (url.pathname === '/api/creative/media/models' && request.method === 'GET') {
    return response(request, env, mediaGenModels(env));
  }
  if (url.pathname === '/api/creative/image' && request.method === 'POST') {
    try {
      await initialize(env).catch(() => {});
      const user = await requireUser(request, env, false);
      if (!user) return response(request, env, { error: '请先登录后再使用 AI 创作', code: 'AUTH_REQUIRED' }, 401);
      const body = await request.json().catch(() => ({}));
      const prompt = String(body.prompt || '').trim().slice(0, 2000);
      if (!prompt) return response(request, env, { error: '请先输入想生成的内容描述' }, 400);
      const def = MEDIA_IMAGE_MODELS.find((m) => m.id === String(body.model || ''));
      if (!def) return response(request, env, { error: '未知的图片模型，请从列表中选择' }, 400);
      if (!mediaModelConfigured(env, def)) return response(request, env, { error: '该模型的密钥尚未配置，请联系管理员' }, 503);
      if (String(body.image || '') && !def.i2i) return response(request, env, { error: '该模型暂不支持图生图（参考图模式）' }, 400);
      const wallet = await resolveBillingWallet(env, user.user_id);
      if (!wallet) return response(request, env, { error: '当前团队钱包不可用，请重新选择积分账户' }, 403);
      if (wallet.credits < def.credits) {
        return response(request, env, { error: `${wallet.name}不足：生成该图片需要 ${def.credits} 积分，请先充值`, code: 'INSUFFICIENT_CREDITS', cost: def.credits }, 402);
      }
      const out = await generateImage(env, def, prompt, { aspectRatio: body.aspectRatio, resolution: body.resolution, image: body.image });
      const mime = out.mime || 'image/png';
      const assetId = crypto.randomUUID();
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
      const name = `AI绘图_${stamp}.${assetExt(mime)}`;
      await env.DB.prepare(`INSERT INTO assets (id,owner_id,canvas_id,name,mime_type,size_bytes,object_key,source,visibility,provider_url) VALUES (?,?,?,?,?,0,?,'generated','personal',?)`)
        .bind(assetId, user.user_id, body.canvasId || null, name, mime, `pending:${assetId}`, out.rawUrl || null).run();
      await env.DB.prepare(`INSERT INTO media_tasks (id,user_id,kind,model,provider,provider_task_id,status,credit_cost,billing_scope,billing_team_id,output_json) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(assetId, user.user_id, 'image', def.id, def.provider, null, 'COMPLETED', def.credits, wallet.scope, wallet.teamId, JSON.stringify({ assetId })).run();
      if (out.dataBase64) {
        try {
          const bytes = Uint8Array.from(atob(String(out.dataBase64).replace(/\s/g, '')), (c) => c.charCodeAt(0));
          if (bytes.byteLength) await persistGeneratedBuffer(env, assetId, mime, bytes);
        } catch (err) {
          // base64 落库失败时保留 pending 记录，至少返回占位信息
        }
      } else if (out.rawUrl) {
        void storeGeneratedAsset(env, assetId, out.rawUrl, mime).catch(() => {});
      }
      const charged = await deductCredits(env, user.user_id, def.credits, `${def.name} 图片生成`, wallet, assetId);
      await recordModelUsage(env, user.user_id, typeof def.model === 'function' ? def.model(env) : def.model, '/api/creative/image', 'creative_image', prompt.slice(0, 100), def.credits);
      return response(request, env, { ok: true, asset: { id: assetId, name, mimeType: mime, url: `/api/assets/${assetId}` }, model: def.id, creditsUsed: def.credits, creditsLeft: charged.creditsLeft, billingScope: charged.scope, billingTeamId: charged.teamId });
    } catch (error) {
      return response(request, env, { error: error.message, code: error.code, cost: error.cost }, error.status || 502);
    }
  }
  if (url.pathname === '/api/creative/video' && request.method === 'POST') {
    try {
      await initialize(env).catch(() => {});
      const user = await requireUser(request, env, false);
      if (!user) return response(request, env, { error: '请先登录后再使用 AI 创作', code: 'AUTH_REQUIRED' }, 401);
      const body = await request.json().catch(() => ({}));
      const prompt = String(body.prompt || '').trim().slice(0, 2000);
      if (!prompt) return response(request, env, { error: '请先输入视频画面描述' }, 400);
      const def = MEDIA_VIDEO_MODELS.find((m) => m.id === String(body.model || ''));
      if (!def) return response(request, env, { error: '未知的视频模型，请从列表中选择' }, 400);
      if (!mediaModelConfigured(env, def)) return response(request, env, { error: '该模型的密钥尚未配置，请联系管理员' }, 503);
      const image = typeof body.image === 'string' && /^data:image\/(png|jpe?g|webp);base64,/i.test(body.image) && body.image.length <= 10_000_000 ? body.image : '';
      const wallet = await resolveBillingWallet(env, user.user_id);
      if (!wallet) return response(request, env, { error: '当前团队钱包不可用，请重新选择积分账户' }, 403);
      if (wallet.credits < def.credits) {
        return response(request, env, { error: `${wallet.name}不足：生成该视频需要 ${def.credits} 积分，请先充值`, code: 'INSUFFICIENT_CREDITS', cost: def.credits }, 402);
      }
      const providerTaskId = await submitVideo(env, def, prompt, image, { aspectRatio: body.aspectRatio, duration: body.duration });
      const taskId = crypto.randomUUID();
      await env.DB.prepare(`INSERT INTO media_tasks (id,user_id,kind,model,provider,provider_task_id,status,credit_cost,billing_scope,billing_team_id) VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .bind(taskId, user.user_id, 'video', def.id, def.provider, providerTaskId, 'queued', def.credits, wallet.scope, wallet.teamId).run();
      const charged = await deductCredits(env, user.user_id, def.credits, `${def.name} 视频生成`, wallet, taskId);
      await recordModelUsage(env, user.user_id, typeof def.model === 'function' ? def.model(env) : def.model, '/api/creative/video', 'creative_video', prompt.slice(0, 100), def.credits);
      return response(request, env, { ok: true, id: taskId, status: 'queued', model: def.id, creditsUsed: def.credits, creditsLeft: charged.creditsLeft, billingScope: charged.scope, billingTeamId: charged.teamId }, 202);
    } catch (error) {
      return response(request, env, { error: error.message, code: error.code, cost: error.cost }, error.status || 502);
    }
  }
  const mediaTaskMatch = url.pathname.match(/^\/api\/creative\/video\/([^/]+)$/);
  if (mediaTaskMatch && request.method === 'GET') {
    try {
      await initialize(env).catch(() => {});
      const user = await requireUser(request, env, false);
      if (!user) return response(request, env, { error: '请先登录', code: 'AUTH_REQUIRED' }, 401);
      const task = await env.DB.prepare(`SELECT * FROM media_tasks WHERE id=? AND user_id=?`).bind(decodeURIComponent(mediaTaskMatch[1]), user.user_id).first();
      if (!task) return response(request, env, { error: '任务不存在' }, 404);
      if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(task.status)) {
        let assets = [];
        if (task.status === 'COMPLETED') {
          const rows = await env.DB.prepare(`SELECT id,name,mime_type FROM assets WHERE task_id=? AND deleted_at IS NULL ORDER BY created_at`).bind(task.id).all();
          assets = rows.results.map((item) => ({ id: item.id, name: item.name, mimeType: item.mime_type, url: `/api/assets/${item.id}` }));
        }
        return response(request, env, { id: task.id, status: task.status, assets, error: task.error || null });
      }
      const def = mediaModelDef(task.model);
      if (!def) return response(request, env, { error: '任务模型不存在' }, 400);
      const result = await pollVideo(env, def, task.provider_task_id);
      let refunded = false;
      if (result.status === 'COMPLETED') {
        const mime = inferAssetMime(result.url);
        const asset = await createGeneratedAsset(env, task.user_id, null, 'video', task.model, result.url, mime, task.id);
        await env.DB.prepare(`UPDATE media_tasks SET status=?,output_json=?,error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind('COMPLETED', JSON.stringify({ url: result.url }), null, task.id).run();
        return response(request, env, { id: task.id, status: 'COMPLETED', assets: [asset], error: null });
      }
      if (result.status === 'FAILED') {
        if (!['FAILED', 'CANCELLED'].includes(task.status)) {
          await refundCredits(env, task.user_id, Number(task.credit_cost) || 0, `${def.name} 生成失败退回`, { scope: task.billing_scope, teamId: task.billing_team_id }, task.id);
          refunded = true;
        }
        await env.DB.prepare(`UPDATE media_tasks SET status=?,output_json=?,error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind('FAILED', '{}', String(result.error || '生成失败').slice(0, 300), task.id).run();
        return response(request, env, { id: task.id, status: 'FAILED', assets: [], error: result.error || '生成失败', creditsRefunded: refunded });
      }
      await env.DB.prepare(`UPDATE media_tasks SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind('processing', task.id).run();
      return response(request, env, { id: task.id, status: 'processing', assets: [], error: null });
    } catch (error) {
      return response(request, env, { error: error.message }, error.status || 502);
    }
  }
  // 创作历史：图片/视频产出全部可追溯（任务 ID + 产出资产）
  if (url.pathname === '/api/creative/history' && request.method === 'GET') {
    try {
      await initialize(env).catch(() => {});
      const user = await requireUser(request, env, false);
      if (!user) return response(request, env, { error: '请先登录', code: 'AUTH_REQUIRED' }, 401);
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 60));
      const rows = await env.DB.prepare(`SELECT id,kind,model,provider,status,credit_cost,error,created_at,output_json FROM media_tasks WHERE user_id=? ORDER BY created_at DESC LIMIT ?`).bind(user.user_id, limit).all();
      const items = [];
      for (const t of rows.results) {
        let thumb = null;
        if (t.status === 'COMPLETED') {
          const a = await env.DB.prepare(`SELECT id,name,mime_type FROM assets WHERE task_id=? AND deleted_at IS NULL ORDER BY created_at LIMIT 1`).bind(t.id).first();
          if (a) thumb = { id: a.id, name: a.name, mimeType: a.mime_type, url: `/api/assets/${a.id}` };
          else {
            try {
              const out = JSON.parse(t.output_json || '{}');
              if (out && out.url) thumb = { url: out.url, external: true };
            } catch (_) {}
          }
        }
        items.push({ id: t.id, kind: t.kind, model: t.model, provider: t.provider, status: t.status, credits: Number(t.credit_cost) || 0, error: t.error || null, createdAt: t.created_at, thumb });
      }
      return response(request, env, { items });
    } catch (error) {
      return response(request, env, { error: error.message }, error.status || 502);
    }
  }
  // 个人中心：使用明细（媒体任务 + 画布文本任务合并分页，每条产出带 ID 可追溯）
  if (url.pathname === '/api/me/usage' && request.method === 'GET') {
    try {
      await initialize(env).catch(() => {});
      const user = await requireUser(request, env, false);
      if (!user) return response(request, env, { error: '请先登录', code: 'AUTH_REQUIRED' }, 401);
      const requestedScope = url.searchParams.get('scope');
      const wallet = await resolveBillingWallet(
        env,
        user.user_id,
        requestedScope === 'team' ? 'team' : requestedScope === 'personal' ? 'personal' : '',
        String(url.searchParams.get('teamId') || ''),
      );
      if (!wallet) return response(request, env, { error: '团队不存在或你已不是团队成员' }, 403);
      const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
      const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
      const offset = (page - 1) * pageSize;
      const teamScope = wallet.scope === 'team';
      const sql = teamScope ? `
        SELECT id,kind,model,provider,status,credit_cost,error,created_at,output_json,NULL AS node_id,billing_scope,billing_team_id,user_id FROM media_tasks WHERE billing_scope='team' AND billing_team_id=?
        UNION ALL
        SELECT id,'text' AS kind,COALESCE(json_extract(input_json,'$.model'),json_extract(input_json,'$.endpoint'),definition_type,'文本生成') AS model,'runninghub' AS provider,status,credit_cost,error,created_at,output_json,node_id,billing_scope,billing_team_id,user_id FROM canvas_tasks WHERE billing_scope='team' AND billing_team_id=? AND id NOT IN (SELECT id FROM media_tasks WHERE billing_scope='team' AND billing_team_id=?)
        ORDER BY created_at DESC LIMIT ? OFFSET ?` : `
        SELECT id,kind,model,provider,status,credit_cost,error,created_at,output_json,NULL AS node_id,billing_scope,billing_team_id,user_id FROM media_tasks WHERE user_id=? AND COALESCE(billing_scope,'personal')='personal'
        UNION ALL
        SELECT id,'text' AS kind,COALESCE(json_extract(input_json,'$.model'),json_extract(input_json,'$.endpoint'),definition_type,'文本生成') AS model,'runninghub' AS provider,status,credit_cost,error,created_at,output_json,node_id,billing_scope,billing_team_id,user_id FROM canvas_tasks WHERE user_id=? AND COALESCE(billing_scope,'personal')='personal' AND id NOT IN (SELECT id FROM media_tasks WHERE user_id=? AND COALESCE(billing_scope,'personal')='personal')
        ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      const bindKey = teamScope ? wallet.teamId : user.user_id;
      const rows = await env.DB.prepare(sql).bind(bindKey, bindKey, bindKey, pageSize, offset).all();
      const c1 = teamScope
        ? await env.DB.prepare(`SELECT COUNT(*) AS c FROM media_tasks WHERE billing_scope='team' AND billing_team_id=?`).bind(wallet.teamId).first()
        : await env.DB.prepare(`SELECT COUNT(*) AS c FROM media_tasks WHERE user_id=? AND COALESCE(billing_scope,'personal')='personal'`).bind(user.user_id).first();
      const c2 = teamScope
        ? await env.DB.prepare(`SELECT COUNT(*) AS c FROM canvas_tasks WHERE billing_scope='team' AND billing_team_id=? AND id NOT IN (SELECT id FROM media_tasks WHERE billing_scope='team' AND billing_team_id=?)`).bind(wallet.teamId, wallet.teamId).first()
        : await env.DB.prepare(`SELECT COUNT(*) AS c FROM canvas_tasks WHERE user_id=? AND COALESCE(billing_scope,'personal')='personal' AND id NOT IN (SELECT id FROM media_tasks WHERE user_id=? AND COALESCE(billing_scope,'personal')='personal')`).bind(user.user_id, user.user_id).first();
      const total = Number(c1?.c || 0) + Number(c2?.c || 0);
      const items = [];
      for (const t of rows.results) {
        let thumb = null;
        if (t.status === 'COMPLETED') {
          const a = await env.DB.prepare(`SELECT id,name,mime_type FROM assets WHERE task_id=? AND deleted_at IS NULL ORDER BY created_at LIMIT 1`).bind(t.id).first();
          if (a) thumb = { id: a.id, name: a.name, mimeType: a.mime_type, url: `/api/assets/${a.id}` };
          else {
            try {
              const out = JSON.parse(t.output_json || '{}');
              if (out && out.url) thumb = { url: out.url, external: true };
            } catch (_) {}
          }
        }
        items.push({ id: t.id, nodeId: t.node_id || null, kind: t.kind, model: t.model, provider: t.provider, status: t.status, credits: Number(t.credit_cost) || 0, error: t.error || null, createdAt: t.created_at, thumb, billingScope: t.billing_scope || 'personal', billingTeamId: t.billing_team_id || null, userId: Number(t.user_id) || null });
      }
      return response(request, env, { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)), scope: wallet.scope, teamId: wallet.teamId || null, walletName: wallet.name });
    } catch (error) {
      return response(request, env, { error: error.message }, error.status || 502);
    }
  }
  // 个人中心：积分明细
  if (url.pathname === '/api/me/ledger' && request.method === 'GET') {
    try {
      await initialize(env).catch(() => {});
      const user = await requireUser(request, env, false);
      if (!user) return response(request, env, { error: '请先登录', code: 'AUTH_REQUIRED' }, 401);
      const requestedScope = url.searchParams.get('scope');
      const wallet = await resolveBillingWallet(env, user.user_id, requestedScope === 'team' ? 'team' : requestedScope === 'personal' ? 'personal' : '', String(url.searchParams.get('teamId') || ''));
      if (!wallet) return response(request, env, { error: '团队不存在或你已不是团队成员' }, 403);
      const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
      const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
      const offset = (page - 1) * pageSize;
      const rows = wallet.scope === 'team'
        ? await env.DB.prepare(`SELECT id,user_id,amount,reason,created_at FROM team_credit_ledger WHERE team_id=? ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`).bind(wallet.teamId, pageSize, offset).all()
        : await env.DB.prepare(`SELECT id,user_id,amount,reason,created_at FROM credit_ledger WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`).bind(user.user_id, pageSize, offset).all();
      const c = wallet.scope === 'team'
        ? await env.DB.prepare(`SELECT COUNT(*) AS c FROM team_credit_ledger WHERE team_id=?`).bind(wallet.teamId).first()
        : await env.DB.prepare(`SELECT COUNT(*) AS c FROM credit_ledger WHERE user_id=?`).bind(user.user_id).first();
      const total = Number(c?.c || 0);
      return response(request, env, { items: rows.results.map(r => ({ id: r.id, amount: Number(r.amount) || 0, reason: r.reason, createdAt: r.created_at, userId: Number(r.user_id) || null, billingScope: wallet.scope, billingTeamId: wallet.teamId || null })), total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)), scope: wallet.scope, teamId: wallet.teamId || null, walletName: wallet.name });
    } catch (error) {
      return response(request, env, { error: error.message }, error.status || 502);
    }
  }
  // 个人中心：充值/订阅记录
  if (url.pathname === '/api/me/orders' && request.method === 'GET') {
    try {
      await initialize(env).catch(() => {});
      const user = await requireUser(request, env, false);
      if (!user) return response(request, env, { error: '请先登录', code: 'AUTH_REQUIRED' }, 401);
      const requestedScope = url.searchParams.get('scope');
      const wallet = await resolveBillingWallet(env, user.user_id, requestedScope === 'team' ? 'team' : requestedScope === 'personal' ? 'personal' : '', String(url.searchParams.get('teamId') || ''));
      if (!wallet) return response(request, env, { error: '团队不存在或你已不是团队成员' }, 403);
      const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
      const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
      const offset = (page - 1) * pageSize;
      const rows = wallet.scope === 'team'
        ? await env.DB.prepare(`SELECT id,user_id,provider,amount_cents,credits,status,plan_type,expires_at,credit_scope,team_id,created_at FROM payment_orders WHERE credit_scope='team' AND team_id=? ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`).bind(wallet.teamId, pageSize, offset).all()
        : await env.DB.prepare(`SELECT id,user_id,provider,amount_cents,credits,status,plan_type,expires_at,credit_scope,team_id,created_at FROM payment_orders WHERE user_id=? AND COALESCE(credit_scope,'personal')='personal' ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`).bind(user.user_id, pageSize, offset).all();
      const c = wallet.scope === 'team'
        ? await env.DB.prepare(`SELECT COUNT(*) AS c FROM payment_orders WHERE credit_scope='team' AND team_id=?`).bind(wallet.teamId).first()
        : await env.DB.prepare(`SELECT COUNT(*) AS c FROM payment_orders WHERE user_id=? AND COALESCE(credit_scope,'personal')='personal'`).bind(user.user_id).first();
      const total = Number(c?.c || 0);
      return response(request, env, { items: rows.results.map(r => ({ id: r.id, provider: r.provider, amountYuan: (Number(r.amount_cents) || 0) / 100, credits: Number(r.credits) || 0, status: r.status, planType: r.plan_type || null, expiresAt: r.expires_at || null, createdAt: r.created_at, creditScope: r.credit_scope || 'personal', teamId: r.team_id || null, userId: Number(r.user_id) || null })), total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)), scope: wallet.scope, teamId: wallet.teamId || null, walletName: wallet.name });
    } catch (error) {
      return response(request, env, { error: error.message }, error.status || 502);
    }
  }
  if (url.pathname.startsWith('/api/auth/') || url.pathname.startsWith('/api/openclaw') || url.pathname.startsWith('/api/canvases') || url.pathname.startsWith('/api/assets') || url.pathname.startsWith('/api/node-definitions') || url.pathname.startsWith('/api/canvas-tasks') || url.pathname.startsWith('/api/payments') || url.pathname.startsWith('/api/collaboration')) {
    try { await initialize(env); } catch (error) { return response(request, env, { error: error.message }, 503); }
  }
  if (url.pathname === '/api/auth/send-code' && request.method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      const phone = normalizePhone(body.phone);
      if (!/^1\d{10}$/.test(phone)) return response(request, env, { error: '请输入有效的中国大陆手机号' }, 400);
      const existing = await env.DB.prepare(`SELECT created_at FROM verification_codes WHERE identifier=? AND purpose='login'`).bind(phone).first();
      if (existing && Date.now() - new Date(String(existing.created_at).replace(' ', 'T')).getTime() < 60_000) return response(request, env, { error: '验证码发送过于频繁，请 60 秒后再试' }, 429);
      if (env.SMS_PROVIDER === 'aliyun' && (!String(env.SMS_SIGN_NAME || '').trim() || !String(env.SMS_TEMPLATE_CODE || '').trim())) {
        return response(request, env, { error: '短信通道未配置完整：请先在阿里云短信服务配置签名和模板，或切到“密码”页用邮箱注册/登录' }, 503);
      }
      if (env.SMS_PROVIDER === 'dypns' && !String(env.SMS_DYPNS_SCHEME_NAME || '').trim()) {
        return response(request, env, { error: '短信认证方案未配置：请先在阿里云号码认证服务配置方案，或切到“密码”页用邮箱注册/登录' }, 503);
      }
      const expires = new Date(Date.now() + 5 * 60_000).toISOString();
      if (env.SMS_PROVIDER) {
        if (env.SMS_PROVIDER === 'dypns') {
          const sent = await dypnsSendVerifyCode(env, phone);
          if (!sent.ok) return response(request, env, { error: sent.error || '短信发送失败，请稍后再试' }, 502);
          // dypns 验证码由阿里云服务端生成并校验，本地 code_hash 存占位串（兼容老库 NOT NULL 约束）
          await env.DB.prepare(`INSERT INTO verification_codes (identifier,purpose,code_hash,attempts,used,biz_id,expires_at) VALUES (?,?,?,0,0,?,?) ON CONFLICT(identifier,purpose) DO UPDATE SET code_hash=excluded.code_hash,attempts=0,used=0,biz_id=excluded.biz_id,expires_at=excluded.expires_at,created_at=CURRENT_TIMESTAMP`)
            .bind(phone, 'login', 'dypns-managed', sent.bizId || '', expires).run();
          return response(request, env, { ok: true, message: '验证码已发送' });
        }
        if (env.SMS_PROVIDER !== 'aliyun') return response(request, env, { error: `暂不支持的短信服务商：${env.SMS_PROVIDER}` }, 503);
        const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
        const sent = await aliyunSendSms(env, phone, code);
        if (!sent.ok) return response(request, env, { error: sent.error || '短信发送失败，请稍后再试' }, 502);
        await env.DB.prepare(`INSERT INTO verification_codes (identifier,purpose,code_hash,attempts,used,expires_at) VALUES (?,?,?,0,0,?) ON CONFLICT(identifier,purpose) DO UPDATE SET code_hash=excluded.code_hash,attempts=0,used=0,expires_at=excluded.expires_at,created_at=CURRENT_TIMESTAMP`)
          .bind(phone, 'login', await sha256(code), expires).run();
        return response(request, env, { ok: true, message: '验证码已发送' });
      }
      const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
      await env.DB.prepare(`INSERT INTO verification_codes (identifier,purpose,code_hash,attempts,used,expires_at) VALUES (?,?,?,0,0,?) ON CONFLICT(identifier,purpose) DO UPDATE SET code_hash=excluded.code_hash,attempts=0,used=0,expires_at=excluded.expires_at,created_at=CURRENT_TIMESTAMP`)
        .bind(phone, 'login', await sha256(code), expires).run();
      return response(request, env, { ok: true, devCode: code, message: '短信服务尚未接入，测试环境直接返回验证码' });
    } catch (error) {
      return response(request, env, { error: `验证码服务异常，请稍后重试（${error.message || 'unknown'}）` }, 500);
    }
  }
  if ((url.pathname === '/api/auth/oauth/start' || url.pathname === '/api/auth/oauth') && (request.method === 'GET' || request.method === 'POST')) {
    const provider = String(url.searchParams.get('provider') || '').toLowerCase();
    if (!['wechat', 'qq'].includes(provider)) return response(request, env, { error: '暂不支持的第三方登录方式' }, 400);
    const appId = provider === 'wechat' ? env.WECHAT_APP_ID : env.QQ_APP_ID;
    const appSecret = provider === 'wechat' ? env.WECHAT_APP_SECRET : env.QQ_APP_SECRET;
    if (!appId || !appSecret) return response(request, env, { error: `${provider === 'wechat' ? '微信' : 'QQ'}扫码登录尚未配置，需要先在开放平台申请应用，配置后即可使用`, code: 'OAUTH_NOT_CONFIGURED' }, 503);
    const state = randomToken();
    const redirect = String(url.searchParams.get('redirect') || '/').slice(0, 300);
    await env.DB.prepare(`INSERT INTO oauth_states (state,provider,redirect,expires_at) VALUES (?,?,?,?)`).bind(state, provider, redirect, new Date(Date.now() + 10 * 60_000).toISOString()).run();
    const callback = encodeURIComponent(`${url.origin}/api/auth/oauth/callback?provider=${provider}`);
    const authorizeUrl = provider === 'wechat'
      ? `https://open.weixin.qq.com/connect/qrconnect?appid=${encodeURIComponent(appId)}&redirect_uri=${callback}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`
      : `https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id=${encodeURIComponent(appId)}&redirect_uri=${callback}&state=${state}&scope=get_user_info`;
    return response(request, env, { url: authorizeUrl, state, provider });
  }
  if (url.pathname === '/api/auth/oauth/callback' && request.method === 'GET') {
    const provider = String(url.searchParams.get('provider') || '').toLowerCase();
    const state = String(url.searchParams.get('state') || '');
    const code = String(url.searchParams.get('code') || '');
    const wantsHtml = String(request.headers.get('accept') || '').includes('text/html');
    const fail = (message, status = 400) => wantsHtml ? htmlPage('登录失败', message) : response(request, env, { error: message }, status);
    const row = await env.DB.prepare(`SELECT * FROM oauth_states WHERE state=? AND provider=?`).bind(state, provider).first();
    if (!row || row.expires_at <= new Date().toISOString()) return fail('扫码登录已过期，请重新发起', 400);
    await env.DB.prepare(`DELETE FROM oauth_states WHERE state=?`).bind(state).run();
    if (!code) return fail('未获取到授权码，请重试', 400);
    let openid = '', nickname = '', avatar = '';
    if (provider === 'wechat') {
      const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${encodeURIComponent(env.WECHAT_APP_ID)}&secret=${encodeURIComponent(env.WECHAT_APP_SECRET)}&code=${encodeURIComponent(code)}&grant_type=authorization_code`;
      const tokenData = await (await fetch(tokenUrl)).json().catch(() => ({}));
      if (!tokenData.access_token) return fail(`微信授权失败：${tokenData.errmsg || '未获取到访问令牌'}`, 502);
      openid = tokenData.openid || '';
      const info = await (await fetch(`https://api.weixin.qq.com/sns/userinfo?access_token=${encodeURIComponent(tokenData.access_token)}&openid=${encodeURIComponent(openid)}&lang=zh_CN`)).json().catch(() => ({}));
      nickname = info.nickname || '微信用户';
      avatar = info.headimgurl || '';
    } else {
      const tokenUrl = `https://graph.qq.com/oauth2.0/token?grant_type=authorization_code&client_id=${encodeURIComponent(env.QQ_APP_ID)}&client_secret=${encodeURIComponent(env.QQ_APP_SECRET)}&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(`${url.origin}/api/auth/oauth/callback?provider=qq`)}`;
      const tokenText = await (await fetch(tokenUrl)).text().catch(() => '');
      const tokenData = tokenText.startsWith('{') ? JSON.parse(tokenText) : Object.fromEntries(new URLSearchParams(tokenText));
      if (!tokenData.access_token) return fail('QQ 授权失败：未获取到访问令牌', 502);
      const meText = await (await fetch(`https://graph.qq.com/oauth2.0/me?access_token=${encodeURIComponent(tokenData.access_token)}`)).text().catch(() => '');
      const meMatch = meText.match(/\{[\s\S]*\}/);
      const me = meMatch ? JSON.parse(meMatch[0]) : {};
      openid = me.openid || '';
      if (!openid) return fail('QQ 授权失败：未获取到 OpenID', 502);
      const info = await (await fetch(`https://graph.qq.com/user/get_user_info?access_token=${encodeURIComponent(tokenData.access_token)}&oauth_consumer_key=${encodeURIComponent(env.QQ_APP_ID)}&openid=${encodeURIComponent(openid)}`)).json().catch(() => ({}));
      nickname = info.nickname || 'QQ用户';
      avatar = info.figureurl_qq_2 || info.figureurl || '';
    }
    const identifier = `${provider}:${openid}`;
    const email = `${provider}_${openid}@oauth.emeng.local`;
    const idSchema = await userIdentitySchema(env);
    let identity = await env.DB.prepare(`SELECT user_id FROM user_identities WHERE provider=? AND ${idSchema.col}=?`).bind(provider, identifier).first();
    let user;
    if (identity) {
      user = await env.DB.prepare(`SELECT id,email,name,credits,status FROM users WHERE id=?`).bind(identity.user_id).first();
    } else {
      user = await env.DB.prepare(`SELECT id,email,name,credits,status FROM users WHERE email=?`).bind(email).first();
      if (!user) {
        const safeName = String(nickname || (provider === 'wechat' ? '微信用户' : 'QQ用户')).replace(/[\u0000-\u001f<>]/g, '').slice(0, 60) || '新用户';
        const userId = (await env.DB.prepare(`INSERT INTO users (email,name,credits) VALUES (?,?,?)`).bind(email, safeName, 100).run()).meta.last_row_id;
        await env.DB.prepare(`INSERT INTO credit_ledger (user_id,amount,reason) VALUES (?,?,?)`).bind(userId, 100, '新用户注册赠送').run();
        user = { id: userId, email, name: safeName, credits: 100 };
      }
      const oauthMeta = idSchema.hasMeta ? JSON.stringify({ avatar, nickname: String(nickname).slice(0, 80) }) : null;
      await env.DB.prepare(`INSERT OR IGNORE INTO user_identities (user_id,provider,${idSchema.col}${idSchema.hasMeta ? ',meta' : ''}) VALUES (?,?,?${idSchema.hasMeta ? ',?' : ''})`).bind(...(idSchema.hasMeta ? [user.id, provider, identifier, oauthMeta] : [user.id, provider, identifier])).run();
    }
    if (!user || user.status !== 'active') return fail('账号不可用', 403);
    const session = await createUserSession(env, user.id);
    const target = String(row.redirect || '/').startsWith('/') ? row.redirect : '/';
    const location = `${url.origin}${target}${target.includes('?') ? '&' : '?'}oauth=ok`;
    const cookie = { 'set-cookie': setSessionCookie(session) };
    if (wantsHtml) return htmlPage('登录成功', '扫码登录成功', location, cookie);
    return response(request, env, { ok: true, user: { id: user.id, email: user.email, name: user.name, credits: user.credits } }, 200, { ...cookie, 'location': location });
  }
  if (url.pathname === '/api/auth/register' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 6) return response(request, env, { error: '需要有效邮箱和至少6位密码' }, 400);
    if (await env.DB.prepare(`SELECT id FROM users WHERE email=?`).bind(email).first()) return response(request, env, { error: '邮箱已注册' }, 409);
    const salt = randomToken(), userId = (await env.DB.prepare(`INSERT INTO users (email,name,credits) VALUES (?,?,?)`).bind(email, String(body.name || email.split('@')[0]).slice(0, 60), 100).run()).meta.last_row_id;
    await env.DB.prepare(`INSERT INTO user_credentials (user_id,password_hash,password_salt) VALUES (?,?,?)`).bind(userId, await passwordHash(password, salt), salt).run();
    await env.DB.prepare(`INSERT INTO credit_ledger (user_id,amount,reason) VALUES (?,?,?)`).bind(userId, 100, '注册赠送').run();
    const session = await createUserSession(env, userId);
    return response(request, env, { user: { id: userId, email, name: body.name || email.split('@')[0], credits: 100 }, csrfToken: session.csrf }, 201, { 'set-cookie': setSessionCookie(session) });
  }
  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    if (body.phone || body.code) {
      const phone = normalizePhone(body.phone);
      const code = String(body.code || '');
      if (!/^1\d{10}$/.test(phone) || !/^\d{6}$/.test(code)) return response(request, env, { error: '手机号或验证码格式不正确' }, 400);
      if (env.SMS_PROVIDER === 'dypns') {
        const row = await env.DB.prepare(`SELECT used, expires_at FROM verification_codes WHERE identifier=? AND purpose='login'`).bind(phone).first();
        if (!row || row.used || row.expires_at <= new Date().toISOString()) return response(request, env, { error: '验证码不存在或已过期，请重新获取' }, 400);
        const check = await dypnsCheckVerifyCode(env, phone, code);
        if (!check.ok) return response(request, env, { error: check.error || '验证码校验失败' }, 401);
        await env.DB.prepare(`UPDATE verification_codes SET used=1, attempts=attempts+1 WHERE identifier=? AND purpose='login'`).bind(phone).run();
      } else {
        const row = await env.DB.prepare(`SELECT * FROM verification_codes WHERE identifier=? AND purpose='login'`).bind(phone).first();
        if (!row || row.used || row.expires_at <= new Date().toISOString()) return response(request, env, { error: '验证码不存在或已过期，请重新获取' }, 400);
        if (row.attempts >= 5) return response(request, env, { error: '验证码错误次数过多，请重新获取' }, 429);
        if (row.code_hash !== await sha256(code)) {
          await env.DB.prepare(`UPDATE verification_codes SET attempts=attempts+1 WHERE identifier=? AND purpose='login'`).bind(phone).run();
          return response(request, env, { error: '验证码错误' }, 401);
        }
        await env.DB.prepare(`UPDATE verification_codes SET used=1 WHERE identifier=? AND purpose='login'`).bind(phone).run();
      }
      const phoneSchema = await userIdentitySchema(env);
      let identity = await env.DB.prepare(`SELECT user_id FROM user_identities WHERE provider='phone' AND ${phoneSchema.col}=?`).bind(phone).first();
      let user;
      let isNew = false;
      if (identity) {
        user = await env.DB.prepare(`SELECT id,email,name,credits,status FROM users WHERE id=?`).bind(identity.user_id).first();
      } else {
        const email = `p${phone}@emeng.local`;
        user = await env.DB.prepare(`SELECT id,email,name,credits,status,subscription_expires_at FROM users WHERE email=?`).bind(email).first();
        if (!user) {
          const userId = (await env.DB.prepare(`INSERT INTO users (email,name,credits) VALUES (?,?,?)`).bind(email, phone, 100).run()).meta.last_row_id;
          const defaultSalt = randomToken();
          const defaultHash = await passwordHash('123456', defaultSalt);
          await env.DB.prepare(`INSERT INTO user_credentials (user_id,password_hash,password_salt) VALUES (?,?,?)`).bind(userId, defaultHash, defaultSalt).run();
          await env.DB.prepare(`INSERT INTO user_identities (user_id,provider,${phoneSchema.col}) VALUES (?,?,?)`).bind(userId, 'phone', phone).run();
          await env.DB.prepare(`INSERT INTO credit_ledger (user_id,amount,reason) VALUES (?,?,?)`).bind(userId, 100, '手机注册赠送（默认密码 123456）').run();
          user = { id: userId, email, name: phone, credits: 100, status: 'active', subscription_expires_at: null };
          isNew = true;
        }
        await env.DB.prepare(`INSERT OR IGNORE INTO user_identities (user_id,provider,${phoneSchema.col}) VALUES (?,?,?)`).bind(user.id, 'phone', phone).run();
      }
      if (!user || user.status !== 'active') return response(request, env, { error: '账号不可用' }, 403);
      const session = await createUserSession(env, user.id);
      return response(request, env, { user: { id: user.id, email: user.email, phone, name: user.name, credits: user.credits }, csrfToken: session.csrf, isNew }, 200, { 'set-cookie': setSessionCookie(session) });
    }
    const user = await passwordLoginUser(env, body.email || body.account);
    if (!user || user.status !== 'active' || user.password_hash !== await passwordHash(String(body.password || ''), user.password_salt)) return response(request, env, { error: '账号或密码错误' }, 401);
    const session = await createUserSession(env, user.id);
    return response(request, env, { user: { id: user.id, email: user.email, phone: user.phone || '', name: user.name, credits: user.credits }, csrfToken: session.csrf }, 200, { 'set-cookie': setSessionCookie(session) });
  }
  if (url.pathname === '/api/auth/me' && request.method === 'GET') {
    const user = await requireUser(request, env);
    if (!user) return response(request, env, { error: '未登录' }, 401);
    const meSchema = await userIdentitySchema(env);
    const identity = await env.DB.prepare(`SELECT ${meSchema.col} AS identifier FROM user_identities WHERE user_id=? AND provider='phone' LIMIT 1`).bind(user.user_id).first();
    const wechat = await env.DB.prepare(`SELECT provider FROM user_identities WHERE user_id=? AND provider='wechat' LIMIT 1`).bind(user.user_id).first();
    const subscriptionActive = user.subscription_expires_at && new Date(user.subscription_expires_at).getTime() > Date.now();
    const premium = await userIsPremium(env, user.user_id);
    return response(request, env, { user: { id: user.user_id, email: user.email, phone: identity?.identifier || '', name: user.name, credits: user.credits, subscription_expires_at: user.subscription_expires_at || null, subscription_active: Boolean(subscriptionActive), premium, wechat_bound: Boolean(wechat) }, csrfToken: user.csrf_token });
  }
  if (url.pathname === '/api/me/wallets' && request.method === 'GET') {
    try {
      await initialize(env);
      const user = await requireUser(request, env, false);
      if (!user) return response(request, env, { error: '请先登录', code: 'AUTH_REQUIRED' }, 401);
      const wallets = await walletsForUser(env, user.user_id);
      return response(request, env, wallets);
    } catch (error) {
      return response(request, env, { error: error.message }, error.status || 500);
    }
  }
  if (url.pathname === '/api/me/wallets/active' && request.method === 'POST') {
    try {
      await initialize(env);
      const user = await requireUser(request, env, true);
      if (!user) return response(request, env, { error: '请先登录或刷新会话' }, 401);
      const body = await request.json().catch(() => ({}));
      const scope = body.scope === 'team' ? 'team' : 'personal';
      if (scope === 'team') {
        const team = await resolveBillingWallet(env, user.user_id, 'team', String(body.teamId || ''));
        if (!team) return response(request, env, { error: '团队不存在或你已不是团队成员' }, 403);
        await env.DB.prepare(`UPDATE users SET active_credit_scope='team',active_team_id=? WHERE id=?`).bind(team.teamId, user.user_id).run();
      } else {
        await env.DB.prepare(`UPDATE users SET active_credit_scope='personal',active_team_id=NULL WHERE id=?`).bind(user.user_id).run();
      }
      return response(request, env, await walletsForUser(env, user.user_id));
    } catch (error) {
      return response(request, env, { error: error.message }, error.status || 500);
    }
  }
  if (url.pathname === '/api/auth/dev-reset-password' && request.method === 'POST') {
    if (!env.DEV_RESET_SECRET) return response(request, env, { error: 'not found' }, 404);
    const body = await request.json().catch(() => ({}));
    if (String(body.secret || '') !== env.DEV_RESET_SECRET) return response(request, env, { error: 'secret 不正确' }, 401);
    const email = String(body.email || '').trim().toLowerCase();
    const newPassword = String(body.newPassword || '');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return response(request, env, { error: '邮箱格式不正确' }, 400);
    if (newPassword.length < 6 || newPassword.length > 64) return response(request, env, { error: '新密码长度需在 6-64 位之间' }, 400);
    const user = await env.DB.prepare(`SELECT id FROM users WHERE email=?`).bind(email).first();
    if (!user) return response(request, env, { error: `邮箱 ${email} 不存在` }, 404);
    const salt = randomToken();
    const hash = await passwordHash(newPassword, salt);
    const existing = await env.DB.prepare(`SELECT user_id FROM user_credentials WHERE user_id=?`).bind(user.id).first();
    if (existing) {
      await env.DB.prepare(`UPDATE user_credentials SET password_hash=?, password_salt=?, updated_at=CURRENT_TIMESTAMP WHERE user_id=?`).bind(hash, salt, user.id).run();
    } else {
      await env.DB.prepare(`INSERT INTO user_credentials (user_id, password_hash, password_salt) VALUES (?, ?, ?)`).bind(user.id, hash, salt).run();
    }
    return response(request, env, { ok: true, email, userId: user.id, message: '密码已重置' });
  }
  if (url.pathname === '/api/auth/change-password' && request.method === 'POST') {
    const user = await requireUser(request, env, true);
    if (!user) return response(request, env, { error: '请先登录' }, 401);
    const body = await request.json().catch(() => ({}));
    const oldPwd = String(body.oldPassword || '');
    const newPwd = String(body.newPassword || '');
    if (newPwd.length < 6 || newPwd.length > 64) return response(request, env, { error: '新密码长度需在 6-64 位之间' }, 400);
    const cred = await env.DB.prepare(`SELECT password_hash, password_salt FROM user_credentials WHERE user_id=?`).bind(user.user_id).first();
    if (!cred) {
      const salt = randomToken();
      const hash = await passwordHash(newPwd, salt);
      await env.DB.prepare(`INSERT INTO user_credentials (user_id,password_hash,password_salt) VALUES (?,?,?)`).bind(user.user_id, hash, salt).run();
      return response(request, env, { ok: true });
    }
    if (!oldPwd) return response(request, env, { error: '请输入当前密码' }, 400);
    if (await passwordHash(oldPwd, cred.password_salt) !== cred.password_hash) return response(request, env, { error: '当前密码不正确' }, 401);
    const salt = randomToken();
    const hash = await passwordHash(newPwd, salt);
    await env.DB.prepare(`UPDATE user_credentials SET password_hash=?, password_salt=?, updated_at=CURRENT_TIMESTAMP WHERE user_id=?`).bind(hash, salt, user.user_id).run();
    return response(request, env, { ok: true });
  }
  if (url.pathname === '/api/payments/subscription/order' && request.method === 'POST') {
    if (env.PAYMENTS_SANDBOX_ENABLED !== true) return response(request, env, { error: '支付通道尚未接入，不能直接开通会员', code: 'PAYMENT_PROVIDER_NOT_CONFIGURED' }, 503);
    const user = await requireUser(request, env, true);
    if (!user) return response(request, env, { error: '请先登录' }, 401);
    const body = await request.json().catch(() => ({}));
    const plan = String(body.plan || 'monthly');
    const planDef = SUBSCRIPTION_PLANS.find((p) => p.id === plan);
    const amountCents = Number.isFinite(Number(body.amountCents)) ? Math.max(0, Math.round(Number(body.amountCents))) : (planDef?.priceCents ?? 9900);
    const days = planDef ? planDef.days : (plan === 'yearly' ? 365 : 30);
    const idem = String(body.idempotencyKey || `sub:${user.user_id}:${Date.now()}`);
    const orderId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
    await env.DB.prepare(`INSERT INTO payment_orders (id,user_id,provider,amount_cents,credits,status,idempotency_key,plan_type,expires_at) VALUES (?,?,?,?,?,?,?,?,?)`).bind(orderId, user.user_id, 'sandbox', amountCents, 0, 'paid', idem, plan, expiresAt).run();
    await env.DB.prepare(`UPDATE users SET subscription_expires_at=? WHERE id=?`).bind(expiresAt, user.user_id).run();
    await env.DB.prepare(`INSERT INTO credit_ledger (user_id,amount,reason) VALUES (?,?,?)`).bind(user.user_id, 0, `订阅续期 ${plan} ${days} 天（金额 ${amountCents/100} 元）`).run();
    return response(request, env, { ok: true, orderId, plan, expiresAt, amountCents });
  }
  // 积分充值：沙箱直付（与订阅一致，商户凭证接入后替换），套餐由服务端统一定价
  if (url.pathname === '/api/payments/credits/order' && request.method === 'POST') {
    if (env.PAYMENTS_SANDBOX_ENABLED !== true) return response(request, env, { error: '支付通道尚未接入，不能直接充值积分', code: 'PAYMENT_PROVIDER_NOT_CONFIGURED' }, 503);
    const user = await requireUser(request, env, true);
    if (!user) return response(request, env, { error: '请先登录' }, 401);
    const body = await request.json().catch(() => ({}));
    const pkg = CREDIT_PACKAGES.find((p) => p.id === String(body.packageId || ''));
    if (!pkg) return response(request, env, { error: '未知的积分套餐' }, 400);
    const requestedScope = body.scope === 'team' ? 'team' : body.scope === 'personal' ? 'personal' : '';
    const wallet = await resolveBillingWallet(env, user.user_id, requestedScope, String(body.teamId || ''));
    if (!wallet) return response(request, env, { error: '团队不存在或你已不是团队成员' }, 403);
    const idem = String(body.idempotencyKey || `credits:${user.user_id}:${pkg.id}:${Date.now()}`);
    const existing = await env.DB.prepare(`SELECT id,credits,credit_scope,team_id FROM payment_orders WHERE idempotency_key=? AND user_id=?`).bind(idem, user.user_id).first().catch(() => null);
    if (existing) {
      const originalWallet = await resolveBillingWallet(env, user.user_id, existing.credit_scope || 'personal', existing.team_id || '');
      return response(request, env, { ok: true, orderId: existing.id, packageId: pkg.id, creditsAdded: Number(existing.credits) || pkg.credits, credits: originalWallet ? originalWallet.credits : null, billingScope: existing.credit_scope || 'personal', billingTeamId: existing.team_id || null, billingName: originalWallet?.name || (existing.credit_scope === 'team' ? '团队积分' : '个人积分'), already: true });
    }
    const orderId = crypto.randomUUID();
    const reason = `购买积分套餐「${pkg.name}」¥${(pkg.priceCents/100).toFixed(2)} +${pkg.credits}积分`;
    const writes = [
      env.DB.prepare(`INSERT INTO payment_orders (id,user_id,provider,amount_cents,credits,status,idempotency_key,plan_type,credit_scope,team_id) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(orderId, user.user_id, 'sandbox', pkg.priceCents, pkg.credits, 'paid', idem, 'credits', wallet.scope, wallet.teamId),
    ];
    if (wallet.scope === 'team') {
      writes.push(
        env.DB.prepare(`UPDATE teams SET credits=credits+?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(pkg.credits, wallet.teamId),
        env.DB.prepare(`INSERT INTO team_credit_ledger (team_id,user_id,amount,reason) VALUES (?,?,?,?)`).bind(wallet.teamId, user.user_id, pkg.credits, reason),
      );
    } else {
      writes.push(
        env.DB.prepare(`UPDATE users SET credits=credits+? WHERE id=?`).bind(pkg.credits, user.user_id),
        env.DB.prepare(`INSERT INTO credit_ledger (user_id,amount,reason) VALUES (?,?,?)`).bind(user.user_id, pkg.credits, reason),
      );
    }
    await env.DB.batch(writes);
    const updated = await resolveBillingWallet(env, user.user_id, wallet.scope, wallet.teamId || '');
    return response(request, env, { ok: true, orderId, packageId: pkg.id, priceCents: pkg.priceCents, creditsAdded: pkg.credits, credits: Number(updated?.credits || 0), billingScope: wallet.scope, billingTeamId: wallet.teamId || null, billingName: wallet.name }, 201);
  }
  if (url.pathname === '/api/vip/packages' && request.method === 'GET') {
    return response(request, env, {
      credits: CREDIT_PACKAGES.map((p) => ({ ...p, priceYuan: p.priceCents / 100 })),
      subscriptions: SUBSCRIPTION_PLANS,
      exchangeNote: '1 积分 ≈ 0.01 元；平台模型按「厂商参考价 + 0.2 元/次」折算积分定价',
    }, 200, { 'Cache-Control': 'public, max-age=300' });
  }
  if (url.pathname === '/api/payments/subscription/status' && request.method === 'GET') {
    const user = await requireUser(request, env);
    if (!user) return response(request, env, { error: '请先登录' }, 401);
    const exp = user.subscription_expires_at;
    const active = exp && new Date(exp).getTime() > Date.now();
    const orders = await env.DB.prepare(`SELECT id,plan_type,amount_cents,status,expires_at,created_at FROM payment_orders WHERE user_id=? AND plan_type IS NOT NULL ORDER BY created_at DESC LIMIT 10`).bind(user.user_id).all();
    return response(request, env, { subscription_expires_at: exp || null, subscription_active: Boolean(active), orders: orders.results });
  }
  if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
    const user = await requireUser(request, env, true);
    if (user) await env.DB.prepare(`DELETE FROM user_sessions WHERE id=?`).bind(user.id).run();
    return response(request, env, { ok: true }, 200, { 'set-cookie': 'emeng_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0' });
  }

  const needsUser = ['/api/teams', '/api/canvases', '/api/assets', '/api/canvas-tasks', '/api/payments', '/api/collaboration', '/api/inspiration'].some((prefix) => url.pathname.startsWith(prefix));
  const user = needsUser ? await requireUser(request, env, !['GET', 'HEAD'].includes(request.method)) : null;
  if (needsUser && !user) return response(request, env, { error: '请先登录或刷新会话' }, 401);
  if (url.pathname === '/api/inspiration/favorites' && request.method === 'GET') {
    const rows = await env.DB.prepare(`SELECT template_id FROM inspiration_favorites WHERE user_id=? ORDER BY created_at DESC`).bind(user.user_id).all();
    return response(request, env, { items: rows.results.map((item) => item.template_id) });
  }
  const inspirationFavoriteMatch = url.pathname.match(/^\/api\/inspiration\/favorites\/([^/]+)$/);
  if (inspirationFavoriteMatch && request.method === 'POST') {
    const templateId = decodeURIComponent(inspirationFavoriteMatch[1]).slice(0, 100);
    const body = await request.json().catch(() => ({}));
    if (!templateId) return response(request, env, { error: '缺少模板 ID' }, 400);
    if (body.favorite === false) await env.DB.prepare(`DELETE FROM inspiration_favorites WHERE user_id=? AND template_id=?`).bind(user.user_id, templateId).run();
    else await env.DB.prepare(`INSERT OR IGNORE INTO inspiration_favorites (user_id,template_id) VALUES (?,?)`).bind(user.user_id, templateId).run();
    return response(request, env, { ok: true, templateId, favorite: body.favorite !== false });
  }
  const inspirationImportMatch = url.pathname.match(/^\/api\/inspiration\/([^/]+)\/import$/);
  if (inspirationImportMatch && request.method === 'POST') {
    let templateId;
    try { templateId = decodeURIComponent(inspirationImportMatch[1]); } catch { return response(request, env, { error: '模板 ID 无效' }, 400); }
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(templateId)) return response(request, env, { error: '模板 ID 无效' }, 400);
    const body = await request.json().catch(() => ({}));
    if (body.id && String(body.id) !== templateId) return response(request, env, { error: '模板 ID 不一致' }, 400);
    if (!body.video) return response(request, env, { error: '该公开案例没有可导入视频' }, 400);
    const title = String(body.title || '未命名案例').trim().slice(0, 100) || '未命名案例';
    const description = String(body.desc || '').trim().slice(0, 2000);
    const author = String(body.author || 'RunningHub 创作者').trim().slice(0, 100);
    const category = String(body.category || '').trim().slice(0, 80);
    let video;
    try {
      video = await copyInspirationAsset(env, user.user_id, templateId, body.video, `${title}.mp4`, 'video');
    } catch (error) {
      return response(request, env, { error: error.message }, 422);
    }
    const warnings = [], optionalAssets = [];
    for (const [kind, rawUrl, fallbackName] of [['image', body.poster, `${title}-封面`], ['audio', body.audio, `${title}-音频`]]) {
      if (!rawUrl) continue;
      try { optionalAssets.push({ kind, asset: await copyInspirationAsset(env, user.user_id, templateId, rawUrl, fallbackName, kind) }); }
      catch (error) { warnings.push(`${kind === 'image' ? '封面' : '音频'}未导入：${error.message}`); }
    }
    const importedAt = crypto.randomUUID(), ids = {
      info: `${importedAt}-info`, video: `${importedAt}-video`, remix: `${importedAt}-remix`, group: `${importedAt}-group`,
    };
    const nodes = [
      { id: ids.info, type: 'studio', position: { x: 0, y: 0 }, data: { type: 'text', title: '二次创作提示', content: description || `参考「${title}」的节奏、镜头和构图进行二次创作`, page: '页面 1', status: 'idle', batch: 1, groupId: ids.group } },
      { id: ids.video, type: 'studio', position: { x: 0, y: 250 }, data: { type: 'upload', title, content: `${author}${category ? ` · ${category}` : ''}`, page: '页面 1', status: 'idle', batch: 1, assetId: video.id, asset: video, case: { id: templateId, author, category, durationText: String(body.durationText || '').slice(0, 20), poster: optionalAssets.find((item) => item.kind === 'image')?.asset.url || '' }, groupId: ids.group } },
    ];
    optionalAssets.forEach(({ kind, asset }, index) => {
      const id = `${importedAt}-${kind}`;
      ids[kind] = id;
      nodes.push({ id, type: 'studio', position: { x: 330, y: index * 250 }, data: { type: 'upload', title: kind === 'image' ? `${title}·封面` : `${title}·音频`, content: kind === 'image' ? '已复制到本站素材库' : '公开案例音频', page: '页面 1', status: 'idle', batch: 1, assetId: asset.id, asset, groupId: ids.group } });
    });
    const poster = optionalAssets.find((item) => item.kind === 'image')?.asset;
    nodes.push({ id: ids.remix, type: 'studio', position: { x: 660, y: 0 }, data: { type: 'video', title: '二次创作', content: description || `参考「${title}」创作新片`, page: '页面 1', status: 'idle', batch: 1, ratio: '16:9', quality: '720p', model: '恶梦-Seedance 2.0', endpoint: poster ? 'rhart-video/sparkvideo-2.0/image-to-video' : 'rhart-video/sparkvideo-2.0/text-to-video', task: poster ? 'image-to-video' : 'text-to-video', outputType: 'video', creditPerRun: poster ? 80 : 100, estimatedCredits: poster ? 80 : 100, groupId: ids.group } });
    const edges = [{ id: `${importedAt}-prompt-edge`, source: ids.info, target: ids.remix, type: 'canvas' }];
    if (ids.image) edges.push({ id: `${importedAt}-poster-edge`, source: ids.image, target: ids.remix, type: 'canvas' });
    return response(request, env, {
      templateId,
      source: 'runninghub-public',
      fragment: { schema: 'emeng-canvas-fragment/v1', nodes, edges, groups: [{ id: ids.group, title, color: '#c43cff', nodeIds: nodes.map((node) => node.id) }] },
      assets: [video, ...optionalAssets.map((item) => item.asset)],
      warnings,
    }, 201);
  }
  const collaborationMatch = url.pathname.match(/^\/api\/collaboration\/([^/]+)$/);
  if (collaborationMatch) {
    const id = decodeURIComponent(collaborationMatch[1]);
    const access = await authorizeCollaborationRequest(request, env, id, user);
    if (!access.ok) return response(request, env, { error: access.error }, access.status);
    if (!env.CANVAS_ROOMS) return response(request, env, { error: '实时协作服务尚未绑定' }, 503);
    const roomUrl = new URL(request.url), requestedCid = roomUrl.searchParams.get('cid') || '';
    roomUrl.search = '';
    roomUrl.searchParams.set('cid', /^[a-zA-Z0-9_-]{1,80}$/.test(requestedCid) ? requestedCid : crypto.randomUUID());
    roomUrl.searchParams.set('name', access.user.name.slice(0, 24));
    roomUrl.searchParams.set('email', access.user.email.slice(0, 120));
    const roomHeaders = new Headers(request.headers);
    roomHeaders.set('x-emeng-collaboration-role', access.canvas.role);
    roomHeaders.set('x-emeng-collaboration-user', String(access.user.user_id));
    const room = env.CANVAS_ROOMS.get(env.CANVAS_ROOMS.idFromName(id));
    return room.fetch(new Request(roomUrl, { method: request.method, headers: roomHeaders, body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body }));
  }
  const teamMatch = url.pathname.match(/^\/api\/teams\/([^/]+)$/);
  const teamMembersMatch = url.pathname.match(/^\/api\/teams\/([^/]+)\/members$/);
  const teamCreditsMatch = url.pathname.match(/^\/api\/teams\/([^/]+)\/credits\/allocate$/);
  if (teamMatch && request.method === 'GET') {
    const teamId = decodeURIComponent(teamMatch[1]);
    const team = await resolveBillingWallet(env, user.user_id, 'team', teamId);
    if (!team) return response(request, env, { error: '团队不存在或你已不是团队成员' }, 403);
    const members = await env.DB.prepare(`
      SELECT u.id,u.email,u.name,tm.role,tm.created_at
      FROM team_members tm JOIN users u ON u.id=tm.user_id
      WHERE tm.team_id=? ORDER BY CASE tm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,tm.created_at
    `).bind(teamId).all();
    return response(request, env, { team, members: members.results, canManage: ['owner', 'admin'].includes(team.role) });
  }
  if (teamMembersMatch && request.method === 'POST') {
    const teamId = decodeURIComponent(teamMembersMatch[1]);
    const team = await resolveBillingWallet(env, user.user_id, 'team', teamId);
    if (!team || !['owner', 'admin'].includes(team.role)) return response(request, env, { error: '仅团队管理人或管理员可邀请成员' }, 403);
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return response(request, env, { error: '请输入已注册账号的邮箱' }, 400);
    const member = await env.DB.prepare(`SELECT id,email,name FROM users WHERE email=?`).bind(email).first();
    if (!member) return response(request, env, { error: '该账号尚未注册，请让对方先注册' }, 404);
    const requestedRole = body.role === 'admin' ? 'admin' : 'editor';
    if (requestedRole === 'admin' && team.role !== 'owner') return response(request, env, { error: '仅团队管理人可以设置管理员' }, 403);
    const existing = await env.DB.prepare(`SELECT role FROM team_members WHERE team_id=? AND user_id=?`).bind(teamId, member.id).first();
    if (existing?.role === 'owner') return response(request, env, { error: '不能修改团队管理人权限' }, 403);
    await env.DB.prepare(`INSERT INTO team_members (team_id,user_id,role) VALUES (?,?,?) ON CONFLICT(team_id,user_id) DO UPDATE SET role=excluded.role`).bind(teamId, member.id, requestedRole).run();
    return response(request, env, { ok: true, member: { id: member.id, email: member.email, name: member.name, role: requestedRole } }, 201);
  }
  if (teamCreditsMatch && request.method === 'POST') {
    const teamId = decodeURIComponent(teamCreditsMatch[1]);
    const team = await resolveBillingWallet(env, user.user_id, 'team', teamId);
    if (!team || !['owner', 'admin'].includes(team.role)) return response(request, env, { error: '仅团队管理人或管理员可分配团队积分' }, 403);
    const body = await request.json().catch(() => ({}));
    const amount = Math.floor(Number(body.amount));
    const referenceId = String(body.idempotencyKey || '').trim().slice(0, 120);
    if (!Number.isInteger(amount) || amount < 1 || amount > 1_000_000) return response(request, env, { error: '积分数量需为 1 到 1,000,000 的整数' }, 400);
    if (!referenceId) return response(request, env, { error: '缺少操作标识，请刷新后重试' }, 400);
    const prior = await env.DB.prepare(`SELECT id FROM team_credit_ledger WHERE team_id=? AND reference_id=? AND amount>0 LIMIT 1`).bind(teamId, referenceId).first();
    if (prior) return response(request, env, { ok: true, already: true, team: await resolveBillingWallet(env, user.user_id, 'team', teamId) });
    const charged = await env.DB.prepare(`UPDATE users SET credits=credits-? WHERE id=? AND credits>=?`).bind(amount, user.user_id, amount).run();
    if (!charged.meta.changes) return response(request, env, { error: '个人积分不足，无法划入团队' }, 409);
    const reason = `划入团队积分：${team.name}`;
    await env.DB.batch([
      env.DB.prepare(`UPDATE teams SET credits=credits+?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(amount, teamId),
      env.DB.prepare(`INSERT INTO credit_ledger (user_id,amount,reason,reference_id) VALUES (?,?,?,?)`).bind(user.user_id, -amount, reason, referenceId),
      env.DB.prepare(`INSERT INTO team_credit_ledger (team_id,user_id,amount,reason,reference_id) VALUES (?,?,?,?,?)`).bind(teamId, user.user_id, amount, reason, referenceId),
    ]);
    return response(request, env, { ok: true, amount, team: await resolveBillingWallet(env, user.user_id, 'team', teamId), wallets: await walletsForUser(env, user.user_id) }, 201);
  }
  if (url.pathname === '/api/canvases' && request.method === 'GET') {
    const scope = url.searchParams.get('scope') === 'team' ? 'team' : 'personal';
    let rows;
    if (scope === 'team') {
      await ensureDefaultTeam(env, user.user_id);
      const teamId = String(url.searchParams.get('teamId') || '');
      rows = await env.DB.prepare(`
        SELECT DISTINCT c.id,c.title,c.current_revision,c.updated_at,c.team_id,t.name AS team_name,COALESCE(cm.role,tm.role) AS role
        FROM canvases c
        JOIN team_members tm ON tm.team_id=c.team_id AND tm.user_id=?
        JOIN teams t ON t.id=c.team_id AND t.status='active'
        LEFT JOIN canvas_members cm ON cm.canvas_id=c.id AND cm.user_id=?
        WHERE c.team_id IS NOT NULL AND c.deleted_at IS NULL AND (?='' OR c.team_id=?)
        ORDER BY c.updated_at DESC
      `).bind(user.user_id, user.user_id, teamId, teamId).all();
    } else {
      rows = await env.DB.prepare(`
        SELECT c.id,c.title,c.current_revision,c.updated_at,NULL AS team_id,NULL AS team_name,m.role
        FROM canvases c JOIN canvas_members m ON m.canvas_id=c.id
        WHERE m.user_id=? AND c.team_id IS NULL AND c.deleted_at IS NULL
        ORDER BY c.updated_at DESC
      `).bind(user.user_id).all();
    }
    return response(request, env, { scope, items: rows.results });
  }
  if (url.pathname === '/api/canvases' && request.method === 'POST') {
    const body = await request.json().catch(() => ({})), id = crypto.randomUUID();
    const snapshot = validateCanvasDocument(body.snapshot || { schema: 'emeng-canvas/v1', title: body.title || '未命名画布', pages: ['页面 1'], nodes: [], edges: [], zoom: 100, activePage: '页面 1' });
    const scope = body.scope === 'team' ? 'team' : 'personal';
    let teamId = null;
    if (scope === 'team') {
      const wallet = await resolveBillingWallet(env, user.user_id, 'team', String(body.teamId || ''));
      if (!wallet) return response(request, env, { error: '团队不存在或你已不是团队成员' }, 403);
      if (!['owner', 'admin', 'editor'].includes(wallet.role)) return response(request, env, { error: '你在该团队中没有新建画布权限' }, 403);
      teamId = wallet.teamId;
    }
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO canvases (id,owner_id,team_id,title,snapshot_json) VALUES (?,?,?,?,?)`).bind(id, user.user_id, teamId, String(body.title || '未命名画布').slice(0, 120), JSON.stringify(snapshot)),
      env.DB.prepare(`INSERT INTO canvas_members (canvas_id,user_id,role) VALUES (?,?,?)`).bind(id, user.user_id, 'owner'),
    ]);
    return response(request, env, { id, revision: 0, snapshot, scope, teamId }, 201);
  }
  const canvasMatch = url.pathname.match(/^\/api\/canvases\/([^/]+)$/);
  if (canvasMatch && request.method === 'GET') {
    const item = await canvasAccess(env, decodeURIComponent(canvasMatch[1]), user.user_id);
    return item ? response(request, env, { ...item, snapshot: JSON.parse(item.snapshot_json) }) : response(request, env, { error: '画布不存在或无权访问' }, 404);
  }
  if (canvasMatch && request.method === 'PUT') {
    const id = decodeURIComponent(canvasMatch[1]), item = await canvasAccess(env, id, user.user_id, true);
    if (!item) return response(request, env, { error: '无编辑权限' }, 403);
    const body = await request.json().catch(() => ({})), snapshot = validateCanvasDocument(body.snapshot);
    const expected = Number(request.headers.get('if-match') || body.revision || item.current_revision);
    const result = await env.DB.prepare(`UPDATE canvases SET title=?,snapshot_json=?,current_revision=current_revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND current_revision=?`).bind(String(snapshot.title || item.title).slice(0, 120), JSON.stringify(snapshot), id, expected).run();
    if (!result.meta.changes) return response(request, env, { error: '画布已被其他成员更新', code: 'REVISION_CONFLICT' }, 409);
    return response(request, env, { ok: true, revision: expected + 1 });
  }
  if (canvasMatch && request.method === 'DELETE') {
    const id = decodeURIComponent(canvasMatch[1]), item = await canvasAccess(env, id, user.user_id, true);
    if (!item || item.role !== 'owner') return response(request, env, { error: '仅创建者可删除画布' }, 403);
    await env.DB.prepare(`UPDATE canvases SET deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL`).bind(id).run();
    return response(request, env, { ok: true });
  }
  const versionsMatch = url.pathname.match(/^\/api\/canvases\/([^/]+)\/versions$/);
  if (versionsMatch && request.method === 'GET') {
    const id = decodeURIComponent(versionsMatch[1]); if (!await canvasAccess(env, id, user.user_id)) return response(request, env, { error: '无访问权限' }, 403);
    const rows = await env.DB.prepare(`SELECT id,revision,label,created_by,created_at FROM canvas_versions WHERE canvas_id=? ORDER BY revision DESC`).bind(id).all();
    return response(request, env, { items: rows.results });
  }
  if (versionsMatch && request.method === 'POST') {
    const id = decodeURIComponent(versionsMatch[1]), item = await canvasAccess(env, id, user.user_id, true); if (!item) return response(request, env, { error: '无编辑权限' }, 403);
    const versionId = crypto.randomUUID(), revision = item.current_revision, body = await request.json().catch(() => ({}));
    await env.DB.prepare(`INSERT INTO canvas_versions (id,canvas_id,revision,label,snapshot_json,created_by) VALUES (?,?,?,?,?,?) ON CONFLICT(canvas_id,revision) DO UPDATE SET label=excluded.label,snapshot_json=excluded.snapshot_json,created_by=excluded.created_by,created_at=CURRENT_TIMESTAMP`).bind(versionId, id, revision, String(body.label || `版本 ${revision}`).slice(0, 100), item.snapshot_json, user.user_id).run();
    return response(request, env, { id: versionId, revision }, 201);
  }
  const versionDetailMatch = url.pathname.match(/^\/api\/canvases\/([^/]+)\/versions\/([^/]+)$/);
  if (versionDetailMatch && request.method === 'GET') {
    const id = decodeURIComponent(versionDetailMatch[1]);
    if (!await canvasAccess(env, id, user.user_id)) return response(request, env, { error: '无访问权限' }, 403);
    const item = await env.DB.prepare(`SELECT id,revision,label,snapshot_json,created_by,created_at FROM canvas_versions WHERE canvas_id=? AND id=?`).bind(id, decodeURIComponent(versionDetailMatch[2])).first();
    return item ? response(request, env, { ...item, snapshot: JSON.parse(item.snapshot_json) }) : response(request, env, { error: '版本不存在' }, 404);
  }
  const versionRestoreMatch = url.pathname.match(/^\/api\/canvases\/([^/]+)\/versions\/([^/]+)\/restore$/);
  if (versionRestoreMatch && request.method === 'POST') {
    const id = decodeURIComponent(versionRestoreMatch[1]), item = await canvasAccess(env, id, user.user_id, true);
    if (!item) return response(request, env, { error: '无编辑权限' }, 403);
    const saved = await env.DB.prepare(`SELECT label,snapshot_json FROM canvas_versions WHERE canvas_id=? AND id=?`).bind(id, decodeURIComponent(versionRestoreMatch[2])).first();
    if (!saved) return response(request, env, { error: '版本不存在' }, 404);
    const snapshot = validateCanvasDocument(JSON.parse(saved.snapshot_json)), revision = Number(item.current_revision) + 1, restoredId = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare(`UPDATE canvases SET title=?,snapshot_json=?,current_revision=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(String(snapshot.title || item.title).slice(0, 120), JSON.stringify(snapshot), revision, id),
      env.DB.prepare(`INSERT INTO canvas_versions (id,canvas_id,revision,label,snapshot_json,created_by) VALUES (?,?,?,?,?,?)`).bind(restoredId, id, revision, `恢复：${String(saved.label || '历史版本').slice(0, 90)}`, JSON.stringify(snapshot), user.user_id),
    ]);
    return response(request, env, { ok: true, revision, versionId: restoredId, snapshot });
  }
  const membersMatch = url.pathname.match(/^\/api\/canvases\/([^/]+)\/members$/);
  if (membersMatch && request.method === 'POST') {
    const id = decodeURIComponent(membersMatch[1]), item = await canvasAccess(env, id, user.user_id, true); if (!item || item.role !== 'owner') return response(request, env, { error: '仅创建者可邀请成员' }, 403);
    const body = await request.json().catch(() => ({})), member = await env.DB.prepare(`SELECT id FROM users WHERE email=?`).bind(String(body.email || '').toLowerCase()).first();
    if (!member) return response(request, env, { error: '该邮箱尚未注册' }, 404);
    const role = body.role === 'editor' ? 'editor' : 'viewer';
    await env.DB.prepare(`INSERT INTO canvas_members (canvas_id,user_id,role) VALUES (?,?,?) ON CONFLICT(canvas_id,user_id) DO UPDATE SET role=excluded.role`).bind(id, member.id, role).run();
    return response(request, env, { ok: true, role });
  }
  const shareMatch = url.pathname.match(/^\/api\/canvases\/([^/]+)\/shares$/);
  if (shareMatch && request.method === 'POST') {
    const id = decodeURIComponent(shareMatch[1]), item = await canvasAccess(env, id, user.user_id, true); if (!item || item.role !== 'owner') return response(request, env, { error: '仅创建者可生成分享链接' }, 403);
    const token = randomToken(), shareId = crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO canvas_shares (id,canvas_id,token_hash,created_by) VALUES (?,?,?,?)`).bind(shareId, id, await sha256(token), user.user_id).run();
    return response(request, env, { id: shareId, token, url: `${url.origin}/?share=${encodeURIComponent(token)}` }, 201);
  }
  if (url.pathname === '/api/assets/upload' && request.method === 'POST') {
    if (!env.MEDIA) return response(request, env, { error: 'R2 素材存储尚未绑定' }, 503);
    const mime = request.headers.get('content-type') || '', size = Number(request.headers.get('x-file-size') || request.headers.get('content-length') || 0), name = decodeURIComponent(request.headers.get('x-file-name') || 'asset');
    const visibility = ['personal', 'team', 'new'].includes(String(request.headers.get('x-visibility') || '')) ? String(request.headers.get('x-visibility')) : 'personal';
    if (!allowedMediaTypes.has(mime) || size <= 0 || size > 100 * 1024 * 1024) return response(request, env, { error: '文件类型不支持或超过100MB' }, 400);
    const assetId = crypto.randomUUID(), key = `${user.user_id}/${assetId}/${name.replace(/[^\w.\-\u4e00-\u9fa5]/g, '_')}`;
    await env.MEDIA.put(key, request.body, { httpMetadata: { contentType: mime }, customMetadata: { owner: String(user.user_id), name } });
    await env.DB.prepare(`INSERT INTO assets (id,owner_id,canvas_id,name,mime_type,size_bytes,object_key,visibility) VALUES (?,?,?,?,?,?,?,?)`).bind(assetId, user.user_id, request.headers.get('x-canvas-id') || null, name, mime, size, key, visibility).run();
    return response(request, env, { id: assetId, name, mimeType: mime, sizeBytes: size, url: `/api/assets/${assetId}` }, 201);
  }
  if (url.pathname === '/api/assets' && request.method === 'GET') {
    const type = url.searchParams.get('type') || 'all';
    const scope = url.searchParams.get('scope') || 'all';
    const q = (url.searchParams.get('q') || '').trim();
    const folder = url.searchParams.get('folder') || '';
    const favorite = url.searchParams.get('favorite') || '';
    const deleted = url.searchParams.get('deleted') === '1';
    const from = url.searchParams.get('from') || '';
    const to = url.searchParams.get('to') || '';
    const memberRows = await env.DB.prepare(`SELECT canvas_id FROM canvas_members WHERE user_id=?`).bind(user.user_id).all();
    const memberIds = memberRows.results.map((row) => row.canvas_id);
    const shared = memberIds.length ? `canvas_id IN (${memberIds.map(() => '?').join(',')})` : '1=0';
    const conditions = [deleted ? 'deleted_at IS NOT NULL' : 'deleted_at IS NULL'];
    const params = [];
    if (scope === 'personal') { conditions.push('owner_id=?', "visibility='personal'"); params.push(user.user_id); }
    else if (scope === 'new') { conditions.push(`(owner_id=? OR ${shared})`, "visibility='new'"); params.push(user.user_id, ...memberIds); }
    else if (scope === 'team') { conditions.push(shared, "visibility='team'"); params.push(...memberIds); }
    else { conditions.push(`(owner_id=? OR ${shared})`); params.push(user.user_id, ...memberIds); }
    if (type === 'image') conditions.push("mime_type LIKE 'image/%'");
    if (type === 'video') conditions.push("mime_type LIKE 'video/%'");
    if (favorite === '1') conditions.push('favorite=1');
    if (folder) { conditions.push('folder=?'); params.push(String(folder).slice(0, 80)); }
    if (q) { conditions.push('name LIKE ?'); params.push(`%${q}%`); }
    if (from) { conditions.push('created_at>=?'); params.push(`${from} 00:00:00`); }
    if (to) { conditions.push('created_at<=?'); params.push(`${to} 23:59:59`); }
    const where = conditions.join(' AND ');
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 60)));
    const rows = await env.DB.prepare(`SELECT id,owner_id,canvas_id,name,mime_type,size_bytes,source,visibility,favorite,folder,task_id,created_at,deleted_at FROM assets WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...params, pageSize, (page - 1) * pageSize).all();
    const total = await env.DB.prepare(`SELECT COUNT(*) AS count FROM assets WHERE ${where}`).bind(...params).first();
    return response(request, env, {
      items: rows.results.map((item) => ({ id: item.id, name: item.name, mimeType: item.mime_type, sizeBytes: item.size_bytes, source: item.source, visibility: item.visibility, favorite: Number(item.favorite) === 1, folder: item.folder || '', taskId: item.task_id, canvasId: item.canvas_id, createdAt: item.created_at, ownerId: item.owner_id, url: `/api/assets/${item.id}` })),
      total: Number(total?.count || 0), page, pageSize,
    });
  }
  if (url.pathname === '/api/assets/batch' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === 'string' && id.length < 128).map(String) : [];
    if (!ids.length) return response(request, env, { error: '请选择至少一个素材' }, 400);
    const placeholders = ids.map(() => '?').join(',');
    const action = String(body.action || '');
    if (action === 'favorite' || action === 'unfavorite') {
      await env.DB.prepare(`UPDATE assets SET favorite=? WHERE id IN (${placeholders}) AND owner_id=?`).bind(action === 'favorite' ? 1 : 0, ...ids, user.user_id).run();
    } else if (action === 'folder') {
      const folder = String(body.folder || '').slice(0, 80);
      await env.DB.prepare(`UPDATE assets SET folder=? WHERE id IN (${placeholders}) AND owner_id=?`).bind(folder, ...ids, user.user_id).run();
    } else if (action === 'delete') {
      await env.DB.prepare(`UPDATE assets SET deleted_at=CURRENT_TIMESTAMP WHERE id IN (${placeholders}) AND owner_id=?`).bind(...ids, user.user_id).run();
    } else if (action === 'restore') {
      await env.DB.prepare(`UPDATE assets SET deleted_at=NULL WHERE id IN (${placeholders}) AND owner_id=?`).bind(...ids, user.user_id).run();
    } else if (action === 'visibility') {
      const visibility = ['personal', 'team', 'new'].includes(String(body.visibility)) ? String(body.visibility) : 'personal';
      await env.DB.prepare(`UPDATE assets SET visibility=? WHERE id IN (${placeholders}) AND owner_id=?`).bind(visibility, ...ids, user.user_id).run();
    } else {
      return response(request, env, { error: '不支持的操作' }, 400);
    }
    return response(request, env, { ok: true, action, count: ids.length });
  }
  const assetMatch = url.pathname.match(/^\/api\/assets\/([^/]+)$/);
  if (assetMatch && request.method === 'GET') {
    const item = await env.DB.prepare(`SELECT * FROM assets WHERE id=?`).bind(decodeURIComponent(assetMatch[1])).first();
    if (!item) return response(request, env, { error: '素材不存在' }, 404);
    const isOwner = Number(item.owner_id) === Number(user.user_id);
    if (!isOwner) {
      const shared = await env.DB.prepare(`SELECT 1 FROM canvas_members WHERE canvas_id=? AND user_id=?`).bind(item.canvas_id, user.user_id).first();
      if (!shared || !['team', 'new'].includes(item.visibility)) return response(request, env, { error: '无权查看该素材' }, 403);
    }
    if (String(item.object_key || '').startsWith('pending:')) {
      if (item.provider_url) return Response.redirect(item.provider_url, 302);
      return response(request, env, { error: '素材尚未生成完毕' }, 404);
    }
    if (!env.MEDIA) return response(request, env, { error: '素材存储不可用' }, 503);
    const object = await env.MEDIA.get(item.object_key); if (!object) return response(request, env, { error: '素材文件不存在' }, 404);
    return new Response(object.body, { headers: { 'content-type': item.mime_type, 'content-length': String(item.size_bytes), 'cache-control': 'private,max-age=3600' } });
  }
  if (assetMatch && request.method === 'PATCH') {
    const id = decodeURIComponent(assetMatch[1]);
    const body = await request.json().catch(() => ({}));
    const fields = [], params = [];
    if (body.name !== undefined) { fields.push('name=?'); params.push(String(body.name).slice(0, 160)); }
    if (body.favorite !== undefined) { fields.push('favorite=?'); params.push(body.favorite ? 1 : 0); }
    if (body.folder !== undefined) { fields.push('folder=?'); params.push(String(body.folder || '').slice(0, 80)); }
    if (body.visibility !== undefined) { fields.push('visibility=?'); params.push(['personal', 'team', 'new'].includes(String(body.visibility)) ? String(body.visibility) : 'personal'); }
    if (!fields.length) return response(request, env, { error: '没有可更新的字段' }, 400);
    const result = await env.DB.prepare(`UPDATE assets SET ${fields.join(',')} WHERE id=? AND owner_id=? AND deleted_at IS NULL`).bind(...params, id, user.user_id).run();
    if (!result.meta.changes) return response(request, env, { error: '素材不存在或无权操作' }, 404);
    return response(request, env, { ok: true });
  }
  if (assetMatch && request.method === 'DELETE') {
    const id = decodeURIComponent(assetMatch[1]);
    const result = await env.DB.prepare(`UPDATE assets SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND owner_id=? AND deleted_at IS NULL`).bind(id, user.user_id).run();
    if (!result.meta.changes) return response(request, env, { error: '素材不存在或无权操作' }, 404);
    return response(request, env, { ok: true });
  }
  if (url.pathname === '/api/node-definitions' && request.method === 'GET') {
    const rows = await env.DB.prepare(`SELECT type,name,provider_mode,input_schema,output_schema,credit_cost,timeout_seconds FROM node_definitions WHERE enabled=1 ORDER BY name`).all();
    return response(request, env, { items: rows.results.map((item) => ({ ...item, inputSchema: JSON.parse(item.input_schema), outputSchema: JSON.parse(item.output_schema) })) });
  }
  const runGraphMatch = url.pathname.match(/^\/api\/canvases\/([^/]+)\/run$/);
  if (runGraphMatch && request.method === 'POST') {
    const id = decodeURIComponent(runGraphMatch[1]), item = await canvasAccess(env, id, user.user_id, true); if (!item) return response(request, env, { error: '无编辑权限' }, 403);
    const body = await request.json().catch(() => ({})), snapshot = validateCanvasDocument(body.snapshot || JSON.parse(item.snapshot_json));
    const visibility = ['personal', 'team', 'new'].includes(String(body.visibility || '')) ? String(body.visibility) : 'new';
    let order; try { order = topologicalOrder(snapshot.nodes, snapshot.edges); } catch (error) { return response(request, env, { error: error.message }, 400); }
    const selected = body.nodeId ? order.filter((nodeId) => nodeId === String(body.nodeId)) : order;
    const definitions = await env.DB.prepare(`SELECT * FROM node_definitions WHERE enabled=1`).all(), definitionMap = new Map(definitions.results.map((row) => [row.type, row]));
    const catalog = await capabilities(env, request).catch(() => null);
    const tasks = [];
    const sub = await checkActiveSubscription(env, user.user_id);
    if (!sub.active) return response(request, env, { error: sub.message, code: sub.code, expires_at: sub.expires_at || null }, 402);
    const canvasBilling = env.__test_bypass_usage === true
      ? { scope: item.team_id ? 'team' : 'personal', teamId: item.team_id || null, name: item.team_name || '测试积分', credits: Number.MAX_SAFE_INTEGER }
      : await resolveBillingWallet(env, user.user_id, item.team_id ? 'team' : 'personal', item.team_id || '');
    if (!canvasBilling) return response(request, env, { error: '画布所属团队不可用或你已不是团队成员' }, 403);
    for (const nodeId of selected) {
      const node = snapshot.nodes.find((entry) => String(entry.id) === nodeId), nodeData = node.data || {}, logicalType = nodeData.type || node.type, definition = definitionMap.get(logicalType);
      if ((!definition && !nodeData.endpoint) || ['upload', 'text', 'text-input', 'replace', 'split', 'display'].includes(logicalType)) continue;
      const providerMode = definition?.provider_mode === 'workflow' || nodeData.provider === 'workflow' ? 'workflow' : 'standard';
      const endpoint = String(nodeData.endpoint || definition?.endpoint || '');
      const workflowId = String(nodeData.workflowId || definition?.workflow_id || '');
      if (providerMode === 'workflow' && !workflowId) continue;
      if (providerMode === 'standard' && !endpoint) continue;
      const idempotency = request.headers.get('idempotency-key') ? `${request.headers.get('idempotency-key')}:${nodeId}` : `${id}:${item.current_revision}:${nodeId}`;
      const idempotencyPrefix = `${idempotency}:`;
      const existing = await env.DB.prepare(`SELECT * FROM canvas_tasks WHERE idempotency_key=? OR substr(idempotency_key,1,?)=? ORDER BY created_at,id`).bind(idempotency, idempotencyPrefix.length, idempotencyPrefix).all();
      if (existing.results.length) {
        tasks.push(...existing.results.map((row) => ({
          id: row.id,
          nodeId: row.node_id,
          taskId: row.provider_task_id,
          status: row.status,
          creditCost: Number(row.credit_cost) || 0,
          billingScope: row.billing_scope || 'personal',
          billingTeamId: row.billing_team_id || null,
        })));
        continue;
      }
      const batchCount = Math.min(10, Math.max(1, Number(nodeData.batch) || 1));
      let unitCost;
      if (logicalType === 'image' && !nodeData.endpoint && imageModelCredits.has(String(nodeData.model || ''))) unitCost = imageModelCredits.get(String(nodeData.model));
      else if (providerMode === 'workflow') unitCost = Math.max(0, Number(nodeData.credits) || Number(definition?.credit_cost) || 30);
      else unitCost = runningHubEstimatedCredits(catalog, endpoint, nodeData.task, nodeData.outputType) || Math.max(0, Number(nodeData.credits) || Number(definition?.credit_cost) || 6);
      const cost = unitCost * batchCount;
      // 预占位 model id：避免在 `let payload;` 之前引用导致 TDZ；后续 try 块构建 payload 时可能改写它。
      const modelIdForUsage = endpoint || workflowId || logicalType;
      try {
        let payload;
        let supportsBatch = true;
        let loops = 1;
        if (providerMode === 'workflow') {
          payload = { ...(nodeData.params || {}), nodeInfoList: nodeData.nodeInfoList || nodeData.params?.nodeInfoList || [] };
          if (nodeData.content) payload.prompt = nodeData.content;
        } else {
          const entry = catalog?.endpoints?.find((item) => item.endpoint === endpoint);
          // 官方 capabilities.json 使用 `key`，测试/旧目录曾使用 `name`；两种都兼容，
          // 否则真实请求会漏掉 prompt / imageUrl 等必填参数。
          const paramNames = new Set((entry?.params || []).map((param) => String(param.key || param.name || '')).filter(Boolean));
          const inputAssetIds = collectCanvasInputAssetIds(snapshot, nodeId);
          // 端点不支持 batchCount 时（如 Nano Banana Pro / Seedance），按数量扇出为多个独立任务，总价不变。
          supportsBatch = entry ? paramNames.has('batchCount') : true;
          loops = supportsBatch ? 1 : batchCount;
          if (entry) {
            payload = { ...(nodeData.params || {}) };
            const fill = (key, value) => { if (paramNames.has(key) && value !== undefined && value !== null && value !== '') payload[key] = value; };
            fill('prompt', nodeData.content || nodeData.params?.prompt);
            fill('aspectRatio', nodeData.ratio);
            fill('ratio', nodeData.ratio);
            fill('resolution', nodeData.quality);
            fill('negativePrompt', nodeData.negativePrompt || nodeData.params?.negativePrompt);
            const hasReference = ['imageUrl', 'imageUrls', 'videoUrl', 'videoUrls', 'audioUrl', 'audioUrls'].some((key) => paramNames.has(key) && payload[key]);
            if (inputAssetIds.length && !hasReference) {
              const referenceKeys = ['imageUrl', 'imageUrls', 'videoUrl', 'videoUrls', 'audioUrl', 'audioUrls'];
              if (!referenceKeys.some((key) => paramNames.has(key))) {
                const error = new Error('所选模型不支持参考素材，请选择“图生图 / 图片编辑 / 图生视频”模型');
                error.status = 400;
                error.code = 'REFERENCE_UNSUPPORTED';
                throw error;
              }
              const uploaded = [];
              for (const assetId of inputAssetIds) {
                const asset = await resolveCanvasAsset(env, assetId, user.user_id, id);
                if (!asset) {
                  const error = new Error('连线中的参考素材不存在、尚未上传完成或你无权访问');
                  error.status = 400;
                  error.code = 'REFERENCE_ASSET_UNAVAILABLE';
                  throw error;
                }
                uploaded.push({ mime: asset.mime, url: await runningHubUploadBinary(env, asset.blob, asset.name) });
              }
              const images = uploaded.filter((item) => item.mime.startsWith('image/')).map((item) => item.url);
              const videos = uploaded.filter((item) => item.mime.startsWith('video/')).map((item) => item.url);
              const audios = uploaded.filter((item) => item.mime.startsWith('audio/')).map((item) => item.url);
              if (images.length && paramNames.has('imageUrls')) payload.imageUrls = images;
              else if (images.length && paramNames.has('imageUrl')) payload.imageUrl = images[0];
              if (videos.length && paramNames.has('videoUrls')) payload.videoUrls = videos;
              else if (videos.length && paramNames.has('videoUrl')) payload.videoUrl = videos[0];
              if (audios.length && paramNames.has('audioUrls')) payload.audioUrls = audios;
              else if (audios.length && paramNames.has('audioUrl')) payload.audioUrl = audios[0];
            }
          } else {
            payload = { ...(nodeData.params || {}), prompt: nodeData.content || nodeData.params?.prompt || '' };
            if (nodeData.model) payload.model = String(nodeData.model);
            if (nodeData.ratio) payload.aspectRatio = String(nodeData.ratio);
            if (nodeData.ratio) payload.ratio = String(nodeData.ratio);
            if (nodeData.quality) payload.resolution = String(nodeData.quality);
            if (inputAssetIds.length) {
              const task = String(nodeData.task || logicalType || '');
              if (!/(image-to-image|image-edit|image-to-video|reference-to-video|start-end-to-video|multimodal-video|image-to-3d|image-to-text)/.test(task)) {
                const error = new Error('所选模型不支持参考素材，请选择带参考图输入的模型');
                error.status = 400;
                error.code = 'REFERENCE_UNSUPPORTED';
                throw error;
              }
              const asset = await resolveCanvasAsset(env, inputAssetIds[0], user.user_id, id);
              if (!asset) {
                const error = new Error('连线中的参考素材不存在、尚未上传完成或你无权访问');
                error.status = 400;
                error.code = 'REFERENCE_ASSET_UNAVAILABLE';
                throw error;
              }
              const remoteUrl = await runningHubUploadBinary(env, asset.blob, asset.name);
              if (asset.mime.startsWith('video/')) payload.videoUrl = remoteUrl;
              else if (asset.mime.startsWith('audio/')) payload.audioUrl = remoteUrl;
              else payload.imageUrl = remoteUrl;
            }
          }
        }
        // 把 mediaKind 提前到 loop 外，避免每次循环重算。
        const mediaKind = ['image-to-video', 'text-to-video', 'reference-to-video', 'video-generation', 'multimodal-video', 'short-play-video', 'motion-control', 'lip-sync-video', 'start-end-to-video', 'image-to-world'].includes(String(nodeData.task || '')) ? 'canvas_video' : (['music-generation', 'audio-generation', 'song-extend'].includes(String(nodeData.task || '')) ? 'canvas_audio' : 'canvas_image');
        for (let loop = 0; loop < loops; loop += 1) {
          // 只向能力目录明确声明支持 batchCount 的端点发送该参数。
          // 低价 V2 等端点会拒绝未知字段；不支持批量时由外层 loops 扇出即可。
          if (supportsBatch) payload.batchCount = batchCount;
          else delete payload.batchCount;
          const chargedCost = supportsBatch ? cost : unitCost;
          const localId = crypto.randomUUID();
          // 先预占 canvas_tasks 行（status='PENDING'）：让同 idempotency 的 retry 在上面 existing 查询处
          // 命中而直接返回，避免再走 deductCredits / upstream；deductCredits 内部也会按 reference_id
          // 做二次幂等（防双触发/网络重试）。credit_cost 占位 0，扣费成功后回填。
          await env.DB.prepare(`INSERT INTO canvas_tasks (id,canvas_id,node_id,user_id,definition_type,idempotency_key,status,visibility,input_json,credit_cost,billing_scope,billing_team_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(localId, id, nodeId, user.user_id, logicalType, `${idempotency}:${loop}`, 'PENDING', visibility, JSON.stringify(payload), 0, canvasBilling.scope, canvasBilling.teamId).run();
          let charged = false;
          try {
            if (env.__test_bypass_usage !== true) {
              await deductCredits(env, user.user_id, chargedCost, `画布「${item.title}」${logicalType}生成`, canvasBilling, localId);
              charged = true;
              await env.DB.prepare(`UPDATE canvas_tasks SET credit_cost=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(chargedCost, localId).run();
            }
            let provider;
            if (providerMode === 'workflow') provider = await runningHubLegacyPost(env, '/task/openapi/create', { workflowId, nodeInfoList: payload.nodeInfoList || [], addMetadata: true });
            else provider = await runningHubPost(env, `/${endpoint}`, payload);
            const providerTaskId = provider.taskId || provider.data?.taskId; if (!providerTaskId) throw new Error('RunningHub 未返回 taskId');
            await env.DB.prepare(`UPDATE canvas_tasks SET provider_task_id=?,status='RUNNING',updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(providerTaskId, localId).run();
            // 写入媒体任务溯源表（id 与 canvas_tasks 相同，管理端产出追溯可关联素材）。
            await env.DB.prepare(`INSERT OR IGNORE INTO media_tasks (id,user_id,kind,model,provider,provider_task_id,status,credit_cost,billing_scope,billing_team_id) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(localId, user.user_id, mediaKind, payload?.model || modelIdForUsage, 'runninghub', providerTaskId, 'processing', chargedCost, canvasBilling.scope, canvasBilling.teamId).run();
            tasks.push({ id: localId, nodeId, taskId: providerTaskId, status: 'RUNNING', creditCost: chargedCost, billingScope: canvasBilling.scope, billingTeamId: canvasBilling.teamId });
          } catch (error) {
            const msg = String(error?.message || error || '').slice(0, 500);
            await env.DB.prepare(`UPDATE canvas_tasks SET status='FAILED',error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(msg, localId).run();
            if (charged) await refundCredits(env, user.user_id, chargedCost, `画布任务提交失败退回`, canvasBilling, localId);
            throw error;
          }
        }
        // 流水记录放在循环之后：此时 payload 已构造完毕，能拿到 payload.model。
        await recordModelUsage(env, user.user_id, payload?.model || modelIdForUsage, endpoint || workflowId || '', 'canvas_run', `${logicalType} × ${batchCount}`, cost);
      } catch (error) {
        return response(request, env, { error: error.message, code: error.code, cost: error.cost, tasks }, error.status || 502);
      }
    }
    return response(request, env, { order, tasks }, 202);
  }
  const canvasTaskMatch = url.pathname.match(/^\/api\/canvas-tasks\/([^/]+)$/);
  if (canvasTaskMatch && request.method === 'GET') {
    const task = await env.DB.prepare(`SELECT * FROM canvas_tasks WHERE id=? AND user_id=?`).bind(decodeURIComponent(canvasTaskMatch[1]), user.user_id).first(); if (!task) return response(request, env, { error: '任务不存在' }, 404);
    if (!task.provider_task_id || ['FAILED', 'CANCELLED', 'ERROR'].includes(String(task.status || '').toUpperCase())) {
      const existing = await env.DB.prepare(`SELECT id,name,mime_type FROM assets WHERE task_id=? AND deleted_at IS NULL ORDER BY created_at`).bind(task.id).all();
      let storedOutputs = [];
      try {
        storedOutputs = JSON.parse(task.output_json || '[]');
      } catch (_) {
        storedOutputs = [];
      }
      return response(request, env, {
        id: task.id,
        nodeId: task.node_id,
        status: task.status,
        outputs: Array.isArray(storedOutputs) ? storedOutputs : [],
        assets: existing.results.map((item) => ({ id: item.id, name: item.name, mimeType: item.mime_type, url: `/api/assets/${item.id}` })),
        error: task.error || null,
      });
    }
    try {
      const result = await runningHubPost(env, '/query', { taskId: task.provider_task_id }), status = String(result.status || task.status).toUpperCase(), outputs = result.results || [];
      const successStatuses = ['SUCCEEDED', 'SUCCESS', 'COMPLETED', 'DONE'];
      const failedStatuses = ['FAILED', 'CANCELLED', 'ERROR'];
      const mediaStatus = successStatuses.includes(status) ? 'COMPLETED' : failedStatuses.includes(status) ? 'FAILED' : status;
      const outputJson = JSON.stringify(outputs);
      const taskError = result.errorMessage || null;
      await env.DB.batch([
        env.DB.prepare(`UPDATE canvas_tasks SET status=?,output_json=?,error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(status, outputJson, taskError, task.id),
        env.DB.prepare(`UPDATE media_tasks SET status=?,output_json=?,error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(mediaStatus, outputJson, taskError, task.id),
      ]);
      if (failedStatuses.includes(status) && !failedStatuses.includes(String(task.status || '').toUpperCase())) {
        // referenceId=task.id 让 refundCredits 按 ledger 二次幂等（防 submit-failure 与 poll-failure 同时退）
        await refundCredits(env, task.user_id, Number(task.credit_cost) || 0, '画布生成失败退回', { scope: task.billing_scope, teamId: task.billing_team_id }, task.id);
      }
      let assets = [];
      if (successStatuses.includes(status)) {
        const existing = await env.DB.prepare(`SELECT id,name,mime_type FROM assets WHERE task_id=? AND deleted_at IS NULL ORDER BY created_at`).bind(task.id).all();
        if (existing.results.length) {
          assets = existing.results.map((item) => ({ id: item.id, name: item.name, mimeType: item.mime_type, url: `/api/assets/${item.id}` }));
        } else {
          const seen = new Set();
          for (let index = 0; index < outputs.length; index += 1) {
            const output = outputs[index];
            const rawUrl = typeof output === 'string' ? output : String(output?.url || output?.src || output?.video_url || output?.image_url || '');
            if (!rawUrl || seen.has(rawUrl)) continue;
            seen.add(rawUrl);
            const mime = inferAssetMime(rawUrl, output?.type || output?.mimeType || output?.content_type);
            const assetId = crypto.randomUUID();
            const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
            const name = `${task.definition_type || '生成'}${stamp}${assets.length + 1}.${assetExt(mime)}`;
            await env.DB.prepare(`INSERT INTO assets (id,owner_id,canvas_id,name,mime_type,size_bytes,object_key,source,visibility,task_id,provider_url) VALUES (?,?,?,?,?,0,?,'generated',?,?,?)`)
              .bind(assetId, task.user_id, task.canvas_id, name, mime, `pending:${assetId}`, task.visibility || 'new', task.id, rawUrl).run();
            assets.push({ id: assetId, name, mimeType: mime, url: `/api/assets/${assetId}` });
            void storeGeneratedAsset(env, assetId, rawUrl, mime).catch(() => {});
          }
        }
      }
      return response(request, env, { id: task.id, nodeId: task.node_id, status, outputs, assets, error: result.errorMessage || null });
    } catch (error) { return response(request, env, { error: error.message }, 502); }
  }
  if (url.pathname === '/api/payments/sandbox/order' && request.method === 'POST') {
    return response(request, env, { enabled: false, providers: ['wechat', 'alipay'], message: '支付沙箱适配器已预留；生产商户凭证配置后启用' }, 503);
  }
  if (url.pathname === '/api/admin/login' && request.method === 'POST') {
    if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
      return response(request, env, { error: '后台账号尚未在服务器环境变量中配置' }, 503);
    }
    try { await initialize(env); } catch (error) { return response(request, env, { error: error.message }, 503); }
    const body = await request.json().catch(() => ({}));
    const email = adminAccountToEmail(body.email || body.account);
    const row = await env.DB.prepare(`SELECT * FROM admins WHERE email=?`).bind(email).first();
    if (!row || Number(row.disabled) === 1) return response(request, env, { error: '账号或密码错误' }, 401);
    const hash = await passwordHash(String(body.password || ''), row.password_salt);
    if (hash !== row.password_hash) return response(request, env, { error: '账号或密码错误' }, 401);
    let permissions = [];
    try { permissions = JSON.parse(row.permissions || '[]'); } catch {}
    const admin = { id: row.id, email: row.email, name: row.name, permissions, is_owner: Number(row.is_owner) === 1 };
    await audit(env, admin.email, 'login', 'admin', String(admin.id));
    return response(request, env, { token: await issueToken(admin, env.SESSION_SECRET), email: admin.email, name: admin.name, permissions, is_owner: admin.is_owner });
  }

  // ===== 内置音乐库 + 用户账号歌单（R2 / 阿里云磁盘）=====
  // GET /api/music/<key>.mp3 公开播放 30 首内置歌曲（支持 Range）
  // GET/DELETE /api/music/mine 用户自己的账号歌单；私有歌曲只能本人播放
  // POST /api/music/user-upload 累计充值满 30 元的用户上传 MP3（≤25MB）
  const musicKeyRe = /^[a-z0-9-]{1,160}\.mp3$/;
  if (url.pathname === '/api/music/mine' && request.method === 'GET') {
    try {
      await initialize(env);
      const user = await requireUser(request, env, false);
      if (!user) return response(request, env, { error: '请先登录后再查看账号歌单', code: 'AUTH_REQUIRED' }, 401);
      const rows = await env.DB.prepare(`SELECT id,name,mime_type,size_bytes,created_at FROM user_music WHERE owner_id=? ORDER BY created_at DESC`).bind(user.user_id).all();
      return response(request, env, { items: rows.results.map((item) => ({
        id: item.id,
        name: item.name,
        artist: '我的上传',
        mimeType: item.mime_type,
        size: Number(item.size_bytes) || 0,
        url: `/api/music/mine/${item.id}/file`,
        createdAt: item.created_at,
        builtin: false,
      })) });
    } catch (error) {
      return response(request, env, { error: error.message || '账号歌单加载失败' }, 503);
    }
  }
  const myMusicFile = url.pathname.match(/^\/api\/music\/mine\/([a-z0-9-]{8,80})\/file$/);
  if (myMusicFile && request.method === 'GET') {
    try {
      await initialize(env);
      const user = await requireUser(request, env, false);
      if (!user) return response(request, env, { error: '请先登录后再播放账号音乐', code: 'AUTH_REQUIRED' }, 401);
      const item = await env.DB.prepare(`SELECT object_key FROM user_music WHERE id=? AND owner_id=?`).bind(myMusicFile[1], user.user_id).first();
      if (!item) return response(request, env, { error: '音乐不存在或不属于当前账号' }, 404);
      return serveMusicObject(request, env, item.object_key, 'private, max-age=3600');
    } catch (error) {
      return response(request, env, { error: error.message || '音乐播放失败' }, 503);
    }
  }
  const myMusicItem = url.pathname.match(/^\/api\/music\/mine\/([a-z0-9-]{8,80})$/);
  if (myMusicItem && request.method === 'DELETE') {
    try {
      await initialize(env);
      const user = await requireUser(request, env, true);
      if (!user) return response(request, env, { error: '请先登录后再管理账号歌单', code: 'AUTH_REQUIRED' }, 401);
      const item = await env.DB.prepare(`SELECT object_key FROM user_music WHERE id=? AND owner_id=?`).bind(myMusicItem[1], user.user_id).first();
      if (!item) return response(request, env, { error: '音乐不存在或不属于当前账号' }, 404);
      if (env.MEDIA) await env.MEDIA.delete(item.object_key);
      await env.DB.prepare(`DELETE FROM user_music WHERE id=? AND owner_id=?`).bind(myMusicItem[1], user.user_id).run();
      return response(request, env, { ok: true, id: myMusicItem[1] });
    } catch (error) {
      return response(request, env, { error: error.message || '音乐删除失败' }, 503);
    }
  }
  if (url.pathname === '/api/music/user-upload' && request.method === 'POST') {
    const user = await requireUser(request, env, true);
    if (!user) return response(request, env, { error: '请先登录后再上传音乐' }, 401);
    if (!(await userIsPremium(env, user.user_id))) {
      return response(request, env, { error: '上传音乐需累计充值满 30 元后解锁，当前为免费用户', code: 'UPGRADE_REQUIRED', upgrade: true }, 402);
    }
    if (!env.MEDIA) return response(request, env, { error: '音乐存储不可用' }, 503);
    const size = Number(request.headers.get('x-file-size') || request.headers.get('content-length') || 0);
    if (!(size > 0) || size > 25 * 1024 * 1024) return response(request, env, { error: '文件为空或超过25MB' }, 400);
    const contentType = String(request.headers.get('content-type') || '').toLowerCase().split(';')[0];
    let name = '';
    try { name = decodeURIComponent(request.headers.get('x-file-name') || ''); } catch { name = ''; }
    name = name.split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 180);
    if (!/\.mp3$/i.test(name) || !['audio/mpeg', 'audio/mp3', 'audio/x-mpeg'].includes(contentType)) {
      return response(request, env, { error: '仅支持 MP3 格式音乐' }, 400);
    }
    try {
      await initialize(env);
      const id = crypto.randomUUID();
      const objectKey = `music/users/${user.user_id}/${id}.mp3`;
      await env.MEDIA.put(objectKey, request.body, { httpMetadata: { contentType: 'audio/mpeg' } });
      try {
        await env.DB.prepare(`INSERT INTO user_music (id,owner_id,name,mime_type,size_bytes,object_key) VALUES (?,?,?,?,?,?)`).bind(id, user.user_id, name, 'audio/mpeg', size, objectKey).run();
      } catch (error) {
        await env.MEDIA.delete(objectKey).catch(() => {});
        throw error;
      }
      return response(request, env, { id, name, artist: '我的上传', mimeType: 'audio/mpeg', size, url: `/api/music/mine/${id}/file`, builtin: false }, 201);
    } catch (error) {
      return response(request, env, { error: error.message || '音乐上传失败' }, 503);
    }
  }
  if (url.pathname === '/api/music/upload' && request.method === 'POST') {
    if (!env.MUSIC_UPLOAD_SECRET) return response(request, env, { error: '音乐上传通道未配置' }, 503);
    if (request.headers.get('x-music-token') !== env.MUSIC_UPLOAD_SECRET) return response(request, env, { error: 'token 不正确' }, 401);
    const key = String(url.searchParams.get('key') || '');
    if (!musicKeyRe.test(key)) return response(request, env, { error: 'key 格式不正确（需为 xxx.mp3）' }, 400);
    if (!env.MEDIA) return response(request, env, { error: '音乐存储不可用' }, 503);
    const size = Number(request.headers.get('content-length') || 0);
    if (!(size > 0) || size > 30 * 1024 * 1024) return response(request, env, { error: '文件为空或超过30MB' }, 400);
    await env.MEDIA.put(`music/${key}`, request.body, { httpMetadata: { contentType: 'audio/mpeg' } });
    return response(request, env, { ok: true, key, url: `/api/music/${key}` }, 201);
  }
  const musicGet = url.pathname.match(/^\/api\/music\/([a-z0-9-]+\.mp3)$/);
  if (musicGet && request.method === 'GET') return serveMusicObject(request, env, `music/${musicGet[1]}`);
  if (musicGet && request.method === 'DELETE') {
    if (!env.MUSIC_UPLOAD_SECRET) return response(request, env, { error: '音乐上传通道未配置' }, 503);
    if (request.headers.get('x-music-token') !== env.MUSIC_UPLOAD_SECRET) return response(request, env, { error: 'token 不正确' }, 401);
    if (!env.MEDIA) return response(request, env, { error: '音乐存储不可用' }, 503);
    await env.MEDIA.delete(`music/${musicGet[1]}`);
    return response(request, env, { ok: true });
  }
  try { await initialize(env); } catch (error) { return response(request, env, { error: error.message }, 503); }
  const admin = await requireAdmin(request, env);
  if (!admin) return response(request, env, { error: '登录已失效，请重新登录' }, 401);
  const forbidden = () => response(request, env, { error: '没有该功能的操作权限' }, 403);

  if (url.pathname === '/api/admin/stats' && request.method === 'GET') {
    const [users, tasks, success, credits, media, mediaToday, assets, usersDaily] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) AS value FROM users`).first(),
      env.DB.prepare(`SELECT COUNT(*) AS value FROM tasks`).first(),
      env.DB.prepare(`SELECT COUNT(*) AS value FROM tasks WHERE status='success'`).first(),
      env.DB.prepare(`SELECT COALESCE(SUM(credits),0) AS value FROM users`).first(),
      env.DB.prepare(`SELECT COUNT(*) AS value, COALESCE(SUM(credit_cost),0) AS credits FROM media_tasks`).first(),
      env.DB.prepare(`SELECT COUNT(*) AS value FROM media_tasks WHERE created_at >= datetime('now','-24 hours')`).first(),
      env.DB.prepare(`SELECT COUNT(*) AS value FROM assets WHERE deleted_at IS NULL`).first(),
      env.DB.prepare(`SELECT substr(created_at,1,10) AS day, COUNT(*) AS n FROM users WHERE created_at >= datetime('now','-13 days') GROUP BY day ORDER BY day ASC`).all(),
    ]);
    const taskCount = Number(tasks.value) || 0;
    const providerStatus = Object.entries(QUOTA_PROVIDERS)
      .filter(([key]) => key !== 'unknown')
      .map(([key, meta]) => ({ key, label: meta.label, configured: providerConfigured(env, key), rechargeUrl: meta.rechargeUrl || null, consoleUrl: meta.consoleUrl || null, balanceSupported: Boolean(meta.balance) }));
    return response(request, env, {
      users: users.value, tasks: taskCount, successRate: taskCount ? Math.round(Number(success.value) * 100 / taskCount) : 0, credits: credits.value,
      runningHubConfigured: Boolean(env.RUNNINGHUB_API_KEY),
      mediaCount: Number(media.value) || 0, mediaCredits: Number(media.credits) || 0, mediaToday: Number(mediaToday.value) || 0, assets: Number(assets.value) || 0,
      usersDaily: (usersDaily?.results || usersDaily || []).map((r) => ({ day: String(r.day || ''), n: Number(r.n) || 0 })),
      providerStatus, smsConfigured: Boolean(env.SMS_ACCESS_KEY_ID && env.SMS_DYPNS_SCHEME_NAME), storageConfigured: Boolean(env.MEDIA && env.DB),
    });
  }
  if (url.pathname === '/api/admin/runninghub/capabilities' && request.method === 'GET') {
    if (!can(admin, 'runninghub')) return forbidden();
    const catalog = await capabilities(env, request);
    const type = url.searchParams.get('type');
    const task = url.searchParams.get('task');
    const query = (url.searchParams.get('q') || '').toLowerCase();
    const items = catalog.endpoints.filter((item) => (!type || item.output_type === type) && (!task || item.task === task) && (!query || JSON.stringify(item).toLowerCase().includes(query)));
    return response(request, env, { version: catalog.version, total: items.length, items: items.slice(0, 200) });
  }
  if (url.pathname === '/api/admin/runninghub/check' && request.method === 'POST') {
    if (!can(admin, 'runninghub')) return forbidden();
    try {
      const result = await runningHubPost(env, '', { apikey: env.RUNNINGHUB_API_KEY }, true);
      const account = result.data || {};
      return response(request, env, { ok: true, balance: account.remainMoney ?? '0', currency: account.currency || 'CNY', runningTasks: account.currentTaskCounts ?? '0', apiType: account.apiType || '' });
    } catch (error) { return response(request, env, { error: error.message }, 502); }
  }
  if (url.pathname === '/api/admin/runninghub/price-preview' && request.method === 'POST') {
    if (!can(admin, 'runninghub')) return forbidden();
    const body = await request.json().catch(() => ({}));
    const catalog = await capabilities(env, request);
    if (!catalog.endpoints.some((item) => item.endpoint === body.endpoint)) return response(request, env, { error: '端点不在能力目录中' }, 400);
    try { return response(request, env, await runningHubPost(env, `/price-preview/${body.endpoint}`, body.payload || {})); }
    catch (error) { return response(request, env, { error: error.message }, 502); }
  }
  if (url.pathname === '/api/admin/runninghub/ai-app/info' && request.method === 'POST') {
    if (!can(admin, 'runninghub')) return forbidden();
    const body = await request.json().catch(() => ({}));
    if (!/^\d+$/.test(String(body.webappId || ''))) return response(request, env, { error: 'webappId 格式不正确' }, 400);
    try {
      const upstream = await fetch(`https://www.runninghub.cn/api/webapp/apiCallDemo?apiKey=${encodeURIComponent(env.RUNNINGHUB_API_KEY)}&webappId=${encodeURIComponent(body.webappId)}`);
      const result = await upstream.json();
      if (!upstream.ok || result.code !== 0) throw new Error(result.msg || '获取 AI 应用节点失败');
      return response(request, env, { nodeInfoList: result.data?.nodeInfoList || [] });
    } catch (error) { return response(request, env, { error: error.message }, 502); }
  }
  if (url.pathname === '/api/admin/runninghub/ai-app/run' && request.method === 'POST') {
    if (!can(admin, 'runninghub')) return forbidden();
    const body = await request.json().catch(() => ({}));
    if (!/^\d+$/.test(String(body.webappId || '')) || !Array.isArray(body.nodeInfoList)) return response(request, env, { error: '需要合法的 webappId 和 nodeInfoList' }, 400);
    try {
      const result = await runningHubLegacyPost(env, '/task/openapi/ai-app/run', { webappId: Number(body.webappId), nodeInfoList: body.nodeInfoList, instanceType: body.instanceType || 'default' });
      const taskId = result.data?.taskId;
      if (!taskId) throw new Error('RunningHub 未返回 taskId');
      const localId = crypto.randomUUID();
      await env.DB.prepare(`INSERT INTO tasks (id,tool_id,user_email,status,provider_task_id) VALUES (?,?,?,?,?)`).bind(localId, `ai-app:${body.webappId}`, admin.email, result.data?.taskStatus || 'RUNNING', taskId).run();
      await audit(env, admin.email, 'submit', 'runninghub_ai_app', localId, JSON.stringify({ webappId: body.webappId, providerTaskId: taskId }));
      return response(request, env, { id: localId, taskId, status: result.data?.taskStatus || 'RUNNING' }, 201);
    } catch (error) { return response(request, env, { error: error.message }, 502); }
  }
  if (url.pathname === '/api/admin/runninghub/workflow/run' && request.method === 'POST') {
    if (!can(admin, 'runninghub')) return forbidden();
    const body = await request.json().catch(() => ({}));
    if (!/^\d+$/.test(String(body.workflowId || '')) || !Array.isArray(body.nodeInfoList || [])) return response(request, env, { error: '需要合法的 workflowId 和 nodeInfoList' }, 400);
    try {
      const result = await runningHubLegacyPost(env, '/task/openapi/create', { workflowId: String(body.workflowId), nodeInfoList: body.nodeInfoList || [], addMetadata: body.addMetadata !== false });
      const taskId = result.data?.taskId;
      if (!taskId) throw new Error('RunningHub 未返回 taskId');
      const localId = crypto.randomUUID();
      await env.DB.prepare(`INSERT INTO tasks (id,tool_id,user_email,status,provider_task_id) VALUES (?,?,?,?,?)`).bind(localId, `workflow:${body.workflowId}`, admin.email, 'RUNNING', taskId).run();
      await audit(env, admin.email, 'submit', 'runninghub_workflow', localId, JSON.stringify({ workflowId: body.workflowId, providerTaskId: taskId }));
      return response(request, env, { id: localId, taskId, status: 'RUNNING' }, 201);
    } catch (error) { return response(request, env, { error: error.message }, 502); }
  }
  if (url.pathname === '/api/admin/runninghub/tasks' && request.method === 'POST') {
    if (!can(admin, 'runninghub')) return forbidden();
    const body = await request.json().catch(() => ({}));
    const catalog = await capabilities(env, request);
    const definition = catalog.endpoints.find((item) => item.endpoint === body.endpoint);
    if (!definition) return response(request, env, { error: '端点不在已核对的 RunningHub 能力目录中' }, 400);
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
    try {
      const result = await runningHubPost(env, `/${definition.endpoint}`, payload);
      if (!result.taskId) throw new Error('RunningHub 未返回 taskId');
      const localId = crypto.randomUUID();
      await env.DB.prepare(`INSERT INTO tasks (id,tool_id,user_email,status,provider_task_id) VALUES (?,?,?,?,?)`)
        .bind(localId, definition.endpoint, admin.email, result.status || 'QUEUED', result.taskId).run();
      await audit(env, admin.email, 'submit', 'runninghub_task', localId, JSON.stringify({ endpoint: definition.endpoint, providerTaskId: result.taskId }));
      return response(request, env, { id: localId, taskId: result.taskId, status: result.status || 'QUEUED' }, 201);
    } catch (error) { return response(request, env, { error: error.message }, 502); }
  }
  const rhTask = url.pathname.match(/^\/api\/admin\/runninghub\/tasks\/([^/]+)$/);
  if (rhTask && request.method === 'GET') {
    if (!can(admin, 'runninghub')) return forbidden();
    const item = await env.DB.prepare(`SELECT * FROM tasks WHERE id=?`).bind(decodeURIComponent(rhTask[1])).first();
    if (!item) return response(request, env, { error: '任务不存在' }, 404);
    try {
      const result = await runningHubPost(env, '/query', { taskId: item.provider_task_id });
      const status = result.status || item.status;
      const first = result.results?.[0] || {};
      const resultUrl = first.url || first.outputUrl || null;
      const error = result.errorMessage || null;
      await env.DB.prepare(`UPDATE tasks SET status=?,result_url=?,error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(status, resultUrl, error, item.id).run();
      return response(request, env, { id: item.id, taskId: item.provider_task_id, status, results: result.results || [], usage: result.usage || {}, error });
    } catch (error) { return response(request, env, { error: error.message }, 502); }
  }
  const rhCancel = url.pathname.match(/^\/api\/admin\/runninghub\/tasks\/([^/]+)\/cancel$/);
  if (rhCancel && request.method === 'POST') {
    if (!can(admin, 'runninghub')) return forbidden();
    const item = await env.DB.prepare(`SELECT * FROM tasks WHERE id=?`).bind(decodeURIComponent(rhCancel[1])).first();
    if (!item) return response(request, env, { error: '任务不存在' }, 404);
    try {
      await runningHubLegacyPost(env, '/task/openapi/cancel', { taskId: item.provider_task_id });
      await env.DB.prepare(`UPDATE tasks SET status='CANCELLED',updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(item.id).run();
      await audit(env, admin.email, 'cancel', 'runninghub_task', item.id);
      return response(request, env, { ok: true, status: 'CANCELLED' });
    } catch (error) { return response(request, env, { error: error.message }, 502); }
  }
  if (url.pathname === '/api/admin/tools' && request.method === 'GET') {
    if (!can(admin, 'tools')) return forbidden();
    const result = await env.DB.prepare(`SELECT * FROM tools ORDER BY name`).all();
    return response(request, env, { items: result.results });
  }
  if (url.pathname === '/api/admin/node-definitions' && request.method === 'GET') {
    if (!can(admin, 'nodes')) return forbidden();
    const result = await env.DB.prepare(`SELECT * FROM node_definitions ORDER BY name`).all();
    return response(request, env, { items: result.results });
  }
  const nodeDefinitionMatch = url.pathname.match(/^\/api\/admin\/node-definitions\/([^/]+)$/);
  if (nodeDefinitionMatch && request.method === 'PUT') {
    if (!can(admin, 'nodes')) return forbidden();
    const type = decodeURIComponent(nodeDefinitionMatch[1]), body = await request.json().catch(() => ({}));
    await env.DB.prepare(`INSERT INTO node_definitions (type,name,provider_mode,endpoint,workflow_id,input_schema,output_schema,parameter_mapping,credit_cost,timeout_seconds,enabled,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(type) DO UPDATE SET name=excluded.name,provider_mode=excluded.provider_mode,endpoint=excluded.endpoint,workflow_id=excluded.workflow_id,input_schema=excluded.input_schema,output_schema=excluded.output_schema,parameter_mapping=excluded.parameter_mapping,credit_cost=excluded.credit_cost,timeout_seconds=excluded.timeout_seconds,enabled=excluded.enabled,updated_at=CURRENT_TIMESTAMP`).bind(type,String(body.name||type),body.provider_mode==='workflow'?'workflow':'standard',String(body.endpoint||''),String(body.workflow_id||''),JSON.stringify(body.input_schema||{}),JSON.stringify(body.output_schema||{}),JSON.stringify(body.parameter_mapping||{}),Math.max(0,Number(body.credit_cost)||0),Math.max(30,Number(body.timeout_seconds)||300),body.enabled===false?0:1).run();
    await audit(env, admin.email, 'update', 'node_definition', type, JSON.stringify({ provider_mode: body.provider_mode, endpoint: body.endpoint, workflow_id: body.workflow_id, credit_cost: body.credit_cost }));
    return response(request, env, { ok: true });
  }
  const toolMatch = url.pathname.match(/^\/api\/admin\/tools\/([^/]+)$/);
  if (toolMatch && request.method === 'PUT') {
    if (!can(admin, 'tools')) return forbidden();
    const id = decodeURIComponent(toolMatch[1]);
    const body = await request.json().catch(() => ({}));
    const cost = Math.max(0, Number.parseInt(body.credit_cost, 10) || 0);
    await env.DB.prepare(`UPDATE tools SET workflow_id=?,credit_cost=?,enabled=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .bind(String(body.workflow_id || ''), cost, body.enabled ? 1 : 0, id).run();
    await audit(env, admin.email, 'update', 'tool', id, JSON.stringify({ workflow_id: body.workflow_id || '', credit_cost: cost, enabled: Boolean(body.enabled) }));
    return response(request, env, { ok: true });
  }
  if (url.pathname === '/api/admin/tasks' && request.method === 'GET') {
    if (!can(admin, 'tasks')) return forbidden();
    const result = await env.DB.prepare(`SELECT * FROM tasks ORDER BY created_at DESC LIMIT 200`).all();
    return response(request, env, { items: result.results });
  }
  if (url.pathname === '/api/admin/media-tasks' && request.method === 'GET') {
    if (!can(admin, 'tasks')) return forbidden();
    const kind = String(url.searchParams.get('kind') || '').toLowerCase();
    const status = String(url.searchParams.get('status') || '').toUpperCase();
    const q = String(url.searchParams.get('q') || '').trim();
    const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get('limit'), 10) || 200, 1), 1000);
    const where = [];
    const params = [];
    if (kind === 'image' || kind === 'video') { where.push('mt.kind=?'); params.push(kind); }
    if (status) { where.push('mt.status=?'); params.push(status); }
    if (q) {
      where.push('(mt.id LIKE ? OR mt.model LIKE ? OR u.email LIKE ? OR u.name LIKE ? OR mt.provider_task_id LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like, like, like);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = (await env.DB.prepare(`SELECT mt.id, mt.user_id, mt.kind, mt.model, mt.provider, mt.provider_task_id, mt.status, mt.credit_cost, mt.output_json, mt.error, mt.created_at, mt.updated_at, u.email AS user_email, u.name AS user_name, (SELECT a.id FROM assets a WHERE (a.task_id = mt.id OR a.id = mt.id) AND a.deleted_at IS NULL ORDER BY a.created_at LIMIT 1) AS asset_id, (SELECT a.mime_type FROM assets a WHERE (a.task_id = mt.id OR a.id = mt.id) AND a.deleted_at IS NULL ORDER BY a.created_at LIMIT 1) AS asset_mime FROM media_tasks mt LEFT JOIN users u ON u.id = mt.user_id ${whereSql} ORDER BY mt.created_at DESC LIMIT ?`).bind(...params, limit).all()).results;
    const total = (await env.DB.prepare(`SELECT COUNT(*) AS value FROM media_tasks`).first()).value;
    return response(request, env, {
      items: rows.map((r) => ({
        id: r.id, userId: r.user_id, kind: r.kind, model: r.model, provider: r.provider,
        providerTaskId: r.provider_task_id || '', status: r.status, creditCost: Number(r.credit_cost) || 0,
        error: r.error || null, createdAt: r.created_at, updatedAt: r.updated_at,
        userEmail: r.user_email || '', userName: r.user_name || '',
        assetId: r.asset_id || null, assetMime: r.asset_mime || null,
        assetUrl: r.asset_id ? `/api/assets/${r.asset_id}` : null,
      })),
      total: Number(total) || 0,
    });
  }
  if (url.pathname === '/api/admin/users' && request.method === 'GET') {
    if (!can(admin, 'users')) return forbidden();
    const result = await env.DB.prepare(`SELECT * FROM users ORDER BY created_at DESC LIMIT 200`).all();
    return response(request, env, { items: result.results });
  }
  const modelUsageMatch = url.pathname.match(/^\/api\/admin\/users\/(\d+)\/model-usage$/);
  if (modelUsageMatch && request.method === 'GET') {
    if (!can(admin, 'users')) return forbidden();
    const userId = Number(modelUsageMatch[1]);
    const summary = await env.DB.prepare(`SELECT model, source, COUNT(*) AS calls, COALESCE(SUM(credits),0) AS credits FROM model_usage WHERE user_id=? GROUP BY model, source ORDER BY calls DESC`).bind(userId).all();
    const recent = await env.DB.prepare(`SELECT id, model, endpoint, source, detail, credits, created_at FROM model_usage WHERE user_id=? ORDER BY created_at DESC LIMIT 100`).bind(userId).all();
    return response(request, env, { user_id: userId, summary: summary.results, recent: recent.results });
  }
  if (url.pathname === '/api/admin/stats/models' && request.method === 'GET') {
    if (!can(admin, 'users')) return forbidden();
    const summary = await env.DB.prepare(`SELECT model, source, COUNT(*) AS calls, COUNT(DISTINCT user_id) AS users, COALESCE(SUM(credits),0) AS credits FROM model_usage GROUP BY model, source ORDER BY calls DESC LIMIT 50`).all();
    return response(request, env, { items: summary.results });
  }
  if (url.pathname === '/api/admin/model-quota' && request.method === 'GET') {
    if (!can(admin, 'users')) return forbidden();
    const rows = (await env.DB.prepare(`SELECT model, source, COUNT(*) AS calls, COUNT(DISTINCT user_id) AS users, COALESCE(SUM(credits),0) AS credits, MAX(created_at) AS last_at FROM model_usage GROUP BY model, source ORDER BY calls DESC`).all()).results;
    const [totUsers, totModels, last24] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(DISTINCT user_id) AS value FROM model_usage`).first(),
      env.DB.prepare(`SELECT COUNT(DISTINCT model) AS value FROM model_usage`).first(),
      env.DB.prepare(`SELECT COUNT(*) AS value FROM model_usage WHERE created_at >= datetime('now','-24 hours')`).first(),
    ]);
    const chatNames = new Map(CREATIVE_CHAT_MODELS.map((m) => [m.id, { name: m.name, provider: m.provider }]));
    const mediaNames = new Map(allMediaModels.map((m) => [m.id, { name: m.name, provider: m.provider }]));
    const upstreamMedia = new Map();
    for (const m of allMediaModels) {
      const id = typeof m.model === 'function' ? m.model({}) : m.model;
      if (id) upstreamMedia.set(id, { name: m.name, provider: m.provider });
    }
    const providerOf = (modelId) => chatNames.get(modelId)?.provider || mediaNames.get(modelId)?.provider || upstreamMedia.get(modelId)?.provider || 'unknown';
    const nameOf = (modelId) => chatNames.get(modelId)?.name || mediaNames.get(modelId)?.name || upstreamMedia.get(modelId)?.name || modelId;
    const distinctRows = (await env.DB.prepare(`SELECT DISTINCT user_id, model FROM model_usage`).all()).results;
    const providerUsers = new Map();
    for (const dr of distinctRows) {
      const provider = providerOf(dr.model);
      if (!providerUsers.has(provider)) providerUsers.set(provider, new Set());
      providerUsers.get(provider).add(dr.user_id);
    }
    const provAgg = new Map();
    const models = rows.map((r) => {
      const provider = providerOf(r.model);
      const agg = provAgg.get(provider) || { calls: 0, users: 0, credits: 0, lastAt: null };
      agg.calls += Number(r.calls) || 0;
      agg.credits += Number(r.credits) || 0;
      if (!agg.lastAt || String(r.last_at || '') > agg.lastAt) agg.lastAt = String(r.last_at || '');
      provAgg.set(provider, agg);
      return { model: r.model, name: nameOf(r.model), provider, source: r.source, calls: Number(r.calls) || 0, users: Number(r.users) || 0, credits: Number(r.credits) || 0, lastAt: r.last_at || null };
    });
    const providerKeys = [...new Set([...Object.keys(QUOTA_PROVIDERS), ...provAgg.keys()])];
    const providers = await Promise.all(providerKeys.map(async (key) => {
      const meta = QUOTA_PROVIDERS[key] || { label: key, rechargeUrl: null, consoleUrl: null, balance: false };
      const agg = provAgg.get(key) || { calls: 0, users: 0, credits: 0, lastAt: null };
      const balance = meta.balance ? await fetchProviderBalance(env, key) : null;
      const manualBalance = (balance && balance.available) ? null : await readManualBalance(env, key);
      return { key, label: meta.label, configured: providerConfigured(env, key), rechargeUrl: meta.rechargeUrl || null, consoleUrl: meta.consoleUrl || null, calls: agg.calls, users: (providerUsers.get(key)?.size) || 0, credits: agg.credits, lastAt: agg.lastAt || null, balance, manualBalance };
    }));
    providers.sort((a, b) => b.calls - a.calls);
    return response(request, env, {
      generatedAt: new Date().toISOString(),
      totals: {
        calls: rows.reduce((s, r) => s + (Number(r.calls) || 0), 0),
        credits: rows.reduce((s, r) => s + (Number(r.credits) || 0), 0),
        users: Number(totUsers.value) || 0,
        models: Number(totModels.value) || 0,
        last24hCalls: Number(last24.value) || 0,
      },
      providers,
      models,
    });
  }
  if (url.pathname === '/api/admin/quota/manual' && request.method === 'GET') {
    if (!can(admin, 'users')) return forbidden();
    const rows = (await env.DB.prepare(`SELECT provider, balance, note, updated_by, updated_at FROM provider_manual_balance ORDER BY provider`).all()).results;
    return response(request, env, { items: rows.map((r) => ({ provider: r.provider, balance: Number(r.balance) || 0, note: r.note || '', updatedBy: r.updated_by || '', updatedAt: r.updated_at || null })) });
  }
  if (url.pathname === '/api/admin/quota/manual' && request.method === 'PUT') {
    if (!can(admin, 'users')) return forbidden();
    const body = await request.json().catch(() => ({}));
    const provider = String(body.provider || '').trim();
    const balance = Number(body.balance);
    if (!provider) return response(request, env, { error: '缺少厂商标识' }, 400);
    if (!Object.prototype.hasOwnProperty.call(QUOTA_PROVIDERS, provider)) return response(request, env, { error: '未知厂商' }, 400);
    if (!Number.isFinite(balance) || balance < 0) return response(request, env, { error: '余额必须是大于等于 0 的数字' }, 400);
    const note = String(body.note || '').trim().slice(0, 100);
    await env.DB.prepare(`INSERT INTO provider_manual_balance (provider,balance,note,updated_by,updated_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(provider) DO UPDATE SET balance=excluded.balance,note=excluded.note,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`)
      .bind(provider, balance, note, admin.email).run();
    await audit(env, admin.email, 'update', 'provider_manual_balance', provider, JSON.stringify({ balance, note }));
    return response(request, env, { ok: true });
  }
  if (url.pathname === '/api/admin/quota/manual' && request.method === 'DELETE') {
    if (!can(admin, 'users')) return forbidden();
    const provider = String(url.searchParams.get('provider') || '').trim();
    if (!provider) return response(request, env, { error: '缺少厂商标识' }, 400);
    await env.DB.prepare(`DELETE FROM provider_manual_balance WHERE provider=?`).bind(provider).run();
    await audit(env, admin.email, 'delete', 'provider_manual_balance', provider, '');
    return response(request, env, { ok: true });
  }
  const rechargeMatch = url.pathname.match(/^\/api\/admin\/users\/(\d+)\/credits$/);
  if (rechargeMatch && request.method === 'POST') {
    if (!can(admin, 'users')) return forbidden();
    const body = await request.json().catch(() => ({})), amount = Number.parseInt(body.amount, 10);
    if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 1_000_000) return response(request, env, { error: '积分变动必须是非零整数且绝对值不超过100万' }, 400);
    const target = await env.DB.prepare(`SELECT id,credits FROM users WHERE id=?`).bind(Number(rechargeMatch[1])).first(); if (!target) return response(request, env, { error: '用户不存在' }, 404);
    if (target.credits + amount < 0) return response(request, env, { error: '扣减后积分不能为负数' }, 400);
    await env.DB.batch([env.DB.prepare(`UPDATE users SET credits=credits+? WHERE id=?`).bind(amount,target.id),env.DB.prepare(`INSERT INTO credit_ledger (user_id,amount,reason) VALUES (?,?,?)`).bind(target.id,amount,String(body.reason||'管理员调整').slice(0,200))]);
    await audit(env, admin.email, 'credit_adjust', 'user', String(target.id), JSON.stringify({ amount, reason: body.reason || '管理员调整' }));
    return response(request, env, { ok: true, credits: target.credits + amount });
  }
  if (url.pathname === '/api/admin/audit-logs' && request.method === 'GET') {
    if (!can(admin, 'logs')) return forbidden();
    const result = await env.DB.prepare(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200`).all();
    return response(request, env, { items: result.results });
  }
  if (url.pathname === '/api/admin/admins' && request.method === 'GET') {
    if (!admin.is_owner) return forbidden();
    const result = await env.DB.prepare(`SELECT id,email,name,permissions,is_owner,disabled,created_at,updated_at FROM admins ORDER BY is_owner DESC, id ASC`).all();
    return response(request, env, { items: result.results.map((row) => {
      let permissions = [];
      try { permissions = JSON.parse(row.permissions || '[]'); } catch {}
      return { id: row.id, email: row.email, name: row.name, permissions, is_owner: Number(row.is_owner) === 1, disabled: Number(row.disabled) === 1, created_at: row.created_at, updated_at: row.updated_at };
    }) });
  }
  if (url.pathname === '/api/admin/admins' && request.method === 'POST') {
    if (!admin.is_owner) return forbidden();
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response(request, env, { error: '邮箱格式不正确' }, 400);
    const name = String(body.name || '').trim() || email.split('@')[0];
    const list = Array.isArray(body.permissions) ? body.permissions.filter((p) => ADMIN_PERMISSIONS.includes(p)) : [];
    if (list.length === 0) return response(request, env, { error: '请至少勾选一项权限' }, 400);
    const exists = await env.DB.prepare(`SELECT id FROM admins WHERE email=?`).bind(email).first();
    if (exists) return response(request, env, { error: '该邮箱已是管理员' }, 409);
    const salt = randomToken();
    const hash = await passwordHash('123456', salt);
    const info = await env.DB.prepare(`INSERT INTO admins (email,name,password_hash,password_salt,permissions,created_by) VALUES (?,?,?,?,?,?)`)
      .bind(email, name, hash, salt, JSON.stringify(list), admin.email).run();
    await audit(env, admin.email, 'create', 'admin', String(info.meta.last_row_id), JSON.stringify({ email, name, permissions: list }));
    return response(request, env, { id: Number(info.meta.last_row_id), email, name, permissions: list, is_owner: false, disabled: false }, 201);
  }
  const adminMatch = url.pathname.match(/^\/api\/admin\/admins\/(\d+)$/);
  if (adminMatch && request.method === 'PATCH') {
    if (!admin.is_owner) return forbidden();
    const item = await env.DB.prepare(`SELECT * FROM admins WHERE id=?`).bind(Number(adminMatch[1])).first();
    if (!item) return response(request, env, { error: '管理员不存在' }, 404);
    const body = await request.json().catch(() => ({}));
    const isOwnerRow = Number(item.is_owner) === 1;
    if (body.disabled !== undefined && isOwnerRow) return response(request, env, { error: '超级管理员不能被停用' }, 400);
    if (body.permissions !== undefined) {
      const list = Array.isArray(body.permissions) ? body.permissions.filter((p) => ADMIN_PERMISSIONS.includes(p)) : [];
      if (!isOwnerRow && list.length === 0) return response(request, env, { error: '请至少勾选一项权限' }, 400);
    }
    if (body.password !== undefined && String(body.password).length < 6) return response(request, env, { error: '密码至少 6 位' }, 400);
    const sets = [];
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return response(request, env, { error: '名称不能为空' }, 400);
      sets.push(['name', name]);
    }
    if (body.permissions !== undefined) sets.push(['permissions', JSON.stringify(isOwnerRow ? ['*'] : body.permissions.filter((p) => ADMIN_PERMISSIONS.includes(p)))]);
    if (body.disabled !== undefined && !isOwnerRow) sets.push(['disabled', body.disabled ? 1 : 0]);
    if (body.password !== undefined) {
      const salt = randomToken();
      sets.push(['password_hash', await passwordHash(String(body.password), salt)], ['password_salt', salt]);
    }
    if (sets.length) {
      sets.push(['updated_at', 'CURRENT_TIMESTAMP']);
      await env.DB.prepare(`UPDATE admins SET ${sets.map(([k]) => `${k}=?`).join(',')} WHERE id=?`).bind(...sets.map(([, v]) => v), item.id).run();
    }
    await audit(env, admin.email, 'update', 'admin', String(item.id), JSON.stringify({ email: item.email, name: body.name !== undefined ? String(body.name).trim() : item.name, permissions: body.permissions, disabled: body.disabled }));
    return response(request, env, { ok: true });
  }
  if (adminMatch && request.method === 'DELETE') {
    if (!admin.is_owner) return forbidden();
    const item = await env.DB.prepare(`SELECT * FROM admins WHERE id=?`).bind(Number(adminMatch[1])).first();
    if (!item) return response(request, env, { error: '管理员不存在' }, 404);
    if (Number(item.is_owner) === 1) return response(request, env, { error: '超级管理员不能被删除' }, 400);
    await env.DB.prepare(`DELETE FROM admins WHERE id=?`).bind(item.id).run();
    await audit(env, admin.email, 'delete', 'admin', String(item.id), JSON.stringify({ email: item.email }));
    return response(request, env, { ok: true });
  }
  return response(request, env, { error: 'API route not found' }, 404);
}

export class CanvasRoom {
  constructor(state) {
    this.state = state;
    this.clients = new Map();
  }
  async fetch(request) {
    if (request.headers.get('upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
    const pair = new WebSocketPair(), client = pair[0], server = pair[1], q = new URL(request.url).searchParams, clientId = q.get('cid') || crypto.randomUUID();
    const role = ['owner', 'editor'].includes(request.headers.get('x-emeng-collaboration-role')) ? request.headers.get('x-emeng-collaboration-role') : 'viewer';
    server.accept();
    this.clients.set(server, { id: clientId, userId: String(request.headers.get('x-emeng-collaboration-user') || clientId), name: String(q.get('name') || '访客').slice(0, 24), email: String(q.get('email') || '').slice(0, 120), role, joinedAt: Date.now() });
    const latest = await this.state.storage.get('latestSnapshot');
    if (latest) server.send(JSON.stringify({ type: 'snapshot', snapshot: latest, source: 'room' }));
    this.broadcast({ type: 'presence', members: this.members() });
    server.addEventListener('message', async (event) => {
      if (typeof event.data === 'string' && event.data.length > 2_000_000) return server.close(1009, 'Message too large');
      if (typeof event.data !== 'string') return;
      try {
        const message = JSON.parse(event.data), member = this.clients.get(server);
        if (message.type === 'snapshot') {
          if (!['owner', 'editor'].includes(member?.role)) return server.send(JSON.stringify({ type: 'error', code: 'READ_ONLY', error: '当前成员仅可查看' }));
          if (!message.snapshot) return;
          await this.state.storage.put('latestSnapshot', message.snapshot);
        } else if (message.type === 'presence.update') {
          message.clientId = member.id;
          message.name = member.name;
          message.x = Math.max(0, Math.min(1, Number(message.x) || 0));
          message.y = Math.max(0, Math.min(1, Number(message.y) || 0));
        } else return;
        const data = JSON.stringify(message);
        for (const socket of this.clients.keys()) if (socket !== server && socket.readyState === 1) socket.send(data);
      } catch {}
    });
    const close = () => { this.clients.delete(server); this.broadcast({ type: 'presence', members: this.members() }); };
    server.addEventListener('close', close); server.addEventListener('error', close);
    return new Response(null, { status: 101, webSocket: client });
  }
  members() {
    const accounts = new Map();
    for (const member of this.clients.values()) {
      const account = accounts.get(member.userId) || { id: `u-${member.userId}`, name: member.name, email: member.email, role: member.role, joinedAt: member.joinedAt, clientIds: [] };
      account.joinedAt = Math.min(account.joinedAt, member.joinedAt);
      account.clientIds.push(member.id);
      accounts.set(member.userId, account);
    }
    return [...accounts.values()];
  }
  broadcast(message) { const data = JSON.stringify(message); for (const socket of this.clients.keys()) if (socket.readyState === 1) socket.send(data); }
}

export { authorizeCollaborationRequest, initialize as initializePlatform, topologicalOrder, validateCanvasDocument, runningHubEstimatedCredits };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return api(request, env, url);
    const appShellPaths = new Set(['/', '/admin', '/admin/']);
    if (appShellPaths.has(url.pathname)) {
      const indexUrl = new URL(request.url);
      indexUrl.pathname = '/index.html'; indexUrl.search = '';
      return env.ASSETS.fetch(new Request(indexUrl, request));
    }
    const asset = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get('accept')?.includes('text/html');
    if (asset.status !== 404 || !acceptsHtml || !['GET', 'HEAD'].includes(request.method)) return asset;
    const indexUrl = new URL(request.url);
    indexUrl.pathname = '/index.html'; indexUrl.search = '';
    return env.ASSETS.fetch(new Request(indexUrl, request));
  },
};
