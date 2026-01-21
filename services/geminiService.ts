import { GoogleGenAI, Type } from "@google/genai";
import { MaterialType, Project } from "../types";

const MODEL_NAME = "gemini-3-flash-preview";

const robustJsonParse = (text: string) => {
    if (!text) return { materials: [] };
    let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
        cleaned = cleaned.substring(start, end + 1);
    } else {
        const startArr = cleaned.indexOf('[');
        const endArr = cleaned.lastIndexOf(']');
        if (startArr !== -1 && endArr !== -1) {
            cleaned = cleaned.substring(startArr, endArr + 1);
        }
    }
    cleaned = cleaned.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
    try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) return { materials: parsed };
        if (parsed && parsed.materials) return parsed;
        return { materials: [] };
    } catch (e) {
        try {
            let fixed = cleaned;
            if (!fixed.endsWith('}')) fixed += '}]}';
            if (fixed.split('[').length > fixed.split(']').length) fixed += ']';
            if (fixed.split('{').length > fixed.split('}').length) fixed += '}';
            return JSON.parse(fixed);
        } catch (innerE) {
            console.error("Erro fatal no JSON:", e);
            return { materials: [] };
        }
    }
};

export const processProjectBatch = async (dataChunk: any[], retryCount = 0): Promise<any> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Preparação das linhas com indexador para que a IA não pule nada
    const listString = dataChunk.map((row, i) => {
        const rowData = Array.isArray(row) 
            ? row.map(c => (c === null || c === undefined) ? "" : String(c).trim()).join(' | ') 
            : String(row);
        return `REF_${i+1}: ${rowData}`;
    }).join('\n');

    const systemInstruction = `Você é um Analista de PCP de Precisão em Metalurgia.
Sua missão absoluta é converter CADA linha de texto em um item de material organizado.

REGRAS DE CATEGORIZAÇÃO (CRÍTICO):
1. COMERCIAL (COMMERCIAL_PART): Toda e qualquer ARRUELA (Lisa, Pesada, de Pressão), Parafuso, Porca ou item de fixação DEVE ser COMMERCIAL_PART. Nunca classifique ARRUELA como SHEET.
2. CHAPAS (SHEET): Identifique por "CHAPA", "CH", "PLACA", símbolo "#" (ex: #14), ou medidas (ex: 2000x1200). Se for Chapa e tiver Ø, extraia o valor do Ø.
3. BARRAS (BAR): Vigas, Perfis, Tubos, Cantoneiras, Ferro Chato.

REGRAS DE EXTRAÇÃO:
- Se não achar quantidade, assuma 1.
- Extraia a Bitola (gauge) para o campo gauge. Ex: "1/4", "3/16", "#11", "M20".
- Se houver Ø na descrição de uma CHAPA, mapeie esse valor para widthMm e lengthMm se eles estiverem vazios.

RETORNO: JSON com chave 'materials'.`;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `TEXTO BRUTO DA PLANILHA:\n${listString}`,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                temperature: 0,
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
                                    drawingNumber: { type: Type.STRING },
                                    details: { type: Type.STRING }
                                },
                                required: ['name', 'quantity', 'detectedType']
                            }
                        }
                    }
                }
            }
        });
        
        const text = response.text;
        if (!text) throw new Error("A IA não retornou dados.");
        
        return robustJsonParse(text);
    } catch (error: any) {
        console.error("Erro na chamada Gemini:", error);
        if (error?.message?.includes('429')) {
            if (retryCount < 2) {
                await new Promise(r => setTimeout(r, 20000));
                return processProjectBatch(dataChunk, retryCount + 1);
            }
        }
        throw error;
    }
};

export const getAgentInsights = async (agentType: 'BAR' | 'SHEET' | 'COMMERCIAL', projects: Project[]): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const materials = projects.flatMap(p => p.materials.filter(m => m.type === (agentType === 'BAR' ? MaterialType.BAR : agentType === 'SHEET' ? MaterialType.SHEET : MaterialType.COMMERCIAL)));
    if (materials.length === 0) return "Sem dados.";
    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `DADOS: ${JSON.stringify(materials.slice(0, 10))}`,
            config: { systemInstruction: `Analista PCP ${agentType}. Dê 1 aviso curto.`, temperature: 0 }
        });
        return response.text || "Sem avisos.";
    } catch (e) { return "Cota cheia."; }
};

export const askAgent = async (agentType: 'BAR' | 'SHEET' | 'COMMERCIAL', prompt: string, projects: Project[]): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const context = projects.flatMap(p => p.materials.filter(m => m.type === (agentType === 'BAR' ? MaterialType.BAR : agentType === 'SHEET' ? MaterialType.SHEET : MaterialType.COMMERCIAL)));
    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `MATERIAIS: ${JSON.stringify(context.slice(0, 20))}\nPERGUNTA: ${prompt}`,
            config: { systemInstruction: `Engenheiro PCP ${agentType}.`, temperature: 0.1 }
        });
        return response.text || "Sem resposta.";
    } catch (e) { return "Erro de cota (429)."; }
};