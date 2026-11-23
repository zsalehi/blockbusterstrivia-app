import { betterAuth } from "better-auth"
import { magicLink } from "better-auth/plugins"
import { nextCookies } from "better-auth/next-js"
import { pool } from "./db"
import { emailLayout, sendEmail } from "./email"
import { siteUrl } from "./site-url"

export const auth = betterAuth({
  baseURL: siteUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  database: pool,
  advanced: { database: { generateId: "uuid" } },
  session: { expiresIn: 60 * 60 * 24 * 15, updateAge: 60 * 60 * 24 },
  plugins: [
    magicLink({
      expiresIn: 60 * 15,
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({
          to: email,
          subject: "Your BlockBusters login link",
          html: emailLayout(
            "Log in to BlockBusters Trivia",
            "Click the button below to log in. This link expires in 15 minutes and works once.",
            "Log in",
            url,
            { note: "If you didn’t ask for this email, you can safely ignore it. Nobody can log in without this link." }
          ),
        })
      },
    }),
    nextCookies(),
  ],
})
