import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  Image,
  File,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader,
  Sparkles,
  Stethoscope,
  Calendar,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { patientAPI } from '../../api';
import toast from 'react-hot-toast';
import DoctorCard from './components/DoctorCard';
import BookingModal from './components/BookingModal';
import DoctorProfileModal from './components/DoctorProfileModal';

const MedicalReportAnalysis = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [recommendedDoctors, setRecommendedDoctors] = useState([]);
  const [availableSpecialties, setAvailableSpecialties] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await patientAPI.getMedicalReports({ limit: 50 });
      setReports(response.data.reports || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAnalysis = async (report) => {
    try {
      setSelectedReport(report);
      
      if (report.processingStatus !== 'completed') {
        toast.loading('Report is still being processed...', { id: 'processing' });
        return;
      }

      const response = await patientAPI.getReportAnalysis(report._id);
      setAnalysisData(response.data.analysis);
      setRecommendedDoctors(response.data.recommendedDoctors || []);
      setAvailableSpecialties(response.data.availableSpecialties || []);
    } catch (error) {
      console.error('Error fetching analysis:', error);
      toast.error('Failed to load analysis');
    }
  };

  const handleManualSpecialtySelection = async (specialty) => {
    try {
      if (!selectedReport) return;
      
      const response = await patientAPI.selectSpecialtyManually(selectedReport._id, specialty);
      setRecommendedDoctors(response.data.doctors || []);
      setAnalysisData(response.data.analysis);
      toast.success(`Showing ${specialty} doctors`);
    } catch (error) {
      console.error('Error selecting specialty:', error);
      toast.error('Failed to load doctors');
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      await patientAPI.deleteMedicalReport(reportId);
      toast.success('Report deleted successfully');
      fetchReports();
      if (selectedReport?._id === reportId) {
        setSelectedReport(null);
        setAnalysisData(null);
        setRecommendedDoctors([]);
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report');
    }
  };

  const handleReanalyze = async (reportId) => {
    try {
      const response = await patientAPI.reanalyzeMedicalReport(reportId);
      toast.success('Report re-analyzed successfully');
      setAnalysisData(response.data.analysis);
      fetchReports();
    } catch (error) {
      console.error('Error re-analyzing report:', error);
      toast.error('Failed to re-analyze report');
    }
  };

  const handleBookAppointment = async (doctor) => {
    setSelectedDoctor(doctor);
    setIsBookingOpen(true);
  };

  const handleViewProfile = (doctor) => {
    setSelectedDoctor(doctor);
    setIsProfileOpen(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Analyzed';
      case 'processing':
        return 'Processing...';
      case 'failed':
        return 'Failed';
      default:
        return 'Pending';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-purple-600" />
                AI Medical Report Analysis
              </h1>
              <p className="text-gray-600 mt-2">
                Upload your medical reports and get instant doctor recommendations
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setUploadModalOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Upload Report
            </motion.button>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reports List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">My Reports</h2>
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No reports uploaded yet</p>
                  <button
                    onClick={() => setUploadModalOpen(true)}
                    className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Upload your first report
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {reports.map((report) => (
                    <motion.div
                      key={report._id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => handleViewAnalysis(report)}
                      className={`p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                        selectedReport?._id === report._id
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-white rounded-lg">
                          {report.reportType === 'pdf' ? (
                            <File className="w-6 h-6 text-red-500" />
                          ) : (
                            <Image className="w-6 h-6 text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {report.reportTitle}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {getStatusIcon(report.processingStatus)}
                            <span className="text-sm font-medium text-gray-600">
                              {getStatusText(report.processingStatus)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteReport(report._id);
                          }}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Analysis & Recommendations */}
          <div className="lg:col-span-2">
            {!selectedReport ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <Stethoscope className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Select a report to view analysis
                </h3>
                <p className="text-gray-500">
                  Upload a medical report and our AI will recommend the right specialist for you
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Report Details */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-lg p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedReport.reportTitle}
                    </h2>
                    {selectedReport.processingStatus === 'completed' && (
                      <button
                        onClick={() => handleReanalyze(selectedReport._id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Re-analyze report"
                      >
                        <RefreshCw className="w-5 h-5 text-gray-600" />
                      </button>
                    )}
                  </div>
                  
                  {selectedReport.description && (
                    <p className="text-gray-600 mb-4">{selectedReport.description}</p>
                  )}

                  {/* Analysis Summary */}
                  {analysisData && (
                    <div className="mt-6 space-y-4">
                      {/* Confidence Score */}
                      {analysisData.confidenceScore > 0 && (
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Analysis Confidence
                            </span>
                            <span className="text-lg font-bold text-blue-600">
                              {analysisData.confidenceScore}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${analysisData.confidenceScore}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Detected Keywords */}
                      {analysisData.detectedKeywords?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700 mb-2">
                            Detected Medical Keywords
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {analysisData.detectedKeywords.slice(0, 10).map((keyword, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recommended Specialists */}
                      {analysisData.recommendedSpecialists?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700 mb-2">
                            Recommended Specialists
                          </h3>
                          <div className="space-y-2">
                            {analysisData.recommendedSpecialists.map((specialist, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                              >
                                <div>
                                  <span className="font-semibold text-gray-900">
                                    {specialist.specialty}
                                  </span>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {specialist.reason}
                                  </p>
                                </div>
                                <span className="text-sm font-bold text-green-600">
                                  {specialist.confidence}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Analysis Summary */}
                      {analysisData.analysisSummary && (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-gray-700">{analysisData.analysisSummary}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual Specialty Selection (if auto-detection failed) */}
                  {analysisData && !analysisData.analysisSuccess && (
                    <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-amber-900 mb-2">
                            Couldn't detect specialist automatically
                          </h3>
                          <p className="text-sm text-amber-700 mb-4">
                            Please select a specialty manually to find the right doctor
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {availableSpecialties.slice(0, 8).map((specialty) => (
                              <button
                                key={specialty}
                                onClick={() => handleManualSpecialtySelection(specialty)}
                                className="px-4 py-2 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 text-sm font-medium text-gray-700 transition-colors"
                              >
                                {specialty}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Recommended Doctors */}
                {recommendedDoctors.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Stethoscope className="w-6 h-6 text-blue-600" />
                      Recommended Doctors
                      <span className="text-sm font-normal text-gray-500">
                        ({recommendedDoctors.length} available)
                      </span>
                    </h2>
                    <div className="grid grid-cols-1 gap-4">
                      {recommendedDoctors.map((doctor) => (
                        <DoctorCard
                          key={doctor._id}
                          doctor={doctor}
                          onViewProfile={() => handleViewProfile(doctor)}
                          onBookAppointment={() => handleBookAppointment(doctor)}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {uploadModalOpen && (
          <UploadReportModal
            onClose={() => setUploadModalOpen(false)}
            onSuccess={() => {
              setUploadModalOpen(false);
              fetchReports();
            }}
          />
        )}
      </AnimatePresence>

      {/* Doctor Profile Modal */}
      <AnimatePresence>
        {isProfileOpen && selectedDoctor && (
          <DoctorProfileModal
            isOpen={isProfileOpen}
            doctor={selectedDoctor}
            onClose={() => {
              setIsProfileOpen(false);
              setSelectedDoctor(null);
            }}
            onBookNow={() => {
              setIsProfileOpen(false);
              setIsBookingOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Booking Modal */}
      <AnimatePresence>
        {isBookingOpen && selectedDoctor && (
          <BookingModal
            isOpen={isBookingOpen}
            doctor={selectedDoctor}
            onClose={() => {
              setIsBookingOpen(false);
              setSelectedDoctor(null);
            }}
            onSuccess={() => {
              setIsBookingOpen(false);
              toast.success('Appointment booked successfully!');
            }}
            relatedReportId={selectedReport?._id}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Upload Report Modal Component
const UploadReportModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    reportType: 'pdf',
    reportTitle: '',
    description: '',
    reportDate: new Date().toISOString().split('T')[0]
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error('Please upload a PDF or image file (JPEG, PNG, WebP)');
      return;
    }

    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);

    // Auto-detect report type
    if (selectedFile.type === 'application/pdf') {
      setFormData((prev) => ({ ...prev, reportType: 'pdf' }));
    } else {
      setFormData((prev) => ({ ...prev, reportType: 'image' }));
    }

    // Auto-fill title if empty
    if (!formData.reportTitle) {
      const fileName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setFormData((prev) => ({ ...prev, reportTitle: fileName }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    if (!formData.reportTitle.trim()) {
      toast.error('Please enter a report title');
      return;
    }

    try {
      setUploading(true);

      const data = new FormData();
      data.append('reportFile', file);
      data.append('reportType', formData.reportType);
      data.append('reportTitle', formData.reportTitle);
      data.append('description', formData.description);
      data.append('reportDate', formData.reportDate);

      await patientAPI.uploadMedicalReport(data);

      toast.success('Report uploaded successfully! Processing in background...');
      onSuccess();
    } catch (error) {
      console.error('Error uploading report:', error);
      toast.error(error.response?.data?.message || 'Failed to upload report');
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Upload className="w-6 h-6 text-blue-600" />
            Upload Medical Report
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Upload File *
            </label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              {file ? (
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-3 px-4 py-3 bg-green-50 rounded-lg">
                    {file.type === 'application/pdf' ? (
                      <File className="w-8 h-8 text-red-500" />
                    ) : (
                      <Image className="w-8 h-8 text-blue-500" />
                    )}
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-700 font-medium mb-2">
                    Drag and drop your file here, or{' '}
                    <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
                      browse
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileSelect(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </p>
                  <p className="text-sm text-gray-500">
                    Supported formats: PDF, JPG, PNG, WebP (Max 10MB)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Report Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Report Type *
            </label>
            <select
              value={formData.reportType}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, reportType: e.target.value }))
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="pdf">PDF Report</option>
              <option value="image">Image Report</option>
              <option value="lab_test">Lab Test</option>
              <option value="prescription">Prescription</option>
              <option value="scan">Scan (MRI/CT/X-Ray)</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Report Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Report Title *
            </label>
            <input
              type="text"
              value={formData.reportTitle}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, reportTitle: e.target.value }))
              }
              placeholder="e.g., Blood Test Report, X-Ray Chest"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Add any additional notes about this report..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Report Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Report Date
            </label>
            <input
              type="date"
              value={formData.reportDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, reportDate: e.target.value }))
              }
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload & Analyze
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default MedicalReportAnalysis;
