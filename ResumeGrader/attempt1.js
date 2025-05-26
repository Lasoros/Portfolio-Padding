import React, { useState } from 'react';
import { Upload, FileText, Target, CheckCircle, AlertCircle, TrendingUp, Star } from 'lucide-react';

const ResumeGrader = () => {
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Keywords and skills database
  const skillCategories = {
    technical: ['javascript', 'python', 'react', 'node.js', 'sql', 'aws', 'docker', 'kubernetes', 'git', 'api', 'database', 'cloud', 'machine learning', 'ai', 'data analysis'],
    soft: ['leadership', 'communication', 'teamwork', 'problem solving', 'analytical', 'creative', 'adaptable', 'collaborative', 'strategic', 'innovative'],
    business: ['project management', 'agile', 'scrum', 'budget', 'roi', 'kpi', 'strategy', 'stakeholder', 'process improvement', 'cross-functional']
  };

  const analyzeResume = () => {
    setIsAnalyzing(true);
    
    setTimeout(() => {
      const resumeLower = resumeText.toLowerCase();
      const jobLower = jobDescription.toLowerCase();
      
      // Extract keywords from job description
      const jobKeywords = extractKeywords(jobLower);
      const resumeKeywords = extractKeywords(resumeLower);
      
      // Calculate keyword match
      const matchedKeywords = jobKeywords.filter(keyword => 
        resumeLower.includes(keyword.toLowerCase())
      );
      const keywordScore = jobKeywords.length > 0 ? 
        (matchedKeywords.length / jobKeywords.length) * 100 : 0;
      
      // Analyze sections
      const sections = analyzeSections(resumeLower);
      const formatting = analyzeFormatting(resumeText);
      const experience = analyzeExperience(resumeLower);
      const skills = analyzeSkills(resumeLower, jobLower);
      
      // Calculate overall score
      const overallScore = Math.round(
        (keywordScore * 0.3 + 
         sections.score * 0.25 + 
         formatting.score * 0.15 + 
         experience.score * 0.2 + 
         skills.score * 0.1)
      );
      
      const result = {
        overallScore,
        keywordMatch: {
          score: Math.round(keywordScore),
          matched: matchedKeywords,
          missing: jobKeywords.filter(k => !matchedKeywords.includes(k)),
          total: jobKeywords.length
        },
        sections,
        formatting,
        experience,
        skills,
        improvements: generateImprovements(overallScore, keywordScore, sections, formatting, experience, skills, jobKeywords, matchedKeywords)
      };
      
      setAnalysis(result);
      setIsAnalyzing(false);
    }, 1500);
  };

  const extractKeywords = (text) => {
    const commonKeywords = [
      'python', 'javascript', 'react', 'node.js', 'java', 'c++', 'sql', 'html', 'css',
      'aws', 'azure', 'docker', 'kubernetes', 'git', 'agile', 'scrum', 'api',
      'machine learning', 'data science', 'analytics', 'marketing', 'sales',
      'project management', 'leadership', 'communication', 'teamwork'
    ];
    
    return commonKeywords.filter(keyword => text.includes(keyword));
  };

  const analyzeSections = (resumeText) => {
    const requiredSections = ['experience', 'education', 'skills'];
    const optionalSections = ['summary', 'objective', 'projects', 'certifications'];
    
    let score = 0;
    const present = [];
    const missing = [];
    
    requiredSections.forEach(section => {
      if (resumeText.includes(section)) {
        present.push(section);
        score += 30;
      } else {
        missing.push(section);
      }
    });
    
    optionalSections.forEach(section => {
      if (resumeText.includes(section)) {
        present.push(section);
        score += 10;
      }
    });
    
    return {
      score: Math.min(score, 100),
      present,
      missing,
      hasContact: resumeText.includes('@') || resumeText.includes('phone')
    };
  };

  const analyzeFormatting = (resumeText) => {
    let score = 100;
    const issues = [];
    
    if (resumeText.length < 200) {
      score -= 30;
      issues.push('Resume appears too short');
    }
    
    if (resumeText.length > 2000) {
      score -= 20;
      issues.push('Resume may be too long');
    }
    
    if (!/[A-Z]/.test(resumeText)) {
      score -= 15;
      issues.push('Missing proper capitalization');
    }
    
    const bulletPoints = (resumeText.match(/•|−|-|\*/g) || []).length;
    if (bulletPoints < 3) {
      score -= 20;
      issues.push('Insufficient use of bullet points');
    }
    
    return { score: Math.max(score, 0), issues };
  };

  const analyzeExperience = (resumeText) => {
    const actionVerbs = ['developed', 'created', 'managed', 'led', 'implemented', 'designed', 'improved', 'increased', 'reduced', 'achieved'];
    const numbers = resumeText.match(/\d+%|\$\d+|\d+\+/g) || [];
    
    let score = 50;
    const strengths = [];
    const weaknesses = [];
    
    const verbCount = actionVerbs.filter(verb => resumeText.includes(verb)).length;
    if (verbCount >= 3) {
      score += 25;
      strengths.push('Good use of action verbs');
    } else {
      weaknesses.push('Needs more strong action verbs');
    }
    
    if (numbers.length >= 2) {
      score += 25;
      strengths.push('Includes quantifiable achievements');
    } else {
      weaknesses.push('Lacks quantifiable results');
    }
    
    return { score, strengths, weaknesses, actionVerbs: verbCount, quantifiers: numbers.length };
  };

  const analyzeSkills = (resumeText, jobText) => {
    const foundSkills = [];
    const missingSkills = [];
    
    Object.values(skillCategories).flat().forEach(skill => {
      if (resumeText.includes(skill.toLowerCase())) {
        foundSkills.push(skill);
      } else if (jobText.includes(skill.toLowerCase())) {
        missingSkills.push(skill);
      }
    });
    
    const score = foundSkills.length > 0 ? Math.min((foundSkills.length / 10) * 100, 100) : 0;
    
    return { score, found: foundSkills, missing: missingSkills.slice(0, 5) };
  };

  const generateImprovements = (overallScore, keywordScore, sections, formatting, experience, skills, jobKeywords, matchedKeywords) => {
    const improvements = [];
    
    if (overallScore < 70) {
      improvements.push({
        priority: 'High',
        category: 'Overall',
        suggestion: 'Your resume needs significant improvement to be competitive. Focus on the high-priority items below.',
        impact: 'Major'
      });
    }
    
    if (keywordScore < 60) {
      improvements.push({
        priority: 'High',
        category: 'Keywords',
        suggestion: `Add these missing keywords from the job description: ${jobKeywords.filter(k => !matchedKeywords.includes(k)).slice(0, 5).join(', ')}`,
        impact: 'Major'
      });
    }
    
    if (sections.missing.length > 0) {
      improvements.push({
        priority: 'High',
        category: 'Structure',
        suggestion: `Add missing sections: ${sections.missing.join(', ')}`,
        impact: 'Major'
      });
    }
    
    if (experience.weaknesses.length > 0) {
      improvements.push({
        priority: 'Medium',
        category: 'Experience',
        suggestion: experience.weaknesses[0],
        impact: 'Moderate'
      });
    }
    
    if (formatting.issues.length > 0) {
      improvements.push({
        priority: 'Medium',
        category: 'Formatting',
        suggestion: formatting.issues[0],
        impact: 'Minor'
      });
    }
    
    if (skills.missing.length > 0) {
      improvements.push({
        priority: 'Low',
        category: 'Skills',
        suggestion: `Consider adding relevant skills: ${skills.missing.slice(0, 3).join(', ')}`,
        impact: 'Minor'
      });
    }
    
    return improvements;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 60) return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    return <AlertCircle className="w-5 h-5 text-red-600" />;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Resume Grader & Improvement Tool</h1>
          <p className="text-gray-600">Upload your resume and job description for personalized feedback</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Your Resume</h2>
            </div>
            <textarea
              placeholder="Paste your resume text here..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold">Job Description</h2>
            </div>
            <textarea
              placeholder="Paste the job description here for targeted analysis..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        <div className="text-center mb-8">
          <button
            onClick={analyzeResume}
            disabled={!resumeText.trim() || isAnalyzing}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Resume'}
          </button>
        </div>

        {analysis && (
          <div className="space-y-6">
            {/* Overall Score */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Overall Score</h2>
                <div className="flex items-center gap-2">
                  {getScoreIcon(analysis.overallScore)}
                  <span className={`text-3xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                    {analysis.overallScore}/100
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${
                    analysis.overallScore >= 80 ? 'bg-green-500' : 
                    analysis.overallScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${analysis.overallScore}%` }}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Detailed Scores */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-blue-600" />
                  Detailed Analysis
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Keyword Match</span>
                    <span className={`font-semibold ${getScoreColor(analysis.keywordMatch.score)}`}>
                      {analysis.keywordMatch.score}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Resume Structure</span>
                    <span className={`font-semibold ${getScoreColor(analysis.sections.score)}`}>
                      {analysis.sections.score}/100
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Experience Quality</span>
                    <span className={`font-semibold ${getScoreColor(analysis.experience.score)}`}>
                      {analysis.experience.score}/100
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Formatting</span>
                    <span className={`font-semibold ${getScoreColor(analysis.formatting.score)}`}>
                      {analysis.formatting.score}/100
                    </span>
                  </div>
                </div>
              </div>

              {/* Keyword Analysis */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Keyword Analysis</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-green-600">Matched Keywords:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {analysis.keywordMatch.matched.map((keyword, idx) => (
                        <span key={idx} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                  {analysis.keywordMatch.missing.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-red-600">Missing Keywords:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {analysis.keywordMatch.missing.slice(0, 8).map((keyword, idx) => (
                          <span key={idx} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Improvements */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Improvement Suggestions
              </h3>
              <div className="space-y-4">
                {analysis.improvements.map((improvement, idx) => (
                  <div key={idx} className="border-l-4 border-blue-400 pl-4 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        improvement.priority === 'High' ? 'bg-red-100 text-red-800' :
                        improvement.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {improvement.priority} Priority
                      </span>
                      <span className="text-sm font-medium text-gray-600">{improvement.category}</span>
                    </div>
                    <p className="text-gray-800">{improvement.suggestion}</p>
                    <span className="text-xs text-gray-500">Impact: {improvement.impact}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeGrader;