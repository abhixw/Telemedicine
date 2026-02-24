const MedicalReport = require('../models/MedicalReport');
const ReportAnalysis = require('../models/ReportAnalysis');
const { mapKeywordsToSpecialists, getAllSpecialties } = require('../utils/specialtyMapping.util');
const { analyzeWithGemini } = require('./geminiAnalysis.service');
const logger = require('../config/logger');

/**
 * Extract text from PDF buffer
 * @param {Buffer} fileBuffer - PDF file buffer
 * @returns {Promise<String>} - Extracted text
 */
async function extractTextFromPDF(fileBuffer) {
    try {
        // Import pdf-parse dynamically
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(fileBuffer);
        return data.text || '';
    } catch (error) {
        logger.error('Error extracting text from PDF:', error);
        throw new Error('Failed to extract text from PDF');
    }
}

/**
 * Extract text from image using Tesseract.js OCR
 * FREE and open-source OCR - no API keys required!
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {String} fileName - Original file name
 * @returns {Promise<String>} - Extracted text
 */
async function extractTextFromImage(fileBuffer, fileName) {
    try {
        logger.info(`🔍 Processing image with Tesseract.js OCR: ${fileName}`);
        
        // Import Tesseract.js
        const Tesseract = require('tesseract.js');
        
        // Create worker for OCR
        const worker = await Tesseract.createWorker('eng', 1, {
            logger: m => {
                if (m.status === 'recognizing text') {
                    logger.debug(`Tesseract progress: ${Math.round(m.progress * 100)}%`);
                }
            }
        });
        
        // Perform OCR
        const { data: { text } } = await worker.recognize(fileBuffer);
        
        // Terminate worker to free resources
        await worker.terminate();
        
        if (text && text.trim().length > 0) {
            logger.info(`✅ Extracted ${text.length} characters from image using Tesseract OCR`);
            return text;
        } else {
            logger.warn(`⚠️ No text detected in image: ${fileName}`);
            return `No readable text detected in image. Image may not contain clear text or may be of poor quality.`;
        }
        
    } catch (error) {
        logger.error('❌ Tesseract OCR error:', error);
        return `Failed to process image: ${error.message}. Please ensure the image contains clear, readable text.`;
    }
}

/**
 * Extract medical keywords from text
 * Uses pattern matching and medical terminology recognition
 * @param {String} text - Text to analyze
 * @returns {Object} - Object containing keywords, conditions, bodyParts, symptoms
 */
function extractMedicalKeywords(text) {
    if (!text || text.trim() === '') {
        return {
            keywords: [],
            conditions: [],
            bodyParts: [],
            symptoms: []
        };
    }
    
    const textLower = text.toLowerCase();
    
    // Common medical keywords/terms to look for
    const medicalTerms = [
        // Symptoms
'pain', 'fever', 'cough', 'nausea', 'vomiting', 'diarrhea', 'constipation',
        'headache', 'dizziness', 'fatigue', 'weakness', 'swelling', 'rash',
        'itching', 'bleeding', 'discharge', 'numbness', 'tingling', 'shortness of breath',
        
        // Body parts
        'heart', 'lung', 'liver', 'kidney', 'brain', 'stomach', 'intestine',
        'skin', 'bone', 'joint', 'muscle', 'eye', 'ear', 'nose', 'throat',
        'blood', 'urine', 'chest', 'abdomen', 'head', 'spine', 'neck',
        
        // Conditions/Diseases
        'diabetes', 'hypertension', 'asthma', 'arthritis', 'cancer', 'infection',
        'inflammation', 'allergy', 'fracture', 'tumor', 'cyst', 'ulcer',
        'pneumonia', 'bronchitis', 'hepatitis', 'nephritis', 'gastritis',
        
        // Medical terms
        'diagnosis', 'treatment', 'medication', 'prescription', 'test', 'scan',
        'x-ray', 'mri', 'ct scan', 'ultrasound', 'blood test', 'urine test',
        'biopsy', 'surgery', 'procedure', 'therapy', 'chronic', 'acute'
    ];
    
    const detectedKeywords = [];
    const detectedConditions = [];
    const detectedBodyParts = [];
    const detectedSymptoms = [];
    
    // Body parts list
    const bodyPartsList = [
        'heart', 'lung', 'liver', 'kidney', 'brain', 'stomach', 'intestine',
        'skin', 'bone', 'joint', 'muscle', 'eye', 'ear', 'nose', 'throat',
        'spine', 'chest', 'abdomen', 'head', 'neck', 'hand', 'leg', 'arm',
        'foot', 'back', 'shoulder', 'knee', 'elbow', 'wrist', 'ankle'
    ];
    
    // Symptom keywords
    const symptomsList = [
        'pain', 'fever', 'cough', 'nausea', 'vomiting', 'diarrhea', 'constipation',
        'headache', 'dizziness', 'fatigue', 'weakness', 'swelling', 'rash',
        'itching', 'bleeding', 'numbness', 'tingling', 'shortness of breath'
    ];
    
    // Condition keywords
    const conditionsList = [
        'diabetes', 'hypertension', 'asthma', 'arthritis', 'cancer', 'infection',
        'inflammation', 'allergy', 'fracture', 'tumor', 'pneumonia', 'bronchitis'
    ];
    
    // Extract keywords
    medicalTerms.forEach(term => {
        if (textLower.includes(term)) {
            detectedKeywords.push(term);
            
            // Categorize
            if (bodyPartsList.includes(term)) {
                detectedBodyParts.push(term);
            }
            if (symptomsList.includes(term)) {
                detectedSymptoms.push(term);
            }
            if (conditionsList.includes(term)) {
                detectedConditions.push(term);
            }
        }
    });
    
    // Extract medical abbreviations and acronyms
    const abbreviations = ['ecg', 'ekg', 'mri', 'ct', 'cbc', 'uti', 'copd', 'gerd', 'ibs', 'adhd', 'ptsd'];
    abbreviations.forEach(abbr => {
        if (textLower.includes(abbr)) {
            detectedKeywords.push(abbr);
        }
    });
    
    // Remove duplicates
    return {
        keywords: [...new Set(detectedKeywords)],
        conditions: [...new Set(detectedConditions)],
        bodyParts: [...new Set(detectedBodyParts)],
        symptoms: [...new Set(detectedSymptoms)]
    };
}

