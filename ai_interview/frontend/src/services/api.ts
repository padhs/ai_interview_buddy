import { RandomProblemResponse } from '../../types/types';

// Use environment variable or fallback to localhost
const API_BASE_URL = 'http://localhost:8080/api/v1';

export async function fetchRandomProblem(): Promise<RandomProblemResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/problems/random`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      // Add credentials if needed
      credentials: 'omit',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }
    
    const data: RandomProblemResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching random problem:', error);
    
    // Provide more specific error messages
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Unable to connect to the server. This might be a CORS issue - please ensure the backend has CORS configured to allow requests from the frontend.');
    }
    
    throw error;
  }
}
