// POST /api/contact
// Receives {name, email, purpose} from the site's form and emails it to CONTACT_TO.
// Delivery: Resend when RESEND_API_KEY is set, otherwise FormSubmit's JSON endpoint.
// The destination address lives only in the environment, never in the page.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(v, max) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
}

async function sendViaResend({ to, from, subject, text, replyTo }) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], reply_to: replyTo, subject, text }),
  });
  if (!r.ok) throw new Error('resend ' + r.status + ' ' + (await r.text()));
}

async function sendViaFormSubmit({ to, name, email, purpose, subject }) {
  const r = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(to), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      name,
      email,
      message: purpose,
      _subject: subject,
      _replyto: email,
      _template: 'table',
      _captcha: 'false',
    }),
  });
  let j = {};
  try { j = await r.json(); } catch (e) { /* non-JSON reply */ }
  if (!r.ok || String(j.success) !== 'true') {
    throw new Error('formsubmit ' + r.status + ' ' + JSON.stringify(j));
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const purpose = String(body.purpose == null ? '' : body.purpose).trim().slice(0, 4000);
  const trap = clean(body.website, 50); // honeypot, hidden from people

  if (trap) return res.status(200).json({ ok: true });
  if (!name || !email || !purpose) {
    return res.status(400).json({ ok: false, error: 'Please fill in your name, your email and what you are working on.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: 'That email address does not look right.' });
  }

  const to = process.env.CONTACT_TO;
  if (!to) return res.status(503).json({ ok: false, error: 'The form is not set up yet. Please try again later.' });

  const subject = 'Free episode request from ' + name;
  const text = 'Name: ' + name + '\nEmail: ' + email + '\n\n' + purpose + '\n\nSent from physicaldata.tech';

  try {
    if (process.env.RESEND_API_KEY) {
      await sendViaResend({
        to,
        from: process.env.CONTACT_FROM || 'Physical Data <onboarding@resend.dev>',
        subject,
        text,
        replyTo: email,
      });
    } else {
      await sendViaFormSubmit({ to, name, email, purpose, subject });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact form delivery failed:', err && err.message);
    return res.status(502).json({ ok: false, error: 'Could not send right now. Please try again in a minute.' });
  }
};
