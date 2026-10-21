import {
  createHmac,
  randomBytes,
  timingSafeEqual
} from 'node:crypto';

import {
  validateMember,
  validateComment,
  validatePayment
} from '../src/shared.js';

// La sesión dura 90 días y se renueva al usar el administrador.
const SESSION_MAX_AGE = 90 * 24 * 60 * 60;

const ENV = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ADMIN_USER',
  'ADMIN_PASSWORD',
  'SESSION_SECRET'
];

function configuration() {
  const count = ENV.filter(key => process.env[key]).length;

  if (!count) return 'demo';

  const missing = ENV.filter(key => !process.env[key]);
  const invalid = [];

  if (
    process.env.SUPABASE_URL &&
    !/^https:\/\//.test(process.env.SUPABASE_URL)
  ) {
    invalid.push('SUPABASE_URL (debe comenzar con https://)');
  }

  if (
    process.env.ADMIN_PASSWORD &&
    process.env.ADMIN_PASSWORD.length < 12
  ) {
    invalid.push('ADMIN_PASSWORD (mínimo 12 caracteres)');
  }

  if (
    process.env.SESSION_SECRET &&
    process.env.SESSION_SECRET.length < 32
  ) {
    invalid.push('SESSION_SECRET (mínimo 32 caracteres)');
  }

  if (missing.length || invalid.length) {
    const details = [
      ...(missing.length
        ? [`faltan: ${missing.join(', ')}`]
        : []),
      ...(invalid.length
        ? [`revisar: ${invalid.join(', ')}`]
        : [])
    ].join('; ');

    const error = new Error(
      `Configuración incompleta en el servidor (${details}). ` +
      'Revisa las variables de entorno de Vercel.'
    );

    error.status = 503;
    throw error;
  }

  return 'cloud';
}

const sign = text =>
  createHmac('sha256', process.env.SESSION_SECRET)
    .update(text)
    .digest('base64url');

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));

  return x.length === y.length && timingSafeEqual(x, y);
};

export function authenticated(req) {
  try {
    const token = (req.headers.cookie || '')
      .split(';')
      .map(value => value.trim())
      .find(value => value.startsWith('iron_session='))
      ?.slice(13);

    if (!token) return false;

    const [payload, signature, extra] = token.split('.');

    if (
      extra ||
      !signature ||
      !safeEqual(sign(payload), signature)
    ) {
      return false;
    }

    const value = JSON.parse(
      Buffer.from(payload, 'base64url').toString()
    );

    const now = Date.now();

    return (
      value.user === process.env.ADMIN_USER &&
      Number.isSafeInteger(value.exp) &&
      value.exp > now &&
      value.exp <= now + SESSION_MAX_AGE * 1000 + 60000
    );
  } catch {
    return false;
  }
}

function cookie(req, value, maxAge) {
  const secure =
    process.env.VERCEL ||
    req.headers['x-forwarded-proto'] === 'https';

  return (
    `iron_session=${value}; Path=/; HttpOnly; ` +
    `SameSite=Strict; Max-Age=${maxAge}` +
    (secure ? '; Secure' : '')
  );
}

function renewSession(req, res) {
  const payload = Buffer.from(
    JSON.stringify({
      user: process.env.ADMIN_USER,
      exp: Date.now() + SESSION_MAX_AGE * 1000,
      nonce: randomBytes(12).toString('hex')
    })
  ).toString('base64url');

  res.setHeader(
    'Set-Cookie',
    cookie(
      req,
      payload + '.' + sign(payload),
      SESSION_MAX_AGE
    )
  );
}

async function db(path, { method = 'GET', body } = {}) {
  const response = await fetch(
    process.env.SUPABASE_URL.replace(/\/$/, '') +
      '/rest/v1/' +
      path,
    {
      method,
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization:
          'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(12000)
    }
  );

  if (!response.ok) {
    const error = new Error(
      'No se pudo acceder a los registros. Verifica la conexión ' +
      'y que se haya ejecutado database.sql.'
    );

    error.status = 503;
    throw error;
  }

  const content = await response.text();
  return content ? JSON.parse(content) : null;
}

async function budget(req, kind, max) {
  const ip = String(
    req.headers['x-vercel-forwarded-for'] ||
    req.headers['x-forwarded-for'] ||
    req.socket?.remoteAddress ||
    'local'
  )
    .split(',')[0]
    .trim();

  const key = sign(kind + ':' + ip);

  const allowed = await db('rpc/iron_take_budget', {
    method: 'POST',
    body: {
      p_key: key,
      p_limit: max,
      p_seconds: 900
    }
  });

  if (!allowed) {
    const error = new Error(
      'Demasiados intentos. Espera 15 minutos antes de volver a intentar.'
    );

    error.status = 429;
    throw error;
  }
}

