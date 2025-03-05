import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API with the provided API key
const genAI = new GoogleGenerativeAI('AIzaSyBTPDPyWIgIt5RABwrFYn8RAYFZ1uOCD-I');

export async function POST(request: Request) {
  try {
    const { projectName, description, features, installation, techStack, usage, license, contribution, projectType } = await request.json();

    // Create a prompt for Gemini
    const prompt = `Generate a professional README.md file for a GitHub project with the following details:
    
Project Name: ${projectName}
Project Type: ${projectType || 'web application'}
Description: ${description}
Features: ${features || 'Not specified'}
Tech Stack: ${techStack || 'Not specified'}
Installation: ${installation || 'Not specified'}
Usage: ${usage || 'Not specified'}
License: ${license || 'MIT'}
Contribution Guidelines: ${contribution || 'Not specified'}

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

    try {
      // For production use, use the actual Gemini API
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const readmeContent = response.text();
      
      return NextResponse.json({ readme: readmeContent });
    } catch (apiError) {
      console.error('Error calling Gemini API:', apiError);
      
      // Fallback response in case of API error
      const fallbackReadme = `# ${projectName}

## Description

${description}

## Features

${features ? features.split('\n').map(f => `- ${f}`).join('\n') : `- Feature 1: Amazing functionality
- Feature 2: Intuitive user interface
- Feature 3: High performance
- Feature 4: Cross-platform compatibility`}

## Tech Stack

${techStack ? techStack.split('\n').map(t => `- ${t}`).join('\n') : `- React.js
- Node.js
- MongoDB
- Express
- TypeScript`}

## Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/username/${projectName.toLowerCase().replace(/\s+/g, '-')}.git

# Navigate to the project directory
cd ${projectName.toLowerCase().replace(/\s+/g, '-')}

# Install dependencies
npm install

# Start the development server
npm run dev
\`\`\`

## Usage

${usage || `1. Configure your environment variables in \`.env\` file
2. Run the application using \`npm start\`
3. Access the application at \`http://localhost:3000\`

For API documentation, visit \`/api/docs\` endpoint.`}

## License

This project is licensed under the ${license || 'MIT'} License - see the LICENSE file for details.

## Contributing

${contribution || `Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request`}

## Acknowledgments

- Hat tip to anyone whose code was used
- Inspiration
- etc.
`;
      
      return NextResponse.json({ readme: fallbackReadme });
    }
  } catch (error) {
    console.error('Error generating README:', error);
    return NextResponse.json(
      { error: 'Failed to generate README', details: JSON.stringify(error) },
      { status: 500 }
    );
  }
}