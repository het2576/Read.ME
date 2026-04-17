import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-provider';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'ReadmeAI — AI-Powered README Generator for GitHub Repos',
  description:
    'ReadmeAI reads your actual code, generates accurate documentation, and raises GitHub PRs automatically. Stop writing READMEs by hand. Roast your README, analyze repos, and keep docs in sync with your codebase.',
  verification: {
    google: "bzQo-VVsJyeO0w3l3ZeqDzDdGQP2by80bzeaZhFmHGk",
  },
  openGraph: {
    title: 'ReadmeAI — AI-Powered README Generator',
    description:
      'ReadmeAI reads your code, writes your docs, and tells you when they break — automatically.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReadmeAI — AI-Powered README Generator',
    description: 'Generate accurate, professional READMEs from your real codebase. Free to try.',
  },
  keywords: ['readme generator', 'ai documentation', 'github readme', 'auto readme', 'readme ai'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
