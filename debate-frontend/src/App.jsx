import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Send, 
  Layers, 
  Cpu, 
  User, 
  Loader2,
  FolderOpen,
  Layout,
  Terminal
} from 'lucide-react';

const API_BASE = "http://127.0.0.1:8000";

// --- Components ---

const AgentAvatar = ({ role }) => {
  const getColors = (r) => {
    const roleLower = r.toLowerCase();
    if (roleLower === 'user') return 'bg-blue-600 text-white';
    if (roleLower.includes('critic')) return 'bg-red-500 text-white';
    if (roleLower.includes('planner') || roleLower.includes('architect')) return 'bg-purple-600 text-white';
    if (roleLower.includes('coder') || roleLower.includes('developer')) return 'bg-emerald-600 text-white';
    return 'bg-gray-700 text-white';
  };

  const getIcon = (r) => {
    const roleLower = r.toLowerCase();
    if (roleLower === 'user') return <User size={16} />;
    return <Cpu size={16} />;
  };

  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm shrink-0 ${getColors(role)}`}>
      {getIcon(role)}
    </div>
  );
};

export default function App() {
  // State
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const messagesEndRef = useRef(null);

  // Helper for scrolling to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- API Integrations ---

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error("API Error (Ensure backend is running on port 8000):", err);
    }
  };

  const fetchChats = async (projectId) => {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/chats`);
      const data = await res.json();
      setChats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async (chatId) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chats/${chatId}/messages`);
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName, description: "Created via UI" })
      });
      const data = await res.json();
      setProjects([...projects, data]);
      setNewProjectName("");
      setIsCreatingProject(false);
      setActiveProject(data);
    } catch (err) {
      alert("Failed to create project. Is backend running?");
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const content = inputText;
    setInputText(""); // Clear immediately for UX
    setIsLoading(true);

    try {
      let res;
      let data;

      if (!activeChat) {
        // Start New Chat
        if (!activeProject) return;
        res = await fetch(`${API_BASE}/chats/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            project_id: activeProject.project_id, 
            idea: content,
            user_id: "user_ui_1",
            title: content.substring(0, 30) + (content.length > 30 ? "..." : "")
          })
        });
        data = await res.json();
        fetchChats(activeProject.project_id);
        setActiveChat({ chat_id: data.chat_id, idea: content, title: data.title });
        await fetchMessages(data.chat_id);
      } else {
        // Continue Chat
        // Optimistic update
        const tempMsg = { 
          id: Date.now(), 
          role: 'user', 
          content: content, 
          timestamp: new Date().toISOString() 
        };
        setMessages(prev => [...prev, tempMsg]);

        res = await fetch(`${API_BASE}/chats/${activeChat.chat_id}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            content: content,
            user_id: "user_ui_1"
          })
        });
        await fetchMessages(activeChat.chat_id);
      }
    } catch (err) {
      console.error(err);
      alert("Error sending message.");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchProjects();
  }, []);

  // When project changes, fetch its chats
  useEffect(() => {
    if (activeProject) {
      fetchChats(activeProject.project_id);
      setActiveChat(null);
      setMessages([]);
    }
  }, [activeProject]);

  // When chat changes, fetch messages
  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.chat_id);
    }
  }, [activeChat]);


  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      
      {/* --- Sidebar (Projects & Chats) --- */}
      <div className="w-72 bg-gray-900 text-gray-300 flex flex-col border-r border-gray-800">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center space-x-2">
          <Layers className="text-indigo-500" />
          <h1 className="font-bold text-white tracking-wide">Brainstorming Engine</h1>
        </div>

        {/* Projects Section */}
        <div className="p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Projects</h2>
            <button 
              onClick={() => setIsCreatingProject(!isCreatingProject)}
              className="hover:text-white transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          {isCreatingProject && (
            <div className="mb-3 animate-in fade-in slide-in-from-top-2">
              <input 
                autoFocus
                type="text" 
                placeholder="Project Name..." 
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              />
            </div>
          )}

          <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-hide">
            {projects.length === 0 && !isCreatingProject && (
              <div className="text-sm text-gray-600 italic">No projects yet.</div>
            )}
            {projects.map(p => (
              <button
                key={p.project_id}
                onClick={() => setActiveProject(p)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center space-x-2 transition-all ${
                  activeProject?.project_id === p.project_id 
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : 'hover:bg-gray-800'
                }`}
              >
                <FolderOpen size={14} />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 mx-4"></div>

        {/* Chats Section */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {activeProject ? 'Sessions' : ''}
            </h2>
            {activeProject && (
              <button 
                onClick={() => { setActiveChat(null); setMessages([]); }}
                className="text-xs bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-gray-300 transition-colors"
              >
                New
              </button>
            )}
          </div>

          <div className="space-y-1">
            {!activeProject ? (
              <div className="text-sm text-gray-600 mt-4 text-center">Select a project to view sessions</div>
            ) : chats.length === 0 ? (
              <div className="text-sm text-gray-600 italic">No sessions found.</div>
            ) : (
              chats.map(c => (
                <button
                  key={c.chat_id}
                  onClick={() => setActiveChat(c)}
                  className={`w-full text-left px-3 py-3 rounded-md text-sm flex items-start space-x-3 transition-all ${
                    activeChat?.chat_id === c.chat_id 
                      ? 'bg-gray-800 text-white border-l-2 border-indigo-500' 
                      : 'hover:bg-gray-800/50 text-gray-400'
                  }`}
                >
                  <MessageSquare size={16} className="mt-0.5 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="font-medium truncate">{c.title || "Untitled Session"}</p>
                    <p className="text-xs text-gray-500 truncate">{c.idea}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
        
        {/* Footer Status */}
        <div className="p-3 bg-gray-950 text-xs text-gray-600 flex items-center justify-between">
           <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Online</span>
           <span>v1.0</span>
        </div>
      </div>

      {/* --- Main Content --- */}
      <div className="flex-1 flex flex-col bg-white relative">
        
        {/* Top Header */}
        <div className="h-16 border-b flex items-center px-6 justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {activeChat ? (activeChat.title || "Brainstorming Session") : (activeProject ? activeProject.name : "Dashboard")}
            </h2>
            <p className="text-xs text-gray-500">
              {activeChat ? `ID: ${activeChat.chat_id} • Multi-Agent Enabled` : "Select or create a chat to begin"}
            </p>
          </div>
          {activeChat && (
             <div className="flex items-center space-x-2 text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                <Cpu size={14} />
                <span>Agents Active</span>
             </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {!activeProject ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
               <Layout size={64} className="mb-4 opacity-20" />
               <p className="text-lg font-medium text-gray-500">No Project Selected</p>
               <p className="text-sm">Choose a project from the sidebar to get started.</p>
            </div>
          ) : !activeChat ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Terminal size={64} className="mb-4 opacity-20" />
              <p className="text-lg font-medium text-gray-500">Ready to Brainstorm?</p>
              <p className="text-sm mb-6">Enter an idea below to initialize the agent swarm.</p>
            </div>
          ) : messages.length === 0 && !isLoading ? (
             <div className="text-center py-10 text-gray-400">
               <p>No messages yet.</p>
             </div>
          ) : (
            messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div 
                  key={idx} 
                  className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-3xl ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
                    <AgentAvatar role={msg.role} />
                    
                    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">{msg.role}</span>
                        <span className="text-[10px] text-gray-400">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                      </div>
                      
                      <div className={`px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                        isUser 
                          ? 'bg-blue-600 text-white rounded-tr-none' 
                          : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {isLoading && (
            <div className="flex w-full justify-start animate-pulse">
               <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                  <div className="bg-gray-200 h-10 w-32 rounded-xl rounded-tl-none"></div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {activeProject && (
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="max-w-4xl mx-auto relative flex items-end gap-2 bg-gray-50 border border-gray-300 rounded-xl p-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all shadow-sm">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={!activeChat ? "Describe your idea to start the brainstorming..." : "Reply to the agents..."}
                className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-2.5 px-2 text-gray-700 placeholder-gray-400 text-sm"
                rows={1}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputText.trim()}
                className={`p-2.5 rounded-lg mb-0.5 shrink-0 transition-all ${
                  isLoading || !inputText.trim() 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'
                }`}
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-400 mt-2">
              AI agents may produce inaccurate information.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}