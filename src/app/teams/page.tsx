import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createTeam } from './actions'
import { revalidatePath } from 'next/cache'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default async function TeamsPage() {
   const supabase = await createSupabaseServerClient() // 👈 await

  // get user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return <p className="text-center mt-10">Please log in to view your teams.</p>
  }

  // fetch teams where this user is a member
  const { data: teams, error } = await supabase
    .from('v_my_teams')
    .select('team_id, team_name, competition_id, role')
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  // simple form action handler wrapper
  async function handleCreate(formData: FormData) {
    'use server'
    await createTeam(formData)
    revalidatePath('/teams')
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <section>
        <h1 className="text-3xl font-bold mb-2">My Teams</h1>
        {teams?.length ? (
          <ul className="space-y-2">
            {teams.map((t) => (
              <li key={t.team_id} className="border rounded p-3">
                <p className="font-semibold">{t.team_name}</p>
                <p className="text-sm text-muted-foreground">
                  Competition: {t.competition_id} • Role: {t.role}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">You’re not on any teams yet.</p>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-2">Create a Team</h2>
        <form action={handleCreate} className="flex flex-col gap-3">
          <Input name="name" placeholder="Team name" required />
          {/* Hardcode one competition for now; later use a select populated from DB */}
          <input
            type="hidden"
            name="competition_id"
            value="3799de97-a02e-4c59-be72-a33663768f7b"
          />
          <Button type="submit">Create Team</Button>
        </form>
      </section>
    </div>
  )
}
