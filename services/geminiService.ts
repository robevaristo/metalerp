import { GoogleGenAI, Type } from "@google/genai";
import { JobRecord } from "../types";

const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
};

interface SimpleItem {
    description: string;
    quantity: number;
}

export const suggestMaterials = async (items: SimpleItem[]) => {
  const ai = getClient();
  if (!ai) {
    console.warn("Gemini API Key missing");
    return [];
  }

  // Construct a prompt listing all items
  const itemsText = items.map(i => `- ${i.description} (Quantidade: ${i.quantity})`).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Atue como um Engenheiro de PCP Industrial experiente.
      Analise esta lista de itens de uma Ordem de Produção (OP) e gere uma LISTA TÉCNICA CONSOLIDADA (BOM) de materiais necessários para fabricar TODOS eles.
      
      ITENS A FABRICAR:
      ${itemsText}
      
      Regras:
      1. Calcule a estimativa total de material para a quantidade solicitada.
      2. Categorize estritamente em:
         - BARRA (Perfis, tubos, vigas, maciços)
         - CHAPA (Chapas lisas, xadrez, expandidas)
         - COMERCIAL_PART (Parafusos, rolamentos, tintas, itens comprados prontos, mancais de compra se não for fabricação)
      3. Seja específico nas descrições (ex: "Barra Chata 1x1/8 A36", "Parafuso M10x50").
      
      Retorne apenas JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Nome técnico do material" },
              type: { type: Type.STRING, enum: ["BARRA", "CHAPA", "COMERCIAL_PART"] },
              quantity: { type: Type.NUMBER, description: "Quantidade estimada total" },
              unit: { type: Type.STRING, description: "Unidade (m, kg, pç, un)" }
            },
            required: ["name", "type", "quantity", "unit"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error generating materials:", error);
    return [];
  }
};

export const analyzeWorkLogs = async (history: JobRecord[]) => {
    const ai = getClient();
    if (!ai) return "Erro: Chave de API não configurada.";

    // Simplificar dados para enviar para a IA
    const summaryData = history.map(h => ({
        func: h.funcionario,
        servico: h.serviceType,
        op: h.op,
        maquina: h.maquina,
        duracao_minutos: Math.round(h.durationSeconds / 60)
    }));

    const prompt = `
    Analise os seguintes registros de trabalho de uma fábrica metalúrgica.
    Identifique padrões de produtividade, gargalos potenciais ou observações relevantes sobre o tempo gasto por serviço/máquina.
    Seja direto e use bullet points. Fale português.
    
    Dados:
    ${JSON.stringify(summaryData)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("AI Error:", error);
        return "Não foi possível gerar a análise no momento.";
    }
};