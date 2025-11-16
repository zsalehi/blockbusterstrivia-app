import Link from "next/link"
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu"
import { Button } from "@/components/ui/button"

export default function Navbar() {
  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-2xl font-bold">
          BlockBusters Trivia
        </Link>
        <NavigationMenu>
          <NavigationMenuList className="space-x-4">
            <NavigationMenuItem>
              <Link href="/competitions" className="text-sm font-medium hover:underline">
                Competitions
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/teams" className="text-sm font-medium hover:underline">
                Teams
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/profile" className="text-sm font-medium hover:underline">
                Profile
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        <Button asChild>
          <Link href="/login">Login</Link>
        </Button>
      </div>
    </nav>
  )
}
