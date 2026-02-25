import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Mic,
  MicOff,
  Loader,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Languages,
  X,
  ChevronDown
} from 'lucide-react';
import { patientAPI } from '../api';
import toast from 'react-hot-toast';
import DoctorCard from '../pages/Patient/components/DoctorCard';
import BookingModal from '../pages/Patient/components/BookingModal';
import DoctorProfileModal from '../pages/Patient/components/DoctorProfileModal';

const VoiceSymptomAnalyzer = () => {
  const { t, i18n } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'en');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const recognitionRef = useRef(null);

  // Language mapping for speech recognition
  const speechLanguages = {
    en: 'en-US',
    hi: 'hi-IN',
    kn: 'kn-IN'
  };

  const languageOptions = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
    { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' }
  ];

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsSupported(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = speechLanguages[selectedLanguage];

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(prev => (prev + finalTranscript).trim() || interimTranscript);
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast.error(t('voiceSymptoms.microphoneError'));
      }
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [selectedLanguage, t]);

  const startListening = () => {
    if (!recognitionRef.current) return;

    try {
      setTranscript('');
      setAnalysisResult(null);
      recognitionRef.current.lang = speechLanguages[selectedLanguage];
      recognitionRef.current.start();
      setIsListening(true);
      toast.success(t('voiceSymptoms.listening'));
    } catch (error) {
      console.error('Error starting recognition:', error);
      toast.error('Unable to start voice recognition');
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
  };

  const analyzeSymptoms = async () => {
    if (!transcript || transcript.trim().length < 10) {
      toast.error('Please describe your symptoms in detail (at least 10 characters)');
      return;
    }

    try {
      setIsAnalyzing(true);
      const response = await patientAPI.analyzeSymptoms(transcript, selectedLanguage);
      
      if (response.success) {
        setAnalysisResult(response.data);
        toast.success('Analysis complete!');
      } else {
        toast.error('Failed to analyze symptoms');
      }
    } catch (error) {
      console.error('Error analyzing symptoms:', error);
      toast.error(error.response?.data?.message || 'Failed to analyze symptoms');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleViewProfile = (doctor) => {
    setSelectedDoctor(doctor);
    setIsProfileOpen(true);
  };

  const handleBookAppointment = (doctor) => {
    setSelectedDoctor(doctor);
    setIsBookingOpen(true);
  };

  const reset = () => {
    setTranscript('');
    setAnalysisResult(null);
    setIsListening(false);
  };

  if (!isSupported) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {t('voiceSymptoms.browserNotSupported')}
        </h3>
        <p className="text-gray-600">
          Please use Chrome, Edge, or Safari browser for voice recognition.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Mic className="w-8 h-8 text-purple-600" />
          {t('voiceSymptoms.title')}
        </h1>
        <p className="text-gray-600 mt-2">
          {t('voiceSymptoms.subtitle')}
        </p>
      </motion.div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl shadow-xl p-8"
      >
        {/* Language Selector */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('voiceSymptoms.selectLanguage')}
          </label>
          <div className="relative">
            <button
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="w-full md:w-64 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl flex items-center justify-between hover:border-purple-500 transition-all"
            >
              <span className="flex items-center gap-2">
                <Languages className="w-5 h-5 text-purple-600" />
                <span className="font-medium">
                  {languageOptions.find(l => l.code === selectedLanguage)?.name}
                </span>
              </span>
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </button>

            <AnimatePresence>
              {showLanguageDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full mt-2 w-full md:w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-10"
                >
                  {languageOptions.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setSelectedLanguage(lang.code);
                        setShowLanguageDropdown(false);
                        if (isListening) {
                          stopListening();
                        }
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors flex items-center gap-3 ${
                        selectedLanguage === lang.code ? 'bg-purple-50 text-purple-600 font-semibold' : ''
                      }`}
                    >
                      <span className="text-2xl">{lang.flag}</span>
                      <span>{lang.name}</span>
                      {selectedLanguage === lang.code && (
                        <CheckCircle className="w-5 h-5 ml-auto" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Voice Recording Area */}
        <div className="bg-white rounded-2xl p-8 mb-6 text-center">
          <AnimatePresence mode="wait">
            {isListening ? (
              <motion.div
                key="listening"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="space-y-4"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                  }}
                  className="w-24 h-24 mx-auto bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center"
                >
                  <Mic className="w-12 h-12 text-white" />
                </motion.div>
                <p className="text-xl font-semibold text-gray-900">
                  {t('voiceSymptoms.listening')}
                </p>
                <p className="text-gray-600">
                  {t('voiceSymptoms.speakNow')}
                </p>
                <button
                  onClick={stopListening}
                  className="px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-all inline-flex items-center gap-2"
                >
                  <MicOff className="w-5 h-5" />
                  {t('voiceSymptoms.stopRecording')}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="space-y-4"
              >
                <div className="w-24 h-24 mx-auto bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                  onClick={startListening}
                >
                  <Mic className="w-12 h-12 text-white" />
                </div>
                <p className="text-xl font-semibold text-gray-900">
                  {t('voiceSymptoms.tapToSpeak')}
                </p>
                <p className="text-sm text-gray-500">
                  {t('voiceSymptoms.examplePrompt')}
                </p>
                <button
                  onClick={startListening}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all inline-flex items-center gap-2"
                >
                  <Mic className="w-5 h-5" />
                  {t('voiceSymptoms.startRecording')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Transcript Display */}
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900">
                {t('voiceSymptoms.yourSymptoms')}
              </h3>
              <button
                onClick={reset}
                className="text-red-500 hover:text-red-600 text-sm font-medium"
              >
                Clear
              </button>
            </div>
            <p className="text-gray-700 leading-relaxed">{transcript}</p>
            
            {!isAnalyzing && !analysisResult && (
              <button
                onClick={analyzeSymptoms}
                className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Analyze Symptoms
              </button>
            )}
          </motion.div>
        )}

        {/* Analysis Loading */}
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl p-8 text-center"
          >
            <Loader className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900">
              {t('voiceSymptoms.analyzing')}
            </p>
            <p className="text-gray-600 mt-2">
              Our AI is analyzing your symptoms...
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Analysis Results */}
      {analysisResult && !isAnalyzing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* AI Summary */}
          {analysisResult.analysis?.summary && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 border-2 border-green-200">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {t('voiceSymptoms.aiSummary')}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {analysisResult.analysis.summary}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Detected Symptoms */}
          {analysisResult.analysis?.symptoms?.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t('voiceSymptoms.detectedSymptoms')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {analysisResult.analysis.symptoms.map((symptom, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium text-sm"
                  >
                    {symptom}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Doctors */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-purple-100">
            <div className="mb-6 pb-4 border-b-2 border-purple-100">
              <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
                {t('voiceSymptoms.recommendedDoctors')}
              </h3>
              <p className="text-sm text-gray-600">
                Based on your symptoms, we recommend consulting these specialists. Click on a doctor card to view their profile or book an appointment.
              </p>
            </div>

            {analysisResult.analysis?.recommendedSpecialists?.map((specialist, index) => (
              <div key={index} className="mb-8 last:mb-0">
                {/* Specialty Header */}
                <div className="mb-4 pb-3 border-b-2 border-purple-100">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-bold text-purple-600 flex items-center gap-2">
                      <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">
                        {index + 1}
                      </span>
                      {specialist.specialty}
                    </h4>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                      {specialist.confidence}% Match
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm ml-10">{specialist.reason}</p>
                </div>

                {/* Doctor Cards */}
                {analysisResult.doctors?.[specialist.specialty]?.length > 0 ? (
                  <div className="space-y-4 ml-10">
                    <p className="text-sm font-semibold text-gray-700 mb-3">
                      Available {specialist.specialty}s ({analysisResult.doctors[specialist.specialty].length})
                    </p>
                    <div className="grid grid-cols-1 gap-4">
                      {analysisResult.doctors[specialist.specialty].map((doctor) => (
                        <DoctorCard
                          key={doctor._id}
                          doctor={doctor}
                          onViewProfile={() => handleViewProfile(doctor)}
                          onBookAppointment={() => handleBookAppointment(doctor)}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="ml-10 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-600 text-sm">
                      No {specialist.specialty}s currently available. Please try searching in the Find Doctors section or contact us for assistance.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Try Again Button */}
          <button
            onClick={reset}
            className="w-full px-6 py-3 border-2 border-purple-600 text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-all"
          >
            {t('voiceSymptoms.tryAgain')}
          </button>
        </motion.div>
      )}

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
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceSymptomAnalyzer;
