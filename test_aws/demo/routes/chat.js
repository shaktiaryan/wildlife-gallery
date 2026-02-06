const express = require('express');
const OpenAI = require('openai');
const { isAuthenticated } = require('../middleware/auth');
const { db } = require('../config/database');

const router = express.Router();

// Initialize OpenAI client
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

// POST /chat - Send message to OpenAI
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!openai) {
      return res.status(503).json({
        error: 'Chat service unavailable. Please configure OPENAI_API_KEY in .env file.'
      });
    }

    // Get all creatures for context
    const creatures = await db.all(`
      SELECT c.name, c.scientific_name, c.description, c.habitat, c.diet, cat.name as category
      FROM creatures c
      JOIN categories cat ON c.category_id = cat.id
    `);

    const systemPrompt = `You are a helpful assistant for an animal and bird gallery website.
You help users learn about various animals and birds. Be friendly, informative, and educational.

Here are the animals and birds in our gallery:
${creatures.map(c => `- ${c.name} (${c.category}): ${c.description?.substring(0, 100) || 'No description'}...`).join('\n')}

${context ? `Current context: The user is viewing ${context}` : ''}

Provide helpful, accurate information about animals and birds. If asked about something not in our gallery,
you can still provide general information but mention that it's not currently in our collection.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const reply = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    res.json({ reply });
  } catch (error) {
    console.error('Chat error:', error);

    if (error.code === 'insufficient_quota') {
      return res.status(503).json({
        error: 'OpenAI API quota exceeded. Please check your API key and billing.'
      });
    }

    if (error.code === 'invalid_api_key') {
      return res.status(503).json({
        error: 'Invalid OpenAI API key. Please check your configuration.'
      });
    }

    res.status(500).json({ error: 'Error processing your message. Please try again.' });
  }
});

module.exports = router;
