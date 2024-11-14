const openaiApiUrl = "https://api.openai.com/v1/chat/completions";
const API_KEY = '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';


async function getChatCompletion() {
    try {
        const response = await fetch(openaiApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: "Say this is a test!" }],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(data.choices[0].message.content);  // Output the response from OpenAI
    } catch (error) {
        console.error("Error fetching completion:", error);
    }
}

getChatCompletion();