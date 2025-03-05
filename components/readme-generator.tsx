"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { marked } from "marked";
import { 
  Copy, 
  Download, 
  Sparkles, 
  FileText, 
  Loader2, 
  ChevronRight,
  Github,
  Code2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

// Configure marked for better rendering
marked.setOptions({
  gfm: true,
  breaks: true,
  pedantic: false,
  silent: true
});

// Custom renderer to enhance typography and structure
const renderer = new marked.Renderer();

// Enhance heading styles
renderer.heading = function(text: string, level: number) {
  const escapedText = text
    .toLowerCase()
    .replace(/[^\w]+/g, '-');
  
  const headingClasses: Record<number, string> = {
    1: 'text-3xl font-bold mt-6 mb-4 pb-2 border-b',
    2: 'text-2xl font-semibold mt-5 mb-3',
    3: 'text-xl font-medium mt-4 mb-2',
    4: 'text-lg font-medium mt-3 mb-2',
    5: 'text-base font-medium mt-2 mb-1',
    6: 'text-sm font-medium mt-2 mb-1'
  };
  
  return `<h${level} id="${escapedText}" class="${headingClasses[level] || ''}">${text}</h${level}>`;
};

// Enhance code blocks
renderer.code = function(code: string, language?: string) {
  return `<div class="relative rounded-md my-4 overflow-hidden">
    <div class="bg-muted/80 text-xs px-3 py-1 border-b">${language || 'code'}</div>
    <pre class="p-4 overflow-x-auto bg-muted/50 text-sm font-mono leading-relaxed"><code class="language-${language || ''}">${code}</code></pre>
  </div>`;
};

// Enhance list items
renderer.listitem = function(text: string) {
  return `<li class="ml-2 mb-1">${text}</li>`;
};

// Enhance paragraphs
renderer.paragraph = function(text: string) {
  return `<p class="mb-4 leading-relaxed">${text}</p>`;
};

// Enhance links
renderer.link = function(href: string, title: string, text: string) {
  return `<a href="${href}" title="${title || ''}" class="text-primary underline hover:no-underline" target="_blank" rel="noopener noreferrer">${text}</a>`;
};

// Apply custom renderer
marked.use({ renderer });

const formSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  description: z.string().min(1, "Description is required"),
  features: z.string().optional(),
  installation: z.string().optional(),
  techStack: z.string().optional(),
  usage: z.string().optional(),
  license: z.string().optional(),
  contribution: z.string().optional(),
  projectType: z.string().optional(),
});

