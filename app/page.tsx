import { Button, Card } from "antd";
import Link from "next/link";
import LogoutButton from "@components/logout-button";

export default function Home() {
  return (
    <Card
      title="Dashboard"
      extra={<LogoutButton />}
    >
      <div className="flex justify-evenly gap-4">
        <Card>
          <div className="flex flex-col items-center gap-4">
            <img src="/joystick.png" alt="Score Tracker" className="w-64 h-64 object-cover" />
            <Button type="primary">
              <Link href="/score-tracker">Go to Score Tracker</Link>
            </Button>
          </div>
        </Card>
        <Card>
          <div className="flex flex-col items-center gap-4">
            <img src="/lala.jpg" alt="Image Gallery" className="w-64 h-64 object-cover" />
            <Button type="primary">
              <Link href="/images">Go to Image Gallery</Link>
            </Button>
          </div>
        </Card>
      </div>
    </Card>
  )
}
