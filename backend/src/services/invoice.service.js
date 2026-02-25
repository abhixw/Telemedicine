const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const logger = require('../config/logger');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

const S3_BUCKET = process.env.AWS_BUCKET_NAME;

/**
 * Generate appointment invoice PDF
 * @param {Object} invoiceData - Invoice details
 * @returns {Promise<Object>} - PDF buffer and metadata
 */
const generateInvoicePDF = async (invoiceData) => {
  return new Promise((resolve, reject) => {
    try {
      const {
        appointmentId,
        patientName,
        patientEmail,
        patientPhone,
        doctorName,
        doctorSpecialization,
        appointmentDate,
        appointmentTime,
        consultationType,
        amount,
        paymentId,
        orderId,
        invoiceDate
      } = invoiceData;

      // Create a document
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      
      const chunks = [];
      
      // Collect PDF data
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve({ buffer: pdfBuffer, filename: `invoice_${appointmentId}.pdf` });
      });
      doc.on('error', reject);

      // Format date
      const formattedDate = new Date(appointmentDate).toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const formattedInvoiceDate = new Date(invoiceDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Colors
      const primaryColor = '#2563EB';
      const textColor = '#1F2937';
      const lightGray = '#F3F4F6';
      const borderColor = '#E5E7EB';

      // Header
      doc.fontSize(28).fillColor(primaryColor).text('Telemedicine', 50, 50);
      doc.fontSize(10).fillColor('#6B7280').text('Telemedicine Platform', 50, 82);

      // Invoice Title
      doc.fontSize(24).fillColor(textColor).text('INVOICE', 400, 50);
      doc.fontSize(10).fillColor('#6B7280').text(`Invoice Date: ${formattedInvoiceDate}`, 400, 80);
      doc.fontSize(10).text(`Invoice #: INV-${appointmentId.slice(-8).toUpperCase()}`, 400, 95);

      // Line separator
      doc.moveTo(50, 130).lineTo(545, 130).strokeColor(borderColor).stroke();

      // Patient Details Section
      doc.fontSize(12).fillColor(primaryColor).text('PATIENT DETAILS', 50, 150);
      doc.fontSize(10).fillColor(textColor)
        .text(`Name: ${patientName}`, 50, 175)
        .text(`Email: ${patientEmail}`, 50, 190)
        .text(`Phone: ${patientPhone}`, 50, 205);

      // Doctor Details Section
      doc.fontSize(12).fillColor(primaryColor).text('DOCTOR DETAILS', 320, 150);
      doc.fontSize(10).fillColor(textColor)
        .text(`Dr. ${doctorName}`, 320, 175)
        .text(`${doctorSpecialization}`, 320, 190);

      // Appointment Details Section
      doc.moveTo(50, 240).lineTo(545, 240).strokeColor(borderColor).stroke();
      
      doc.fontSize(14).fillColor(primaryColor).text('APPOINTMENT DETAILS', 50, 260);
      
      // Create a table-like structure
      const detailsY = 290;
      doc.rect(50, detailsY, 495, 120).fillAndStroke(lightGray, borderColor);
      
      doc.fillColor(textColor).fontSize(10);
      doc.text('Appointment ID:', 70, detailsY + 15);
      doc.text(appointmentId, 300, detailsY + 15);
      
      doc.text('Appointment Date:', 70, detailsY + 35);
      doc.text(formattedDate, 300, detailsY + 35);
      
      doc.text('Appointment Time:', 70, detailsY + 55);
      doc.text(appointmentTime, 300, detailsY + 55);
      
      doc.text('Consultation Type:', 70, detailsY + 75);
      const consultationText = consultationType === 'video' ? '🎥 Video Consultation' : '🏥 In-Person Consultation';
      doc.text(consultationText, 300, detailsY + 75);
      
      doc.text('Payment Status:', 70, detailsY + 95);
      doc.fillColor('#16A34A').text('✓ PAID', 300, detailsY + 95);

      // Payment Details Section
      doc.moveTo(50, 440).lineTo(545, 440).strokeColor(borderColor).stroke();
      
      doc.fontSize(14).fillColor(primaryColor).text('PAYMENT DETAILS', 50, 460);
      
      const paymentY = 490;
      doc.fontSize(10).fillColor(textColor);
      doc.text('Payment ID:', 70, paymentY);
      doc.text(paymentId, 300, paymentY);
      
      doc.text('Order ID:', 70, paymentY + 20);
      doc.text(orderId, 300, paymentY + 20);
      
      doc.text('Payment Method:', 70, paymentY + 40);
      doc.text('Razorpay - Online Payment', 300, paymentY + 40);

      // Amount Section
      doc.moveTo(50, 580).lineTo(545, 580).strokeColor(borderColor).stroke();
      
      const amountY = 600;
      doc.fontSize(11).fillColor(textColor);
      doc.text('Consultation Fee:', 70, amountY);
      doc.text(`₹${amount.toFixed(2)}`, 470, amountY, { align: 'right' });
      
      doc.text('Platform Fee:', 70, amountY + 20);
      doc.text('₹0.00', 470, amountY + 20, { align: 'right' });
      
      doc.moveTo(50, amountY + 50).lineTo(545, amountY + 50).strokeColor(borderColor).stroke();
      
      doc.fontSize(14).fillColor(primaryColor);
      doc.text('Total Amount:', 70, amountY + 60);
      doc.fontSize(16).text(`₹${amount.toFixed(2)}`, 470, amountY + 60, { align: 'right' });

      // Footer
      const footerY = 720;
      doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor(borderColor).stroke();
      
      doc.fontSize(9).fillColor('#6B7280')
        .text('Thank you for choosing Telemedicine!', 50, footerY + 15, { align: 'center', width: 495 });
      
      doc.fontSize(8)
        .text('For any queries, please contact: support@Telemedicine.com | +91-9508874235', 50, footerY + 30, { 
          align: 'center', 
          width: 495 
        });

      doc.fontSize(7).fillColor('#9CA3AF')
        .text('This is a computer-generated invoice and does not require a signature.', 50, footerY + 50, {
          align: 'center',
          width: 495
        });

      // Finalize PDF
      doc.end();

    } catch (error) {
      logger.error('PDF generation error:', error);
      reject(error);
    }
  });
};

