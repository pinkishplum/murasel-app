// types/next-auth.d.ts (Corrected)

import 'next-auth';
import { DefaultSession } from 'next-auth';

type UserRole = 'admin' | 'manager' | 'murasel';

declare module 'next-auth' {
  /**
   * Extends the built-in session to include the 'role' property.
   */
  interface Session {
    user: {
      /** The user's role. Can be null for new users. */
      role: UserRole | null;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  /** Extends the JWT to include the 'role' property. */
  interface JWT {
    /** The user's role. Can be null for new users. */
    role: UserRole;
  }
}