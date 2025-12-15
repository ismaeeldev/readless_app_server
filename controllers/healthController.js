import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence, RunnableParallel } from "@langchain/core/runnables";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import fs from "fs/promises";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import os from "os";

dotenv.config();

const openAIModel = new ChatOpenAI({ modelName: "gpt-3.5-turbo", temperature: 0.2 });
const geminiModel = new ChatGoogleGenerativeAI({ model: "gemini-2.5-pro", temperature: 0.2 });
const parser = new StringOutputParser();

const healthPrompt = new PromptTemplate({
    template: `
    you are a PDF Health AI Analyst.

    Analyze the following PDF content and provide:
    
    - Overall Health Score (0-100)
    - Readability (0-100)
    - Structure (0-100)
    - Clarity (0-100)
    - Recommendations (bullet points)
    
    Content:
    ----------------
    {content}
    ----------------
    
    Return output as JSON strictly in this format:
    {{
      "overall": "",
      "readability": "",
      "structure": "",
      "clarity": "",
      "recommendation": []
    }}
    `,
    inputVariables: ["content"],
});

const ensemblePrompt = new PromptTemplate({
    template: `
       You are a PDF Health Analyst.
       
       Below are TWO health analyses for the same PDF from different AI models:
       
       Both Analysis
       {analysis}
       
       Combine and reconcile both analyses into a single JSON health report.
       Keep the format strictly:
       {{
         "overall": "",
         "readability": "",
         "structure": "",
         "clarity": "",
         "recommendation": []
       }}
       Provide numeric scores as averages and merge recommendations intelligently.
       `,
    inputVariables: ["analysis"],
});


const OpenAIChain = RunnableSequence.from([healthPrompt, openAIModel, parser]);
const GeminiChain = RunnableSequence.from([healthPrompt, geminiModel, parser]);
const EnsembleChain = RunnableSequence.from([ensemblePrompt, openAIModel, parser]);

async function downloadPdf(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to download PDF");
    const buffer = Buffer.from(await res.arrayBuffer());
    const filePath = path.join(os.tmpdir(), `temp_${Date.now()}_health.pdf`);
    await fs.writeFile(filePath, buffer);
    return filePath;
}

async function extractPdfText(pdfPath) {
    const loader = new PDFLoader(pdfPath);
    const docs = await loader.load();
    return docs.map(d => d.pageContent).join("\n\n");
}

async function analyzePdfHealthLogic(pdfUrl) {
    let pdfPath;
    try {
        console.log(`📥 Downloading PDF: ${pdfUrl}`);
        pdfPath = await downloadPdf(pdfUrl);

        console.log("📄 Extracting text...");
        const content = await extractPdfText(pdfPath);

        if (!content || content.trim().length < 10) {
            throw new Error("PDF text is empty or unreadable");
        }

        console.log("⚡ Running OpenAI + Gemini in parallel...");
        const parallelChain = RunnableParallel.from({
            openai: OpenAIChain,
            // gemini: GeminiChain,
        });

        const results = await parallelChain.invoke({ content });

        console.log("📝 Combining results using OpenAI...");
        const finalResult = await EnsembleChain.invoke({
            analysis: { results }
        });

        return JSON.parse(finalResult);

    } catch (err) {
        console.error("❌ PDF Health Analysis failed:", err);
        throw err;
    } finally {
        if (pdfPath) await fs.unlink(pdfPath).catch(() => { });
    }
}

export const checkHealth = async (req, res) => {
    try {
        const { pdfUrl } = req.body;
        if (!pdfUrl) return res.status(400).json({ success: false, message: "pdfUrl is required" });

        const analysis = await analyzePdfHealthLogic(pdfUrl);
        res.status(200).json({ success: true, data: analysis });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message || "Failed to analyze PDF" });
    }
};
