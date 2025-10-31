// parse api response and segregate into id, title, difficulty, description, examples, constraints, followup

import { RandomProblemResponse, ParsedProblem } from '../../types/types';

export function parseProblem(raw: RandomProblemResponse): ParsedProblem {
    const text = raw.description?.String || "";
    const [descPart = "", constraintsPart = ""] =
      text.split(/Example 1:|Examples?:|Constraints:/);
  
    // --- Extract examples ---
    const exampleMatches = text.match(/Example \d+:[\s\S]*?(?=(?:Example \d+:|Constraints:|$))/g) || [];
    const examples = exampleMatches.map((ex: string) => {
      const inputMatch = ex.match(/Input:\s*(.*)/);
      const outputMatch = ex.match(/Output:\s*(.*)/);
      const explanationMatch = ex.match(/Explanation:\s*(.*)/);
      return {
        input: inputMatch ? inputMatch[1].trim() : "",
        output: outputMatch ? outputMatch[1].trim() : "",
        explanation: explanationMatch ? explanationMatch[1].trim() : "",
      };
    });
  
    // --- Extract constraints ---
    const constraints = constraintsPart
      .split(/\n|`/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0 && /\d/.test(s));
  
    return {
      id: raw.id,
      title: raw.title,
      difficulty: raw.difficulty,
      description: descPart.trim(),
      examples,
      constraints,
    };
  }

