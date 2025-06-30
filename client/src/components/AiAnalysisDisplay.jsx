// client/src/components/AiAnalysisDisplay.jsx
import React, { useState } from 'react';
import { IoChevronDown } from 'react-icons/io5';

// A helper component for each collapsible section to reduce repetition
const AccordionSection = ({ title, children, isOpen, setIsOpen }) => (
  <div className="border-b border-vav-background-alt">
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="w-full flex justify-between items-center text-left py-4 px-5 hover:bg-vav-background-alt transition-colors duration-200"
    >
      <span className="text-lg font-semibold text-vav-text">{title}</span>
      <IoChevronDown
        className={`w-5 h-5 text-vav-text-secondary transition-transform duration-300 ${
          isOpen ? 'rotate-180' : ''
        }`}
      />
    </button>
    <div
      className={`grid transition-all duration-500 ease-in-out ${
        isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      }`}
    >
      <div className="overflow-hidden">
        <div className="p-5 text-vav-text-secondary space-y-4">{children}</div>
      </div>
    </div>
  </div>
);

// A helper to render bullet points from a string
const BulletPointList = ({ text }) => (
    <ul className="list-disc list-inside space-y-2">
        {text.split('\n').map((item, index) => item.trim() && (
            <li key={index}>{item.trim().replace(/^- /, '')}</li>
        ))}
    </ul>
);

const AiAnalysisDisplay = ({ analysis }) => {
  const [isAnalysisOpen, setAnalysisOpen] = useState(true); // Default open
  const [isValueOpen, setValueOpen] = useState(false);
  const [isIssuesOpen, setIssuesOpen] = useState(false);
  const [isGearOpen, setGearOpen] = useState(false);

  if (!analysis) {
    return null;
  }

  return (
    <div className="bg-vav-background rounded-lg shadow-inner overflow-hidden">
      {/* At a Glance Section */}
      <div className="p-5 bg-vav-background-alt/50">
        <p className="text-sm text-vav-text-secondary text-center mb-1">AI Summary</p>
        <p className="text-center text-vav-text italic mb-3">"{analysis.summary}"</p>
        {analysis.valueInsight?.estimatedValueUSD && (
             <p className="text-center text-2xl font-bold text-vav-accent-primary">
                {analysis.valueInsight.estimatedValueUSD}
            </p>
        )}
      </div>

      {/* Accordion Sections */}
      <div className="border-t border-vav-background-alt">
        <AccordionSection title="Detailed Analysis & History" isOpen={isAnalysisOpen} setIsOpen={setAnalysisOpen}>
          <p className="whitespace-pre-wrap">{analysis.detailedAnalysis}</p>
        </AccordionSection>

        <AccordionSection title="Value & Market Desirability" isOpen={isValueOpen} setIsOpen={setValueOpen}>
            <div className="space-y-3">
                <p><strong className="text-vav-text">Production Dates:</strong> {analysis.valueInsight?.productionDates}</p>
                <p><strong className="text-vav-text">Market Desirability:</strong> {analysis.valueInsight?.marketDesirability}</p>
            </div>
        </AccordionSection>

        <AccordionSection title="Potential Issues & Restoration Tips" isOpen={isIssuesOpen} setIsOpen={setIssuesOpen}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="text-md font-semibold text-vav-text mb-2">Common Issues</h4>
                    <BulletPointList text={analysis.potentialIssues} />
                </div>
                <div>
                    <h4 className="text-md font-semibold text-vav-text mb-2">Restoration & Upgrade Tips</h4>
                    <BulletPointList text={analysis.restorationTips} />
                </div>
            </div>
        </AccordionSection>

         <AccordionSection title="Suggested Gear Pairings" isOpen={isGearOpen} setIsOpen={setGearOpen}>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analysis.suggestedGear?.map((gear, index) => (
                <div key={index} className="bg-vav-background-alt p-3 rounded-md">
                    <p className="font-bold text-vav-text">{gear.make} {gear.model}</p>
                    <p className="text-sm">{gear.reason}</p>
                </div>
            ))}
           </div>
        </AccordionSection>
      </div>
       {analysis.disclaimer && <p className="text-vav-text-secondary text-xs text-center p-4">{analysis.disclaimer}</p>}
    </div>
  );
};

export default AiAnalysisDisplay;