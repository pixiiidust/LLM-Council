import { GoogleGenAI } from "@google/genai";
import { CouncilMember, Opinion, Review } from "../types";

// Initialize Gemini Client
// In a real scenario, this relies on process.env.API_KEY being present
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define the Council Members
export const COUNCIL_MEMBERS: CouncilMember[] = [
  {
    id: 'logic',
    name: 'The Analyst',
    style: 'Analytical, data-driven, and precise.',
    color: 'text-blue-400',
    model: 'gemini-2.5-flash',
    systemPrompt: 'You are The Analyst. Your goal is to provide a strictly logical, fact-based answer. Focus on structure, data, and correctness. Format your response cleanly using Markdown. Do not use emojis, decorative symbols, or non-standard punctuation.',
  },
  {
    id: 'creative',
    name: 'The Visionary',
    style: 'Creative, abstract, and out-of-the-box.',
    color: 'text-purple-400',
    model: 'gemini-2.5-flash',
    systemPrompt: 'You are The Visionary. Your goal is to think laterally. Provide creative solutions, metaphors, and explore the "what if". Format your response cleanly using Markdown. Do not use emojis, decorative symbols, or non-standard punctuation. Avoid excessive fluff.',
  },
  {
    id: 'skeptic',
    name: 'The Skeptic',
    style: 'Critical, cautious, and risk-aware.',
    color: 'text-orange-400',
    model: 'gemini-2.5-flash',
    systemPrompt: 'You are The Skeptic. Your goal is to find flaws, risks, and edge cases. Challenge assumptions. Play devil\'s advocate against the user\'s premise if necessary. Format your response cleanly using Markdown. Do not use emojis, decorative symbols, or non-standard punctuation.',
  },
  {
    id: 'pragmatist',
    name: 'The Pragmatist',
    style: 'Practical, realistic, and solution-oriented.',
    color: 'text-green-400',
    model: 'gemini-2.5-flash',
    systemPrompt: 'You are The Pragmatist. Your goal is to focus on feasibility, real-world implementation, and compromise. What actually works in practice? Avoid overly theoretical or idealistic solutions. Format your response cleanly using Markdown. Do not use emojis, decorative symbols, or non-standard punctuation.',
  }
];

// Helper to clean response text
const cleanText = (text: string | undefined): string => {
  return text?.trim() || "No response generated.";
};

// Stage 1: Get Initial Opinions
export const getInitialOpinions = async (prompt: string, attachmentPart?: any): Promise<Opinion[]> => {
  // If there is an attachment (like a PDF), we send a multi-part request.
  // Otherwise just the text prompt.
  const contents = attachmentPart 
    ? { parts: [attachmentPart, { text: prompt }] }
    : prompt;

  const promises = COUNCIL_MEMBERS.map(async (member) => {
    try {
      const response = await ai.models.generateContent({
        model: member.model,
        contents: contents,
        config: {
          systemInstruction: member.systemPrompt,
        },
      });
      return {
        memberId: member.id,
        content: cleanText(response.text),
      };
    } catch (error) {
      console.error(`Error fetching opinion from ${member.name}:`, error);
      return {
        memberId: member.id,
        content: `[Error: Failed to retrieve opinion from ${member.name}]`,
      };
    }
  });

  return Promise.all(promises);
};

// Stage 2: Get Peer Reviews
export const getPeerReviews = async (prompt: string, opinions: Opinion[], attachmentPart?: any): Promise<Review[]> => {
  const promises = COUNCIL_MEMBERS.map(async (member) => {
    try {
      // Construct a context where this member sees others' opinions but not who wrote them
      const otherOpinions = opinions
        .filter((o) => o.memberId !== member.id)
        .map((o, index) => `Opinion ${index + 1}: ${o.content}`)
        .join('\n\n---\n\n');

      const reviewPromptText = `
        Original Query: "${prompt}"

        Here are opinions from other council members:
        ${otherOpinions}

        As ${member.name}, please briefly review these opinions.
        1. Identify any logical fallacies or brilliant insights.
        2. Rank them informally in terms of helpfulness.
        3. Be critical but constructive.
        
        Keep your response professional and free of conversational filler. Do not use emojis.
      `;

      // Pass the attachment to the reviewer so they can verify the source material too
      const contents = attachmentPart 
        ? { parts: [attachmentPart, { text: reviewPromptText }] }
        : reviewPromptText;

      const response = await ai.models.generateContent({
        model: member.model,
        contents: contents,
        config: {
          systemInstruction: member.systemPrompt,
        },
      });

      return {
        reviewerId: member.id,
        content: cleanText(response.text),
      };
    } catch (error) {
      return {
        reviewerId: member.id,
        content: `[Error: Failed to retrieve review from ${member.name}]`,
      };
    }
  });

  return Promise.all(promises);
};

// Stage 3: Chairman's Synthesis
export const getChairmanRuling = async (
  prompt: string,
  opinions: Opinion[],
  reviews: Review[],
  attachmentPart?: any,
  isEli5: boolean = false
): Promise<string> => {
  try {
    const formattedOpinions = opinions.map(o => {
      const member = COUNCIL_MEMBERS.find(m => m.id === o.memberId);
      return `Member (${member?.name}): ${o.content}`;
    }).join('\n\n');

    const formattedReviews = reviews.map(r => {
      const member = COUNCIL_MEMBERS.find(m => m.id === r.reviewerId);
      return `Review by (${member?.name}): ${r.content}`;
    }).join('\n\n');

    let chairmanInstruction = "You are the wise and balanced Chairman. Synthesize the debate into a single truth. Format your response cleanly in Markdown. Do not use emojis or decorative symbols.";

    if (isEli5) {
        chairmanInstruction += " IMPORTANT: The user has requested an ELI5 (Explain Like I'm 5) response. You must explain the final conclusion using very simple language, analogies, and short sentences that a 5-year-old could understand. Avoid jargon completely.";
    }

    const chairmanPromptText = `
      You are the Chairman of the AI Council.
      
      User Query: "${prompt}"

      --- Stage 1: Council Opinions ---
      ${formattedOpinions}

      --- Stage 2: Council Reviews ---
      ${formattedReviews}

      --- Your Task ---
      Synthesize all the information above into a final, authoritative, and comprehensive answer. 
      Acknowledge the strong points raised by the council members, resolve any conflicts, and provide the best possible response to the user.
      ${isEli5 ? "Explain it simply (ELI5). Use analogies. Keep it easy to understand." : "Structure your response clearly using Markdown."}
    `;

    // The Chairman also sees the document to make the final informed decision
    const contents = attachmentPart 
      ? { parts: [attachmentPart, { text: chairmanPromptText }] }
      : chairmanPromptText;

    // Using Pro for the smartest synthesis
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: contents,
      config: {
        systemInstruction: chairmanInstruction,
        thinkingConfig: { thinkingBudget: 1024 } // Giving the chairman a moment to think
      },
    });

    return cleanText(response.text);

  } catch (error) {
    console.error("Chairman error:", error);
    return "The Chairman has resigned due to an unexpected error. Please try again.";
  }
};