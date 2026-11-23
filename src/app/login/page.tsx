import type { Metadata } from 'next'
import { safeNext } from '@/lib/safe-next'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Log in' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams

  return (
    <div className="max-w-md mx-auto mt-16 space-y-4 text-center px-4">
      <h1 className="text-2xl font-bold">Log in to BlockBusters Trivia</h1>
      <p className="text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a one-time login link. No password needed.
      </p>
      <LoginForm
        next={safeNext(next)}
        initialError={error ? 'That login link is invalid or has expired. Please request a new one.' : undefined}
      />
    </div>
  )
}
