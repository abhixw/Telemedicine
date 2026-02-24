/**
 * Disease-to-Specialist Mapping System
 * Maps medical keywords, symptoms, conditions, and body parts to medical specialties
 */

// Comprehensive specialty mapping with keywords
const SPECIALTY_KEYWORDS = {
    'Dermatologist': {
        keywords: [
            'skin', 'acne', 'rash', 'eczema', 'psoriasis', 'dermatitis', 'melanoma',
            'mole', 'wart', 'pimple', 'blemish', 'hives', 'itching', 'dry skin',
            'oily skin', 'skin cancer', 'pigmentation', 'vitiligo', 'fungal infection',
            'ringworm', 'scabies', 'allergy', 'allergic reaction', 'urticaria',
            'hair loss', 'alopecia', 'dandruff', 'nail infection', 'cellulitis',
            'abscess', 'boil', 'cyst', 'lesion', 'dermatological', 'epidermis'
        ],
        conditions: [
            'acne vulgaris', 'atopic dermatitis', 'contact dermatitis', 'seborrheic dermatitis',
            'psoriasis', 'rosacea', 'eczema', 'skin infection', 'fungal infection'
        ],
        bodyParts: ['skin', 'scalp', 'hair', 'nails', 'epidermis', 'dermis']
    },
    
    'Cardiologist': {
        keywords: [
            'heart', 'cardiac', 'chest pain', 'angina', 'palpitation', 'arrhythmia',
            'hypertension', 'blood pressure', 'cholesterol', 'coronary', 'cardiovascular',
            'myocardial', 'infarction', 'heart attack', 'valve', 'aneurysm',
            'atherosclerosis', 'congestive heart failure', 'chf', 'atrial fibrillation',
            'tachycardia', 'bradycardia', 'murmur', 'ecg', 'ekg', 'echo', 'stress test'
        ],
        conditions: [
            'coronary artery disease', 'heart failure', 'atrial fibrillation',
            'hypertension', 'myocardial infarction', 'angina', 'arrhythmia',
            'cardiomyopathy', 'heart valve disease'
        ],
        bodyParts: ['heart', 'cardiac', 'cardiovascular', 'coronary', 'aorta', 'ventricle', 'atrium']
    },
    
    'Neurologist': {
        keywords: [
            'brain', 'nerve', 'neurological', 'seizure', 'epilepsy', 'paralysis',
            'stroke', 'migraine', 'headache', 'vertigo', 'dizziness', 'tremor',
            'parkinsons', 'alzheimers', 'dementia', 'neuropathy', 'sclerosis',
            'multiple sclerosis', 'ms', 'meningitis', 'encephalitis', 'concussion',
            'spinal cord', 'cerebral', 'cognitive', 'memory loss', 'confusion',
            'numbness', 'tingling', 'weakness', 'coordination', 'balance', 'mri brain'
        ],
        conditions: [
            'epilepsy', 'stroke', 'migraine', 'parkinsons disease', 'alzheimers disease',
            'multiple sclerosis', 'neuropathy', 'meningitis', 'seizure disorder'
        ],
        bodyParts: ['brain', 'spinal cord', 'nerves', 'cerebral', 'cranial', 'neural']
    },
    
    'Orthopedic': {
        keywords: [
            'bone', 'fracture', 'joint', 'arthritis', 'spine', 'back pain',
            'knee pain', 'hip pain', 'shoulder pain', 'ligament', 'tendon',
            'cartilage', 'meniscus', 'sprain', 'strain', 'dislocation',
            'osteoporosis', 'scoliosis', 'herniated disc', 'slipped disc',
            'carpal tunnel', 'tennis elbow', 'rotator cuff', 'acl tear',
            'skeletal', 'musculoskeletal', 'x-ray bone', 'ortho', 'orthopedic'
        ],
        conditions: [
            'fracture', 'arthritis', 'osteoporosis', 'scoliosis', 'herniated disc',
            'ligament tear', 'tendonitis', 'bursitis', 'joint dislocation'
        ],
        bodyParts: ['bone', 'joint', 'spine', 'vertebra', 'knee', 'hip', 'shoulder', 'elbow', 'wrist', 'ankle']
    },
    
    'Ophthalmologist': {
        keywords: [
            'eye', 'vision', 'sight', 'retina', 'cornea', 'cataract', 'glaucoma',
            'myopia', 'hyperopia', 'astigmatism', 'presbyopia', 'blurred vision',
            'double vision', 'eye pain', 'redness', 'discharge', 'tear', 'dry eye',
            'conjunctivitis', 'pink eye', 'stye', 'floaters', 'spots', 'blind',
            'macular degeneration', 'diabetic retinopathy', 'optic nerve', 'pupil',
            'lens', 'iris', 'sclera', 'ophthalmology', 'optometry'
        ],
        conditions: [
            'cataract', 'glaucoma', 'macular degeneration', 'diabetic retinopathy',
            'conjunctivitis', 'myopia', 'hyperopia', 'astigmatism', 'retinal detachment'
        ],
        bodyParts: ['eye', 'retina', 'cornea', 'lens', 'iris', 'optic nerve', 'pupil']
    },
    
    'ENT Specialist': {
        keywords: [
            'ear', 'nose', 'throat', 'ent', 'hearing', 'deaf', 'tinnitus',
            'vertigo', 'sinusitis', 'rhinitis', 'nasal', 'sinus', 'congestion',
            'tonsillitis', 'tonsil', 'adenoid', 'pharyngitis', 'laryngitis',
            'hoarseness', 'voice', 'swallowing', 'dysphagia', 'ear infection',
            'otitis', 'earache', 'ear pain', 'hearing loss', 'balance disorder',
            'smell', 'taste', 'snoring', 'sleep apnea', 'thyroid'
        ],
        conditions: [
            'sinusitis', 'tonsillitis', 'otitis media', 'hearing loss', 'tinnitus',
            'vertigo', 'sleep apnea', 'nasal polyps', 'laryngitis'
        ],
        bodyParts: ['ear', 'nose', 'throat', 'sinus', 'tonsil', 'larynx', 'pharynx', 'eardrum']
    },
    
    'Gastroenterologist': {
        keywords: [
            'stomach', 'abdomen', 'abdominal pain', 'digestive', 'intestine',
            'bowel', 'colon', 'liver', 'gallbladder', 'pancreas', 'esophagus',
            'gastric', 'ulcer', 'gastritis', 'gerd', 'acid reflux', 'heartburn',
            'ibs', 'crohns', 'colitis', 'diarrhea', 'constipation', 'bloating',
            'nausea', 'vomiting', 'jaundice', 'hepatitis', 'cirrhosis',
            'gallstone', 'pancreatitis', 'indigestion', 'dyspepsia', 'flatulence'
        ],
        conditions: [
            'gastritis', 'peptic ulcer', 'gerd', 'ibs', 'crohns disease',
            'ulcerative colitis', 'hepatitis', 'cirrhosis', 'pancreatitis', 'gallstones'
        ],
        bodyParts: ['stomach', 'intestine', 'colon', 'liver', 'pancreas', 'gallbladder', 'esophagus', 'rectum']
    },
    
    'Pulmonologist': {
        keywords: [
            'lung', 'respiratory', 'breathing', 'breath', 'cough', 'asthma',
            'bronchitis', 'pneumonia', 'copd', 'tuberculosis', 'tb', 'chest',
            'wheezing', 'shortness of breath', 'dyspnea', 'emphysema',
            'pulmonary', 'bronchial', 'alveolar', 'pleural', 'pneumothorax',
            'pulmonary embolism', 'lung cancer', 'fibrosis', 'sarcoidosis',
            'oxygen', 'ventilation', 'chest x-ray', 'spirometry'
        ],
        conditions: [
            'asthma', 'copd', 'pneumonia', 'tuberculosis', 'bronchitis',
            'emphysema', 'pulmonary fibrosis', 'lung cancer', 'pulmonary embolism'
        ],
        bodyParts: ['lung', 'bronchi', 'trachea', 'alveoli', 'pleura', 'respiratory']
    },
    
    'Endocrinologist': {
        keywords: [
            'diabetes', 'thyroid', 'hormone', 'endocrine', 'insulin', 'glucose',
            'blood sugar', 'hyperthyroidism', 'hypothyroidism', 'goiter',
            'adrenal', 'pituitary', 'metabolic', 'obesity', 'weight gain',
            'weight loss', 'osteoporosis', 'menopause', 'hirsutism',
            'polycystic ovary', 'pcos', 'growth disorder', 'gigantism',
            'acromegaly', 'cushings', 'addisons', 'parathyroid'
        ],
        conditions: [
            'diabetes mellitus', 'hypothyroidism', 'hyperthyroidism', 'pcos',
            'cushings syndrome', 'addisons disease', 'metabolic syndrome'
        ],
        bodyParts: ['thyroid', 'pancreas', 'adrenal', 'pituitary', 'endocrine glands']
    },
    
    'Nephrologist': {
        keywords: [
            'kidney', 'renal', 'nephrology', 'urinary', 'urine', 'kidney failure',
            'kidney stone', 'dialysis', 'nephritis', 'proteinuria', 'hematuria',
            'blood in urine', 'chronic kidney disease', 'ckd', 'acute kidney injury',
            'aki', 'glomerulonephritis', 'nephrotic syndrome', 'electrolyte',
            'creatinine', 'urea', 'kidney transplant', 'renal insufficiency'
        ],
        conditions: [
            'chronic kidney disease', 'kidney stones', 'nephritis', 'nephrotic syndrome',
            'acute kidney injury', 'glomerulonephritis', 'renal failure'
        ],
        bodyParts: ['kidney', 'renal', 'urinary', 'nephron', 'glomerulus']
    },
    
    'Psychiatrist': {
        keywords: [
            'mental', 'depression', 'anxiety', 'stress', 'psychiatric', 'psychology',
            'bipolar', 'schizophrenia', 'psychosis', 'panic attack', 'phobia',
            'ocd', 'ptsd', 'adhd', 'autism', 'mood disorder', 'eating disorder',
            'anorexia', 'bulimia', 'insomnia', 'sleep disorder', 'suicidal',
            'self-harm', 'addiction', 'substance abuse', 'alcoholism',
            'emotional', 'behavioral', 'cognitive', 'therapy', 'counseling'
        ],
        conditions: [
            'depression', 'anxiety disorder', 'bipolar disorder', 'schizophrenia',
            'ptsd', 'ocd', 'panic disorder', 'eating disorder', 'adhd'
        ],
        bodyParts: ['brain', 'mental', 'psychological', 'cognitive']
    },
    
    'Gynecologist': {
        keywords: [
            'gynecology', 'uterus', 'ovary', 'vagina', 'cervix', 'menstrual',
            'period', 'menstruation', 'pregnancy', 'pregnant', 'prenatal',
            'antenatal', 'obstetric', 'fertility', 'infertility', 'miscarriage',
            'abortion', 'contraception', 'pcos', 'endometriosis', 'fibroids',
            'pelvic pain', 'vaginal discharge', 'menopause', 'pap smear',
            'breast', 'mammogram', 'ovarian cyst', 'ectopic pregnancy'
        ],
        conditions: [
            'pcos', 'endometriosis', 'uterine fibroids', 'ovarian cyst',
            'menstrual disorder', 'pregnancy complications', 'cervical cancer'
        ],
        bodyParts: ['uterus', 'ovary', 'vagina', 'cervix', 'fallopian tube', 'breast']
    },
    
    'Urologist': {
        keywords: [
            'urinary', 'bladder', 'prostate', 'urology', 'incontinence', 'uti',
            'urinary tract infection', 'kidney stone', 'hematuria', 'dysuria',
            'frequent urination', 'painful urination', 'erectile dysfunction',
            'ed', 'infertility male', 'testicular', 'prostatitis', 'bph',
            'benign prostatic hyperplasia', 'bladder cancer', 'prostate cancer',
            'vasectomy', 'urethral', 'ureter', 'genital'
        ],
        conditions: [
            'uti', 'kidney stones', 'prostatitis', 'bph', 'bladder infection',
            'urinary incontinence', 'erectile dysfunction', 'testicular cancer'
        ],
        bodyParts: ['bladder', 'prostate', 'urethra', 'ureter', 'testis', 'penis']
    },
    
    'General Physician': {
        keywords: [
            'fever', 'cold', 'flu', 'cough', 'viral infection', 'bacterial infection',
            'general checkup', 'routine checkup', 'vaccination', 'immunization',
            'fatigue', 'weakness', 'body pain', 'headache', 'general illness',
            'common cold', 'sore throat', 'runny nose', 'malaise', 'preventive care'
        ],
        conditions: [
            'common cold', 'flu', 'viral fever', 'throat infection', 'general illness'
        ],
        bodyParts: ['general', 'overall health']
    }
};

