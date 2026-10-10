require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

let readings = [];

// Receiver endpoint for IoT Simulator
app.post('/api/readings', (req, res) => {
    const { waterLevelCm } = req.body;
    if (typeof waterLevelCm !== 'number') {
        return res.status(400).json({ error: "Invalid water level data" });
    }
    const newReading = {
        waterLevelCm,
        timestamp: new Date().toISOString()
    };
    readings.unshift(newReading);
    if (readings.length > 50) readings.pop();
    res.status(201).json(newReading);
});

// GET /api/readings
app.get('/api/readings', (req, res) => {
    res.json(readings);
});

// GET /api/summary
app.get('/api/summary', (req, res) => {
    if (readings.length === 0) {
        return res.json({ message: "No readings available." });
    }

    const levels = readings.map(r => r.waterLevelCm);
    const average = (levels.reduce((a, b) => a + b, 0) / levels.length).toFixed(1);
    const min = Math.min(...levels);
    const max = Math.max(...levels);

    let normalCount = 0, alertCount = 0, dangerCount = 0;
    levels.forEach(level => {
        if (level >= 150) dangerCount++;
        else if (level >= 100) alertCount++;
        else normalCount++;
    });

    let trend = "Steady";
    if (readings.length >= 10) {
        const latest5Avg = levels.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
        const previous5Avg = levels.slice(5, 10).reduce((a, b) => a + b, 0) / 5;
        if (latest5Avg > previous5Avg + 1) trend = "Rising";
        else if (latest5Avg < previous5Avg - 1) trend = "Falling";
    }

    res.json({
        average: Number(average),
        min,
        max,
        statusCounts: { Normal: normalCount, Alert: alertCount, Danger: dangerCount },
        trend
    });
});

// Fallback logic for rule-based advisory
function getFallbackAdvisory(summary) {
    const avg = summary.average;
    const trend = summary.trend;

    if (avg >= 150) {
        return "DANGER: Water level is high (" + avg + " cm) and trending " + trend + ". Evacuate immediately to higher ground.\n\n" +
               "BABALA: Mataas ang tubig (" + avg + " cm) at " + trend + ". Lumikas agad sa mas mataas na lugar.";
    } else if (avg >= 100) {
        return "ALERT: Water level is elevated (" + avg + " cm) and trending " + trend + ". Prepare emergency kits and stay tuned for updates.\n\n" +
               "MAG-INGAT: Tumaas ang tubig (" + avg + " cm) at " + trend + ". Ihanda ang emergency kit at mag-abang sa mga balita.";
    } else {
        return "NORMAL: Water level is safe (" + avg + " cm) and trending " + trend + ". Keep monitoring for further updates.\n\n" +
               "LIGTAS: Normal ang antas ng tubig (" + avg + " cm) at " + trend + ". Patuloy na magmatyag sa mga susunod na ulat.";
    }
}

// POST /api/advisory
app.post('/api/advisory', async (req, res) => {
    if (readings.length === 0) {
        return res.json({ advisory: "No sensor readings available to analyze." });
    }

    const levels = readings.map(r => r.waterLevelCm);
    const average = (levels.reduce((a, b) => a + b, 0) / levels.length).toFixed(1);
    const min = Math.min(...levels);
    const max = Math.max(...levels);

    let trend = "Steady";
    if (readings.length >= 10) {
        const latest5Avg = levels.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
        const previous5Avg = levels.slice(5, 10).reduce((a, b) => a + b, 0) / 5;
        if (latest5Avg > previous5Avg + 1) trend = "Rising";
        else if (latest5Avg < previous5Avg - 1) trend = "Falling";
    }

    const summaryData = { average: Number(average), min, max, trend };

    try {
        const { GoogleGenAI } = require('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });

        const prompt = `You are an emergency flood advisory system in the Philippines.
Based ONLY on these water level numbers:
- Average Water Level: ${summaryData.average} cm
- Minimum Water Level: ${summaryData.min} cm
- Maximum Water Level: ${summaryData.max} cm
- Water Level Trend: ${summaryData.trend}

Write a clear, safety-focused advisory for local residents.
Rules:
1. Maximum 3 sentences total.
2. Provide the advisory in BOTH English and Filipino.
3. Use ONLY the provided numbers. Do NOT invent external weather reports or external locations.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        res.json({ advisory: response.text });

    } catch (error) {
        console.log("AI Call failed, switching to rule-based fallback:", error.message);
        const fallbackText = getFallbackAdvisory(summaryData);
        res.json({ advisory: fallbackText });
    }
});

const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});