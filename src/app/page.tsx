import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function HomePage() {
  return (
    <><section className="flex flex-col items-center justify-center text-center py-20">
      <h1 className="text-4xl font-bold mb-4">Welcome to BlockBusters Trivia</h1>
      <p className="text-muted-foreground mb-6">
        Compete in tournaments, form teams, and prove your trivia skills!
      </p>
      <Button asChild>
        <Link href="/competitions">View Competitions</Link>
      </Button>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-2">Join Competitions</h2>
            <p>Register solo or as a team for our latest trivia tournaments.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-2">Build Your Team</h2>
            <p>Invite your friends, choose a name, and show off your trivia power.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-2">Win Prizes</h2>
            <p>Top teams win exclusive BlockBusters merch and bragging rights!</p>
          </CardContent>
        </Card>
      </div>
    </section><div className="p-6 rounded-lg bg-blue-500 text-white text-xl">
        Tailwind is working 🎉
      </div></>
  
  )
}