/**
 * Calculate confidence score based on keyword matches
 * @param {Array} detectedKeywords - Keywords found in the report
 * @param {Object} specialtyData - Specialty data including keywords, conditions, bodyParts
 * @returns {Number} - Confidence score from 0-100
 */
function calculateConfidence(detectedKeywords, specialtyData) {
    if (!detectedKeywords || detectedKeywords.length === 0) {
        return 0;
    }
    
    const allSpecialtyTerms = [
        ...specialtyData.keywords,
        ...specialtyData.conditions,
        ...specialtyData.bodyParts
    ].map(term => term.toLowerCase());
    
    const normalizedDetectedKeywords = detectedKeywords.map(k => k.toLowerCase());
    
    // Count matches
    let matchCount = 0;
    let weightedScore = 0;
    
    normalizedDetectedKeywords.forEach(keyword => {
        // Direct match in keywords (higher weight)
        if (specialtyData.keywords.some(k => k.toLowerCase().includes(keyword) || keyword.includes(k.toLowerCase()))) {
            matchCount++;
            weightedScore += 10;
        }
        // Match in conditions (highest weight)
        else if (specialtyData.conditions.some(c => c.toLowerCase().includes(keyword) || keyword.includes(c.toLowerCase()))) {
            matchCount++;
            weightedScore += 15;
        }
        // Match in body parts (medium weight)
        else if (specialtyData.bodyParts.some(b => b.toLowerCase().includes(keyword) || keyword.includes(b.toLowerCase()))) {
            matchCount++;
            weightedScore += 8;
        }
    });
    
    // Calculate confidence (0-100)
    // Use matchCount to avoid penalizing reports with many unrelated keywords
    if (matchCount === 0) {
        return 0;
    }
    
    // Base confidence on matched keywords, with bonus for multiple matches
    const baseConfidence = Math.min(60, weightedScore);
    const matchBonus = Math.min(40, matchCount * 5);
    const confidence = baseConfidence + matchBonus;
    
    return Math.round(confidence);
}

