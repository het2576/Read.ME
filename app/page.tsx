import { Navbar } from "@/components/navbar";
import { ReadmeGenerator } from "@/components/readme-generator";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <ReadmeGenerator />
      </div>
    </main>
  );
}