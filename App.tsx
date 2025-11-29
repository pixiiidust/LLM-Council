import React, { useState, useRef, useEffect } from 'react';
import { Message, CouncilData } from './types';
import { CouncilCard } from './components/CouncilCard';
import { Icon } from './components/Icon';
import { getInitialOpinions, getPeerReviews, getChairmanRuling } from './services/geminiService';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; content: string; type: 'text' | 'pdf' } | null>(null);
  const [isEli5, setIsEli5] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for Full Screen changes (e.g. user pressing ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      const docEl = document.documentElement as any;
      const requestFullScreen = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
      if (requestFullScreen) {
          requestFullScreen.call(docEl).catch((err: any) => {
              console.warn("Full screen request failed", err);
          });
      }
    } else {
      const doc = document as any;
      const exitFullScreen = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
      if (exitFullScreen) {
        exitFullScreen.call(doc);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf';
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (isPdf) {
         // Extract base64 part of Data URL
         const content = result.split(',')[1];
         setAttachment({ name: file.name, content, type: 'pdf' });
      } else {
         setAttachment({ name: file.name, content: result, type: 'text' });
      }
    };

    reader.onerror = () => {
        console.error("Failed to read file");
    };

    if (isPdf) {
        reader.readAsDataURL(file);
    } else {
        reader.readAsText(file);
    }
    
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !attachment) || isLoading) return;

    // Reset previous abort controller if any
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const signal = abortController.signal;

    let userText = inputValue.trim();
    let displayPrompt = userText;
    let attachmentPart = null;
    
    // Construct the actual prompt and attachments sent to AI
    if (attachment) {
        if (attachment.type === 'pdf') {
            if (!userText) {
                userText = `Analyze this PDF document: ${attachment.name}`;
                displayPrompt = `[Attached PDF: ${attachment.name}]`;
            } else {
                displayPrompt = `${userText}\n\n[Attached PDF: ${attachment.name}]`;
            }
            // For PDFs, we create a specialized part to send to Gemini
            attachmentPart = {
                inlineData: {
                    mimeType: 'application/pdf',
                    data: attachment.content
                }
            };
        } else {
            // Text files are appended directly to the text prompt
            if (!userText) {
                userText = `Analyze this document: ${attachment.name}`;
                displayPrompt = `[Attached: ${attachment.name}]`;
            } else {
                displayPrompt = `${userText}\n\n[Attached: ${attachment.name}]`;
            }
            userText += `\n\n--- Document Content (${attachment.name}) ---\n${attachment.content}`;
        }
    }

    setInputValue('');
    setAttachment(null);
    setIsLoading(true);

    // 1. Add User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: displayPrompt,
      timestamp: Date.now(),
    };

    // 2. Initialize Council Message Placeholder
    const councilMsgId = (Date.now() + 1).toString();
    const initialCouncilData: CouncilData = {
      stage: 'idle',
      opinions: [],
      reviews: [],
      chairmanResponse: '',
    };

    const councilMsg: Message = {
      id: councilMsgId,
      role: 'council',
      councilData: initialCouncilData,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg, councilMsg]);

    try {
      // --- STAGE 1: FIRST OPINIONS ---
      updateCouncilStage(councilMsgId, 'opinions');
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      const opinions = await getInitialOpinions(userText, attachmentPart, signal);
      updateCouncilData(councilMsgId, { opinions });

      // --- STAGE 2: PEER REVIEWS ---
      updateCouncilStage(councilMsgId, 'reviews');
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      const reviews = await getPeerReviews(userText, opinions, attachmentPart, signal);
      updateCouncilData(councilMsgId, { reviews });

      // --- STAGE 3: CHAIRMAN'S RULING ---
      updateCouncilStage(councilMsgId, 'chairman');
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      const finalRuling = await getChairmanRuling(userText, opinions, reviews, attachmentPart, isEli5, signal);
      
      // --- COMPLETE ---
      updateCouncilData(councilMsgId, { 
        chairmanResponse: finalRuling,
        stage: 'complete' 
      });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        updateCouncilData(councilMsgId, {
            error: "DELIBERATION_HALTED_BY_USER",
            stage: 'complete'
        });
      } else {
        console.error("Council process failed:", error);
        updateCouncilData(councilMsgId, { 
            stage: 'complete', 
            error: "CRITICAL_SYSTEM_FAILURE: DELIBERATION_ABORTED" 
        });
      }
    } finally {
      if (abortControllerRef.current === abortController) {
          setIsLoading(false);
          abortControllerRef.current = null;
      }
    }
  };

  const updateCouncilData = (msgId: string, updates: Partial<CouncilData>) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === msgId && msg.councilData) {
        return {
          ...msg,
          councilData: { ...msg.councilData, ...updates }
        };
      }
      return msg;
    }));
  };

  const updateCouncilStage = (msgId: string, stage: CouncilData['stage']) => {
    updateCouncilData(msgId, { stage });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-cyber-black text-cyber-primary font-mono relative overflow-hidden bg-grid-pattern bg-[length:40px_40px]">
      
      {/* Top Protocol Header - Persistent and Sticky */}
      <header className="flex-none h-20 border-b-4 border-cyber-border bg-cyber-black flex items-center justify-between px-4 sm:px-6 z-30 select-none shadow-[0_5px_20px_rgba(0,0,0,0.5)] sticky top-0">
        <div className="flex items-center gap-6">
             <div className="flex flex-col">
                 <div className="text-3xl sm:text-4xl font-bold tracking-tighter text-cyber-primary text-glow leading-none">
                    AI SYSTEMS REPORT
                 </div>
                 <div className="flex items-center gap-2 mt-1">
                    <span className="w-3 h-3 bg-cyber-secondary animate-pulse"></span>
                    <div className="text-[10px] text-cyber-secondary tracking-[0.3em] uppercase opacity-80 font-bold">
                      Authority: Human-in-Loop
                    </div>
                 </div>
             </div>
        </div>
        
        <div className="flex items-center gap-4">
            {/* Hidden Analytics for Mobile */}
            <div className="hidden md:flex items-center">
                <div className="bg-cyber-primary text-cyber-black px-4 py-2 font-bold text-2xl tracking-tighter border-4 border-transparent">
                    +14%
                    <span className="block text-[10px] leading-none tracking-normal font-normal">EFFICIENCY GAIN</span>
                </div>
                <div className="ml-4 flex flex-col items-end text-[10px] text-cyber-muted tracking-widest gap-1 font-bold">
                    <span>PROGRAM : AUXON // ANALYTICS_MODE</span>
                    <span className="text-cyber-secondary">> DATASETS INGESTED : 7,428</span>
                </div>
            </div>

            {/* Full Screen Toggle (Visible on Mobile) */}
            <button 
                onClick={toggleFullScreen}
                className="p-3 border-4 border-cyber-border hover:bg-cyber-dim hover:border-cyber-primary text-cyber-primary transition-all active:scale-95"
                title={isFullscreen ? "EXIT_FULL_SCREEN" : "FULL_SCREEN_MODE"}
            >
                <Icon name={isFullscreen ? 'minimize' : 'maximize'} className="w-6 h-6" />
            </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 scroll-smooth relative">
        
        {messages.length === 0 && (
          // Adjusted container: Use min-h-full to ensure it fills screen but grows if content overflows.
          // Removed forced justify-center on mobile to prevent clipping at top. Added py-12 for safe spacing.
          <div className="min-h-full flex flex-col items-center py-12 md:justify-center p-4">
             <div className="max-w-4xl w-full border-4 border-cyber-border p-1 relative bg-cyber-black/90 shadow-[0_0_30px_rgba(74,222,128,0.1)] backdrop-blur-sm">
                
                {/* Decorative corners */}
                <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-8 border-l-8 border-cyber-primary"></div>
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-8 border-r-8 border-cyber-primary"></div>
                <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-8 border-l-8 border-cyber-primary"></div>
                <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-8 border-r-8 border-cyber-primary"></div>

                <div className="p-8 border-4 border-cyber-border/30 border-dashed">
                    {/* Hero Section */}
                    <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
                        <div className="flex-1 space-y-4">
                             <div className="inline-block px-3 py-1 bg-cyber-primary/10 text-cyber-primary text-xs font-bold uppercase tracking-wider mb-2 border-2 border-cyber-primary">
                                [ INSIGHT SUMMARY ]
                             </div>
                             <h2 className="text-4xl md:text-5xl font-bold text-cyber-text tracking-tighter text-glow">
                                COUNCIL_OF_5
                             </h2>
                             <p className="text-cyber-muted text-sm leading-relaxed border-l-4 border-cyber-primary pl-4 font-bold">
                                > Autonomous multi-agent deliberation protocols engaged.<br/>
                                > Synthesis engine ready to process complex queries through adversarial review.
                             </p>
                        </div>
                        
                        {/* Chairman Box */}
                        <div className="w-full md:w-64 border-4 border-cyber-border bg-cyber-dim p-4 relative">
                            <div className="absolute top-0 right-0 bg-cyber-primary text-cyber-black text-[10px] px-2 py-0.5 font-bold">CORE_CPU</div>
                            <h3 className="text-xl font-bold text-cyber-primary mb-2 flex items-center gap-2">
                                <Icon name="sparkles" className="w-5 h-5 text-cyber-primary" />
                                THE_CHAIRMAN
                            </h3>
                            <p className="text-xs text-cyber-muted font-bold">
                                Synthesizes data. Resolves conflicts. Outputs final directive.
                            </p>
                            
                            {/* Animated Loading Bar */}
                            <div className="mt-4 h-3 w-full bg-cyber-black border-2 border-cyber-border/50 relative overflow-hidden">
                                <div className="absolute inset-0 bg-cyber-primary/50 w-2/3 animate-[shimmer_2s_infinite_linear]"></div>
                                <div className="absolute inset-0 flex justify-between">
                                    <div className="w-[2px] h-full bg-cyber-black"></div>
                                    <div className="w-[2px] h-full bg-cyber-black"></div>
                                    <div className="w-[2px] h-full bg-cyber-black"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Grid of Members */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { title: 'THE ANALYST', desc: 'Logic / Data / Precision', color: 'text-lime-400', border: 'border-lime-400/30' },
                            { title: 'THE VISIONARY', desc: 'Abstract / Creative / What-If', color: 'text-fuchsia-400', border: 'border-fuchsia-400/30' },
                            { title: 'THE SKEPTIC', desc: 'Critical / Risk / Edge-Cases', color: 'text-amber-400', border: 'border-amber-400/30' },
                            { title: 'THE PRAGMATIST', desc: 'Feasible / Real-World / Action', color: 'text-emerald-400', border: 'border-emerald-400/30' },
                        ].map((member, i) => (
                            <div key={i} className={`bg-cyber-black border-4 ${member.border} p-3 hover:bg-cyber-dim transition-colors cursor-default`}>
                                <div className={`font-bold ${member.color} text-sm mb-1 tracking-wider`}>
                                    // {member.title}
                                </div>
                                <div className="text-[10px] text-cyber-muted uppercase font-bold">
                                    > {member.desc}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Bottom Status Line */}
                    <div className="mt-8 pt-4 border-t-4 border-cyber-border/30 border-dashed flex justify-between text-[10px] text-cyber-muted uppercase tracking-widest font-bold">
                         <span>>>>>> Add text files if required to augment your query.</span>
                         <div className="flex gap-2">
                             <span>00:01</span>
                             <span>00:05</span>
                             <span>00:09</span>
                         </div>
                    </div>
                </div>
             </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' ? (
              <div className="max-w-3xl relative group">
                 <div className="absolute top-0 right-0 -mr-2 -mt-2 w-4 h-4 border-t-4 border-r-4 border-cyber-secondary"></div>
                 <div className="bg-cyber-black border-4 border-cyber-secondary text-cyber-text px-6 py-4 shadow-[0_0_15px_rgba(74,222,128,0.1)]">
                    <div className="text-[10px] text-cyber-secondary uppercase tracking-widest mb-2 border-b-2 border-cyber-secondary/30 pb-1 w-fit font-bold">
                        > USER_INPUT_LOG
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                 </div>
              </div>
            ) : (
              // Council Message Component
              <div className="w-full">
                {msg.councilData && <CouncilCard data={msg.councilData} />}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Terminal - Persistent and Sticky */}
      <footer className="flex-none bg-cyber-black p-4 border-t-4 border-cyber-border z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] sticky bottom-0">
        <div className="max-w-5xl mx-auto space-y-2">
          
          {/* Attachment Tag */}
          {attachment && (
            <div className="inline-flex items-center gap-2 bg-cyber-secondary/10 border-4 border-cyber-secondary text-cyber-secondary px-3 py-1 text-xs font-bold uppercase tracking-wider">
                <Icon name={attachment.type === 'pdf' ? 'file-pdf' : 'file-text'} className="w-4 h-4" />
                <span>LOADED: {attachment.name}</span>
                <button onClick={removeAttachment} className="ml-2 hover:text-white"><Icon name="x" className="w-3 h-3" /></button>
            </div>
          )}

          <div className="relative flex items-center">
            {/* Prompt Symbol */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-cyber-primary font-bold animate-pulse text-lg">
                {'>'}
            </div>

            <input 
                type="file" 
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
                accept=".txt,.md,.json,.csv,.js,.ts,.tsx,.html,.css,.xml,.pdf"
            />
            
            <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                placeholder={isLoading ? "SYSTEM_PROCESSING..." : "ENTER_QUERY..."}
                className="w-full bg-cyber-dark text-cyber-primary pl-10 pr-32 py-4 border-4 border-cyber-border focus:border-cyber-primary focus:shadow-[0_0_10px_rgba(74,222,128,0.3)] outline-none resize-none disabled:opacity-50 h-16 font-mono text-sm shadow-inner uppercase placeholder-cyber-muted/50 font-bold"
            />
            
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                
                {/* File Upload */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="p-2 text-cyber-muted hover:text-cyber-primary hover:bg-cyber-dim border-2 border-transparent hover:border-cyber-border transition-all rounded-none"
                    title="UPLOAD_DATA"
                >
                    <Icon name="paperclip" className="w-4 h-4" />
                </button>

                 {/* ELI5 Toggle */}
                <button
                    onClick={() => setIsEli5(!isEli5)}
                    disabled={isLoading}
                    className={`p-2 border-2 text-[10px] font-bold transition-all rounded-none ${
                        isEli5 
                        ? 'bg-fuchsia-900/30 border-fuchsia-500 text-fuchsia-400' 
                        : 'bg-cyber-dark border-cyber-border text-cyber-muted hover:text-cyber-text'
                    }`}
                    title="SIMPLIFY_OUTPUT"
                >
                    ELI5_MODE:{isEli5 ? 'ON' : 'OFF'}
                </button>

                {/* Action Button */}
                {isLoading ? (
                    <button
                        onClick={handleStopGeneration}
                        className="p-2 bg-red-900/20 border-2 border-red-500 text-red-500 hover:bg-red-900/40 transition-all rounded-none"
                        title="ABORT"
                    >
                        <Icon name="square" className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() && !attachment}
                        className="p-2 bg-cyber-primary/10 border-2 border-cyber-primary text-cyber-primary hover:bg-cyber-primary/20 hover:shadow-[0_0_10px_rgba(74,222,128,0.4)] transition-all disabled:opacity-30 disabled:cursor-not-allowed rounded-none"
                        title="EXECUTE"
                    >
                        <Icon name="send" className="w-4 h-4" />
                    </button>
                )}
            </div>
          </div>
          
          <div className="flex justify-between text-[10px] text-cyber-muted uppercase font-bold">
             <span>SYS_RAM: OK</span>
             <span>MODELS: GEMINI_2.5_FLASH // GEMINI_3.0_PRO</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;