const validId = value =>
  Number.isSafeInteger(Number(value)) &&
  Number(value) > 0 &&
  Number(value) < 1e12;

function requireMethod(req, allowed) {
  if (!allowed.includes(req.method)) {
    const error = new Error('Método no permitido.');
    error.status = 405;
    throw error;
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  try {
    const mode = configuration();

    const action =
      req.query?.action ||
      new URL(req.url, 'http://localhost')
        .searchParams.get('action');

    // CONFIGURACIÓN
    if (action === 'config') {
      requireMethod(req, ['GET']);
      return res.status(200).json({ mode });
    }

    if (mode !== 'cloud') {
      return res.status(503).json({
        error: 'Esta instalación está en modo de demostración local.'
      });
    }

    // VALIDACIÓN DEL ORIGEN Y FORMATO
    if (!['GET', 'HEAD'].includes(req.method)) {
      const origin = req.headers.origin;

      const expected =
        process.env.APP_ORIGIN ||
        (
          (process.env.VERCEL ? 'https' : 'http') +
          '://' +
          req.headers.host
        );

      if (origin && origin !== expected) {
        return res.status(403).json({
          error: 'Origen no autorizado.'
        });
      }

      if (req.headers['sec-fetch-site'] === 'cross-site') {
        return res.status(403).json({
          error: 'Origen no autorizado.'
        });
      }

      if (
        !(req.headers['content-type'] || '')
          .includes('application/json')
      ) {
        return res.status(415).json({
          error: 'Se requiere JSON.'
        });
      }
    }

    // CONSULTAR Y RENOVAR SESIÓN
    if (action === 'session') {
      requireMethod(req, ['GET']);

      const isAuthenticated = authenticated(req);

      if (isAuthenticated) {
        renewSession(req, res);
      }

      return res.status(200).json({
        authenticated: isAuthenticated
      });
    }

    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body)
        : req.body || {};

    if (JSON.stringify(body).length > 16000) {
      return res.status(413).json({
        error: 'Solicitud demasiado grande.'
      });
    }

    // INICIAR SESIÓN
    if (action === 'login') {
      requireMethod(req, ['POST']);
      await budget(req, 'login', 12);

      if (
        !safeEqual(body.user, process.env.ADMIN_USER) ||
        !safeEqual(body.password, process.env.ADMIN_PASSWORD)
      ) {
        return res.status(401).json({
          error: 'Usuario o contraseña incorrectos.'
        });
      }

      renewSession(req, res);

      return res.status(200).json({ ok: true });
    }

    // CERRAR SESIÓN
    if (action === 'logout') {
      requireMethod(req, ['POST']);

      res.setHeader(
        'Set-Cookie',
        cookie(req, '', 0)
      );

      return res.status(200).json({ ok: true });
    }

    // CONSULTA PÚBLICA DE MEMBRESÍA
    if (action === 'lookup') {
      requireMethod(req, ['POST']);
      await budget(req, 'lookup', 30);

      if (
        typeof body.name !== 'string' ||
        body.name.trim().length < 3 ||
        body.name.length > 100
      ) {
        return res.status(400).json({
          error: 'Escribe tu nombre completo.'
        });
      }

      const result = await db('rpc/iron_lookup_name', {
        method: 'POST',
        body: {
          p_name: body.name.trim()
        }
      });

      if (!result?.length) {
        return res.status(404).json({
          error:
            'No encontramos tu membresía. Escribe tu nombre completo ' +
            'como lo registraste en recepción.'
        });
      }

      if (result.length > 1) {
        return res.status(409).json({
          error:
            'Hay más de un registro con ese nombre. Acércate a ' +
            'recepción para identificar tu membresía.'
        });
      }

      return res.status(200).json(result[0]);
    }

    // ENVIAR COMENTARIO DESDE LA PÁGINA PÚBLICA
    if (action === 'comments' && req.method === 'POST') {
      await budget(req, 'comments', 5);

      let fields;

      try {
        fields = validateComment(body);
      } catch (error) {
        return res.status(400).json({
          error: error.message
        });
      }

      await db('iron_comments', {
        method: 'POST',
        body: fields
      });

      return res.status(201).json({ ok: true });
    }

    // LAS SIGUIENTES OPERACIONES REQUIEREN SESIÓN
    if (!authenticated(req)) {
      return res.status(401).json({
        error: 'Inicia sesión para administrar los miembros.'
      });
    }

    // Mantener vigente la sesión mientras se utiliza el panel.
    renewSession(req, res);

    // PAGOS
    if (action === 'payments') {
      requireMethod(req, ['GET', 'POST']);

      if (req.method === 'GET') {
        const rows = [];
        let offset = 0;

        while (true) {
          const page = await db(
            'iron_payments?select=*&order=created_at.desc' +
            `&limit=500&offset=${offset}`
          );

          rows.push(...page);

          if (page.length < 500) break;
          offset += 500;
        }

        return res.status(200).json(rows);
      }

      let fields;

      try {
        fields = validatePayment(body);
      } catch (error) {
        return res.status(400).json({
          error: error.message
        });
      }

      const result = await db('rpc/iron_record_payment', {
        method: 'POST',
        body: {
          p_id: fields.id,
          p_member: fields.member_id,
          p_amount: fields.amount,
          p_method: fields.method,
          p_start: fields.start,
          p_months: fields.months
        }
      });

      return res.status(200).json(result);
    }

    // ADMINISTRAR COMENTARIOS
    if (action === 'comments') {
      requireMethod(req, ['GET', 'PATCH', 'DELETE']);

      if (req.method === 'GET') {
        const rows = [];
        let offset = 0;

        while (true) {
          const page = await db(
            'iron_comments?select=*&order=created_at.desc' +
            `&limit=500&offset=${offset}`
          );

          rows.push(...page);

          if (page.length < 500) break;
          offset += 500;
        }

        return res.status(200).json(rows);
      }

      if (!validId(body.id)) {
        return res.status(400).json({
          error: 'Comentario inválido.'
        });
      }

      const result = await db(
        'iron_comments?id=eq.' + Number(body.id),
        req.method === 'DELETE'
          ? { method: 'DELETE' }
          : {
              method: 'PATCH',
              body: { reviewed: true }
            }
      );

      if (!result?.length) {
        return res.status(404).json({
          error: 'No encontramos el comentario.'
        });
      }

      return res.status(200).json({ ok: true });
    }

    // MIEMBROS
    if (action !== 'members') {
      return res.status(404).json({
        error: 'Ruta no encontrada.'
      });
    }

    requireMethod(req, ['GET', 'POST', 'PATCH', 'DELETE']);

    // LISTAR MIEMBROS
    if (req.method === 'GET') {
      const rows = [];
      let offset = 0;

      while (true) {
        const page = await db(
          'iron_members?select=*&order=id.desc' +
          `&limit=500&offset=${offset}`
        );

        rows.push(...page);

        if (page.length < 500) break;
        offset += 500;
      }

      return res.status(200).json(rows);
    }

    // ELIMINAR MIEMBRO
    if (req.method === 'DELETE') {
      if (!validId(body.id)) {
        return res.status(400).json({
          error: 'Número de miembro inválido.'
        });
      }

      const result = await db(
        'iron_members?id=eq.' + Number(body.id),
        { method: 'DELETE' }
      );

      if (!result?.length) {
        return res.status(404).json({
          error: 'Este miembro ya no existe.'
        });
      }

      return res.status(200).json({ ok: true });
    }

    // VALIDAR DATOS PARA CREAR O EDITAR
    let member;

    try {
      member = validateMember(body);
    } catch (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    let result;

    if (req.method === 'PATCH') {
      // EDITAR MIEMBRO
      if (!validId(body.id)) {
        return res.status(400).json({
          error: 'Número de miembro inválido.'
        });
      }

      const previous = await db(
        'iron_members?id=eq.' +
        Number(body.id) +
        '&select=start,months,paid_until'
      );

      if (previous?.length) {
        member.paid_until =
          previous[0].start === member.start &&
          previous[0].months === member.months
            ? previous[0].paid_until
            : null;
      }

      result = await db(
        'iron_members?id=eq.' + Number(body.id),
        {
          method: 'PATCH',
          body: member
        }
      );

      if (!result?.length) {
        return res.status(404).json({
          error: 'Este miembro ya no existe.'
        });
      }
    } else {
      // CREAR MIEMBRO
      result = await db('iron_members', {
        method: 'POST',
        body: {
          ...member,
          access_code: randomBytes(10)
            .toString('hex')
            .toUpperCase()
        }
      });
    }

    return res
      .status(req.method === 'POST' ? 201 : 200)
      .json(result[0]);

  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.status
        ? error.message
        : 'No se pudo completar la solicitud. Inténtalo de nuevo.'
    });
  }
}