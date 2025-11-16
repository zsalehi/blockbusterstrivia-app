import { Button } from "@/components/ui/button"

export default function CompetitionDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Competition {params.id}</h1>
      <p className="text-muted-foreground mb-6">Details about the selected competition.</p>

      <Button>Register Team</Button>
    </div>
  )
}
