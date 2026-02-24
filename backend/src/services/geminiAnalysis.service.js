const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../config/logger');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Available medical specialties in our platform
const AVAILABLE_SPECIALTIES = [
    'Dermatologist',
    'Cardiologist',
    'Neurologist',
    'Orthopedic',
    'Ophthalmologist',
    'ENT Specialist',
    'Gastroenterologist',
    'Pulmonologist',
    'Endocrinologist',
    'Nephrologist',
    'Psychiatrist',
    'Gynecologist',
    'Urologist',
    'General Physician'
];

/**
 * Analyze medical report text using Gemini AI
 * @param {String} extractedText - Text extracted from medical report
 * @returns {Object} - Analysis results with recommended specialists
 */
async function analyzeWithGemini(extractedText) {
    try {
        if (!extractedText || extractedText.trim().length < 10) {
            logger.warn('Text too short for Gemini analysis');
            return {
                success: false,
                error: 'Insufficient text for analysis',
                recommendations: [],
                keywords: [],
                conditions: [],
                summary: ''
            };
        }

        logger.info('🤖 Starting Gemini AI analysis...');

        // Get the generative model (using gemini-2.5-flash - fast and reliable)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Create detailed prompt for medical analysis
        const prompt = `You are a friendly medical AI assistant helping patients understand their medical reports. Many patients are from villages and may not understand complex medical terms. Use SIMPLE, EASY language that anyone can understand.

**Available Medical Specialties:**
${AVAILABLE_SPECIALTIES.map((s, i) => `${i + 1}. ${s}`).join('\n')}

**Medical Report Text:**
${extractedText}

**Your Task:**
Analyze this medical report and provide recommendations in SIMPLE, EASY-TO-UNDERSTAND language.

**LANGUAGE GUIDELINES:**
- Use simple everyday words, NOT complex medical terms
- Explain like you're talking to a friend or family member
- Use conversational, friendly tone
- Keep sentences short and clear
- If you must use a medical term, explain it in simple words
- Examples:
  ✅ Good: "Your heart is not beating properly" 
  ❌ Bad: "Cardiac arrhythmia detected"
  
  ✅ Good: "You have high blood pressure which can affect your heart"
  ❌ Bad: "Hypertensive condition with potential cardiovascular complications"

**Provide Information About:**

1. **Detected Medical Conditions**: Simple names of health problems found
2. **Key Symptoms**: What the patient is feeling (in simple words)
3. **Body Parts/Systems Affected**: Which parts of the body are involved
4. **Recommended Specialists**: Up to 3 most suitable doctors from the list
5. **Confidence Scores**: How sure we are (0-100) for each doctor recommendation
6. **Reasoning**: WHY we recommend this doctor - in SIMPLE, FRIENDLY language that a village patient can understand
7. **Summary**: A simple, short explanation of what's going on with the patient's health

**Important Context Rules:**
- Consider negations (e.g., "no ear problems" means DON'T recommend ENT)
- Focus on current symptoms, not past resolved issues
- Consider severity and urgency
- If report mentions multiple issues, prioritize the most significant
- If unclear or insufficient information, recommend General Physician with lower confidence

**Response Format (JSON only, no markdown):**
{
  "detectedConditions": ["simple condition name 1", "simple condition name 2"],
  "symptoms": ["simple symptom 1", "simple symptom 2"],
  "bodyParts": ["body part 1", "body part 2"],
  "recommendedSpecialists": [
    {
      "specialty": "Doctor Specialty Name",
      "confidence": 85,
      "reason": "Simple, friendly explanation in everyday language why this doctor is recommended. Talk like a friend explaining to someone."
    }
  ],
  "summary": "A simple, short, friendly explanation of the patient's health condition in easy words",
  "keywords": ["keyword1", "keyword2"]
}

REMEMBER: Use SIMPLE language. Avoid complex medical jargon. Be friendly and clear. Provide ONLY valid JSON, no other text.`;

        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        logger.info('✅ Gemini AI response received');
        logger.debug('Raw Gemini response:', text);

        // Parse JSON response
        let analysisData;
        try {
            // Remove markdown code blocks if present
            const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            analysisData = JSON.parse(cleanedText);
        } catch (parseError) {
            logger.error('Failed to parse Gemini JSON response:', parseError);
            logger.error('Response text:', text);
            
            // Fallback: try to extract information from text
            return {
                success: false,
                error: 'Failed to parse AI response',
                recommendations: [],
                keywords: [],
                conditions: [],
                summary: 'Analysis failed - please try again'
            };
        }

        // Validate and format response
        const recommendations = (analysisData.recommendedSpecialists || [])
            .filter(spec => AVAILABLE_SPECIALTIES.includes(spec.specialty))
            .slice(0, 3) // Top 3 recommendations
            .map(spec => ({
                specialty: spec.specialty,
                confidence: Math.min(100, Math.max(0, spec.confidence || 50)),
                reason: spec.reason || 'Based on report analysis'
            }))
            .sort((a, b) => b.confidence - a.confidence);

        // If no valid recommendations, suggest General Physician
        if (recommendations.length === 0) {
            recommendations.push({
                specialty: 'General Physician',
                confidence: 60,
                reason: 'For comprehensive health evaluation'
            });
        }

        logger.info(`🎯 Gemini recommended ${recommendations.length} specialists:`, 
            recommendations.map(r => `${r.specialty} (${r.confidence}%)`).join(', '));

        return {
            success: true,
            recommendations,
            detectedConditions: analysisData.detectedConditions || [],
            symptoms: analysisData.symptoms || [],
            bodyParts: analysisData.bodyParts || [],
            keywords: analysisData.keywords || [],
            summary: analysisData.summary || 'Medical report analyzed successfully',
            aiProvider: 'gemini-2.5-flash'
        };

    } catch (error) {
        logger.error('❌ Gemini AI analysis error:', error);
        
        // Check for specific error types
        if (error.message?.includes('API_KEY')) {
            logger.error('Invalid or missing Gemini API key');
        } else if (error.message?.includes('quota')) {
            logger.error('Gemini API quota exceeded');
        }

        return {
            success: false,
            error: error.message || 'AI analysis failed',
            recommendations: [],
            keywords: [],
            conditions: [],
            summary: 'Analysis failed - please try again'
        };
    }
}

/**
 * Test Gemini API connection
 */
async function testGeminiConnection() {
    try {
        logger.info('Testing Gemini API connection...');
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent('Say "API connection successful" if you can read this.');
        const response = await result.response;
        const text = response.text();
        logger.info('✅ Gemini API test successful:', text);
        return { success: true, message: text };
    } catch (error) {
        logger.error('❌ Gemini API test failed:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    analyzeWithGemini,
    testGeminiConnection,
    AVAILABLE_SPECIALTIES
};
