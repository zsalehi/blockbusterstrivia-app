import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function createSupabaseServerClient() {
  // Next.js 16: cookies() is async
  const cookieStore = await cookies()

    return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // ✅ NEW cookie API (non-deprecated): only getAll + setAll
      cookies: {
        getAll() {
          // Next returns { name, value }[]
          return cookieStore.getAll().map(c => ({ name: c.name, value: c.value }))
        },
        setAll(items: SetAllItem[]) {
          try {
            for (const { name, value, options } of items) {
              cookieStore.set({ name, value, ...options })
            }
          } catch {
            // cookies() can be read-only in parts of server actions; ignore safely
          }
        },
      },
      // (optional) cookieOptions if you need custom names/attrs
      // cookieOptions: { name: 'sb', domain: undefined, path: '/', sameSite: 'lax' }
    }
  )
}