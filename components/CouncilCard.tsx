import React, { useState } from 'react';
import { CouncilData, Stage } from '../types';
import { COUNCIL_MEMBERS } from '../services/geminiService';
import { Icon } from './Icon';

interface CouncilCardProps {
  data: CouncilData;
}

const Markdown: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap leading-relaxed">
      {content}
    </div>
  );
};

export const CouncilCard: React.FC<CouncilCardProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<string>('final');
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);

  // Helper to determine status icon
  const StatusIcon = ({ targetStage }: { targetStage: Stage }) => {
    // Defines order of stages
    const stages: Stage[] = ['idle', 'opinions', 'reviews', 'chairman', 'complete'];
    const currentIdx = stages.indexOf(data.stage);
    const targetIdx = stages.indexOf(targetStage);

    if (currentIdx > targetIdx) return <Icon name="check" className="w-4 h-4 text-green-400" />;
    if (currentIdx === targetIdx) return <Icon name="clock" className="w-4 h-4 text-blue-400 animate-spin" />;
    return <div className="w-4 h-4 rounded-full border border-gray-600" />;
  };

  const getActiveContent = () => {
    if (activeTab === 'final') return data.chairmanResponse || "Waiting for the Chairman's verdict...";
    
    // Check Reviews tab
    if (activeTab === 'reviews') {
      if (data.reviews.length === 0) return "Reviews pending...";
      return data.reviews.map(r => {
        const m = COUNCIL_MEMBERS.find(m => m.id === r.reviewerId);
        return `**${m?.name} Review:**\n${r.content}`;
      }).join('\n\n---\n\n');
    }

    // Individual Member tabs
    const opinion = data.opinions.find(o => o.memberId === activeTab);
    return opinion?.content || "Opinion pending...";
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto my-6 bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
      
      {/* Header / Progress Bar */}
      <div className="bg-gray-900/50 p-4 border-b border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
           <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400">
             <Icon name="bot" className="w-6 h-6" />
           </div>
           <div>
             <h3 className="font-semibold text-gray-100">LLM Council</h3>
             <span className="text-xs text-gray-400">
               {data.stage === 'complete' ? 'Deliberation Complete' : 'Council is in session...'}
             </span>
           </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-3 text-xs font-medium text-gray-400 bg-gray-900 rounded-lg p-2">
          <div className={`flex items-center gap-1 ${data.stage === 'opinions' ? 'text-blue-400' : ''}`}>
             <StatusIcon targetStage="opinions" />
             <span>First Opinions</span>
          </div>
          <div className="w-4 h-[1px] bg-gray-700"></div>
          <div className={`flex items-center gap-1 ${data.stage === 'reviews' ? 'text-blue-400' : ''}`}>
             <StatusIcon targetStage="reviews" />
             <span>Peer Review</span>
          </div>
          <div className="w-4 h-[1px] bg-gray-700"></div>
          <div className={`flex items-center gap-1 ${data.stage === 'chairman' ? 'text-blue-400' : ''}`}>
             <StatusIcon targetStage="chairman" />
             <span>Chairman</span>
          </div>
        </div>
      </div>

      {/* Accordion Toggle for Details */}
      <div className="bg-gray-800 border-b border-gray-700">
        <button 
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-500 hover:bg-gray-700/50 transition-colors uppercase tracking-wider font-semibold"
        >
          <span>Council Proceedings</span>
          <Icon name={isDetailsOpen ? 'chevron-up' : 'chevron-down'} className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      {isDetailsOpen && (
        <div className="flex flex-col md:flex-row h-[500px] md:h-auto min-h-[400px]">
          
          {/* Sidebar Tabs */}
          <div className="md:w-64 bg-gray-900/30 border-r border-gray-700 flex flex-row md:flex-col overflow-x-auto md:overflow-visible">
            
            {/* Chairman Tab (Final Answer) */}
            <button
              onClick={() => setActiveTab('final')}
              className={`flex-shrink-0 md:w-full text-left px-4 py-3 text-sm font-medium border-l-4 transition-all
                ${activeTab === 'final' 
                  ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' 
                  : 'border-transparent text-gray-400 hover:bg-gray-800 hover:text-gray-200'}
              `}
            >
              <div className="flex items-center gap-2">
                <Icon name="sparkles" className="w-4 h-4" />
                <span>Final Verdict</span>
              </div>
            </button>
            
            <div className="h-[1px] bg-gray-700 my-1 mx-2 hidden md:block"></div>

            {/* Individual Members */}
            {COUNCIL_MEMBERS.map((member) => (
              <button
                key={member.id}
                onClick={() => setActiveTab(member.id)}
                disabled={data.opinions.length === 0}
                className={`flex-shrink-0 md:w-full text-left px-4 py-3 text-sm border-l-4 transition-all
                  ${activeTab === member.id 
                    ? `bg-gray-800 border-${member.color.split('-')[1]}-500 text-gray-200` 
                    : 'border-transparent text-gray-500 hover:bg-gray-800 hover:text-gray-300'}
                  ${data.opinions.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div className="font-semibold">{member.name}</div>
                <div className="text-[10px] opacity-70 truncate">{member.style}</div>
              </button>
            ))}

            <div className="h-[1px] bg-gray-700 my-1 mx-2 hidden md:block"></div>

            {/* Reviews Tab */}
            <button
              onClick={() => setActiveTab('reviews')}
              disabled={data.reviews.length === 0}
              className={`flex-shrink-0 md:w-full text-left px-4 py-3 text-sm font-medium border-l-4 transition-all
                ${activeTab === 'reviews' 
                  ? 'bg-gray-800 border-yellow-500 text-yellow-500' 
                  : 'border-transparent text-gray-400 hover:bg-gray-800 hover:text-gray-200'}
                 ${data.reviews.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              Internal Reviews
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto bg-gray-800 min-h-[300px] max-h-[600px]">
            {data.error ? (
                <div className="p-4 bg-red-900/20 border border-red-500/50 rounded text-red-200 flex items-center gap-2">
                    <Icon name="alert" />
                    {data.error}
                </div>
            ) : (
                <Markdown content={getActiveContent()} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
