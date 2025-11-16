import { Button } from "@/components/ui/button"

export default function TeamsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">My Teams</h1>
      <p className="text-muted-foreground mb-6">
        Manage your teams or create a new one.
      </p>
      <Button>Create Team</Button>
      <div className="mt-6 border p-4 rounded bg-muted/50">
        <p>[TODO: List user’s teams from Supabase]</p>
      </div>
    </div>
  )
}
