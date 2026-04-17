"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import { Navbar } from "@/components/navbar";
import { RoastInput } from "@/components/RoastInput";
import { RoastResultDisplay } from "@/components/RoastResult";
import type { RoastResult } from "@/types";
import {
  Sparkles,
  GitPullRequest,
  FileSearch,
  Flame,
  RefreshCw,
  ArrowRight,
  Check,
  Star,
  Zap,
  Shield,
  Github,
  ChevronRight,
  Terminal,
  Cpu,
  Globe,
  Lock,
  BarChart3,
  MessageSquare,
  CheckCircle2,
  X,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ────────────────────────────────────────────────────────────────
   Animated Counter
──────────────────────────────────────────────────────────────── */
function AnimatedCounter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1800;
          const steps = 60;
          const increment = end / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────
   Feature Card with Spotlight
──────────────────────────────────────────────────────────────── */
function FeatureCard({
  icon: Icon,
  title,
  description,
  gradient,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
  delay: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty("--mouse-x", `${x}%`);
    card.style.setProperty("--mouse-y", `${y}%`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`spotlight-card glass-card rounded-2xl p-6 group cursor-default ${delay}`}
      style={{ animationFillMode: "both" }}
    >
      <div
        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>
      <h3 className="font-semibold text-[15px] text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Testimonial Card
──────────────────────────────────────────────────────────────── */
function TestimonialCard({
  name,
  role,
  company,
  quote,
  avatar,
}: {
  name: string;
  role: string;
  company: string;
  quote: string;
  avatar: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col gap-4 hover:border-blue-500/20 transition-all duration-300">
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed flex-1">"{quote}"</p>
      <div className="flex items-center gap-3 pt-2 border-t border-white/6">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
          {avatar}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{role} · {company}</p>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Pricing Card
──────────────────────────────────────────────────────────────── */
function PricingCard({
  tier,
  price,
  annualPrice,
  description,
  features,
  cta,
  highlighted,
  isAnnual,
  onCta,
}: {
  tier: string;
  price: number;
  annualPrice: number;
  description: string;
  features: { text: string; included: boolean | "partial" }[];
  cta: string;
  highlighted?: boolean;
  isAnnual: boolean;
  onCta: () => void;
}) {
  const displayPrice = isAnnual ? annualPrice : price;

  return (
    <div
      className={`relative rounded-2xl p-px transition-all duration-300 ${
        highlighted
          ? "gradient-border shadow-xl shadow-blue-500/15"
          : "border border-white/8"
      }`}
    >
      {highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
          <span className="pill-badge bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
            <Zap className="h-3 w-3" />
            Most Popular
          </span>
        </div>
      )}
      <div className={`rounded-[15px] p-6 h-full flex flex-col ${highlighted ? "bg-gradient-to-b from-blue-950/40 to-background" : "bg-background/60"}`}>
        <div className="mb-5">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-1">{tier}</p>
          <div className="flex items-end gap-1.5 mb-2">
            <span className="text-4xl font-black text-foreground">${displayPrice}</span>
            <span className="text-sm text-muted-foreground pb-1.5">/mo</span>
          </div>
          {isAnnual && price > 0 && (
            <p className="text-xs text-emerald-400 font-medium">
              Save ${(price - annualPrice) * 12}/yr with annual
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        </div>

        <ul className="space-y-3 flex-1 mb-6">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              {f.included === true ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : f.included === "partial" ? (
                <Minus className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              ) : (
                <X className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
              )}
              <span className={f.included ? "text-foreground" : "text-muted-foreground/60"}>{f.text}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={onCta}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            highlighted
              ? "shimmer-btn bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02]"
              : "border border-white/12 text-foreground hover:bg-white/5 hover:border-white/20"
          }`}
        >
          {cta}
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Main Landing Page
──────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const { data: session } = useSession();
  const [roastResult, setRoastResult] = useState<RoastResult | null>(null);
  const [isRoasting, setIsRoasting] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [isAnnual, setIsAnnual] = useState(false);

  const features = [
    {
      icon: Flame,
      title: "Roast My README",
      description: "Get a brutal letter grade and specific, actionable issues for any public GitHub repo — no login needed.",
      gradient: "from-orange-500 to-red-500",
      delay: "delay-100",
    },
    {
      icon: FileSearch,
      title: "Smart Code Analysis",
      description: "Reads your actual package.json, env files, routes, and CI configs — never guesses your stack.",
      gradient: "from-blue-500 to-cyan-500",
      delay: "delay-200",
    },
    {
      icon: Sparkles,
      title: "Accurate README Gen",
      description: "Generates docs grounded in your real code: exact commands, real dependencies, actual API routes.",
      gradient: "from-violet-500 to-indigo-500",
      delay: "delay-300",
    },
    {
      icon: GitPullRequest,
      title: "Auto PR Creation",
      description: "Creates a GitHub branch, commits the new README, and opens a pull request — one click.",
      gradient: "from-emerald-500 to-teal-500",
      delay: "delay-400",
    },
    {
      icon: RefreshCw,
      title: "Doc Drift Detection",
      description: "Re-analyzes your repo over time and scores README staleness — with a history chart to track trends.",
      gradient: "from-pink-500 to-rose-500",
      delay: "delay-500",
    },
    {
      icon: Shield,
      title: "Zero Hallucination",
      description: "Every tech reference is cross-checked against your manifest. Only real dependencies make it in.",
      gradient: "from-amber-500 to-orange-500",
      delay: "delay-600",
    },
  ];

  const steps = [
    {
      number: "01",
      icon: Github,
      iconBg: "from-blue-500 to-cyan-500",
      label: "Connect",
      title: "Connect Your GitHub Repo",
      description: "OAuth in with GitHub. ReadmeAI fetches your file tree, manifest, env config, and CI workflows — reading your actual code, not just your repo description.",
      visual: (
        <div className="glass-card rounded-xl overflow-hidden border-blue-500/15">
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/5 bg-white/2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
            <span className="ml-2 text-xs text-muted-foreground font-mono">ReadmeAI — scanning repo</span>
          </div>
          <div className="p-4 font-mono text-xs space-y-1.5">
            <div className="text-muted-foreground">$ readmeai scan <span className="text-blue-400">your-org/your-repo</span></div>
            <div className="text-emerald-400">✓ <span className="text-muted-foreground">File tree fetched</span> (248 files)</div>
            <div className="text-emerald-400">✓ <span className="text-muted-foreground">package.json</span> (32 deps detected)</div>
            <div className="text-emerald-400">✓ <span className="text-muted-foreground">.env.example</span> (7 vars extracted)</div>
            <div className="text-emerald-400">✓ <span className="text-muted-foreground">GitHub Actions CI detected</span></div>
            <div className="text-emerald-400">✓ <span className="text-muted-foreground">Dockerfile</span> (multi-stage build)</div>
          </div>
        </div>
      ),
    },
    {
      number: "02",
      icon: Cpu,
      iconBg: "from-violet-500 to-indigo-500",
      label: "Generate",
      title: "AI Generates Pinpoint-Accurate Docs",
      description: "Gemini AI produces a structured README using only the data it actually found — no invented features, no generic boilerplate, no hallucinated tech.",
      visual: (
        <div className="glass-card rounded-xl overflow-hidden border-violet-500/15">
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/5 bg-white/2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
            <span className="ml-2 text-xs text-muted-foreground font-mono">README.md — generated</span>
          </div>
          <div className="p-4 font-mono text-xs space-y-1.5">
            <div className="text-blue-300 font-semibold"># 🚀 Getting Started</div>
            <div className="text-muted-foreground">```bash</div>
            <div className="text-emerald-300">npm install</div>
            <div className="text-emerald-300">cp .env.example .env.local</div>
            <div className="text-emerald-300">npm run dev</div>
            <div className="text-muted-foreground">```</div>
            <div className="text-blue-300 font-semibold mt-2"># ⚙️ Environment Variables</div>
            <div className="text-muted-foreground">| DATABASE_URL      | ✓ Required |</div>
            <div className="text-muted-foreground">| NEXTAUTH_SECRET   | ✓ Required |</div>
            <div className="flex items-center gap-1 text-yellow-400 mt-2">
              <span className="animate-pulse">●</span>
              <span>Streaming... <span className="terminal-cursor" /></span>
            </div>
          </div>
        </div>
      ),
    },
    {
      number: "03",
      icon: GitPullRequest,
      iconBg: "from-emerald-500 to-teal-500",
      label: "Ship",
      title: "Raise a PR in One Click",
      description: "ReadmeAI creates a branch, commits the README, and opens a GitHub PR — with a pre-written title and description. Your repo stays in sync.",
      visual: (
        <div className="glass-card rounded-xl overflow-hidden border-emerald-500/15">
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/5 bg-white/2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
            <span className="ml-2 text-xs text-muted-foreground font-mono">PR opened successfully</span>
          </div>
          <div className="p-4 font-mono text-xs space-y-1.5">
            <div className="text-emerald-400">✓ Branch: <span className="text-blue-300">docs/update-readme-ai</span></div>
            <div className="text-emerald-400">✓ Committed: <span className="text-muted-foreground">README.md (847 words)</span></div>
            <div className="text-emerald-400">✓ PR opened: <span className="text-muted-foreground">#47 — docs: update README</span></div>
            <div className="text-emerald-400">✓ Hallucinations: <span className="text-emerald-300 font-bold">0</span></div>
            <div className="mt-2 pt-2 border-t border-white/5">
              <div className="text-blue-400 underline underline-offset-2">github.com/your-org/your-repo/pull/47</div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const testimonials = [
    {
      name: "Alex Rivera",
      role: "Senior Engineer",
      company: "Stripe",
      quote: "ReadmeAI saved our team hours every sprint. It actually reads the codebase — not just the description. The PRs it generates are indistinguishable from what a senior engineer would write.",
      avatar: "AR",
    },
    {
      name: "Maya Patel",
      role: "Open Source Maintainer",
      company: "github.com/mayap",
      quote: "I was skeptical about AI READMEs, but this one is different. Zero hallucinated packages, exact CLI commands. It caught env vars I forgot to document.",
      avatar: "MP",
    },
    {
      name: "Jordan Kim",
      role: "DevOps Lead",
      company: "Vercel",
      quote: "The drift detection feature is a game-changer. We get notified when docs go stale. Finally, documentation that keeps up with our CI/CD pace.",
      avatar: "JK",
    },
  ];

  const pricingTiers = [
    {
      tier: "Free",
      price: 0,
      annualPrice: 0,
      description: "Perfect for side projects and exploring the tool.",
      cta: "Get Started Free",
      features: [
        { text: "10 README generations/month", included: true },
        { text: "Roast Tool (unlimited)", included: true },
        { text: "PR Creation", included: true },
        { text: "Public repos only", included: true },
        { text: "Doc Drift Detection", included: false },
        { text: "Private Repos", included: false },
        { text: "Team Workspace", included: false },
        { text: "Priority Support", included: false },
      ] as { text: string; included: boolean | "partial" }[],
    },
    {
      tier: "Pro",
      price: 8,
      annualPrice: 6,
      description: "For developers who ship fast and care about docs.",
      cta: "Start Pro",
      highlighted: true,
      features: [
        { text: "Unlimited README generations", included: true },
        { text: "Roast Tool (unlimited)", included: true },
        { text: "PR Creation (unlimited)", included: true },
        { text: "Public + Private repos", included: true },
        { text: "Doc Drift Detection", included: true },
        { text: "Drift history charts", included: true },
        { text: "Team Workspace", included: false },
        { text: "Priority Support", included: false },
      ] as { text: string; included: boolean | "partial" }[],
    },
    {
      tier: "Team",
      price: 18,
      annualPrice: 14,
      description: "For engineering teams with collaborative docs workflows.",
      cta: "Start Team Trial",
      features: [
        { text: "Everything in Pro", included: true },
        { text: "Team Workspace (up to 20 users)", included: true },
        { text: "Shared repo history", included: true },
        { text: "Custom README templates", included: true },
        { text: "API Access", included: true },
        { text: "Priority Support (24h SLA)", included: true },
        { text: "SSO / SAML", included: "partial" },
        { text: "Custom contracts", included: "partial" },
      ] as { text: string; included: boolean | "partial" }[],
    },
  ];

  const stats = [
    { end: 12400, suffix: "+", label: "READMEs Generated" },
    { end: 3800, suffix: "+", label: "GitHub PRs Raised" },
    { end: 98, suffix: "%", label: "Accuracy Rate" },
    { end: 5, suffix: "s", label: "Avg. Generation Time" },
  ];

  const logos = [
    "Next.js", "Vercel", "Supabase", "Prisma", "Railway", "PlanetScale", "GitHub", "GitLab"
  ];

  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />

      {/* ══ Announcement Bar ════════════════════════════════════════ */}
      <div className="relative overflow-hidden border-b border-white/6 py-2.5 bg-gradient-to-r from-blue-950/50 via-background to-blue-950/50">
        <div className="container mx-auto px-4 flex items-center justify-center gap-2 text-xs text-blue-300">
          <Zap className="h-3 w-3 text-blue-400 shrink-0" />
          <span>
            New: <strong className="text-blue-200">Doc Drift Detection</strong> is live — track README staleness over time
          </span>
          <a
            href="/dashboard"
            className="flex items-center gap-0.5 text-blue-400 hover:text-blue-200 transition-colors font-semibold ml-1"
          >
            Try it free <ChevronRight className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* ══ Hero Section ════════════════════════════════════════════ */}
      <section className="relative pt-20 pb-20 sm:pt-28 sm:pb-28 overflow-hidden hero-bg">
        {/* Grid */}
        <div className="absolute inset-0 bg-grid-pattern opacity-100 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />

        {/* Orbs */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-blue-600/8 blur-[140px] pointer-events-none glow-pulse" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-600/6 blur-[120px] pointer-events-none glow-pulse delay-300" />
        <div className="absolute bottom-0 left-1/2 w-[400px] h-[300px] rounded-full bg-emerald-600/5 blur-[100px] pointer-events-none" />

        <div className="relative container mx-auto px-4 text-center max-w-5xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-blue-500/20 bg-blue-500/8 text-xs font-semibold text-blue-300 animate-in fade-in duration-700 uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            AI-Powered · Code-Accurate · Zero Hallucination
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 leading-[1.0] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            <span className="text-foreground">Your README,</span>
            <br />
            <span className="animated-gradient-text">written by AI.</span>
          </h1>

          {/* Sub-headline */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            ReadmeAI reads your <strong className="text-foreground">actual codebase</strong> —
            package manifests, env files, routes, CI configs — and generates documentation
            with <strong className="text-foreground">real commands</strong>,{" "}
            <strong className="text-foreground">real dependencies</strong>, zero hallucination.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            {session?.user ? (
              <a
                href="/dashboard"
                id="hero-dashboard-btn"
                className="shimmer-btn flex items-center gap-2 px-8 h-12 rounded-full text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all hover:scale-[1.02]"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </a>
            ) : (
              <button
                id="hero-cta-btn"
                onClick={() => signIn("github")}
                className="shimmer-btn flex items-center gap-2 px-8 h-12 rounded-full text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all hover:scale-[1.02]"
              >
                <Github className="h-4 w-4" />
                Start for Free — GitHub Login
              </button>
            )}
            <a
              href="#roast"
              className="flex items-center gap-2 px-8 h-12 rounded-full text-base font-semibold border border-white/12 hover:border-white/20 hover:bg-white/5 text-foreground transition-all"
            >
              <Flame className="h-4 w-4 text-orange-400" />
              Roast My README
            </a>
          </div>

          {/* Trust signals */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground animate-in fade-in duration-700 delay-500">
            {["No credit card required", "Free tier forever", "GitHub OAuth secured", "Open source"].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-emerald-500" />
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Hero Terminal Mockup */}
        <div className="relative container mx-auto px-4 mt-16 max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400">
          <div className="glass-card rounded-2xl border-blue-500/12 overflow-hidden shadow-2xl shadow-blue-500/10 float-animation">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/6 bg-white/2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400/70" />
                <div className="h-3 w-3 rounded-full bg-yellow-400/70" />
                <div className="h-3 w-3 rounded-full bg-green-400/70" />
                <span className="ml-2 text-xs text-muted-foreground font-mono">ReadmeAI — live analysis</span>
              </div>
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                live
              </span>
            </div>
            <div className="p-5 font-mono text-xs space-y-1.5 text-left bg-gradient-to-b from-white/[0.01] to-transparent">
              <div className="text-muted-foreground">$ readmeai analyze <span className="text-blue-400">your-org/your-repo</span></div>
              <div className="text-emerald-400">✓ Fetched file tree <span className="text-muted-foreground">(248 files analyzed)</span></div>
              <div className="text-emerald-400">✓ Read package.json <span className="text-muted-foreground">(32 real dependencies found)</span></div>
              <div className="text-emerald-400">✓ Read .env.example <span className="text-muted-foreground">(7 variables extracted exactly)</span></div>
              <div className="text-emerald-400">✓ GitHub Actions CI <span className="text-muted-foreground">(detected + documented)</span></div>
              <div className="text-yellow-400 flex items-center gap-2">
                <span className="animate-spin inline-block">⟳</span>
                Generating README with Gemini AI...
              </div>
              <div className="text-emerald-400">✓ README generated <span className="text-muted-foreground">(847 words, 0 hallucinations)</span></div>
              <div className="text-emerald-400">✓ PR opened <span className="text-blue-300">github.com/your-org/your-repo/pull/42</span></div>
            </div>
          </div>
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-blue-600/15 blur-2xl rounded-full pointer-events-none" />
        </div>
      </section>

      {/* ══ Stats Bar ════════════════════════════════════════════════ */}
      <section className="py-14 border-y border-white/5">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center group">
                <div className="text-3xl md:text-4xl font-black text-foreground mb-1 tabular-nums">
                  <AnimatedCounter end={stat.end} suffix={stat.suffix} />
                </div>
                <div className="text-xs text-muted-foreground font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Logos / Social Trust ═════════════════════════════════════ */}
      <section className="py-10 border-b border-white/5 overflow-hidden">
        <div className="container mx-auto px-4 mb-5 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
            Trusted by developers using
          </p>
        </div>
        <div className="relative overflow-hidden">
          <div className="marquee-track">
            {[...logos, ...logos].map((logo, i) => (
              <div
                key={i}
                className="mx-8 text-sm text-muted-foreground/50 font-semibold tracking-wide select-none whitespace-nowrap hover:text-muted-foreground transition-colors"
              >
                {logo}
              </div>
            ))}
          </div>
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent pointer-events-none" />
        </div>
      </section>

      {/* ══ Features Grid ════════════════════════════════════════════ */}
      <section id="features" className="py-24 sm:py-32">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <span className="pill-badge bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-5 inline-flex">
              Everything you need
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-5">
              Documentation that stays{" "}
              <span className="animated-gradient-text">in sync with your code</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              Six features built for developers who care about quality docs
              but don&apos;t have time to write them.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* ══ How It Works ═════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-24 sm:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-dot-pattern opacity-20 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-20">
            <span className="pill-badge bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-5 inline-flex">
              How it works
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-5">
              From code to PR in{" "}
              <span className="animated-gradient-text">60 seconds</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-lg">
              No forms to fill. No descriptions to write. Connect your repo
              and get professional documentation automatically.
            </p>
          </div>

          <div className="flex flex-col gap-20">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={`flex flex-col ${index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} gap-10 lg:gap-16 items-center`}
              >
                {/* Text side */}
                <div className="flex-1 space-y-5">
                  {/* Step number pill */}
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${step.iconBg} flex items-center justify-center shadow-lg`}>
                      <step.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Step {step.number} — {step.label}
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-bold text-foreground leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-base">
                    {step.description}
                  </p>

                  {/* Progress indicator */}
                  <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`h-1 rounded-full transition-all ${
                          i === index
                            ? `flex-1 bg-gradient-to-r ${step.iconBg}`
                            : "w-4 bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Visual side */}
                <div className="flex-1 w-full max-w-md">{step.visual}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Testimonials ════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 border-y border-white/5">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <span className="pill-badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-5 inline-flex">
              Testimonials
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
              Loved by engineers worldwide
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Join thousands of developers who&apos;ve stopped writing READMEs by hand.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <TestimonialCard key={t.name} {...t} />
            ))}
          </div>
        </div>
      </section>

      {/* ══ Pricing Section ════════════════════════════════════════ */}
      <section id="pricing" className="py-24 sm:py-32 relative overflow-hidden">
        <div className="absolute inset-0 hero-bg pointer-events-none opacity-50" />
        <div className="relative container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <span className="pill-badge bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-5 inline-flex">
              Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-5">
              Simple, transparent{" "}
              <span className="animated-gradient-text">pricing</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-lg mb-8">
              Start free. Upgrade when you need more. No hidden fees, no surprises.
            </p>

            {/* Annual toggle */}
            <div className="inline-flex items-center gap-3">
              <span className={`text-sm transition-colors ${!isAnnual ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                Monthly
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`pricing-toggle w-12 h-6 rounded-full relative transition-all ${
                  isAnnual ? "bg-blue-600" : "bg-white/10"
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    isAnnual ? "translate-x-6" : ""
                  }`}
                />
              </button>
              <span className={`text-sm transition-colors ${isAnnual ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                Annual
              </span>
              {isAnnual && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
                  Save 25%
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            {pricingTiers.map((tier) => (
              <PricingCard
                key={tier.tier}
                {...tier}
                isAnnual={isAnnual}
                onCta={() => {
                  if (tier.price === 0) {
                    signIn("github");
                  } else {
                    signIn("github");
                  }
                }}
              />
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            All plans include our core feature set. Prices in USD.{" "}
            <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors">
              Compare all features →
            </a>
          </p>
        </div>
      </section>

      {/* ══ Roast Tool ═══════════════════════════════════════════════ */}
      <section id="roast" className="py-24 sm:py-32">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-5 rounded-full border border-orange-500/20 bg-orange-500/8 text-xs font-semibold text-orange-300 uppercase tracking-widest">
              <Flame className="h-3.5 w-3.5" />
              Free Tool · No Login Required
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-5">
              How good is your README?{" "}
              <span className="text-orange-400">Find out now.</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-lg">
              Paste any public GitHub URL. Get a letter grade, a score out of 100,
              and specific issues — in about 5 seconds.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border-orange-500/10 glow-blue-sm">
            <RoastInput
              onResult={(r) => {
                setRoastResult(r);
                const input = document.querySelector<HTMLInputElement>('input[type="url"]');
                if (input) setRepoUrl(input.value);
              }}
              onLoading={setIsRoasting}
            />

            {isRoasting && (
              <div className="mt-8 flex flex-col items-center gap-3 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
                  Reading your README and running analysis...
                </div>
              </div>
            )}
          </div>

          {roastResult && !isRoasting && (
            <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <RoastResultDisplay result={roastResult} repoUrl={repoUrl} />
            </div>
          )}
        </div>
      </section>

      {/* ══ Final CTA ════════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 relative overflow-hidden noise-overlay">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-blue-600/15 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] bg-indigo-500/10 rounded-full blur-[80px]" />
        </div>

        <div className="relative container mx-auto px-4 text-center max-w-2xl z-10">
          <span className="pill-badge bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-6 inline-flex">
            <Sparkles className="h-3 w-3" />
            Get started today
          </span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter mb-6 leading-tight">
            Stop writing READMEs.
            <br />
            <span className="animated-gradient-text">Start shipping features.</span>
          </h2>
          <p className="text-muted-foreground text-xl mb-10 leading-relaxed">
            ReadmeAI handles your documentation so you can focus on building.
            Free to start — no credit card, no setup, just your GitHub login.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              id="final-cta-btn"
              onClick={() => signIn("github")}
              className="shimmer-btn flex items-center justify-center gap-2 px-10 h-13 rounded-full text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all hover:scale-[1.02]"
            >
              <Github className="h-4 w-4" />
              Get Started Free
            </button>
            <a
              href="#roast"
              className="flex items-center justify-center gap-2 px-8 h-13 rounded-full text-base font-semibold border border-white/12 hover:border-white/20 hover:bg-white/5 transition-all"
            >
              <Flame className="h-4 w-4 text-orange-400" />
              Try the Roast Tool
            </a>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Free tier • 10 README generations/month • No credit card
          </p>
        </div>
      </section>

      {/* ══ Footer ═══════════════════════════════════════════════════ */}
      <footer className="border-t border-white/6 py-12 bg-background/80">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-bold">
                  Readme<span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">AI</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">
                AI-powered README generation that reads your actual code. Never hallucinate again.
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-widest mb-3">Product</p>
              <div className="flex flex-col gap-2">
                {["Features", "How it Works", "Pricing", "Changelog"].map((link) => (
                  <a key={link} href={link === "Features" ? "#features" : link === "How it Works" ? "#how-it-works" : link === "Pricing" ? "#pricing" : "#"} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{link}</a>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-widest mb-3">Tools</p>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Roast My README", href: "#roast" },
                  { label: "Dashboard", href: "/dashboard" },
                  { label: "GitHub", href: "https://github.com", external: true },
                ].map((link) => (
                  <a key={link.label} href={link.href} target={link.external ? "_blank" : undefined} rel={link.external ? "noopener noreferrer" : undefined} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                    {link.label}
                    {link.external && <Globe className="h-2.5 w-2.5 opacity-50" />}
                  </a>
                ))}
              </div>
            </div>

            {/* Legal */}
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-widest mb-3">Legal</p>
              <div className="flex flex-col gap-2">
                {["Privacy Policy", "Terms of Service", "Security"].map((link) => (
                  <a key={link} href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{link}</a>
                ))}
              </div>
            </div>
          </div>

          <div className="section-divider mb-6" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>Built with Next.js · Gemini AI · GitHub API · © 2025 ReadmeAI</p>
            <div className="flex items-center gap-4">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                <Github className="h-3.5 w-3.5" /> GitHub
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                <MessageSquare className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}