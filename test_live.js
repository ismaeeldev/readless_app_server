import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const TEST_PDF_URL = "https://rv64eedq1o.ufs.sh/f/wnuNLPjYxdgUxwzasD24y3BKDltTaVNi1fwRLHUAdkF0mMpJ";

async function runLiveTests() {
    console.log("🚀 Starting Live Server Tests...\n");

    // 1. Health Endpoint
    console.log("------------------------------------------------");
    console.log("1️⃣  Testing PDF Heath Check (/api/health)...");
    try {
        const res = await fetch(`${BASE_URL}/api/health`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pdfUrl: TEST_PDF_URL })
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch (e) { data = { message: text }; }

        console.log(`   Status: ${res.status}`);
        if (data.success) {
            console.log("   ✅ Success! Health Score:", data.data.overall);
        } else {
            console.log("   ❌ Failed:", data.message);
        }
    } catch (e) { console.error("   ❌ Error:", e.message); }


    // 2. Summary Endpoint
    console.log("------------------------------------------------");
    console.log("2️⃣  Testing Single Summary (/api/summary/single)...");
    try {
        const res = await fetch(`${BASE_URL}/api/summary/single`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pdfUrl: TEST_PDF_URL, summaryType: "Brief Summary" })
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch (e) { data = { message: text }; }

        console.log(`   Status: ${res.status}`);
        if (data.success) {
            console.log("   ✅ Success! Summary Length:", data.data.summary.length);
        } else {
            console.log("   ❌ Failed:", data.message);
        }
    } catch (e) { console.error("   ❌ Error:", e.message); }


    // 3. Chat Endpoint
    console.log("------------------------------------------------");
    console.log("3️⃣  Testing Chat (/api/chat)...");
    try {
        const res = await fetch(`${BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pdfUrl: TEST_PDF_URL,
                query: "What is the main topic of this document?"
            })
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch (e) { data = { message: text }; }

        console.log(`   Status: ${res.status}`);
        if (data.success) {
            console.log("   ✅ Success! Answer:", data.data.answer.substring(0, 100) + "...");
        } else {
            console.log("   ❌ Failed:", data.message);
        }
    } catch (e) { console.error("   ❌ Error:", e.message); }

    console.log("\n------------------------------------------------");
    console.log("🏁 Tests Completed.");
}

runLiveTests();