/**
 * Process medical report and create analysis
 * @param {String} reportId - Medical report ID
 * @param {Buffer} fileBuffer - File buffer (optional, for re-processing)
 * @returns {Promise<Object>} - Report analysis result
 */
async function processReport(reportId, fileBuffer = null) {
    try {
        // Get the report
        const report = await MedicalReport.findById(reportId);
        
        if (!report) {
            throw new Error('Report not found');
        }
        
        // Mark as processing
        await report.markAsProcessing();
        
        let extractedText = '';
        
        // Extract text based on file type
        if (report.mimeType === 'application/pdf') {
            if (!fileBuffer) {
                throw new Error('File buffer required for PDF processing');
            }
            extractedText = await extractTextFromPDF(fileBuffer);
        } else if (report.mimeType.startsWith('image/')) {
            if (!fileBuffer) {
                throw new Error('File buffer required for image processing');
            }
            extractedText = await extractTextFromImage(fileBuffer, report.fileName);
        } else {
            extractedText = `File type ${report.mimeType} uploaded. Text extraction not supported yet.`;
        }
        
        // Update report with extracted text
        await report.markAsCompleted(extractedText);
        
        logger.info(`📄 Extracted ${extractedText.length} characters from report`);
        
        // 🤖 PRIMARY: Use Gemini AI for context-aware analysis
        let recommendedSpecialists = [];
        let keywords = [];
        let conditions = [];
        let bodyParts = [];
        let symptoms = [];
        let analysisSummary = '';
        let analysisMethod = 'gemini-ai';
        let confidenceScore = 0;
        
        const geminiResult = await analyzeWithGemini(extractedText);
        
        if (geminiResult.success) {
            // Use Gemini AI recommendations (context-aware)
            logger.info('✅ Using Gemini AI analysis results');
            recommendedSpecialists = geminiResult.recommendations;
            conditions = geminiResult.detectedConditions || [];
            symptoms = geminiResult.symptoms || [];
            bodyParts = geminiResult.bodyParts || [];
            keywords = geminiResult.keywords || [];
            analysisSummary = geminiResult.summary || 'AI analysis completed successfully';
            confidenceScore = recommendedSpecialists.length > 0 
                ? recommendedSpecialists[0].confidence 
                : 0;
        } else {
            // 🔄 FALLBACK: Use keyword-based mapping
            logger.warn('⚠️ Gemini AI failed, falling back to keyword mapping');
            analysisMethod = 'keyword-mapping';
            
            const keywordData = extractMedicalKeywords(extractedText);
            keywords = keywordData.keywords;
            conditions = keywordData.conditions;
            bodyParts = keywordData.bodyParts;
            symptoms = keywordData.symptoms;
            
            recommendedSpecialists = mapKeywordsToSpecialists(keywords, conditions, bodyParts);
            confidenceScore = recommendedSpecialists.length > 0 
                ? recommendedSpecialists[0].confidence 
                : 0;
            
            analysisSummary = recommendedSpecialists.length > 0
                ? `Analyzed report and detected ${keywords.length} medical keywords. Recommended ${recommendedSpecialists.length} specialist(s).`
                : 'Unable to detect specific medical conditions. Please select a specialist manually.';
        }
        
        // Determine if analysis was successful
        const analysisSuccess = recommendedSpecialists.length > 0;
        
        // Create or update report analysis
        let analysis = await ReportAnalysis.findOne({ reportId: report._id });
        
        if (!analysis) {
            analysis = new ReportAnalysis({
                reportId: report._id,
                patientId: report.patientId
            });
        }
        
        // Update analysis data
        analysis.detectedKeywords = keywords;
        analysis.detectedConditions = conditions;
        analysis.bodyParts = bodyParts;
        analysis.symptoms = symptoms;
        analysis.confidenceScore = confidenceScore;
        analysis.recommendedSpecialists = recommendedSpecialists;
        analysis.analysisSuccess = analysisSuccess;
        analysis.analysisSummary = analysisSummary;
        analysis.analysisMethod = analysisMethod; // Track which method was used
        
        // Set primary specialist
        analysis.setPrimarySpecialist();
        
        await analysis.save();
        
        logger.info(`Report ${reportId} processed successfully`);
        
        return {
            success: true,
            report,
            analysis
        };
        
    } catch (error) {
        logger.error(`Error processing report ${reportId}:`, error);
        
        // Mark report as failed
        if (reportId) {
            const report = await MedicalReport.findById(reportId);
            if (report) {
                await report.markAsFailed(error.message);
            }
        }
        
        throw error;
    }
}

