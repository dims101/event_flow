import React from 'react';
import DashboardHeader from './_components/DashboardHeader';
import RoomList from './_components/RoomList';
import { getRoomsAction } from '@/app/actions/room';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const rooms = await getRoomsAction();

  return (
    <div className="space-y-6">
      <DashboardHeader />
      <RoomList initialRooms={rooms} />
    </div>
  );
}
