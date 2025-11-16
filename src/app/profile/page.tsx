import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function ProfilePage() {
  return (
    <div className="max-w-lg">
      <h1 className="text-3xl font-bold mb-4">My Profile</h1>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <Input placeholder="Enter your name" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Handle</label>
          <Input placeholder="@yourhandle" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Avatar</label>
          <Input type="file" accept="image/*" />
        </div>
        <Button type="submit">Save Changes</Button>
      </form>
    </div>
  )
}

