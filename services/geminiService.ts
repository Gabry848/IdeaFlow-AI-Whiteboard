import { GoogleGenAI } from "@google/genai";
import { BoardElement } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please select an API Key.");
  }
  return new GoogleGenAI({ apiKey });
};

export const summarizeBoard = async (elements: BoardElement[]): Promise<string> => {
  const ai = getClient();
  
  // Filter out elements that don't have text content for a purely text-based summary first
  // In a full implementation with html2canvas, we would send the image.
  // Here we construct a structured text representation of the board state.
  
  const textElements = elements.filter(e => e.type === 'text' || e.type === 'sticky');
  const shapes = elements.filter(e => e.type === 'rect' || e.type === 'circle');
  const drawings = elements.filter(e => e.type === 'pen' || e.type === 'highlighter');

  const boardContext = `
    The user has an interactive whiteboard with the following content:
    
    **Sticky Notes & Text:**
    ${textElements.map(e => `- [${e.type.toUpperCase()}] at (${Math.round(e.x)},${Math.round(e.y)}): "${e.content || '(empty)'}"`).join('\n')}

    **Visual Elements:**
    - ${shapes.length} geometric shapes.
    - ${drawings.length} freehand drawings.

    **Instructions:**
    1. Analyze the text content and spatial arrangement (if implied by context).
    2. Create a structured summary of the ideas presented.
    3. Group related concepts.
    4. If there are tasks, list them as Action Items.
    5. Keep the tone professional, concise, and helpful. 
    6. Output in clean Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: boardContext,
      config: {
        systemInstruction: "You are an intelligent assistant for a digital whiteboard app. Your goal is to synthesize scattered notes into coherent documents.",
      }
    });

    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};