export function ReadmeGenerator() {
  const [markdown, setMarkdown] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("form");
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectName: "",
      description: "",
      features: "",
      installation: "",
      techStack: "",
      usage: "",
      license: "MIT",
      contribution: "",
      projectType: "web",
    },
  });

  // Auto-switch to preview tab when README is generated
  useEffect(() => {
    if (markdown && activeTab === "form") {
      setActiveTab("preview");
    }
  }, [markdown]);

  const generateReadme = (values: z.infer<typeof formSchema>) => {
    const { 
      projectName, 
      description, 
      features, 
      installation, 
      techStack, 
      usage, 
      license, 
      contribution 
    } = values;

    let readmeContent = `# ${projectName}\n\n`;
    
    // Add license badge if license is selected
    if (license && license !== 'None') {
      const licenseBadges: Record<string, string> = {
        'MIT': '[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)',
        'Apache-2.0': '[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)',
        'GPL-3.0': '[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)',
        'BSD-3-Clause': '[![License](https://img.shields.io/badge/License-BSD_3--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)'
      };
      
      if (licenseBadges[license]) {
        readmeContent += `${licenseBadges[license]}\n\n`;
      }
    }

    readmeContent += `## Description\n\n${description}\n\n`;

    if (features) {
      readmeContent += `## Features\n\n${features
        .split("\n")
        .map((feature) => `* ${feature.trim()}`)
        .join("\n")}\n\n`;
    }

    if (techStack) {
      readmeContent += `## Tech Stack\n\n${techStack
        .split("\n")
        .map((tech) => `* ${tech.trim()}`)
        .join("\n")}\n\n`;
    }

    if (installation) {
      readmeContent += `## Installation\n\n\`\`\`bash\n${installation}\n\`\`\`\n\n`;
    }

    if (usage) {
      readmeContent += `## Usage\n\n${usage}\n\n`;
    }

    if (license) {
      readmeContent += `## License\n\n${license === 'None' ? 'This project is not licensed.' : `This project is licensed under the ${license} License.`}\n\n`;
    }

    if (contribution) {
      readmeContent += `## Contributing\n\n${contribution}\n\n`;
    }
    
    // Add table of contents for longer READMEs
    if ((features && features.length > 0) || 
        (techStack && techStack.length > 0) || 
        installation || 
        usage || 
        license || 
        contribution) {
      let tocContent = "## Table of Contents\n\n";
      tocContent += "- [Description](#description)\n";
      if (features) tocContent += "- [Features](#features)\n";
      if (techStack) tocContent += "- [Tech Stack](#tech-stack)\n";
      if (installation) tocContent += "- [Installation](#installation)\n";
      if (usage) tocContent += "- [Usage](#usage)\n";
      if (license) tocContent += "- [License](#license)\n";
      if (contribution) tocContent += "- [Contributing](#contributing)\n";
      
      // Insert TOC after the description
      const descEnd = readmeContent.indexOf('## Features') > -1 
        ? readmeContent.indexOf('## Features') 
        : readmeContent.length;
      
      readmeContent = readmeContent.substring(0, descEnd) + tocContent + readmeContent.substring(descEnd);
    }

    setMarkdown(readmeContent);
    toast({
      title: "README Generated!",
      description: "Your README has been created successfully.",
    });
  };

  const generateAIReadme = async () => {
    setIsGenerating(true);
    try {
      const values = form.getValues();
      
      if (!values.projectName || !values.description) {
        toast({
          title: "Missing Information",
          description: "Project name and description are required.",
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }

      // Create the prompt for Gemini
      const prompt = `Generate a professional README.md file for a GitHub project with the following details:
    
Project Name: ${values.projectName}
Project Type: ${values.projectType || 'web application'}
Description: ${values.description}
Features: ${values.features || 'Not specified'}
Tech Stack: ${values.techStack || 'Not specified'}
Installation: ${values.installation || 'Not specified'}
Usage: ${values.usage || 'Not specified'}
License: ${values.license || 'MIT'}
Contribution Guidelines: ${values.contribution || 'Not specified'}

The README should include the following sections:
1. Title (Project Name) with a badge for the license if specified
2. Description
3. Table of Contents with links to each section
4. Features (as bullet points with asterisks, not numbers)
5. Tech Stack (as bullet points with asterisks, not numbers)
6. Installation (with code blocks for commands using triple backticks and the bash language indicator)
7. Usage with clear paragraphs and proper line breaks
8. License
9. Contributing
10. Acknowledgments if appropriate

Use proper Markdown syntax with correct spacing between sections. 
Format code blocks properly with triple backticks and language indicators.
Use asterisks for bullet points, not dashes or numbers.
Ensure each section has a clear ## heading.
Include blank lines between sections and between paragraphs.
For the description and other text areas, use proper formatting including *italics* or **bold** where appropriate.`;

      // Generate content using Gemini Flash
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const readmeContent = response.text();
      
      setMarkdown(readmeContent);
      toast({
        title: "README Generated!",
        description: "Gemini AI has created a README based on your inputs.",
      });
      setActiveTab("preview");
    } catch (error) {
      console.error("Error generating README:", error);
      toast({
        title: "Error",
        description: "Failed to generate README. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(markdown);
    toast({
      title: "Copied!",
      description: "README copied to clipboard.",
    });
  };

  const downloadReadme = () => {
    const element = document.createElement("a");
    const file = new Blob([markdown], { type: "text/markdown" });
    element.href = URL.createObjectURL(file);
    element.download = "README.md";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast({
      title: "Downloaded!",
      description: "README.md file has been downloaded.",
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-in fade-in duration-500">
      {/* Hero Section */}
      <section className="mb-10 text-center space-y-4">
        <div className="inline-flex items-center justify-center p-1.5 px-3 mb-2 border rounded-full text-sm font-medium bg-muted/50">
          <Badge variant="outline" className="mr-1 bg-primary/10 hover:bg-primary/20">NEW</Badge>
          <span>AI-powered README generator for developers</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
          Create Professional README Files
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Generate beautiful, structured README.md files for your GitHub projects with our Gemini AI-powered tool.
        </p>

        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <Button 
            variant="default" 
            className="gap-2 font-semibold"
            onClick={() => setActiveTab("form")}
          >
            Get Started <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="gap-2">
            <Github className="h-4 w-4" /> View Example
          </Button>
        </div>
      </section>

      {/* Main Content Tabs */}
      <Tabs 
        defaultValue="form" 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <Card className="border shadow-md mb-8">
          <CardHeader className="pb-2 border-b">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl">README Generator</CardTitle>
              <TabsList className="grid w-full max-w-[300px] grid-cols-2">
                <TabsTrigger value="form" className="text-sm font-medium">
                  <FileText className="h-4 w-4 mr-2" /> Editor
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-sm font-medium">
                  <Code2 className="h-4 w-4 mr-2" /> Preview
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>

          <CardContent className="pt-6 px-0 sm:px-6">
            <TabsContent value="form" className="animate-in fade-in-50 duration-300 mt-0">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(generateReadme)} className="space-y-8">
                  {/* Project Basics Section */}
                  <section className="space-y-6">
                    <div className="px-6">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <div className="bg-primary/10 p-1.5 rounded-md mr-2">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        Project Basics
                      </h2>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6">
                      {/* Project Name */}
                      <FormField
                        control={form.control}
                        name="projectName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Project Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="My Awesome Project" 
                                {...field} 
                                className="focus-visible:ring-1 text-base"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Project Type */}
                      <FormField
                        control={form.control}
                        name="projectType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Project Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="focus-visible:ring-1 text-base">
                                  <SelectValue placeholder="Select project type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="web">Web Application</SelectItem>
                                <SelectItem value="mobile">Mobile App</SelectItem>
                                <SelectItem value="library">Library/Package</SelectItem>
                                <SelectItem value="api">API/Backend</SelectItem>
                                <SelectItem value="cli">CLI Tool</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-xs">
                              Used to optimize AI suggestions
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Description */}
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem className="lg:col-span-2">
                            <FormLabel className="text-base font-medium">Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="A brief description of your project"
                                className="min-h-[120px] focus-visible:ring-1 text-base"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </section>
                  
                  <Separator />
                  
                  {/* Features & Tech Stack Section */}
                  <section className="space-y-6">
                    <div className="px-6">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <div className="bg-primary/10 p-1.5 rounded-md mr-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                        </div>
                        Features & Tech Stack
                      </h2>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6">
                      {/* Features */}
                      <FormField
                        control={form.control}
                        name="features"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Features</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="List your project features (one per line)"
                                className="min-h-[150px] focus-visible:ring-1 text-base"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              Enter one feature per line for better formatting
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Tech Stack */}
                      <FormField
                        control={form.control}
                        name="techStack"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Tech Stack</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="List technologies used (one per line)"
                                className="min-h-[150px] focus-visible:ring-1 text-base"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              Enter one technology per line for better formatting
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </section>
                  
                  <Separator />
                  
                  {/* Installation & Usage Section */}
                  <section className="space-y-6">
                    <div className="px-6">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <div className="bg-primary/10 p-1.5 rounded-md mr-2">
                          <Code2 className="h-4 w-4 text-primary" />
                        </div>
                        Installation & Usage
                      </h2>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6">
                      {/* Installation */}
                      <FormField
                        control={form.control}
                        name="installation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Installation</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="npm install my-package"
                                className="min-h-[120px] focus-visible:ring-1 text-base font-mono text-sm leading-relaxed"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              Add installation commands (will be formatted as code)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Usage */}
                      <FormField
                        control={form.control}
                        name="usage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Usage</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="How to use your project"
                                className="min-h-[120px] focus-visible:ring-1 text-base"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </section>
                  
                  <Separator />
                  
                  {/* Additional Info Section */}
                  <section className="space-y-6">
                    <div className="px-6">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <div className="bg-primary/10 p-1.5 rounded-md mr-2">
                          <Github className="h-4 w-4 text-primary" />
                        </div>
                        Additional Information
                      </h2>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6">
                      {/* License */}
                      <FormField
                        control={form.control}
                        name="license"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">License</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="focus-visible:ring-1 text-base">
                                  <SelectValue placeholder="Select a license" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="MIT">MIT</SelectItem>
                                <SelectItem value="Apache-2.0">Apache 2.0</SelectItem>
                                <SelectItem value="GPL-3.0">GPL 3.0</SelectItem>
                                <SelectItem value="BSD-3-Clause">BSD 3-Clause</SelectItem>
                                <SelectItem value="None">None</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Contribution */}
                      <FormField
                        control={form.control}
                        name="contribution"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Contribution Guidelines</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="How others can contribute to your project"
                                className="min-h-[120px] focus-visible:ring-1 text-base"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </section>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center sticky bottom-0 bg-background pb-4 pt-2 px-6 border-t">
                    <Button 
                      type="submit" 
                      size="lg"
                      className="w-full sm:w-auto text-base"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Generate README
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      className="w-full sm:w-auto text-base"
                      onClick={generateAIReadme}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating with AI...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate with AI
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="preview" className="animate-in fade-in-50 duration-300 mt-0">
              <div className="relative">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-6 mb-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold">README Preview</h2>
                    <p className="text-muted-foreground text-sm">
                      Preview how your README will look on GitHub
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                      disabled={!markdown}
                      className="flex-1 md:flex-none"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy to Clipboard
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadReadme}
                      disabled={!markdown}
                      className="flex-1 md:flex-none"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download README
                    </Button>
                  </div>
                </div>
                
                <Separator className="mb-6" />
                
                <div className="rounded-md border bg-card md:mx-6">
                  {markdown ? (
                    <div className="p-6">
                      <ScrollArea className="h-[60vh] pr-4">
                        <div
                          className="readme-preview prose dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: marked(markdown),
                          }}
                        />
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                      <div className="bg-primary/10 p-3 rounded-full mb-4">
                        <FileText className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">No Preview Available</h3>
                      <p className="text-muted-foreground text-center max-w-md mb-6">
                        Fill out the form and generate a README to see the preview here
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveTab("form")} 
                      >
                        Go to Editor
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
      
      {/* Add global styling for markdown rendering */}
      <style jsx global>{`
        .readme-preview h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid hsl(var(--border));
        }
        
        .readme-preview h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
          padding-bottom: 0.25rem;
        }
        
        .readme-preview h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.75rem;
        }
        
        .readme-preview p {
          margin-bottom: 1rem;
          line-height: 1.65;
        }
        
        .readme-preview ul {
          margin-top: 0.5rem;
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }
        
        .readme-preview ul li {
          margin-bottom: 0.5rem;
          list-style-type: disc;
        }
        
        .readme-preview code {
          font-family: monospace;
          background-color: hsl(var(--muted));
          padding: 0.25rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
        }
        
        .readme-preview pre {
          background-color: hsl(var(--muted));
          border-radius: 0.5rem;
          padding: 1rem;
          margin: 1rem 0;
          overflow-x: auto;
        }
        
        .readme-preview pre code {
          background-color: transparent;
          padding: 0;
          font-family: monospace;
          font-size: 0.875rem;
          line-height: 1.7;
        }
        
        .readme-preview a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
        
        .readme-preview a:hover {
          text-decoration: none;
        }
        
        .readme-preview blockquote {
          border-left: 4px solid hsl(var(--primary));
          padding-left: 1rem;
          margin-left: 0;
          margin-right: 0;
          font-style: italic;
          margin-bottom: 1rem;
        }
        
        .readme-preview img {
          max-width: 100%;
          height: auto;
          border-radius: 0.25rem;
        }
        
        .readme-preview hr {
          margin: 1.5rem 0;
          border: 0;
          height: 1px;
          background-color: hsl(var(--border));
        }
      `}</style>
    </div>
  );
}