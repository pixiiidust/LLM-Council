import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !attachment) || isLoading) return;

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
      // Pass attachmentPart if it exists (for PDFs)
      const opinions = await getInitialOpinions(userText, attachmentPart);
      updateCouncilData(councilMsgId, { opinions });

      // --- STAGE 2: PEER REVIEWS ---
      updateCouncilStage(councilMsgId, 'reviews');
      const reviews = await getPeerReviews(userText, opinions, attachmentPart);
      updateCouncilData(councilMsgId, { reviews });

      // --- STAGE 3: CHAIRMAN'S RULING ---
      updateCouncilStage(councilMsgId, 'chairman');
      // Pass isEli5 to the Chairman
      const finalRuling = await getChairmanRuling(userText, opinions, reviews, attachmentPart, isEli5);
      
      // --- COMPLETE ---
      updateCouncilData(councilMsgId, { 
        chairmanResponse: finalRuling,
        stage: 'complete' 
      });

    } catch (error) {
      console.error("Council process failed:", error);
      updateCouncilData(councilMsgId, { 
        stage: 'complete', 
        error: "The Council encountered a critical error during deliberation." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to update state deeply
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
    <div className="flex flex-col h-full bg-gray-900 text-gray-100 relative">
      
      {/* Navbar */}
      <header className="flex-none h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                <Icon name="bot" className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">LLM Council</h1>
        </div>
        <div className="text-sm text-gray-500 hidden sm:block">
            Powered by Google Gemini 2.5 & 3.0
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center p-8">
             <div className="max-w-3xl w-full space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                     <div className="w-20 h-20 bg-gray-800 rounded-2xl mx-auto flex items-center justify-center shadow-xl border border-gray-700">
                       <Icon name="bot" className="w-10 h-10 text-indigo-500" />
                     </div>
                     <h2 className="text-3xl font-bold text-gray-100">The LLM Council</h2>
                     <p className="text-gray-400 max-w-lg mx-auto">
                        Your query is debated by a diverse council of AI personas before a final verdict is reached.
                     </p>
                </div>

                {/* The Chairman Card */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 relative overflow-hidden group hover:border-indigo-500/50 transition-colors">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                    <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                        <Icon name="sparkles" className="w-5 h-5 text-indigo-400" />
                        The Chairman
                    </h3>
                    <p className="text-gray-400">
                        Presides over the council. Reviews all opinions and critiques to synthesize a final, balanced, and authoritative answer.
                    </p>
                </div>

                {/* Members Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Analyst */}
                    <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4 hover:bg-gray-800/50 transition-colors group">
                        <h4 className="font-bold text-blue-400 mb-1 group-hover:text-blue-300 transition-colors">The Analyst</h4>
                        <p className="text-sm text-gray-400">Analytical, data-driven, and precise.</p>
                    </div>

                    {/* Visionary */}
                    <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4 hover:bg-gray-800/50 transition-colors group">
                        <h4 className="font-bold text-purple-400 mb-1 group-hover:text-purple-300 transition-colors">The Visionary</h4>
                        <p className="text-sm text-gray-400">Creative, abstract, and out-of-the-box.</p>
                    </div>

                    {/* Skeptic */}
                    <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4 hover:bg-gray-800/50 transition-colors group">
                        <h4 className="font-bold text-orange-400 mb-1 group-hover:text-orange-300 transition-colors">The Skeptic</h4>
                        <p className="text-sm text-gray-400">Critical, cautious, and risk-aware.</p>
                    </div>

                    {/* Pragmatist */}
                    <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4 hover:bg-gray-800/50 transition-colors group">
                        <h4 className="font-bold text-green-400 mb-1 group-hover:text-green-300 transition-colors">The Pragmatist</h4>
                        <p className="text-sm text-gray-400">Practical, realistic, and solution-oriented.</p>
                    </div>
                </div>
             </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            
            {msg.role === 'user' ? (
              <div className="max-w-2xl bg-indigo-600 text-white rounded-2xl rounded-tr-none px-6 py-4 shadow-lg">
                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
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

      {/* Input Area */}
      <footer className="flex-none bg-gray-900 p-4 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          
          {/* Attachment Preview */}
          {attachment && (
            <div className="mb-2 bg-gray-800 border border-gray-700 rounded-lg p-2 flex items-center justify-between w-fit max-w-full">
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="p-1.5 bg-gray-700 rounded text-gray-300">
                        <Icon name={attachment.type === 'pdf' ? 'file-pdf' : 'file-text'} className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-gray-300 truncate max-w-[200px]">{attachment.name}</span>
                </div>
                <button 
                    onClick={removeAttachment}
                    className="ml-3 p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-red-400 transition-colors"
                >
                    <Icon name="x" className="w-4 h-4" />
                </button>
            </div>
          )}

          <div className="relative flex items-center gap-2">
            {/* File Input (Hidden) */}
            <input 
                type="file" 
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
                // Accepting common text formats and PDFs
                accept=".txt,.md,.json,.csv,.js,.ts,.tsx,.html,.css,.xml,.pdf"
            />
            
            <div className="relative flex-1">
                {/* Attachment Button */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-indigo-400 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Attach a text document or PDF"
                >
                    <Icon name="paperclip" className="w-5 h-5" />
                </button>

                <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    placeholder={isLoading ? "The Council is deliberating..." : "Present your query to the Council..."}
                    className="w-full bg-gray-800 text-gray-100 rounded-xl pl-12 pr-12 py-4 shadow-inner border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    rows={1}
                    style={{ minHeight: '60px' }}
                />
                
                {/* Send Button */}
                <button
                    onClick={handleSendMessage}
                    disabled={(!inputValue.trim() && !attachment) || isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white rounded-lg transition-colors"
                >
                    <Icon name="send" className="w-5 h-5" />
                </button>
            </div>

            {/* ELI5 Toggle Button */}
            <button
                onClick={() => setIsEli5(!isEli5)}
                disabled={isLoading}
                className={`flex-none p-3 rounded-xl border transition-all duration-200 ${
                    isEli5 
                    ? 'bg-pink-500/20 border-pink-500 text-pink-400' 
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                }`}
                title="Explain Like I'm 5 (ELI5)"
            >
                <div className="flex items-center gap-2">
                    <Icon name="balloon" className="w-5 h-5" />
                    <span className="text-xs font-bold hidden sm:inline">ELI5</span>
                </div>
            </button>
          </div>
        </div>
        <div className="text-center mt-2">
            <p className="text-xs text-gray-500">
                Models Used: Gemini 2.5 Flash (Council) • Gemini 3.0 Pro (Chairman)
            </p>
        </div>
      </footer>
    </div>
  );
};

export default App;