/**
 * Re-analyze a report (manual trigger)
 * @param {String} reportId - Report ID to re-analyze
 * @returns {Promise<Object>} - Updated analysis
 */
async function reAnalyzeReport(reportId) {
    try {
        const report = await MedicalReport.findById(reportId);
        
        if (!report) {
            throw new Error('Report not found');
        }
        
        if (!report.extractedText || report.extractedText === '') {
            throw new Error('No extracted text available. Please re-upload the report.');
        }
        
        logger.info(`🔄 Re-analyzing report ${reportId} with Gemini AI`);
        
        // 🤖 PRIMARY: Use Gemini AI for context-aware analysis
        let recommendedSpecialists = [];
        let keywords = [];
        let conditions = [];
        let bodyParts = [];
        let symptoms = [];
        let analysisSummary = '';
        let analysisMethod = 'gemini-ai';
        let confidenceScore = 0;
        
        const geminiResult = await analyzeWithGemini(report.extractedText);
        
        if (geminiResult.success) {
            // Use Gemini AI recommendations
            logger.info('✅ Using Gemini AI re-analysis results');
            recommendedSpecialists = geminiResult.recommendations;
            conditions = geminiResult.detectedConditions || [];
            symptoms = geminiResult.symptoms || [];
            bodyParts = geminiResult.bodyParts || [];
            keywords = geminiResult.keywords || [];
            analysisSummary = geminiResult.summary || 'AI re-analysis completed successfully';
            confidenceScore = recommendedSpecialists.length > 0 
                ? recommendedSpecialists[0].confidence 
                : 0;
        } else {
            // 🔄 FALLBACK: Use keyword-based mapping
            logger.warn('⚠️ Gemini AI failed, falling back to keyword mapping');
            analysisMethod = 'keyword-mapping';
            
            const keywordData = extractMedicalKeywords(report.extractedText);
            keywords = keywordData.keywords;
            conditions = keywordData.conditions;
            bodyParts = keywordData.bodyParts;
            symptoms = keywordData.symptoms;
            
            recommendedSpecialists = mapKeywordsToSpecialists(keywords, conditions, bodyParts);
            confidenceScore = recommendedSpecialists.length > 0 
                ? recommendedSpecialists[0].confidence 
                : 0;
            
            analysisSummary = recommendedSpecialists.length > 0
                ? `Re-analyzed report and detected ${keywords.length} medical keywords. Recommended ${recommendedSpecialists.length} specialist(s).`
                : 'Unable to detect specific medical conditions. Please select a specialist manually.';
        }
        
        const analysisSuccess = recommendedSpecialists.length > 0;
        
        // Update analysis
        let analysis = await ReportAnalysis.findOne({ reportId: report._id });
        
        if (!analysis) {
            analysis = new ReportAnalysis({
                reportId: report._id,
                patientId: report.patientId
            });
        }
        
        analysis.detectedKeywords = keywords;
        analysis.detectedConditions = conditions;
        analysis.bodyParts = bodyParts;
        analysis.symptoms = symptoms;
        analysis.confidenceScore = confidenceScore;
        analysis.recommendedSpecialists = recommendedSpecialists;
        analysis.analysisSuccess = analysisSuccess;
        analysis.analysisSummary = analysisSummary;
        analysis.analysisMethod = analysisMethod;
        analysis.setPrimarySpecialist();
        
        await analysis.save();
        
        return {
            success: true,
            analysis
        };
        
    } catch (error) {
        logger.error(`Error re-analyzing report ${reportId}:`, error);
        throw error;
    }
}

/**
 * Get available specialties for manual selection
 * @returns {Array} - List of all available specialties
 */
function getAvailableSpecialties() {
    return getAllSpecialties();
}

module.exports = {
    processReport,
    reAnalyzeReport,
    extractTextFromPDF,
    extractTextFromImage,
    extractMedicalKeywords,
    getAvailableSpecialties
};
