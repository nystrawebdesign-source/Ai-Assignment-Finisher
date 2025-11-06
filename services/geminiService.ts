
import { Type } from "@google/genai";

// Helper to extract plain text from HTML for cheaper analysis
function getPlainText(html: string): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
}

// 1. Task Analyzer ("Pre-judger")
export async function analyzeTask(assignmentHtml: string): Promise<boolean> {
    const { GoogleGenAI } = await import("@google/genai");
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) throw new Error("API_KEY not set.");
    
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const assignmentText = getPlainText(assignmentHtml).substring(0, 4000); // Limit context for speed/cost

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Does the following assignment text explicitly require the inclusion of images, pictures, photos, or visuals? Answer only with a JSON object: {"requires_images": boolean}.\n\nText: "${assignmentText}"`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    requires_images: { type: Type.BOOLEAN },
                },
                required: ['requires_images']
            },
        },
    });

    try {
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        return result.requires_images || false;
    } catch (e) {
        console.error("Failed to parse analyzer response:", response.text);
        return false; // Default to false if analysis fails
    }
}


// 2. Standard assignment completion (no image generation)
export async function completeAssignment(assignmentHtml: string, contextText: string, imageBase64: string): Promise<string> {
    const { GoogleGenAI } = await import("@google/genai");
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) throw new Error("API_KEY not set.");

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const prompt = `
You are an expert academic assistant with an advanced ability to understand documents both structurally (via HTML) and visually (via a screenshot).
A user has provided an assignment document as HTML, a screenshot of that rendered document, and some reference notes. Your task is to intelligently complete the assignment.

**CRITICAL INSTRUCTIONS:**
1.  **Analyze Both Inputs:** You MUST use BOTH the HTML and the screenshot.
    *   The **HTML** gives you the precise text, structure, and styling attributes.
    *   The **Screenshot** gives you the visual context. Pay close attention to things like **highlighted areas** (e.g., yellow backgrounds), which indicate blanks that need to be filled in.
2.  **Preserve Formatting:** It is absolutely essential that you maintain the original document's structure and styling. When you fill in a blank, replace the placeholder content but preserve all surrounding tags and CSS styles. For highlighted blanks, fill in the answer and **remove the highlight** for the text you added.
3.  **Use Reference Notes:** Use the provided reference notes to inform your answers.
4.  **Final Output:** Your output MUST be ONLY the completed, well-formed HTML document. Do not include any explanations, preambles, or markdown formatting like \`\`\`html.

---
**ASSIGNMENT DOCUMENT (HTML):**
---
${assignmentHtml}
---
**REFERENCE NOTES:**
---
${contextText}
---
Attached is the visual screenshot of the assignment. Use it to understand the layout and identify the areas needing completion. Now, provide the completed HTML document.`;

    const imagePart = { inlineData: { mimeType: 'image/png', data: imageBase64 } };
    const textPart = { text: prompt };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [textPart, imagePart] },
        });
        
        const text = response.text.trim();
        return text.replace(/^```html\s*|```\s*$/g, '').trim();
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to generate assignment completion.");
    }
}

// 3. Advanced assignment completion with image generation
type ProgressCallback = (message: string, progress: number) => void;

interface ImageRequest {
    term: string;
    prompt: string;
}

export async function completeAssignmentWithImages(
    assignmentHtml: string, 
    contextText: string, 
    imageBase64: string,
    onProgress: ProgressCallback
): Promise<string> {
    const { GoogleGenAI } = await import("@google/genai");
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) throw new Error("API_KEY not set.");
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // Step A: Identify image requirements
    onProgress('Identifying image needs...', 15);
    const getPromptsResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Based on the following assignment text, identify all distinct concepts that require a visual representation. For each concept, create a concise, descriptive prompt suitable for an AI image generation model to create a simple, clear, and representative image or icon. Return your answer ONLY as a JSON object with a single key 'image_requests', which is an array of objects, each with 'term' and 'prompt' keys. e.g., [{"term": "Birth Rate", "prompt": "A simple icon representing a high birth rate..."}].\n\nText: "${getPlainText(assignmentHtml)}"`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    image_requests: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                term: { type: Type.STRING },
                                prompt: { type: Type.STRING }
                            },
                            required: ['term', 'prompt']
                        }
                    }
                },
                required: ['image_requests']
            },
        }
    });
    
    const { image_requests: imageRequests } = JSON.parse(getPromptsResponse.text) as { image_requests: ImageRequest[] };
    if (!imageRequests || imageRequests.length === 0) {
        // If no images are identified, fall back to the simple completion.
        onProgress('No images needed, completing text...', 20);
        return completeAssignment(assignmentHtml, contextText, imageBase64);
    }
    
    // Step B: Generate images
    const generatedImages = [];
    const totalImages = imageRequests.length;
    for (let i = 0; i < totalImages; i++) {
        const req = imageRequests[i];
        const progress = 20 + Math.round((70 / totalImages) * (i + 1));
        onProgress(`Generating image ${i + 1}/${totalImages}: ${req.term}`, progress);
        
        const imageResponse = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: req.prompt,
            config: { numberOfImages: 1, outputMimeType: 'image/png', aspectRatio: '1:1' }
        });

        const image = imageResponse.generatedImages[0]?.image?.imageBytes;
        if (image) {
            generatedImages.push({ term: req.term, imageBase64: image });
        }
    }

    // Step C: Compose final document
    onProgress('Composing final document...', 95);
    const finalPrompt = `
You are an expert academic assistant. Your task is to complete the assignment using the provided HTML, screenshot, reference notes, and a set of pre-generated images.

**CRITICAL INSTRUCTIONS:**
1.  **Integrate Images:** You have been given an array of JSON objects, each containing a 'term' and its corresponding 'imageBase64' encoded image. You MUST insert each image into the correct location in the document. Use the 'term' to identify where each image belongs.
2.  **Embed Correctly:** Embed images using the format: \`<img src="data:image/png;base64,THE_BASE64_STRING" alt="TERM_NAME" style="width:150px; height:150px; object-fit:cover;"/>\`. You can adjust the style as needed for good presentation.
3.  **Complete Text:** Fill in all other text-based blanks as required by the assignment, using the reference notes.
4.  **Preserve Formatting:** Maintain all original styling and structure. Remove highlights from areas you fill in.
5.  **Final Output:** Your output MUST be ONLY the completed, well-formed HTML document.

---
**ASSIGNMENT DOCUMENT (HTML):**
---
${assignmentHtml}
---
**REFERENCE NOTES:**
---
${contextText}
---
**PRE-GENERATED IMAGES (JSON):**
---
${JSON.stringify(generatedImages)}
---

Attached is the visual screenshot of the original assignment. Now, provide the final, completed HTML with text answers and embedded images.`;
    
    const finalResponse = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [
            { text: finalPrompt },
            { inlineData: { mimeType: 'image/png', data: imageBase64 } }
        ]},
    });

    const finalText = finalResponse.text.trim();
    return finalText.replace(/^```html\s*|```\s*$/g, '').trim();
}
