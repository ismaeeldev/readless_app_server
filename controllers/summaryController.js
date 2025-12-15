import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "fs/promises";
import path from "path";
import os from "os";

dotenv.config();

// Helper to download PDF locally (internal to this controller as mostly specific)
// Or reuse from utils if applicable, but different implementation in original files.
// Using standard implementation here.
async function downloadPdfFromUrl(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Unable to download PDF");
    const buf = Buffer.from(await response.arrayBuffer());
    const tempFilePath = path.join(os.tmpdir(), `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);
    await fs.writeFile(tempFilePath, buf);
    return tempFilePath;
}

async function extractPdfText(pdfPath) {
    const loader = new PDFLoader(pdfPath);
    const docs = await loader.load();
    return docs.map(d => d.pageContent).join("\n\n");
}

const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.2,
});

const geminiModel = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-pro",
    temperature: 0.2,
    maxRetries: 2,
});

const parser = new StringOutputParser();

const summaryPromptTemplate = `
SYSTEM RULES:
- You are a powerful AI PDF summarizer.
- Always follow the summary type strictly.
- Make output structured, clear, and helpful.

User selected summary type: **{type}**

Summarize the PDF content below:

--------------------
{content}
--------------------

Generate summary according to type: {type}
`;

const summaryPrompt = new PromptTemplate({
    template: summaryPromptTemplate,
    inputVariables: ["content", "type"],
});

const summaryChain = RunnableSequence.from([
    summaryPrompt,
    model,
    parser,
]);

const FallBackSummaryChain = RunnableSequence.from([
    summaryPrompt,
    geminiModel,
    parser,
]);

async function generatePdfSummaryLogic(pdfUrl, summaryType = "Standard Summary") {
    let pdfPath = null;
    let content = null;

    try {
        console.log("Downloading PDF...", pdfUrl);
        pdfPath = await downloadPdfFromUrl(pdfUrl);

        console.log("Extracting PDF text...");
        content = await extractPdfText(pdfPath);

        console.log("Running Primary Chain (OpenAI)...");
        const result = await summaryChain.invoke({
            content,
            type: summaryType,
        });

        if (pdfPath) await fs.unlink(pdfPath).catch(() => { });
        return result;

    } catch (error) {
        console.error("❌ Primary Chain Failed:", error);
 
        if (!content) {
            throw new Error("PDF could not be processed. Possibly scanned / protected.");
        }

        try {
            console.log("🔄 Running Fallback Chain (Gemini)...");
            const fallbackResult = await FallBackSummaryChain.invoke({
                content,
                type: summaryType,
            });

            if (pdfPath) await fs.unlink(pdfPath).catch(() => { });
            return fallbackResult;

        } catch (fallbackError) {
            console.error("❌ Fallback Gemini Failed:", fallbackError);
            throw new Error("Both primary & fallback models failed.");
        }
    }
}

// === Controllers ===

export const summarizePdf = async (req, res) => {
    try {
        const { pdfUrl, summaryType } = req.body;
        if (!pdfUrl) return res.status(400).json({ success: false, message: "pdfUrl is required" });

        const summary = await generatePdfSummaryLogic(pdfUrl, summaryType || "Detailed Analysis");
        res.status(200).json({ success: true, data: { summary } });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const summarizeBatchPdfs = async (req, res) => {
    try {
        const { pdfUrls } = req.body; // Array of URLs
        if (!pdfUrls || !Array.isArray(pdfUrls) || pdfUrls.length === 0) {
            return res.status(400).json({ success: false, message: "pdfUrls array is required" });
        }

        console.log("🚀 Starting multiple PDF summarization in parallel...");
        const allSummaries = await Promise.all(
            pdfUrls.map(url => generatePdfSummaryLogic(url, "Executive Summary")) // Default type for batch
        );

        console.log("📚 Merging summaries...");
        const finalSummary = allSummaries
            .map((summary, idx) => `### 📘 Summary for PDF ${idx + 1}\n${summary}`)
            .join("\n\n------------------------------\n\n");

        res.status(200).json({ success: true, data: { combinedSummary: finalSummary } });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
