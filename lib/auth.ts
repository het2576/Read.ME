// /lib/auth.ts — Shared NextAuth configuration
// Exported so getServerSession() in API routes can access the same config

import type { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import { upsertUser } from '@/db/queries';

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'read:user user:email repo',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // On initial sign-in, store the access token and GitHub profile
      if (account && profile) {
        token.accessToken = account.access_token;
        token.githubId = String((profile as Record<string, unknown>).id || '');
        token.githubUsername =
          ((profile as Record<string, unknown>).login as string) || '';
        token.githubAvatar =
          ((profile as Record<string, unknown>).avatar_url as string) || '';
      }
      return token;
    },

    async session({ session, token }) {
      // Expose access token and GitHub info in the session
      if (session.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = session as any;
        s.accessToken = token.accessToken;
        s.user.githubId = token.githubId;
        s.user.githubUsername = token.githubUsername;
        s.user.image = token.githubAvatar;
      }
      return session;
    },

    async signIn({ account, profile }) {
      // Upsert user to Supabase on each sign-in
      if (account && profile) {
        try {
          await upsertUser({
            github_id: String((profile as Record<string, unknown>).id || ''),
            github_username:
              ((profile as Record<string, unknown>).login as string) || '',
            github_avatar:
              ((profile as Record<string, unknown>).avatar_url as string) || '',
            email:
              ((profile as Record<string, unknown>).email as string) || null,
            access_token: account.access_token || '',
          });
        } catch (error) {
          console.error('Failed to upsert user:', error);
          // Don't block sign-in on DB failure
        }
      }
      return true;
    },
  },
  pages: {
    signIn: '/', // Redirect to landing page for sign-in
  },
  secret: process.env.NEXTAUTH_SECRET,
};
