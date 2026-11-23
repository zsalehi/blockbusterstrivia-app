import { Resend } from "resend"

const FROM = process.env.EMAIL_FROM ?? "BlockBusters <noreply@blockbusterstrivia.com>"

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function emailLayout(heading: string, body: string, buttonLabel: string, url: string): string {
  const safeUrl = escapeHtml(url)
  return `
    <div style="font-family:Inter,system-ui,Arial,sans-serif;max-width:480px;margin:0 auto;color:#121923">
      <h2 style="margin:0 0 12px">${escapeHtml(heading)}</h2>
      <p style="margin:0 0 20px">${escapeHtml(body)}</p>
      <p style="margin:0 0 20px"><a href="${safeUrl}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#d85545;color:#fff;text-decoration:none;font-weight:600">${escapeHtml(buttonLabel)}</a></p>
      <p style="margin:0;font-size:13px;color:#5b6b7c">Or copy this link into your browser:<br>${safeUrl}</p>
    </div>`
}

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY is not configured")
    console.log(`[email:dev] to=${opts.to} subject=${opts.subject}\n${opts.html}`)
    return
  }
  const { error } = await new Resend(apiKey).emails.send({ from: FROM, ...opts })
  if (error) throw new Error(`Email send failed: ${error.message}`)
}
