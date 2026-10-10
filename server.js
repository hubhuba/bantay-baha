const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());


let readings = []; 


app.post('/api/readings', (req, res) => {
    const { sensorId, waterLevelCm, timestamp } = req.body;

  
    if (!sensorId) {
        return res.status(400).json({ error: "sensorId is required." });
    }
    if (waterLevelCm === undefined || typeof waterLevelCm !== 'number' || waterLevelCm < 0 || waterLevelCm > 500) {
        return res.status(400).json({ error: "waterLevelCm must be a number between 0 and 500." });
    }

    const newReading = {
        sensorId,
        waterLevelCm,
        timestamp: timestamp || new Date().toISOString()
    };

   
    readings.unshift(newReading);


    res.status(201).json({ message: "Reading saved successfully.", reading: newReading });
});

app.get('/api/readings', (req, res) => {

    res.json(readings.slice(0, 50));
});


app.get('/api/summary', (req, res) => {

    res.json({ message: "Summary data will go here in Part E." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});