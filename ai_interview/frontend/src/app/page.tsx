import ProblemPane from '@/components/ProblemPane';
import CodeEditorPane from '@/components/CodeEditorPane';
import VoiceAIWidget from '@/components/VoiceAIWidget';

export default function Home() {
  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* Left Pane - Problem Details */}
      <div className="w-1/2 border-r border-gray-200 dark:border-gray-700">
        <ProblemPane />
      </div>
      
      {/* Right Pane - Code Editor */}
      <div className="w-1/2">
        <CodeEditorPane />
      </div>
      
      {/* Floating Voice AI Widget */}
      <VoiceAIWidget />
    </div>
  );
}
