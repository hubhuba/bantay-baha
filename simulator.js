
let currentLevel = 80.0; 

setInterval(async () => {
   
    const change = (Math.random() * 6) - 3;
    currentLevel += change;

   
    if (currentLevel < 0) currentLevel = 0;
    if (currentLevel > 500) currentLevel = 500;

    const payload = {
        sensorId: "CREEK-01",
        waterLevelCm: parseFloat(currentLevel.toFixed(1)),
        timestamp: new Date().toISOString()
    };

    try {
      
        const response = await fetch('http://127.0.0.1:3000/api/readings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log(`Sent reading: ${payload.waterLevelCm} cm`);
        } else {
            console.error('Failed to send reading:', response.status);
        }
    } catch (error) {
        console.error('Error connecting to API:', error.message);
    }
}, 5000); 