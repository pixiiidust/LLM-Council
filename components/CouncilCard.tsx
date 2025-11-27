import React, { useState } from 'react';
import { CouncilData, Stage } from '../types';
import { COUNCIL_MEMBERS } from '../services/geminiService';
import { Icon } from './Icon';

interface CouncilCardProps {
  data: CouncilData;
}

const Markdown: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap leading-relaxed font-mono text-cyber-text">
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

    if (currentIdx > targetIdx) return <span className="text-cyber-secondary">[DONE]</span>;
    if (currentIdx === targetIdx) return <span className="text-cyber-primary animate-pulse">[BUSY]</span>;
    return <span className="text-cyber-muted opacity-30">[WAIT]</span>;
  };

  const getActiveContent = () => {
    if (activeTab === 'final') return data.chairmanResponse || "Awaiting Final Verdict...";
    
    // Check Reviews tab
    if (activeTab === 'reviews') {
      if (data.reviews.length === 0) return "Reviews pending...";
      return data.reviews.map(r => {
        const m = COUNCIL_MEMBERS.find(m => m.id === r.reviewerId);
        return `### REVIEW: ${m?.name}\n${r.content}`;
      }).join('\n\n***\n\n');
    }

    // Individual Member tabs
    const opinion = data.opinions.find(o => o.memberId === activeTab);
    return opinion?.content || "Opinion pending...";
  };

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto my-6 bg-cyber-black border-4 border-cyber-border shadow-[0_0_15px_rgba(74,222,128,0.1)] overflow-hidden font-mono relative">
      
      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-8 border-l-8 border-cyber-primary"></div>
      <div className="absolute top-0 right-0 w-3 h-3 border-t-8 border-r-8 border-cyber-primary"></div>
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-8 border-l-8 border-cyber-primary"></div>
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-8 border-r-8 border-cyber-primary"></div>

      {/* Header / Progress Bar */}
      <div className="bg-cyber-dim p-4 border-b-4 border-cyber-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
           <div className="bg-cyber-primary/10 p-2 border-2 border-cyber-primary text-cyber-primary shadow-[0_0_10px_rgba(74,222,128,0.2)]">
             <Icon name="bot" className="w-5 h-5" />
           </div>
           <div>
             <h3 className="text-lg font-bold tracking-widest text-cyber-primary uppercase text-glow">/// PROTOCOL: COUNCIL_V1</h3>
             <span className="text-xs text-cyber-secondary uppercase tracking-wider font-bold">
               STATUS: {data.stage === 'complete' ? 'DELIBERATION_COMPLETE' : 'PROCESSING_REQUEST...'}
             </span>
           </div>
        </div>

        {/* Technical Progress Steps */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-xs font-bold font-mono text-cyber-muted">
          <div className="flex items-center gap-2">
             <span>01 // INITIAL_OPINIONS:</span>
             <StatusIcon targetStage="opinions" />
          </div>
          <div className="flex items-center gap-2">
             <span>02 // PEER_REVIEW:</span>
             <StatusIcon targetStage="reviews" />
          </div>
          <div className="flex items-center gap-2">
             <span>03 // FINAL_SYNTHESIS:</span>
             <StatusIcon targetStage="chairman" />
          </div>
        </div>
      </div>

      {/* Accordion Toggle */}
      <div className="bg-cyber-black border-b-4 border-cyber-border border-dashed">
        <button 
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs text-cyber-primary hover:bg-cyber-primary/10 transition-colors uppercase tracking-widest font-bold"
        >
          <span>[ TOGGLE_DETAILS ]</span>
          <Icon name={isDetailsOpen ? 'chevron-up' : 'chevron-down'} className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      {isDetailsOpen && (
        <div className="flex flex-col md:flex-row h-[600px] md:h-auto min-h-[450px]">
          
          {/* Sidebar Tabs */}
          <div className="md:w-64 bg-cyber-panel border-r-4 border-cyber-border flex flex-row md:flex-col overflow-x-auto md:overflow-visible scrollbar-hide">
            
            {/* Chairman Tab (Final Answer) */}
            <button
              onClick={() => setActiveTab('final')}
              className={`flex-shrink-0 md:w-full text-left px-4 py-3 text-xs font-bold border-b-2 border-cyber-border transition-all uppercase tracking-wider
                ${activeTab === 'final' 
                  ? 'bg-cyber-primary/20 text-cyber-primary border-l-8 border-l-cyber-primary text-glow' 
                  : 'text-cyber-muted hover:text-cyber-primary hover:bg-cyber-primary/5 border-l-8 border-l-transparent'}
              `}
            >
              > FINAL_VERDICT
            </button>

            {/* Individual Members */}
            <div className="px-4 py-2 text-[10px] text-cyber-muted uppercase tracking-widest border-b-2 border-cyber-border hidden md:block bg-cyber-black font-bold">
              // COUNCIL_MEMBERS
            </div>
            
            {COUNCIL_MEMBERS.map((member) => (
              <button
                key={member.id}
                onClick={() => setActiveTab(member.id)}
                disabled={data.opinions.length === 0}
                className={`flex-shrink-0 md:w-full text-left px-4 py-3 text-xs border-b-2 border-cyber-border transition-all uppercase
                  ${activeTab === member.id 
                    ? `bg-white/5 ${member.color} border-l-8 border-l-current font-bold` 
                    : 'text-cyber-muted hover:text-cyber-text hover:bg-white/5 border-l-8 border-l-transparent'}
                  ${data.opinions.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {member.name}
              </button>
            ))}

            {/* Reviews Tab */}
            <button
              onClick={() => setActiveTab('reviews')}
              disabled={data.reviews.length === 0}
              className={`flex-shrink-0 md:w-full text-left px-4 py-3 text-xs font-bold border-b-2 border-cyber-border transition-all uppercase tracking-wider
                ${activeTab === 'reviews' 
                  ? 'bg-amber-900/20 text-amber-400 border-l-8 border-l-amber-500' 
                  : 'text-amber-700 hover:text-amber-400 hover:bg-amber-900/10 border-l-8 border-l-transparent'}
                 ${data.reviews.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              > INTERNAL_LOGS
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto bg-cyber-black min-h-[300px] max-h-[600px] relative">
            {/* Background grid for content area */}
             <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(74,222,128,0.1)_2px,transparent_2px),linear-gradient(90deg,rgba(74,222,128,0.1)_2px,transparent_2px)] bg-[size:20px_20px]"></div>

            {data.error ? (
                <div className="p-4 border-2 border-red-500 text-red-500 bg-red-950/30 font-mono text-sm">
                    <div className="flex items-center gap-2 mb-2 font-bold uppercase">
                         <Icon name="alert" />
                         CRITICAL_ERROR
                    </div>
                    {data.error}
                </div>
            ) : (
                <div className="relative z-10">
                   <div className="mb-4 text-xs text-cyber-muted uppercase tracking-widest border-b-2 border-cyber-border/50 pb-2 font-bold">
                      Displaying: {activeTab === 'final' ? 'CHAIRMAN_SYNTHESIS' : activeTab.toUpperCase() + '_OUTPUT'}
                   </div>
                   <Markdown content={getActiveContent()} />
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};