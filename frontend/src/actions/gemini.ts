"use server"

import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export const getQuestion = async () => {
    const { text } = await generateText({
        model: google('gemini-2.5-flash-lite'),
        prompt: 'You are a General Knowledge Expert. Ask me one question on any famous topic which a person should know but it should not be very easy the person answering should use some brain to answer the question, but the answer should one word only. Ask questions that a third grader would know. The output should be in the format of a json object only: {"question": "question", "answer": "answer"}',
    });

    const cleanJsonText = text
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '')
        .trim();

    console.log(cleanJsonText);

    return JSON.parse(cleanJsonText);
}