/**
 * Map detected keywords to recommended specialists
 * @param {Array} detectedKeywords - Array of keywords detected in the report
 * @param {Array} conditions - Array of detected conditions
 * @param {Array} bodyParts - Array of detected body parts
 * @returns {Array} - Array of recommended specialists with confidence scores
 */
function mapKeywordsToSpecialists(detectedKeywords = [], conditions = [], bodyParts = []) {
    const allKeywords = [...detectedKeywords, ...conditions, ...bodyParts];
    
    if (allKeywords.length === 0) {
        return [];
    }
    
    const recommendations = [];
    
    // Check each specialty
    for (const [specialty, specialtyData] of Object.entries(SPECIALTY_KEYWORDS)) {
        const confidence = calculateConfidence(allKeywords, specialtyData);
        
        if (confidence > 5) { // Only include if confidence is above threshold (lowered from 20 to 5)
            // Generate reason based on matches
            const matchedTerms = allKeywords.filter(keyword => {
                const keywordLower = keyword.toLowerCase();
                return specialtyData.keywords.some(k => k.toLowerCase().includes(keywordLower) || keywordLower.includes(k.toLowerCase())) ||
                       specialtyData.conditions.some(c => c.toLowerCase().includes(keywordLower) || keywordLower.includes(c.toLowerCase())) ||
                       specialtyData.bodyParts.some(b => b.toLowerCase().includes(keywordLower) || keywordLower.includes(b.toLowerCase()));
            });
            
            const reason = matchedTerms.length > 0 
                ? `Detected: ${matchedTerms.slice(0, 3).join(', ')}`
                : 'Based on report analysis';
            
            recommendations.push({
                specialty,
                confidence,
                reason
            });
        }
    }
    
    // Sort by confidence (highest first)
    recommendations.sort((a, b) => b.confidence - a.confidence);
    
    // Return top 3 recommendations
    return recommendations.slice(0, 3);
}

/**
 * Get all available specialties
 * @returns {Array} - Array of specialty names
 */
function getAllSpecialties() {
    return Object.keys(SPECIALTY_KEYWORDS);
}

/**
 * Get specialty by name
 * @param {String} specialtyName - Name of the specialty
 * @returns {Object|null} - Specialty data or null if not found
 */
function getSpecialtyByName(specialtyName) {
    return SPECIALTY_KEYWORDS[specialtyName] || null;
}

module.exports = {
    SPECIALTY_KEYWORDS,
    mapKeywordsToSpecialists,
    calculateConfidence,
    getAllSpecialties,
    getSpecialtyByName
};
