"use server"

import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export const getQuestion = async () => {
    const { text } = await generateText({
        model: google('gemini-2.5-flash'),
        prompt: 'You are a General Knowledge Expert. Ask me one question on any famous topic which a person should know but it should not be very easy the person answering should use some brsin to answer the question. The output should be in the format of a json object only: {"question": "question", "answer": "answer"}',
      });

    return JSON.parse(text);
}

