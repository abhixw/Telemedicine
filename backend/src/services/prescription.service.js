const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, S3_BUCKET } = require('../config/s3');
const logger = require('../config/logger');
const crypto = require('crypto');

/**
 * Generate prescription PDF with QR code verification
 * @param {Object} prescriptionData - Prescription details
 * @returns {Promise<Object>} - PDF buffer, S3 key, and verification code
 */
const generatePrescriptionPDF = async (prescriptionData) => {
  return new Promise(async (resolve, reject) => {
    try {
      const {
        prescriptionId,
        patientName,
        patientAge,
        patientGender,
        doctorName,
        doctorSpecialization,
        doctorLicense,
        diagnosis,
        medicines,
        testsRecommended,
        followUpDate,
        specialInstructions,
        appointmentDate
      } = prescriptionData;

      // Generate verification code
      const verificationCode = crypto.randomBytes(16).toString('hex');
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-prescription/${verificationCode}`;

      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 150
      });

      // Create a document
      const doc = new PDFDocument({ 
        margin: 50, 
        size: 'A4',
        bufferPages: true
      });
      
      const chunks = [];
      
      // Collect PDF data
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve({ pdfBuffer, verificationCode });
      });

      // Colors
      const primaryColor = '#2563EB';
      const secondaryColor = '#64748B';
      const lightGray = '#F1F5F9';

      // Header
      doc.fontSize(24)
         .fillColor(primaryColor)
         .text('MEDICAL PRESCRIPTION', { align: 'center' })
         .moveDown(0.5);

      // Watermark
      doc.fontSize(10)
         .fillColor('#CBD5E1')
         .text('Digitally Generated - Telemedicine Platform', { align: 'center' })
         .moveDown(1);

      // Doctor Details Box
      doc.rect(50, doc.y, doc.page.width - 100, 80)
         .fillAndStroke(lightGray, '#E2E8F0');

      const doctorBoxY = doc.y + 15;
      doc.fillColor('#1E293B')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text(`Dr. ${doctorName}`, 60, doctorBoxY);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(secondaryColor)
         .text(`${doctorSpecialization}`, 60, doctorBoxY + 20)
         .text(`License No: ${doctorLicense}`, 60, doctorBoxY + 35)
         .text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 60, doctorBoxY + 50);

      doc.moveDown(6);

      // Patient Details
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#1E293B')
         .text('PATIENT INFORMATION', 50, doc.y);

      doc.moveDown(0.5);
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#1E293B')
         .text(`Name: ${patientName}`, 50)
         .text(`Age: ${patientAge} years`, 300, doc.y - 12)
         .text(`Gender: ${patientGender}`, 450, doc.y - 12)
         .moveDown(0.5);

      if (appointmentDate) {
        doc.text(`Consultation Date: ${new Date(appointmentDate).toLocaleDateString('en-IN')}`, 50);
      }

      doc.moveDown(1);

      // Diagnosis Section
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text('DIAGNOSIS', 50);

      doc.moveDown(0.3);
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#1E293B')
         .text(diagnosis, 50, doc.y, { 
           width: doc.page.width - 100,
           align: 'justify'
         });

      doc.moveDown(1.5);

      // Medicines Section with Rx Symbol
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text('℞', 45, doc.y);

      doc.fontSize(12)
         .text('MEDICINES PRESCRIBED', 60, doc.y - 14);

      doc.moveDown(0.5);

      // Medicine table
      medicines.forEach((medicine, index) => {
        if (doc.y > 650) {
          doc.addPage();
        }

        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor('#1E293B')
           .text(`${index + 1}. ${medicine.name}`, 50);

        doc.fontSize(9)
           .font('Helvetica')
           .fillColor(secondaryColor)
           .text(`   Dosage: ${medicine.dosage}`, 50)
           .text(`   Frequency: ${medicine.frequency}`, 50)
           .text(`   Duration: ${medicine.duration}`, 50);

        if (medicine.instructions) {
          doc.fillColor('#DC2626')
             .text(`   Instructions: ${medicine.instructions}`, 50);
        }

        doc.moveDown(0.8);
      });

      doc.moveDown(0.5);

      // Tests Recommended
      if (testsRecommended && testsRecommended.length > 0) {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor(primaryColor)
           .text('TESTS RECOMMENDED', 50);

        doc.moveDown(0.3);
        testsRecommended.forEach((test, index) => {
          doc.fontSize(10)
             .font('Helvetica')
             .fillColor('#1E293B')
             .text(`${index + 1}. ${test}`, 60);
        });

        doc.moveDown(1);
      }

      // Special Instructions
      if (specialInstructions) {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor(primaryColor)
           .text('SPECIAL INSTRUCTIONS', 50);

        doc.moveDown(0.3);
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#1E293B')
           .text(specialInstructions, 50, doc.y, { 
             width: doc.page.width - 100,
             align: 'justify'
           });

        doc.moveDown(1);
      }

      // Follow-up
      if (followUpDate) {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#DC2626')
           .text(`⚠ Follow-up Date: ${new Date(followUpDate).toLocaleDateString('en-IN')}`, 50);
        doc.moveDown(1);
      }

      // Footer - Doctor Signature and QR Code
      const footerY = doc.page.height - 150;
      
      if (doc.y > footerY - 20) {
        doc.addPage();
      } else {
        doc.y = footerY;
      }

      doc.moveTo(50, doc.y)
         .lineTo(doc.page.width - 50, doc.y)
         .stroke('#E2E8F0');

      doc.moveDown(1);

      // QR Code on the left
      const qrImage = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
      doc.image(qrImage, 50, doc.y, { width: 80, height: 80 });

      doc.fontSize(7)
         .font('Helvetica')
         .fillColor(secondaryColor)
         .text('Scan to verify', 50, doc.y + 85, { width: 80, align: 'center' });

      // Doctor signature on the right
      const signatureY = doc.y - 80;
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#1E293B')
         .text(`Dr. ${doctorName}`, doc.page.width - 200, signatureY, { align: 'right' });

      doc.fontSize(8)
         .fillColor(secondaryColor)
         .text(doctorSpecialization, doc.page.width - 200, signatureY + 15, { align: 'right' })
         .text(`License: ${doctorLicense}`, doc.page.width - 200, signatureY + 28, { align: 'right' })
         .text(`Generated: ${new Date().toLocaleString('en-IN')}`, doc.page.width - 200, signatureY + 41, { align: 'right' });

      // Prescription ID at bottom
      doc.fontSize(7)
         .fillColor('#94A3B8')
         .text(`Prescription ID: ${prescriptionId}`, 50, doc.page.height - 40, { 
           align: 'center',
           width: doc.page.width - 100 
         })
         .text(`Verification Code: ${verificationCode}`, 50, doc.page.height - 28, { 
           align: 'center',
           width: doc.page.width - 100 
         });

      // Finalize PDF
      doc.end();

    } catch (error) {
      logger.error('Error generating prescription PDF:', error);
      reject(error);
    }
  });
};

/**
 * Upload prescription PDF to S3
 * @param {Buffer} pdfBuffer - PDF buffer
 * @param {String} prescriptionId - Prescription ID
 * @returns {Promise<Object>} - S3 URL and key
 */
const uploadPrescriptionToS3 = async (pdfBuffer, prescriptionId) => {
  try {
    const timestamp = Date.now();
    const s3Key = `prescriptions/${prescriptionId}/${timestamp}-prescription.pdf`;

    const uploadParams = {
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: pdfBuffer,
      ContentType: 'application/pdf'
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    const pdfUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    logger.info(`Prescription PDF uploaded to S3: ${s3Key}`);

    return { pdfUrl, s3Key };

  } catch (error) {
    logger.error('Error uploading prescription to S3:', error);
    throw error;
  }
};

/**
 * Generate a pre-signed URL for downloading a prescription PDF from S3
 * @param {String} s3Key - The S3 key of the PDF
 * @param {Number} expiresIn - URL expiry in seconds (default 15 minutes)
 * @returns {Promise<String>} - Pre-signed URL
 */
const getPresignedPdfUrl = async (s3Key, expiresIn = 604800) => {
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    logger.error('Error generating pre-signed URL for prescription:', error);
    throw error;
  }
};

module.exports = {
  generatePrescriptionPDF,
  uploadPrescriptionToS3,
  getPresignedPdfUrl
};
