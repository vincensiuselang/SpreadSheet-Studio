import { GoogleGenAI } from "@google/genai";
import { WidgetConfig, WidgetType, DataRow, DashboardConfig } from "../types";

const SYSTEM_INSTRUCTION = `
You are a data visualization expert. Analyze the provided dataset columns and sample data.
Recommend a dashboard layout by generating a list of widgets.
Prefer 'stat' widgets for simple aggregations (Total Revenue, Average Score).
Prefer 'bar' or 'line' for trends and comparisons.
Prefer 'pie' only for categorical distributions with few unique values.
Only use the column names provided in the schema.
For layout:
- 'stat' widgets should usually be small (cols: 2-3, rows: 1).
- 'bar' and 'line' charts should be wider (cols: 6-8, rows: 2-3).
- 'pie' charts should be medium (cols: 4, rows: 2).
The grid has 12 columns total.
`;

const CHAT_SYSTEM_INSTRUCTION = `
You are a helpful Data Analyst assistant integrated into a dashboard application called "SpreadSheet Studio".
Your goal is to answer user questions based *strictly* on the provided dataset context.

The context provided includes:
1. Dataset Metadata (Name, Size, Schema)
2. Dashboard State (What charts are currently visible)
3. Sample Data (A snippet of the actual rows)

Guidelines:
- If the user asks about specific statistics (avg, sum, etc.) and it's not pre-calculated in the context, estimate based on the sample or explain how to get it.
- Use the Dashboard State to reference what the user is already seeing (e.g., "As seen in the 'Revenue by Month' chart...").
- If the user asks a question that requires data not present in the sample, acknowledge the limitation (e.g., "Based on the sample data I can see...").
- Be professional, concise, and helpful.
`;

export const generateDashboardConfig = async (
  datasetName: string, 
  data: DataRow[]
): Promise<WidgetConfig[]> => {
  // We use local heuristics now for speed, but keeping this structure for potential hybrid approach
  return generateLocalDashboardConfig(data);
};

// --- Local Heuristic Generation (Fast) ---
const generateLocalDashboardConfig = (data: DataRow[]): WidgetConfig[] => {
  if (!data.length) return [];
  const columns = Object.keys(data[0]);
  const widgets: WidgetConfig[] = [];
  let widgetCount = 0;

  const getUniqueCount = (key: string) => {
    const values = new Set(data.map(d => String(d[key])));
    return values.size;
  };

  const isNumber = (key: string) => {
    return data.every(d => !isNaN(Number(d[key])));
  };

  // 1. Stats for Numerical Columns (Max 3)
  const numCols = columns.filter(c => isNumber(c));
  numCols.slice(0, 3).forEach(col => {
    widgets.push({
      id: `stat-${widgetCount++}`,
      type: WidgetType.STAT,
      title: `Total ${col}`,
      dataKey: 'id', // Dummy
      valueKey: col,
      aggregation: 'sum',
      cols: 3,
      rows: 1
    });
  });

  // 2. Pie/Bar for Categorical (Low cardinality)
  const catCols = columns.filter(c => !isNumber(c) && getUniqueCount(c) < 10);
  catCols.slice(0, 2).forEach(col => {
    widgets.push({
      id: `pie-${widgetCount++}`,
      type: WidgetType.PIE,
      title: `${col} Distribution`,
      dataKey: col,
      aggregation: 'count',
      cols: 4,
      rows: 2
    });
  });

  // 3. Bar/Line for others
  const otherCols = columns.filter(c => !catCols.includes(c) && !numCols.includes(c));
  if (otherCols.length > 0) {
     widgets.push({
      id: `bar-${widgetCount++}`,
      type: WidgetType.BAR,
      title: `${otherCols[0]} Analysis`,
      dataKey: otherCols[0],
      aggregation: 'count',
      cols: 6,
      rows: 2
    });
  } else if (numCols.length > 0 && catCols.length > 0) {
      // Cross analysis
      widgets.push({
          id: `bar-cross-${widgetCount++}`,
          type: WidgetType.BAR,
          title: `${numCols[0]} by ${catCols[0]}`,
          dataKey: catCols[0],
          valueKey: numCols[0],
          aggregation: 'sum',
          cols: 6,
          rows: 2
      });
  }

  // Fallback
  if (widgets.length === 0) {
     widgets.push({
      id: `fallback-${widgetCount++}`,
      type: WidgetType.STAT,
      title: 'Total Rows',
      dataKey: columns[0],
      aggregation: 'count',
      cols: 12,
      rows: 1
    });
  }

  return widgets;
};

// --- Chat Functionality ---
export const getChatResponse = async (
  message: string,
  datasetName: string,
  data: DataRow[],
  dashboardConfig: DashboardConfig | null,
  chatHistory: { role: 'user' | 'model'; parts: { text: string }[] }[],
  language: string = 'en'
): Promise<string> => {
  if (!process.env.API_KEY) {
    return "I'm sorry, I cannot connect to the AI service right now. Please check the API Key.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Construct Context
    // We increase sample size to 50 for better context with Gemini 3 Pro
    const sampleData = data.slice(0, 50); 
    
    // Infer Column Types for better AI understanding
    const firstRow = data[0] || {};
    const columnsWithTypes = Object.keys(firstRow).map(key => {
        const val = firstRow[key];
        const type = typeof val === 'number' ? 'Numeric' : 'Text';
        return `- ${key} (${type})`;
    }).join('\n');
    
    // Summarize Widgets with clearer structure
    const widgetSummary = dashboardConfig?.widgets.map(w => {
      const measure = w.valueKey ? `${w.aggregation} of ${w.valueKey}` : `Count of Rows`;
      return `- ${w.type.toUpperCase()} Chart "${w.title}": Group by [${w.dataKey}], Measure: [${measure}]`;
    }).join('\n') || "No widgets configured.";

    // Language Instruction
    const langInstruction = language === 'id' 
      ? "IMPORTANT: You MUST answer strictly in INDONESIAN language."
      : "IMPORTANT: You MUST answer strictly in ENGLISH language.";

    const contextPrompt = `
      CONTEXT OVERVIEW:
      Dataset Name: ${datasetName}
      Total Row Count: ${data.length}
      
      DATA SCHEMA:
      ${columnsWithTypes}
      
      CURRENT DASHBOARD VISUALIZATIONS:
      ${widgetSummary}

      SAMPLE DATA (First 50 Rows):
      ${JSON.stringify(sampleData)}
      
      INSTRUCTIONS:
      - Answer the user's question based on the provided context.
      - If calculating, use the Total Row Count and Sample Data to infer trends.
      - ${langInstruction}
    `;

    const chat = ai.chats.create({
      model: "gemini-3-pro-preview",
      config: {
        systemInstruction: CHAT_SYSTEM_INSTRUCTION + "\n" + contextPrompt
      },
      history: chatHistory
    });

    const result = await chat.sendMessage({ message });
    return result.text || "";
    
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return language === 'id' 
      ? "Maaf, saya mengalami masalah saat menganalisis. Silakan coba lagi nanti."
      : "I'm having trouble analyzing that right now. Please try again later.";
  }
};
