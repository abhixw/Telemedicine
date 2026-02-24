/**
 * OCR Configuration
 * 
 * Easily switch between different OCR providers by changing OCR_PROVIDER env variable
 * 
 * Available providers:
 * - 'google' - Google Cloud Vision API (most accurate, needs API key)
 * - 'aws' - AWS Textract (good accuracy, uses existing AWS credentials)
 * - 'tesseract' - Tesseract.js (free, open source, no API key needed)
 * - 'none' - No OCR processing (returns placeholder message)
 * 
 * Set in .env file:
 * OCR_PROVIDER=tesseract
 */

const logger = require('../config/logger');

// Import OCR services (only import if package is installed)
let googleVisionOCR = null;
let awsTextractOCR = null;
let tesseractOCR = null;

try {
    googleVisionOCR = require('./ocr/googleVisionOCR.service');
} catch (e) {
    logger.debug('Google Vision OCR not available (package not installed)');
}

try {
    awsTextractOCR = require('./ocr/awsTextractOCR.service');
} catch (e) {
    logger.debug('AWS Textract OCR not available (package not installed)');
}

try {
    tesseractOCR = require('./ocr/tesseractOCR.service');
} catch (e) {
    logger.debug('Tesseract OCR not available (package not installed)');
}

// Get OCR provider from environment variable
const OCR_PROVIDER = process.env.OCR_PROVIDER || 'none';

/**
 * Extract text from image using configured OCR provider
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {String} fileName - Original file name
 * @returns {Promise<String>} - Extracted text
 */
async function extractTextFromImage(fileBuffer, fileName) {
    logger.info(`OCR Provider: ${OCR_PROVIDER}`);
    
    switch (OCR_PROVIDER.toLowerCase()) {
        case 'google':
            if (!googleVisionOCR) {
                throw new Error('Google Cloud Vision OCR is not installed. Run: npm install @google-cloud/vision');
            }
            logger.info(`Using Google Cloud Vision OCR for: ${fileName}`);
            return await googleVisionOCR.extractTextFromImageWithGoogleVision(fileBuffer, fileName);
        
        case 'aws':
            if (!awsTextractOCR) {
                throw new Error('AWS Textract OCR is not installed. Run: npm install @aws-sdk/client-textract');
            }
            logger.info(`Using AWS Textract OCR for: ${fileName}`);
            return await awsTextractOCR.extractTextFromImageWithAWSTextract(fileBuffer, fileName);
        
        case 'tesseract':
            if (!tesseractOCR) {
                throw new Error('Tesseract.js OCR is not installed. Run: npm install tesseract.js');
            }
            logger.info(`Using Tesseract.js OCR for: ${fileName}`);
            return await tesseractOCR.extractTextFromImageWithTesseract(fileBuffer, fileName);
        
        case 'none':
        default:
            logger.warn(`No OCR provider configured. Image text extraction disabled.`);
            return `Medical image uploaded: ${fileName}. OCR is not configured. Set OCR_PROVIDER environment variable to enable text extraction.`;
    }
}

module.exports = {
    extractTextFromImage,
    OCR_PROVIDER
};
