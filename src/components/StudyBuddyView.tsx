import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  HelpCircle,
  Award,
  CheckCircle,
  XCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { sendChatMessage } from '../services/api';

const GRADE_LEVELS = [
  'Elementary (Grades 1-5)',
  'Middle School (Grades 6-8)',
  'High School (Grades 9-12)',
  'College / University',
  'Lifelong Learner',
];

const SUBJECTS = [
  'Mathematics & Calculus',
  'Physics & Chemistry',
  'Biology & Medicine',
  'World History & Politics',
  'Literature & Writing',
  'Computer Science',
  'Economics & Finance',
];

export const StudyBuddyView: React.FC = () => {
  const [selectedGrade, setSelectedGrade] = useState('High School (Grades 9-12)');
  const [action, setAction] = useState<'explain' | 'homework' | 'quiz' | 'stepbystep'>('explain');
  const [topicInput, setTopicInput] = useState('');
  const [studyOutput, setStudyOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sample quick questions
  const sampleTopics = {
    explain: [
      'How does photosynthesis convert sunlight into glucose and oxygen?',
      'Explain Newton’s 3 Laws of Motion with sports examples',
      'How does the immune system remember viruses via antibodies?',
    ],
    homework: [
      'Solve: 3x^2 - 12x + 9 = 0 using factoring and quadratic formula',
      'A car accelerates from 0 to 60 mph in 5 seconds. What is its acceleration in m/s^2?',
      'Analyze the symbolism of the green light in The Great Gatsby',
    ],
    quiz: [
      'Create a 4-question biology quiz on cell organelles with multiple choices',
      'Create a 4-question history quiz on the American Revolution with answer key',
      'Create a 4-question quiz on fractions, percentages, and ratios',
    ],
    stepbystep: [
      'Step-by-step derivation of the area of a circle using calculus integration',
      'Step-by-step guide to balancing the chemical equation: C3H8 + O2 -> CO2 + H2O',
      'Step-by-step explanation of how DNS resolves a website domain to an IP address',
    ],
  };

  const handleStudy = async (overridePrompt?: string) => {
    const prompt = overridePrompt || topicInput;
    if (!prompt.trim()) return;

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await sendChatMessage({
        messages: [{ role: 'user', content: prompt }],
        mode: 'study',
        gradeLevel: selectedGrade,
        studyAction: action,
      });

      setStudyOutput(res.text || 'No response returned.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to complete study session.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-gray-900 to-slate-900 border border-amber-500/20 text-white">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <span>Study Buddy</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium">
                Tutor & Coach
              </span>
            </h1>
            <p className="text-xs text-gray-300 mt-0.5">
              Personalized homework guidance, deep concept breakdowns, and interactive quizzes tailored to your grade level.
            </p>
          </div>
        </div>

        {/* Grade Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Class/Grade:</span>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-medium focus:ring-1 focus:ring-amber-500 outline-hidden cursor-pointer"
          >
            {GRADE_LEVELS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Selector */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
        {[
          { key: 'explain' as const, label: 'Explain a Topic', icon: BookOpen, desc: 'Intuitive analogies & depth' },
          { key: 'homework' as const, label: 'Homework Help', icon: HelpCircle, desc: 'Step-by-step problem guidance' },
          { key: 'quiz' as const, label: 'Quiz Mode', icon: Award, desc: 'Interactive practice & testing' },
          { key: 'stepbystep' as const, label: 'Step-by-Step Breakdown', icon: Lightbulb, desc: 'Detailed derivations' },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = action === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setAction(item.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                isActive
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Input & Output Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form & Presets */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              {action === 'explain'
                ? 'What topic would you like to master?'
                : action === 'homework'
                ? 'Enter your homework problem or assignment prompt:'
                : action === 'quiz'
                ? 'What subject or chapter should the quiz cover?'
                : 'What formula or problem requires step-by-step breakdown?'}
            </label>

            <textarea
              rows={4}
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              placeholder="E.g., Explain how the Doppler effect works with sound and light waves..."
              className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white placeholder-gray-400 resize-none outline-hidden focus:border-amber-500 leading-relaxed"
            />

            <button
              type="button"
              onClick={() => handleStudy()}
              disabled={isLoading || !topicInput.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Preparing Tutoring Session...</span>
                </>
              ) : (
                <>
                  <GraduationCap className="w-4 h-4" />
                  <span>Start Learning with AI Buddy</span>
                </>
              )}
            </button>
          </div>

          {/* Preset Questions for current mode */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Suggested {action} Topics
            </span>
            <div className="space-y-1.5">
              {sampleTopics[action].map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setTopicInput(sample);
                    handleStudy(sample);
                  }}
                  className="w-full text-left p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 hover:border-amber-400 text-xs text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition cursor-pointer truncate"
                  title={sample}
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Tutoring & Quiz Feedback */}
        <div className="lg:col-span-7">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 min-h-[460px] flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Study Buddy Explanation & Lesson
                  </span>
                </div>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                  Level: {selectedGrade.split(' ')[0]}
                </span>
              </div>

              {errorMsg && (
                <div className="p-3 mb-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                  {errorMsg}
                </div>
              )}

              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center animate-spin">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Drafting personalized pedagogical lesson...
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Tailoring analogies and step-by-step clarity to your grade level.
                  </p>
                </div>
              ) : studyOutput ? (
                <div className="overflow-x-auto text-sm leading-relaxed">
                  <MarkdownRenderer content={studyOutput} />
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center text-gray-400 space-y-2 select-none">
                  <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-700" />
                  <p className="text-xs font-medium">Your study session will appear here</p>
                  <p className="text-[11px] max-w-sm">
                    Ask for homework help, request an interactive quiz with scoring, or explore any concept step-by-step.
                  </p>
                </div>
              )}
            </div>

            {studyOutput && (
              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  Interactive Learning Mode
                </span>
                <span>Audience: {selectedGrade}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
