import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const ALLOWED_DOMAIN = 'ueberseehub.de';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') return false;
      const email = (profile as any)?.email ?? '';
      // Nur @ueberseehub.de erlaubt
      return email.endsWith(`@${ALLOWED_DOMAIN}`);
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    signIn:  '/login',
    error:   '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
