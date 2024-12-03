const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const OpenAI = require('openai');
const cors = require('cors');
const app = express();

const port = 8081;

// MongoDB 
const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'test';

// OpenAI configuration
// Load from .env file

// CORS middleware
app.use(cors({
    origin: 'https://s4789280-triple-p-chat.uqcloud.net',
    credentials: true
}));

// Enable JSON parsing
app.use(express.json());

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, 'client/build')));

// MongoDB Endpoint
app.get('/api/databases', async function (req, res) {
    const client = new MongoClient(mongoUrl);
    await client.connect();
    const adminDb = client.db(dbName).admin();

    const dbInfo = await adminDb.listDatabases();
    const databases = dbInfo.databases.map(db => ({
        name: db.name,
        size: db.sizeOnDisk,
    }));

    res.json(databases);
});

// Chat API endpoint with detailed error logging
app.post('/api/chat', async (req, res) => {
    try {
        console.log('Received request:', req.body); // Log incoming request

        const { message, threadId } = req.body;
        
        if (!message) {
            throw new Error('Message is required');
        }

        // Create or retrieve thread
        const thread = threadId ? 
            await openai.beta.threads.retrieve(threadId) :
            await openai.beta.threads.create();
        
        console.log('Thread created/retrieved:', thread.id); // Log thread ID

        // Add message to thread
        const threadMessage = await openai.beta.threads.messages.create(
            thread.id,
            {
                role: "user",
                content: message
            }
        );
        
        console.log('Message added to thread'); // Log progress

        // Create a run
        const run = await openai.beta.threads.runs.create(
            thread.id,
            {
                assistant_id: ASSISTANT_ID
            }
        );
        
        console.log('Run created:', run.id); // Log run ID

        // Poll for completion
        let runStatus = await openai.beta.threads.runs.retrieve(
            thread.id,
            run.id
        );

        while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(
                thread.id,
                run.id
            );
            console.log('Run status:', runStatus.status); // Log status updates
        }

        if (runStatus.status === 'failed') {
            throw new Error('Assistant run failed: ' + runStatus.last_error?.message);
        }

        // Get messages
        const messages = await openai.beta.threads.messages.list(
            thread.id
        );

        console.log('Retrieved messages'); // Log success

        // Return the latest assistant message and thread ID
        res.json({
            threadId: thread.id,
            message: messages.data[0].content[0].text.value
        });

    } catch (error) {
        console.error('Detailed error:', error); // Log detailed error
        res.status(500).json({ 
            error: 'Internal Server Error',
            details: error.message 
        });
    }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(port, () => console.log(`Server running on port ${port}`));
