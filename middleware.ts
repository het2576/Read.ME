// /middleware.ts — Protect authenticated routes
// Redirects unauthenticated users to sign-in for /dashboard and /repo/*

export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/dashboard/:path*', '/repo/:path*'],
};
