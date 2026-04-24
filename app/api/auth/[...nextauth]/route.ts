'use server';
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const ALLOWED_DOMAIN = 'ueberseehub.de';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      // NextAuth reads GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET automatically,
      // but we also support NEXT_PUBLIC_ prefix for AWS Amplify
      clientId:     (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID)!,
      clientSecret: (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET)!,
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') return false;
      const email = (profile as any)?.email ?? '';
      return email.endsWith(`@${ALLOWED_DOMAIN}`);
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error:  '/login',
  },
  // NEXTAUTH_SECRET must NOT have NEXT_PUBLIC_ prefix — NextAuth reads it internally
  // In Vercel: set NEXTAUTH_SECRET (without prefix)
  // In AWS Amplify: set both NEXTAUTH_SECRET and NEXT_PUBLIC_NEXTAUTH_SECRET
  secret: process.env.NEXTAUTH_SECRET ?? process.env.NEXT_PUBLIC_NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
