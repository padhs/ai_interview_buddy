# AI Interview Buddy - Frontend

A modern, responsive frontend for the AI Interview Buddy application built with Next.js 15, TypeScript, and Tailwind CSS.

## Features

### Layout
- **Two-pane layout**: Problem details on the left, code editor on the right
- **Responsive design**: Optimized for desktop coding environments
- **Dark/Light mode**: Automatic theme switching based on system preferences

### Left Pane - Problem Details
- **Problem header**: ID, title, and difficulty badge
- **Scrollable content**: Description, examples, constraints, and follow-up questions
- **Syntax highlighting**: Code examples with proper formatting
- **Interactive elements**: Hover effects and smooth transitions

### Right Pane - Code Editor
- **Monaco Editor**: Full-featured code editor with syntax highlighting
- **Language support**: JavaScript, TypeScript, Python, Java, C++, C#, Go, Rust
- **Action buttons**: Run and Submit functionality with loading states
- **Language selector**: Easy switching between programming languages

### Voice AI Widget
- **Floating widget**: Bottom-right corner positioning
- **Interactive states**: Active/inactive with visual feedback
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Smooth animations**: Hover effects and state transitions

## Tech Stack

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Monaco Editor**: VS Code editor component
- **Geist Fonts**: Modern typography

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── app/
│   ├── globals.css      # Global styles and theme
│   ├── layout.tsx       # Root layout component
│   └── page.tsx         # Main page component
└── components/
    ├── ProblemPane.tsx      # Left pane with problem details
    ├── CodeEditorPane.tsx   # Right pane with Monaco editor
    └── VoiceAIWidget.tsx    # Floating voice AI widget
```

## Component Details

### ProblemPane
- Displays coding problem information
- Includes mock data for demonstration
- Scrollable content area for long problems
- Responsive design with proper spacing

### CodeEditorPane
- Integrates Monaco Editor for code editing
- Language selection dropdown
- Run and Submit buttons with loading states
- Default code templates for each language

### VoiceAIWidget
- Floating action button for voice AI
- Visual feedback for active/listening states
- Tooltip for better UX
- Accessible design with proper focus management

## Future Enhancements

- [ ] Real-time code execution
- [ ] Test case validation
- [ ] Progress tracking
- [ ] User authentication
- [ ] Problem database integration
- [ ] Voice AI functionality
- [ ] Collaborative features
- [ ] Performance analytics
