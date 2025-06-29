import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { connectMongo } from '@/lib/mongodb';
import { Users, IUser } from '@/models/Users';

const ADMINS = ["ziyadmowafy@gmail.com","y.aldhafeeri@z-adv.com"];

export const {
  auth,
  handlers,
  signIn,
  signOut,
} = NextAuth({
  pages: {
    signIn: '/login',
    newUser: '/',
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {

    async jwt({ token, trigger, session }) {
      if (!token.email) {
        return token;
      }

      await connectMongo();

      if (ADMINS.includes(token.email)) {
        token.role = 'admin';

        await Users.findOneAndUpdate(
          { email: token.email }, // Find by email
          {
            $set: {
              name: token.name,
              image: token.picture,
              role: 'admin'
            },
            $setOnInsert: {
              email: token.email,
            }
          },
          {
            upsert: true,
            new: true
          }
        );

        return token;
      }


      if (trigger === 'update' && session?.role) {
        token.role = session.role;
        return token;
      }

      const userInDb = await Users.findOne({ email: token.email }).lean<IUser>();
      if (userInDb) {
        token.role = userInDb.role;
      } else {
        token.role = null;
      }

      return token;
    },

    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as 'admin' | 'manager' | 'murasel' | null;
      }
      return session;
    },
  },
});