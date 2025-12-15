import dotenv from "dotenv";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PDF_PROMPT } from "../utils/pdfPrompt.js";
import { downloadPdfToTemp, pdfNamespaceFromUrl } from "../utils/pdfHelper.js";
import fs from "fs/promises";

dotenv.config();

const DEFAULT_CONFIG = {
    temperature: 0.2,
    chunkSize: 1000,
    chunkOverlap: 200,
    topK: 12,
    maxRetries: 3,
    retryDelay: 1500,
};

async function getEmbeddings() {
    try {
        console.log("🔵 Using OpenAI embeddings...");
        return new OpenAIEmbeddings({
            model: "text-embedding-3-small",
        });
    } catch (err) {
        console.log("🟡 OpenAI embeddings failed → switching to Gemini embeddings...");
        return new GoogleGenerativeAIEmbeddings({
            model: "models/embedding-001",
        });
    }
}

async function getChatModel() {
    try {
        console.log("🔵 Using OpenAI Chat model...");
        return new ChatOpenAI({
            modelName: "gpt-3.5-turbo",
            temperature: 0,
        });
    } catch (err) {
        console.log("🟡 OpenAI failed → switching to Gemini Chat...");
        return new ChatGoogleGenerativeAI({
            model: "gemini-1.5-flash",
            temperature: 0,
        });
    }
}

async function namespaceExists(index, namespace) {
    try {
        const stats = await index.describeIndexStats();
        return !!stats.namespaces?.[namespace];
    } catch (err) {
        console.error("❌ Namespace check failed:", err);
        return false;
    }
}

export const chat = async (req, res) => {
    try {
        const { pdfUrl, query, sessionId, config = {} } = req.body;

        if (!pdfUrl || !query) {
            return res.status(400).json({ success: false, message: "Missing pdfUrl or query" });
        }

        const finalConfig = { ...DEFAULT_CONFIG, ...config };
        const namespace = pdfNamespaceFromUrl(pdfUrl);

        console.log("⚡ Starting chat for:", pdfUrl);
        console.log("❓ Query:", query);

        // === Load embeddings & chat model ===
        const embeddings = await getEmbeddings();
        const model = await getChatModel();
        const parser = new StringOutputParser();

        // === Pinecone Setup ===
        const pinecone = new PineconeClient({ apiKey: process.env.PINECONE_API_KEY });
        const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);

        const exists = await namespaceExists(pineconeIndex, namespace);

        // ===== INGESTION PROCESS =====
        if (!exists) {
            console.log("📦 Namespace not found → ingesting PDF...");

            const filePath = await downloadPdfToTemp(pdfUrl);
            const loader = new PDFLoader(filePath, { splitPages: true });
            const rawDocs = await loader.load();

            await fs.unlink(filePath).catch(() => { });

            // Split text
            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: finalConfig.chunkSize,
                chunkOverlap: finalConfig.chunkOverlap,
            });

            const docs = [];
            for (const page of rawDocs) {
                const chunks = await splitter.splitText(page.pageContent || "");
                for (const chunk of chunks) {
                    docs.push(new Document({
                        pageContent: chunk,
                        metadata: { source: pdfUrl, page: page.metadata?.page }
                    }));
                }
            }

            console.log(`📚 Total chunks: ${docs.length}`);

            const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
                pineconeIndex,
                namespace,
            });

            await vectorStore.addDocuments(docs);
            console.log("✅ PDF successfully stored in Pinecone.");
        } else {
            console.log("⚡ Namespace exists → skipping ingestion.");
        }

        // ===== QUERY PROCESS =====
        const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
            pineconeIndex,
            namespace,
        });

        const retriever = vectorStore.asRetriever({
            k: finalConfig.topK,
            scoreThreshold: 0.25,
        });

        const results = await retriever.invoke(query);
        console.log(`🔍 Retrieved: ${results.length} chunks`);

        const PromptContext = results.map(r => r.pageContent).join("\n\n");

        const chain = PDF_PROMPT.pipe(model).pipe(parser);
        const answer = await chain.invoke({ query, PromptContext });

        res.status(200).json({
            success: true,
            data: {
                question: query,
                answer,
                // contextChunks: results, 
                pdfUrl,
                namespace, 
            }
        });

    } catch (error) {
        console.error("🔥 Chat Controller Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
