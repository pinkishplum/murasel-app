'use client';

import { useSession } from 'next-auth/react';
import Image from 'next/image';

type User = {
  name: string;
  image: string;
};

export default function UserInfoBar() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return null;
  }

  if (!session || !session.user) {
    return null;
  }

  const user = session.user as User;


  return (
    <div className="flex items-center justify-end pt-2.5 space-x-2">
      <p className="text-1xl text-black">{user.name}</p>

      {user.image && (
        <Image
          src={user.image}
          alt="User Profile"
          width={30}
          height={30}
          className="rounded-full object-cover"
        />
      )}
    </div>
  );
}
