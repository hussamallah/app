'use client';
import { useState } from 'react';

export default function PrivacyAndMethodology() {
  const [activeTab, setActiveTab] = useState('privacy');

  const tabs = [
    { id: 'privacy', label: 'Privacy Policy' },
    { id: 'data', label: 'Data Storage & Use' },
    { id: 'methodology', label: 'Methodology' },
  ];

  return (
    <section id="privacy" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <h2 className="text-xl sm:text-2xl font-semibold text-center mb-6">Privacy & Methodology</h2>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-center border-b border-white/10 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-yellow-400 text-yellow-300'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          {activeTab === 'privacy' && (
            <div>
              <h3 className="text-lg font-semibold text-yellow-300 mb-3">Privacy Policy</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                Your privacy is critically important to us. This policy outlines how we handle your data throughout the Ground Zero assessment process. Our goal is to be fully transparent while safeguarding your information.
              </p>
              <ul className="list-disc list-inside mt-4 space-y-2 text-sm text-white/80">
                <li><strong>Minimal Data Collection:</strong> We do not ask for or store any personally identifiable information (PII) such as your name, email address, or IP address. The assessment can be completed anonymously.</li>
                <li><strong>Ephemeral In-Progress Data:</strong> While you are taking the assessment, your answers are held in a temporary, in-memory session on our server. This data is discarded once the session ends or after a short period of inactivity.</li>
                <li><strong>Persistent, Anonymous Results:</strong> To allow you to retrieve your results later, a final, anonymized summary of your assessment outcome is stored in our database. This record is only accessible via the unique, non-identifiable result code (hash) you receive upon completion.</li>
                <li><strong>No Data Selling:</strong> We will never sell your assessment data to third parties. Anonymized and aggregated data may be used for research purposes to improve the assessment's accuracy and reliability, but it will never be traceable back to an individual.</li>
              </ul>
            </div>
          )}
          {activeTab === 'data' && (
            <div>
              <h3 className="text-lg font-semibold text-yellow-300 mb-3">Data Storage & Use</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                We've designed our data handling practices to prioritize your privacy and security at every step. Here’s a detailed breakdown of what we store and how we protect it:
              </p>
              <ul className="list-disc list-inside mt-4 space-y-2 text-sm text-white/80">
                <li><strong>What We Store:</strong> The only data we store long-term is the final assessment result, which includes your computed scores and archetype. This is stored in a secure Supabase database and is associated only with your unique result code. The raw answers you provide during the assessment are processed to generate this result and are not stored in the final record.</li>
                <li><strong>How We Protect It:</strong> Our database is protected with industry-standard security measures, including encryption at rest and in transit. Access to the database is strictly limited to authorized personnel for system maintenance and analytics.</li>
                <li><strong>Your Result Code:</strong> The unique code you receive is a SHA-256 hash generated from your results data, making it computationally difficult to reverse-engineer. This code is your only key to your results. If you lose it, we have no way to retrieve your specific results, providing an additional layer of anonymity.</li>
                <li><strong>Data Retention:</strong> We store the anonymized results indefinitely to allow you to access them whenever you need them. If you wish for your results to be deleted, please contact us, though we will have no way of finding your data without the result code.</li>
              </ul>
            </div>
          )}
          {activeTab === 'methodology' && (
            <div>
              <h3 className="text-lg font-semibold text-yellow-300 mb-3">Methodology & Credentials</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                The Ground Zero assessment is built upon established principles of psychometrics and personality theory, primarily leveraging the Five-Factor Model (also known as the Big Five).
              </p>
              <ul className="list-disc list-inside mt-4 space-y-2 text-sm text-white/80">
                <li><strong>Scientific Foundation:</strong> Our methodology is rooted in decades of psychological research into personality traits: Openness, Conscientiousness, Extraversion, Agreeableness, and Neuroticism. These traits are widely accepted as a robust framework for understanding personality.</li>
                <li><strong>Deterministic Engine:</strong> Unlike many assessments, our scoring is 100% deterministic. The rules engine that processes your responses is transparent and reproducible. The "verification hash" provided with your results is a signature of your inputs and the ruleset, guaranteeing that the output is a direct, unchanged computation of your answers.</li>
                <li><strong>Credentialed Design:</strong> The assessment questions and archetypal models were developed by a team with backgrounds in psychology, organizational behavior, and data science. The system's logic is designed to be as objective as possible, translating psychometric inputs into practical, actionable identity blueprints.</li>
                <li><strong>Continuous Improvement:</strong> We are committed to refining our models and questions based on ongoing research and anonymized data analysis to ensure the highest degree of accuracy and utility.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