/**
 * Upload PDF to S3 and get pre-signed URL
 * @param {Buffer} pdfBuffer - PDF buffer
 * @param {string} filename - Filename
 * @returns {Promise<string>} - Pre-signed URL valid for 7 days
 */
const uploadInvoiceToS3 = async (pdfBuffer, filename) => {
  try {
    const key = `invoices/${Date.now()}_${filename}`;
    
    // Upload to S3
    const putCommand = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf'
    });

    await s3Client.send(putCommand);
    
    // Generate pre-signed URL (valid for 7 days)
    const getCommand = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key
    });
    
    const signedUrl = await getSignedUrl(s3Client, getCommand, { 
      expiresIn: 604800 // 7 days in seconds
    });
    
    logger.info(`Invoice uploaded to S3 with pre-signed URL: ${key}`);
    return signedUrl;

  } catch (error) {
    logger.error('S3 upload error:', error);
    throw error;
  }
};

/**
 * Generate and upload invoice
 * @param {Object} invoiceData - Invoice data
 * @returns {Promise<Object>} - Invoice URL and filename
 */
const generateAndUploadInvoice = async (invoiceData) => {
  try {
    logger.info(`Generating invoice for appointment ${invoiceData.appointmentId}`);
    
   
    const { buffer, filename } = await generateInvoicePDF(invoiceData);
    
    const patientNameClean = invoiceData.patientName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
    const invoiceNumber = invoiceData.appointmentId.slice(-8).toUpperCase();
    const cleanFilename = `invoice_${patientNameClean}_INV${invoiceNumber}.pdf`;
    
    // Upload to S3
    const publicUrl = await uploadInvoiceToS3(buffer, cleanFilename);
    
    return {
      success: true,
      url: publicUrl,
      filename: cleanFilename
    };

  } catch (error) {
    logger.error('Invoice generation and upload failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  generateInvoicePDF,
  uploadInvoiceToS3,
  generateAndUploadInvoice
};
