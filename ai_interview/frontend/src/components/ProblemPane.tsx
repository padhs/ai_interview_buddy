'use client';

interface Problem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  constraints: string[];
  followUp?: string;
}

// Mock data for demonstration
const mockProblem: Problem = {
  id: "1",
  title: "Two Sum",
  difficulty: "Easy",
  description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
  examples: [
    {
      input: "nums = [2,7,11,15], target = 9",
      output: "[0,1]",
      explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
    },
    {
      input: "nums = [3,2,4], target = 6",
      output: "[1,2]",
      explanation: "Because nums[2] + nums[4] == 6, we return [1, 2]."
    },
    {
      input: "nums = [3,3], target = 6",
      output: "[0,1]"
    }
  ],
  constraints: [
    "2 <= nums.length <= 10⁴",
    "-10⁹ <= nums[i] <= 10⁹",
    "-10⁹ <= target <= 10⁹",
    "Only one valid answer exists."
  ],
  followUp: "Can you come up with an algorithm that is less than O(n²) time complexity?"
};

export default function ProblemPane() {
  const { id, title, difficulty, description, examples, constraints, followUp } = mockProblem;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Top Section - ID, Title, Difficulty */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Problem {id}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(difficulty)}`}>
            {difficulty}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {title}
        </h1>
      </div>

      {/* Scrollable Content Section */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Description */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Description
          </h2>
          <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
            {description}
          </div>
        </div>

        {/* Examples */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Examples
          </h2>
          <div className="space-y-4">
            {examples.map((example, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Example {index + 1}:
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Input:
                    </span>
                    <pre className="mt-1 text-sm text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 p-2 rounded">
                      {example.input}
                    </pre>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Output:
                    </span>
                    <pre className="mt-1 text-sm text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 p-2 rounded">
                      {example.output}
                    </pre>
                  </div>
                  {example.explanation && (
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Explanation:
                      </span>
                      <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                        {example.explanation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Constraints */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Constraints
          </h2>
          <ul className="space-y-2">
            {constraints.map((constraint, index) => (
              <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                <span className="text-gray-400 dark:text-gray-500 mt-1">•</span>
                <span className="text-sm">{constraint}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Follow-up */}
        {followUp && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Follow-up
            </h2>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                {followUp}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
