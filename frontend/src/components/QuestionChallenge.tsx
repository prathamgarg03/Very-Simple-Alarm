"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface Question {
  question: string;
  answer: string;
}

interface QuestionChallengeProps {
  onCorrect: () => void;
}

export default function QuestionChallenge({ onCorrect }: QuestionChallengeProps) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [answerCorrect, setAnswerCorrect] = useState(false);
  const [showError, setShowError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchQuestion();
  }, []);

  const fetchQuestion = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/get-question");
      const data = await response.json();
      setQuestion(data);
    } catch (error) {
      setQuestion({ question: "What is the capital of France?", answer: "Paris" });
    } finally {
      setLoading(false);
    }
  };

  const checkAnswer = () => {
    if (!question) return;
    const userAnswerLower = userAnswer.trim().toLowerCase();
    const correctAnswerLower = question.answer.trim().toLowerCase();
    if (userAnswerLower === correctAnswerLower) {
      setAnswerCorrect(true);
      setShowError(false);
      onCorrect();
    } else {
      setShowError(true);
      setUserAnswer("");
      setTimeout(() => {
        setShowError(false);
        fetchQuestion();
      }, 2000);
    }
  };

  return (
    <div className="bg-neutral-800 rounded-lg p-4 space-y-3">
      {loading ? (
        <p className="text-neutral-400 text-center">Loading question...</p>
      ) : question ? (
        <>
          <div className="text-sm text-neutral-400 mb-2">Answer this question to dismiss:</div>
          <div className="text-lg font-medium mb-3">{question.question}</div>
          {!answerCorrect ? (
            <>
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && checkAnswer()}
                placeholder="Type your answer..."
                className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2"
              />
              <Button onClick={checkAnswer} disabled={!userAnswer.trim()} className="w-full bg-blue-600 hover:bg-blue-700">
                Submit Answer
              </Button>
              {showError && (
                <div className="bg-red-600/20 text-red-400 px-4 py-2 rounded-lg text-sm text-center">
                  Wrong answer! Getting a new question...
                </div>
              )}
            </>
          ) : (
            <div className="bg-green-600/20 text-green-400 px-4 py-3 rounded-lg text-center font-medium">
              ✓ Correct! You can now dismiss the alarm.
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}


