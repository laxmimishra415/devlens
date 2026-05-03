const pool = require('../db');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const reviewCode = async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' });
    }

    const prompt = `You are an expert code reviewer. Review the following ${language} code and provide feedback in this EXACT JSON format only, no extra text:
{
  "bugs": ["bug1", "bug2"],
  "performance": ["issue1", "issue2"],
  "security": ["issue1", "issue2"],
  "suggestions": ["suggestion1", "suggestion2"]
}

Code to review:
${code}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const cleanResponse = responseText.replace(/```json|```/g, '').trim();
    const reviewData = JSON.parse(cleanResponse);

    const savedReview = await pool.query(
      `INSERT INTO reviews (user_id, code, language, bugs, performance, security, suggestions)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        req.user.id,
        code,
        language,
        JSON.stringify(reviewData.bugs || []),
        JSON.stringify(reviewData.performance || []),
        JSON.stringify(reviewData.security || []),
        JSON.stringify(reviewData.suggestions || [])
      ]
    );

    res.json({
      message: 'Review complete',
      review: {
        id: savedReview.rows[0].id,
        language,
        bugs: reviewData.bugs || [],
        performance: reviewData.performance || [],
        security: reviewData.security || [],
        suggestions: reviewData.suggestions || []
      }
    });

  } catch (err) {
    console.error('Review error:', err.message);
    res.status(500).json({ error: 'Review failed: ' + err.message });
  }
};

const getReviews = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM reviews WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ reviews: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { reviewCode, getReviews };