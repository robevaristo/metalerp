import { GoogleGenAI, Type } from "@google/genai";
import { MaterialType, Project } from "../types";

const MODEL_NAME = "gemini-3-flash-preview";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Wrapper de execução com retentativa robusta para ambientes online
const callAiWithRetry = async (fn: () => Promise<any>, retries = 3, delay = 10000): Promise<any> => {
    try {
        return await fn();
    } catch (error: any) {
        const errorMsg = error?.message?.toLowerCase() || "";
        const isQuotaError = errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('limit');
        
        if (isQuotaError && retries > 0) {
            console.warn(`[ZINDRA IA] Limite atingido. Aguardando ${delay/1000}s para liberar cota...`);
            await sleep(delay);
            // Dobra o tempo de espera a cada falha (Exponential Backoff)
            return callAiWithRetry(fn, retries - 1, delay * 2);
        }
        throw error;
    }
};

const robustJsonParse = (text: string) => {
    if (!text) return { materials: [] };
    let cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    
    // Tenta localizar o objeto JSON se a IA enviou texto extra
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    try {
        if (firstBrace !== -1 && lastBrace !== -1) {
            const potentialJson = cleaned.substring(firstBrace, lastBrace + 1);
            const parsed = JSON.parse(potentialJson);
            if (parsed.materials) return parsed;
            if (Array.isArray(parsed)) return { materials: parsed };
            return { materials: [parsed] };
        }
    } catch (e) {
        console.warn("Falha no parser de JSON da IA:", e);
    }
    return { materials: [] };
};

export const processProjectBatch = async (dataChunk: any[]): Promise<any> => {
    if (!process.env.API_KEY) throw new Error("API_KEY_MISSING");

    return callAiWithRetry(async () => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Formata as linhas de forma clara para a IA
        const listString = dataChunk.map((row, i) => {
            const content = Array.isArray(row) ? row.filter(c => String(c).trim() !== "").join(' | ') : String(row);
            return `L${i+1}: ${content}`;
        }).join('\n');

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Extraia materiais industriais (Chapas, Barras e Itens Comerciais) destas linhas de planilha:\n\n${listString}`,
            config: {
                systemInstruction: "Você é um especialista em PCP Industrial. Converta cada linha em um objeto JSON. Categorias: 'SHEET' (Chapa), 'BAR' (Barra/Perfil), 'COMMERCIAL' (Parafusos/Itens prontos). Extraia nomes, quantidades e bitolas. Saída JSON chave 'materials'.",
                responseMimeType: "application/json",
                temperature: 0.1,
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        materials: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    detectedType: { type: Type.STRING, enum: ['SHEET', 'BAR', 'COMMERCIAL'] },
                                    name: { type: Type.STRING },
                                    quantity: { type: Type.NUMBER },
                                    gauge: { type: Type.STRING },
                                    materialGrade: { type: Type.STRING },
                                    lengthMm: { type: Type.NUMBER },
                                    widthMm: { type: Type.NUMBER },
                                    details: { type: Type.STRING }
                                },
                                required: ['name', 'quantity']
                            }
                        }
                    }
                }
            }
        });
        
        return robustJsonParse(response.text);
    });
};

export const getAgentInsights = async (agentType: 'BAR' | 'SHEET' | 'COMMERCIAL', projects: Project[]): Promise<string> => {
    return callAiWithRetry(async () => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
        const materials = projects.flatMap(p => p.materials.filter(m => m.type === (agentType === 'BAR' ? MaterialType.BAR : agentType === 'SHEET' ? MaterialType.SHEET : MaterialType.COMMERCIAL)));
        if (materials.length === 0) return "Sem dados.";
        
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `DADOS: ${JSON.stringify(materials.slice(0, 10))}`,
            config: { systemInstruction: `Analista PCP ${agentType}. Dê 1 aviso curto.`, temperature: 0 }
        });
        return response.text || "Sem avisos.";
    }, 2, 12000); 
};

export const askAgent = async (agentType: 'BAR' | 'SHEET' | 'COMMERCIAL', prompt: string, projects: Project[]): Promise<string> => {
    return callAiWithRetry(async () => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
        const context = projects.flatMap(p => p.materials.filter(m => m.type === (agentType === 'BAR' ? MaterialType.BAR : agentType === 'SHEET' ? MaterialType.SHEET : MaterialType.COMMERCIAL)));
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `MATERIAIS: ${JSON.stringify(context.slice(0, 20))}\nPERGUNTA: ${prompt}`,
            config: { systemInstruction: `Engenheiro PCP ${agentType}.`, temperature: 0.1 }
        });
        return response.text || "Sem resposta.";
    });
};