import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Plus, 
  Trash2, 
  Loader, 
  Pill, 
  FileText, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { prescriptionAPI } from '../../../api';

const PrescriptionModal = ({ isOpen, onClose, appointment, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    diagnosis: '',
    medicines: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    testsRecommended: [''],
    followUpDate: '',
    specialInstructions: ''
  });

  const handleAddMedicine = () => {
    setFormData({
      ...formData,
      medicines: [...formData.medicines, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]
    });
  };

  const handleRemoveMedicine = (index) => {
    const newMedicines = formData.medicines.filter((_, i) => i !== index);
    setFormData({ ...formData, medicines: newMedicines });
  };

  const handleMedicineChange = (index, field, value) => {
    const newMedicines = [...formData.medicines];
    newMedicines[index][field] = value;
    setFormData({ ...formData, medicines: newMedicines });
  };

  const handleAddTest = () => {
    setFormData({
      ...formData,
      testsRecommended: [...formData.testsRecommended, '']
    });
  };

  const handleRemoveTest = (index) => {
    const newTests = formData.testsRecommended.filter((_, i) => i !== index);
    setFormData({ ...formData, testsRecommended: newTests });
  };

  const handleTestChange = (index, value) => {
    const newTests = [...formData.testsRecommended];
    newTests[index] = value;
    setFormData({ ...formData, testsRecommended: newTests });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.diagnosis.trim()) {
      toast.error('Please enter diagnosis');
      return;
    }

    const validMedicines = formData.medicines.filter(m => m.name.trim() && m.dosage.trim() && m.frequency.trim() && m.duration.trim());
    if (validMedicines.length === 0) {
      toast.error('Please add at least one medicine with complete details');
      return;
    }

    const validTests = formData.testsRecommended.filter(t => t.trim());

    try {
      setLoading(true);

      const prescriptionData = {
        appointmentId: appointment._id,
        diagnosis: formData.diagnosis,
        medicines: validMedicines,
        testsRecommended: validTests,
        followUpDate: formData.followUpDate || null,
        specialInstructions: formData.specialInstructions
      };

      await prescriptionAPI.createPrescription(prescriptionData);
      
      toast.success('Prescription created and sent to patient successfully!');
      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error creating prescription:', error);
      toast.error(error.response?.data?.message || 'Failed to create prescription');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <FileText className="w-7 h-7" />
                  Create Prescription
                </h2>
                <p className="text-blue-100 mt-1">
                  For {appointment.patientId?.name} - {new Date(appointment.appointmentDate).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="p-6 space-y-6">
              {/* Diagnosis */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Diagnosis <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="3"
                  placeholder="Enter detailed diagnosis..."
                  required
                />
              </div>

              {/* Medicines */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    <Pill className="w-4 h-4 inline mr-1" />
                    Medicines <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMedicine}
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Medicine
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.medicines.map((medicine, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-start justify-between mb-3">
                        <span className="font-semibold text-gray-700">Medicine {index + 1}</span>
                        {formData.medicines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicine(index)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={medicine.name}
                          onChange={(e) => handleMedicineChange(index, 'name', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="Medicine name *"
                          required
                        />
                        <input
                          type="text"
                          value={medicine.dosage}
                          onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="Dosage (e.g., 500mg) *"
                          required
                        />
                        <input
                          type="text"
                          value={medicine.frequency}
                          onChange={(e) => handleMedicineChange(index, 'frequency', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="Frequency (e.g., Twice daily) *"
                          required
                        />
                        <input
                          type="text"
                          value={medicine.duration}
                          onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="Duration (e.g., 7 days) *"
                          required
                        />
                        <input
                          type="text"
                          value={medicine.instructions}
                          onChange={(e) => handleMedicineChange(index, 'instructions', e.target.value)}
                          className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="Instructions (e.g., After meals)"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tests Recommended */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Tests Recommended (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddTest}
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Test
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.testsRecommended.map((test, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={test}
                        onChange={(e) => handleTestChange(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Test name (e.g., Complete Blood Count)"
                      />
                      {formData.testsRecommended.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTest(index)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Follow-up Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Follow-up Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.followUpDate}
                  onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Special Instructions (Optional)
                </label>
                <textarea
                  value={formData.specialInstructions}
                  onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="3"
                  placeholder="Any additional instructions for the patient..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-6 bg-gray-50 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Prescription will be sent to patient's dashboard
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Create & Send Prescription
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PrescriptionModal;
