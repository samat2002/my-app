"use client";

import { Button, Card } from "antd";
import Link from "next/link";
import LogoutButton from "@components/logout-button";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-3 sm:p-6 md:p-8">
      <Card
        className="w-full max-w-4xl shadow-md rounded-2xl border-0 overflow-hidden"
        title={
          <div className="flex items-center gap-2 py-1">
            <span className="text-lg sm:text-xl font-bold text-gray-800">Dashboard</span>
          </div>
        }
        extra={<LogoutButton />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 p-1 sm:p-4">
          <Card
            hoverable
            className="w-full rounded-xl border border-gray-100 hover:border-blue-400 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col items-center text-center p-2 sm:p-4"
          >
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 flex items-center justify-center overflow-hidden rounded-xl bg-gray-100 shadow-inner">
                <img
                  src="/joystick.png"
                  alt="Score Tracker"
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
              <div className="flex flex-col items-center gap-1">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 m-0">Score Tracker</h3>
                <p className="text-xs sm:text-sm text-gray-500 m-0">
                  Track multiplayer scores and view leaderboards
                </p>
              </div>
              <Button type="primary" size="large" className="w-full sm:w-auto px-6 font-medium mt-1">
                <Link href="/score-tracker" className="block w-full">Go to Score Tracker</Link>
              </Button>
            </div>
          </Card>

          <Card
            hoverable
            className="w-full rounded-xl border border-gray-100 hover:border-blue-400 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col items-center text-center p-2 sm:p-4"
          >
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 flex items-center justify-center overflow-hidden rounded-xl bg-gray-100 shadow-inner">
                <img
                  src="/lala.jpg"
                  alt="Image Gallery"
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
              <div className="flex flex-col items-center gap-1">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 m-0">Image Gallery</h3>
                <p className="text-xs sm:text-sm text-gray-500 m-0">
                  Browse Discord detached images stored in Supabase
                </p>
              </div>
              <Button type="primary" size="large" className="w-full sm:w-auto px-6 font-medium mt-1">
                <Link href="/images" className="block w-full">Go to Image Gallery</Link>
              </Button>
            </div>
          </Card>
        </div>
      </Card>
    </div>
  );
}
