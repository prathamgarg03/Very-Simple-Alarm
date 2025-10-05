import { getQuestion } from '@/actions/gemini'; // Adjust path to your getQuestion function
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const questionData = await getQuestion();
    return NextResponse.json(questionData);
  } catch (error) {
    console.error('Error generating question:', error);
    return NextResponse.json(
      { 
        question: "What is the capital of France?", 
        answer: "Paris" 
      },
      { status: 200 } // Return 200 so the alarm still works with fallback
    );
  }
}