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
const genAI = new GoogleGenerativeAI('AIzaSyBTPDPyWIgIt5RABwrFYn8RAYFZ1uOCD-I');

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
    readmeContent += `## Description\n\n${description}\n\n`;

    if (features) {
      readmeContent += `## Features\n\n${features
        .split("\n")
        .map((feature) => `- ${feature}`)
        .join("\n")}\n\n`;
    }

    if (techStack) {
      readmeContent += `## Tech Stack\n\n${techStack
        .split("\n")
        .map((tech) => `- ${tech}`)
        .join("\n")}\n\n`;
    }

    if (installation) {
      readmeContent += `## Installation\n\n\`\`\`bash\n${installation}\n\`\`\`\n\n`;
    }

    if (usage) {
      readmeContent += `## Usage\n\n${usage}\n\n`;
    }

    if (license) {
      readmeContent += `## License\n\n${license}\n\n`;
    }

    if (contribution) {
      readmeContent += `## Contributing\n\n${contribution}\n\n`;
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
1. Title (Project Name)
2. Description
3. Features (as bullet points)
4. Tech Stack (as bullet points)
5. Installation (with code blocks for commands)
6. Usage
7. License
8. Contributing
9. Acknowledgments

Please format the README using proper Markdown syntax.`;

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header Section */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-1 mb-3 rounded-full bg-primary/10">
          <Badge variant="outline" className="px-3 py-1 text-xs font-medium bg-background">
            README Generator Tool
          </Badge>
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
          Create Professional{" "}
          <span className="text-primary relative">
            README Files
            <span className="absolute -bottom-1 left-0 w-full h-1 bg-primary/30 rounded-full"></span>
          </span>
        </h1>
        <p className="text-muted-foreground md:text-lg max-w-2xl mx-auto leading-relaxed">
          Generate beautiful, structured README.md files for your GitHub projects with 
          our powerful AI-assisted tools.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-12 space-y-6">
          <Card className="border-0 shadow-md bg-card/50 backdrop-blur-sm">
            <CardContent className="p-0">
              <Tabs defaultValue="form" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="border-b">
                  <div className="px-6 pt-4">
                    <TabsList className="grid w-full grid-cols-2 gap-4 h-12">
                      <TabsTrigger 
                        value="form" 
                        className="text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Editor
                      </TabsTrigger>
                      <TabsTrigger 
                        value="preview" 
                        className="text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        <Github className="w-4 h-4 mr-2" />
                        Preview
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </div>
                
                {/* Form Tab */}
                <TabsContent value="form" className="animate-in fade-in-50 duration-300 space-y-6 p-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold tracking-tight">README Information</h2>
                    <p className="text-muted-foreground">Fill in the details below to generate your README file.</p>
                  </div>
                
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(generateReadme)}
                      className="space-y-8"
                    >
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* Project Information Section */}
                        <Card className="border border-border/40 shadow-sm overflow-hidden">
                          <CardHeader className="bg-muted/50 pb-3 border-b border-border/40">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Code2 className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-xl">Project Information</CardTitle>
                                <CardDescription>
                                  Define the core details of your project
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-5 pt-5">
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
                                      className="rounded-md h-11 focus-visible:ring-primary"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">Description</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="A brief description of your project"
                                      className="min-h-[120px] rounded-md resize-none focus-visible:ring-primary"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
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
                                      <SelectTrigger className="h-11 rounded-md focus-visible:ring-primary">
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
                                    This helps AI generate better suggestions
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </CardContent>
                        </Card>

                        {/* Features Section */}
                        <Card className="border border-border/40 shadow-sm overflow-hidden">
                          <CardHeader className="bg-muted/50 pb-3 border-b border-border/40">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-xl">Features & Tech Stack</CardTitle>
                                <CardDescription>
                                  What makes your project special
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-5 pt-5">
                            <FormField
                              control={form.control}
                              name="features"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">Features</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="List your project features (one per line)"
                                      className="min-h-[120px] rounded-md resize-none focus-visible:ring-primary"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormDescription className="text-xs">
                                    Enter one feature per line for proper formatting
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="techStack"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">Tech Stack</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="List technologies used (one per line)"
                                      className="min-h-[120px] rounded-md resize-none focus-visible:ring-primary"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormDescription className="text-xs">
                                    Enter one technology per line for bullet points
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </CardContent>
                        </Card>

                        {/* Setup Section */}
                        <Card className="border border-border/40 shadow-sm overflow-hidden">
                          <CardHeader className="bg-muted/50 pb-3 border-b border-border/40">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Code2 className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-xl">Setup & Usage</CardTitle>
                                <CardDescription>
                                  How to install and use your project
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-5 pt-5">
                            <FormField
                              control={form.control}
                              name="installation"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">Installation</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="npm install my-package"
                                      className="min-h-[120px] rounded-md resize-none focus-visible:ring-primary"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormDescription className="text-xs">
                                    Installation commands or steps (will be formatted as code)
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="usage"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">Usage</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="How to use your project"
                                      className="min-h-[120px] rounded-md resize-none focus-visible:ring-primary"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </CardContent>
                        </Card>

                        {/* Additional Info Section */}
                        <Card className="border border-border/40 shadow-sm overflow-hidden">
                          <CardHeader className="bg-muted/50 pb-3 border-b border-border/40">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-xl">Additional Information</CardTitle>
                                <CardDescription>
                                  License and contribution guidelines
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-5 pt-5">
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
                                      <SelectTrigger className="h-11 rounded-md focus-visible:ring-primary">
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
                            <FormField
                              control={form.control}
                              name="contribution"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">Contribution Guidelines</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="How others can contribute to your project"
                                      className="min-h-[120px] rounded-md resize-none focus-visible:ring-primary"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </CardContent>
                        </Card>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button 
                          type="submit" 
                          size="lg"
                          className="w-full sm:w-auto text-base font-medium rounded-md transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                        >
                          <FileText className="mr-2 h-5 w-5" />
                          Generate README
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="lg"
                          className="w-full sm:w-auto text-base font-medium rounded-md transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                          onClick={generateAIReadme}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Generating with AI...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-5 w-5" />
                              AI-Powered Generation
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </TabsContent>
                
                {/* Preview Tab */}
                <TabsContent value="preview" className="animate-in fade-in-50 duration-300 p-0">
                  <div className="p-6 border-b">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h2 className="text-2xl font-semibold tracking-tight">README Preview</h2>
                        <p className="text-muted-foreground text-sm">
                          Preview how your README will look on GitHub
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyToClipboard}
                          disabled={!markdown}
                          className="flex-1 sm:flex-none h-10 rounded-md transition-all duration-200 hover:bg-muted"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Markdown
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadReadme}
                          disabled={!markdown}
                          className="flex-1 sm:flex-none h-10 rounded-md transition-all duration-200 hover:bg-muted"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download README
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {markdown ? (
                    <div className="bg-card/50 p-6 border-t border-border/40">
                      <ScrollArea className="h-[calc(100vh-380px)] min-h-[400px] rounded-md">
                        <div className="github-markdown px-4">
                          <div
                            className="prose prose-slate dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: marked(markdown),
                            }}
                          />
                        </div>
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                      <div className="rounded-full bg-primary/10 p-3 mb-4">
                        <FileText className="h-10 w-10 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">No README Preview</h3>
                      <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
                        Fill out the form and generate a README to see how it will appear in your GitHub repository
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveTab("form")} 
                        className="flex items-center transition-all duration-200"
                      >
                        Go to Editor
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Bottom Feature Badges */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
        <Badge variant="outline" className="px-3 py-1.5 text-xs font-medium bg-background/80 backdrop-blur-sm">
          <span className="mr-1.5 text-primary">✓</span> Professional Format
        </Badge>
        <Badge variant="outline" className="px-3 py-1.5 text-xs font-medium bg-background/80 backdrop-blur-sm">
          <span className="mr-1.5 text-primary">✓</span> Markdown Support
        </Badge>
        <Badge variant="outline" className="px-3 py-1.5 text-xs font-medium bg-background/80 backdrop-blur-sm">
          <span className="mr-1.5 text-primary">✓</span> AI-Powered
        </Badge>
        <Badge variant="outline" className="px-3 py-1.5 text-xs font-medium bg-background/80 backdrop-blur-sm">
          <span className="mr-1.5 text-primary">✓</span> Multiple Project Types
        </Badge>
        <Badge variant="outline" className="px-3 py-1.5 text-xs font-medium bg-background/80 backdrop-blur-sm">
          <span className="mr-1.5 text-primary">✓</span> Easy Export
        </Badge>
      </div>
    </div>
  );
}