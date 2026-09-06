/**
 * Custom Resume Screening Algorithm (No external AI APIs)
 * Scoring: Skill Match 50% | Experience 30% | Education 20%
 */

const EDUCATION_LEVELS = {
  'phd': 100, 'doctorate': 100,
  'master': 85, 'mba': 85, 'msc': 85, 'ma ': 85,
  'bachelor': 70, 'bsc': 70, 'btech': 70, 'be ': 70, 'ba ': 70, 'bca': 70, 'bba': 70,
  'diploma': 50, 'associate': 50,
  'high school': 30, 'secondary': 30
};

const SKILL_ALIASES = {
  'js': 'javascript', 'ts': 'typescript', 'reactjs': 'react', 'react.js': 'react',
  'nodejs': 'node.js', 'node': 'node.js', 'vuejs': 'vue', 'vue.js': 'vue',
  'angularjs': 'angular', 'mongo': 'mongodb', 'postgres': 'postgresql',
  'k8s': 'kubernetes', 'py': 'python', 'tf': 'tensorflow', 'ml': 'machine learning'
};

export const extractTextSkills = (text, skillKeywords) => {
  const lowerText = text.toLowerCase();
  const matched = [];
  const missing = [];

  for (const skill of skillKeywords) {
    const normalizedSkill = SKILL_ALIASES[skill.toLowerCase()] || skill.toLowerCase();
    const regex = new RegExp(`\\b${normalizedSkill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lowerText)) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  return { matched, missing };
};

export const extractExperience = (text) => {
  const patterns = [
    /(\d+)\+?\s*years?\s+(?:of\s+)?experience/gi,
    /experience\s+(?:of\s+)?(\d+)\+?\s*years?/gi,
    /(\d+)\s*(?:yrs?|years?)\s+(?:of\s+)?(?:work|professional|industry)/gi
  ];

  let maxYears = 0;
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const years = parseInt(match[1]);
      if (years > maxYears && years < 50) maxYears = years;
    }
  }

  // Also estimate from date ranges
  const dateRangePattern = /(\d{4})\s*[-–]\s*(\d{4}|present|current|now)/gi;
  let totalYears = 0;
  let dateMatch;
  while ((dateMatch = dateRangePattern.exec(text)) !== null) {
    const start = parseInt(dateMatch[1]);
    const end = dateMatch[2].toLowerCase() === 'present' || dateMatch[2].toLowerCase() === 'current' || dateMatch[2].toLowerCase() === 'now'
      ? new Date().getFullYear()
      : parseInt(dateMatch[2]);
    if (end > start && end - start < 30) totalYears += end - start;
  }

  return Math.max(maxYears, Math.min(totalYears, 40));
};

export const extractEducation = (text) => {
  const lowerText = text.toLowerCase();
  let highestLevel = 'none';
  let highestScore = 0;

  for (const [keyword, score] of Object.entries(EDUCATION_LEVELS)) {
    if (lowerText.includes(keyword) && score > highestScore) {
      highestScore = score;
      highestLevel = keyword;
    }
  }

  return { level: highestLevel, score: highestScore };
};

export const calculateSkillScore = (matched, total) => {
  if (total === 0) return 100;
  return Math.round((matched / total) * 100);
};

export const calculateExperienceScore = (detected, required) => {
  if (!required || required === 0) return 100;
  if (detected >= required) return 100;
  if (detected === 0) return 0;
  return Math.round((detected / required) * 100);
};

export const calculateEducationScore = (detectedScore, requiredLevel) => {
  const requiredScore = EDUCATION_LEVELS[requiredLevel?.toLowerCase()] || 0;
  if (detectedScore >= requiredScore) return 100;
  if (requiredScore === 0) return 100;
  return Math.round((detectedScore / requiredScore) * 100);
};

/**
 * Main screening function
 */
export const screenResume = ({ text, job }) => {
  const { matched, missing } = extractTextSkills(text, job.requiredSkills || []);
  const detectedExp = extractExperience(text);
  const { level: eduLevel, score: eduScore } = extractEducation(text);

  const skillScore = calculateSkillScore(matched.length, (job.requiredSkills || []).length);
  const expScore = calculateExperienceScore(detectedExp, job.experience?.min || 0);
  const educationScore = Math.min(100, eduScore + 30); // base score for having education

  // Weighted final score: Skills 50%, Experience 30%, Education 20%
  const overallScore = Math.round(
    skillScore * 0.5 + expScore * 0.3 + educationScore * 0.2
  );

  return {
    skillsMatched: matched,
    skillsMissing: missing,
    detectedExperience: detectedExp,
    detectedEducation: eduLevel,
    skillMatchScore: skillScore,
    experienceScore: expScore,
    educationScore,
    overallScore: Math.min(100, overallScore)
  };
};

/**
 * Rank candidates by score
 */
export const rankCandidates = (candidates) => {
  return candidates
    .sort((a, b) => b.matchScore - a.matchScore)
    .map((c, i) => ({ ...c, rank: i + 1 }));
};
