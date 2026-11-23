import { Resend } from "resend"
import nodemailer, { type Transporter } from "nodemailer"

const FROM = process.env.EMAIL_FROM ?? "BlockBusters <noreply@blockbusterstrivia.com>"

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

const FONT_BODY = "Barlow,Helvetica,Arial,sans-serif"
const FONT_HEAD = "'Bebas Neue',Impact,'Arial Narrow',Arial,sans-serif"

// Email clients can't load our web fonts, so headings fall back to Impact/Arial Narrow; the logo carries the brand.
export function emailShell(opts: { heading: string; preheader?: string; content: string; footer?: string }): string {
  const origin = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "")
  const footer = opts.footer ? `<p style="margin:0 0 8px">${escapeHtml(opts.footer)}</p>` : ""
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:#eef1f5">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#eef1f5">${escapeHtml(opts.preheader ?? opts.heading)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden">
    <tr><td align="center" style="background:#121923;padding:24px 20px">
      <img src="${escapeHtml(origin)}/blockbusters-logo.png" width="170" alt="BlockBusters Trivia Competition" style="display:block;width:170px;max-width:100%;height:auto;border:0">
    </td></tr>
    <tr><td style="font-size:0;line-height:0;height:4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="50%" style="background:#d85545;height:4px;line-height:4px;font-size:0">&nbsp;</td><td width="50%" style="background:#3481b5;height:4px;line-height:4px;font-size:0">&nbsp;</td></tr></table></td></tr>
    <tr><td style="padding:32px 32px 28px;font-family:${FONT_BODY};font-size:16px;line-height:1.55;color:#243141">
      <h1 style="margin:0 0 16px;font-family:${FONT_HEAD};font-size:30px;line-height:1.15;font-weight:400;letter-spacing:0.03em;text-transform:uppercase;color:#121923">${escapeHtml(opts.heading)}</h1>
      ${opts.content}
    </td></tr>
    <tr><td style="padding:20px 32px 26px;background:#f7f8fa;border-top:1px solid #e3e7ed;font-family:${FONT_BODY};font-size:13px;line-height:1.5;color:#5b6b7c">
      ${footer}
      <p style="margin:0">BlockBusters Trivia Competition &middot; Toronto, Ontario<br><a href="mailto:info@blockbusterstrivia.com" style="color:#3481b5">info@blockbusterstrivia.com</a></p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`
}

export function emailLayout(
  heading: string,
  body: string,
  buttonLabel: string,
  url: string,
  opts: { note?: string; preheader?: string } = {}
): string {
  const safeUrl = escapeHtml(url)
  return emailShell({
    heading,
    preheader: opts.preheader ?? body,
    footer: opts.note,
    content: `
      <p style="margin:0 0 24px">${escapeHtml(body)}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px"><tr><td align="center" bgcolor="#d85545" style="border-radius:8px">
        <a href="${safeUrl}" style="display:inline-block;padding:14px 28px;font-family:${FONT_BODY};font-size:18px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px">${escapeHtml(buttonLabel)}</a>
      </td></tr></table>
      <p style="margin:0;font-size:13px;color:#5b6b7c">Button not working? Copy this link into your browser:<br><a href="${safeUrl}" style="color:#3481b5;word-break:break-all">${safeUrl}</a></p>`,
  })
}

function htmlToText(html: string): string {
  return html
    .replace(/<(style|head|title)[\s\S]*?<\/\1>/gi, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, text) => (text.trim() === href ? href : `${text} (${href})`))
    .replace(/<\/(p|h1|h2|tr|div)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&middot;/g, "·")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

type Message = { to: string; subject: string; html: string }

let smtp: Transporter | undefined
function smtpTransport() {
  if (smtp) return smtp
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, SMTP_USER } = process.env
  if (GOOGLE_REFRESH_TOKEN) {
    // Google Workspace via OAuth: no app password needed. SMTP_USER is the mailbox that authorised the token.
    return (smtp = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { type: "OAuth2", user: SMTP_USER, clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, refreshToken: GOOGLE_REFRESH_TOKEN },
    }))
  }
  const port = Number(process.env.SMTP_PORT ?? 587)
  return (smtp = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  }))
}

// Provider is chosen by env: GOOGLE_REFRESH_TOKEN or SMTP_HOST (any SMTP service), else RESEND_API_KEY, else console (dev / private network).
export async function sendEmail(opts: Message): Promise<void> {
  if (process.env.SMTP_HOST || process.env.GOOGLE_REFRESH_TOKEN) {
    await smtpTransport().sendMail({ from: FROM, ...opts, text: htmlToText(opts.html) })
    return
  }
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // EMAIL_CONSOLE=true is for trying the site on a private network: links go to the container log.
    if (process.env.NODE_ENV === "production" && process.env.EMAIL_CONSOLE !== "true") {
      throw new Error("No email provider configured (set SMTP_HOST or RESEND_API_KEY)")
    }
    console.log(`[email:dev] to=${opts.to} subject=${opts.subject}\n${opts.html}`)
    return
  }
  const resend = new Resend(apiKey)
  for (let attempt = 1; ; attempt++) {
    const { error } = await resend.emails.send({ from: FROM, ...opts, text: htmlToText(opts.html) })
    if (!error) return
    const rateLimited = error.statusCode === 429 || /rate_limit/i.test(error.name)
    if (!rateLimited || attempt >= 5) throw new Error(`Email send failed: ${error.message}`)
    await new Promise((r) => setTimeout(r, Math.min(8000, 750 * 2 ** (attempt - 1))))
  }
}

// Providers rate-limit (Resend ~2 requests/second), so bulk sends are spaced out. Failures are logged, not thrown.
export async function sendEmailsPaced(
  messages: Message[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0
  for (const [i, m] of messages.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 600))
    try {
      await sendEmail(m)
      sent++
    } catch (err) {
      failed++
      console.error(`email to ${m.to} failed:`, err instanceof Error ? err.message : err)
    }
  }
  return { sent, failed }
}
