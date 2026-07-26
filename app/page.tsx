'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Send, Eye, EyeOff, Edit2, Check, Trash2, 
  Download, Upload, Moon, Sun, Heart, Paperclip 
} from 'lucide-react';

type Provider = 'openai' | 'anthropic' | 'gemini' | 'grok';

interface ModelOption {
  id: string;
  name: string;
  provider: Provider;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isHidden?: boolean;
  files?: { name: string; content: string }[];
}

const DEFAULT_MODELS: ModelOption[] = [
  { id: 'gpt-4o', name: 'ChatGPT (gpt-4o)', provider: 'openai' },
  { id: 'gpt-4o-mini', name: 'ChatGPT (gpt-4o-mini)', provider: 'openai' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini' },
  { id: 'grok-beta', name: 'Grok Beta', provider: 'grok' },
];

export default function Home() {
  // --- ステート管理 ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<ModelOption>(DEFAULT_MODELS[0]);
  const [models, setModels] = useState<ModelOption[]>(DEFAULT_MODELS);
  
  // テーマ・UI設定
  const [theme, setTheme] = useState<'light' | 'dark' | 'pink'>('pink');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);

  // APIキー
  const [apiKeys, setApiKeys] = useState<Record<Provider, string>>({
    openai: '', anthropic: '', gemini: '', grok: ''
  });

  // 編集モード管理
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // カスタムモデル追加用
  const [newModelId, setNewModelId] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newModelProvider, setNewModelProvider] = useState<Provider>('openai');

  // ファイル添付
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; content: string }[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 初期ロード (LocalStorage)
  useEffect(() => {
    const savedKeys = localStorage.getItem('llm_api_keys');
    if (savedKeys) setApiKeys(JSON.parse(savedKeys));
    
    const savedModels = localStorage.getItem('llm_custom_models');
    const currentModels = savedModels ? JSON.parse(savedModels) : DEFAULT_MODELS;
    if (savedModels) setModels(currentModels);

    // モデル固定機能：保存されたモデルを選択
    const savedModelId = localStorage.getItem('llm_selected_model');
    if (savedModelId) {
      const found = currentModels.find((m: ModelOption) => m.id === savedModelId);
      if (found) setSelectedModel(found);
    }

    const savedTheme = localStorage.getItem('llm_theme');
    if (savedTheme) setTheme(savedTheme as any);

    const savedChats = localStorage.getItem('llm_chat_history');
    if (savedChats) setMessages(JSON.parse(savedChats));
  }, []);

  // 自動保存
  useEffect(() => {
    localStorage.setItem('llm_chat_history', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('llm_theme', theme);
  }, [theme]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // APIキー保存
  const handleSaveKeys = () => {
    localStorage.setItem('llm_api_keys', JSON.stringify(apiKeys));
    setShowSettings(false);
    alert('設定を保存しました');
  };

  // カスタムモデル追加
  const handleAddModel = () => {
    if (!newModelId || !newModelName) return;
    const newM: ModelOption = { id: newModelId, name: newModelName, provider: newModelProvider };
    const updated = [...models, newM];
    setModels(updated);
    localStorage.setItem('llm_custom_models', JSON.stringify(updated));
    setNewModelId('');
    setNewModelName('');
  };

  // メッセージ送信 (API実行)
  const handleSend = async () => {
    if (!input.trim() && attachedFiles.length === 0) return;

    let fullContent = input;
    if (attachedFiles.length > 0) {
      const fileText = attachedFiles.map(f => `\n\n【ファイル: ${f.name}】\n${f.content}`).join('');
      fullContent += fileText;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: fullContent,
      files: attachedFiles
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setAttachedFiles([]);
    setLoading(true);

    try {
      const apiKey = apiKeys[selectedModel.provider];
      if (!apiKey) {
        alert(`${selectedModel.provider.toUpperCase()} のAPIキーを設定画面で入力してください`);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedModel.provider,
          apiKey,
          model: selectedModel.id,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          systemPrompt
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.result
      };

      setMessages([...newMessages, aiMsg]);
    } catch (err: any) {
      alert(`エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ダミー/隠しプロンプトの追加
  const handleAddDummy = (role: 'user' | 'assistant', isHidden: boolean) => {
    const text = prompt(`${role === 'user' ? 'ユーザー' : 'AI'}のメッセージを入力 (${isHidden ? '非表示モード' : '通常'}):`);
    if (!text) return;

    const dummyMsg: Message = {
      id: Date.now().toString(),
      role,
      content: text,
      isHidden
    };
    setMessages([...messages, dummyMsg]);
  };

  // メッセージ編集の保存
  const handleSaveEdit = (id: string) => {
    setMessages(messages.map(m => m.id === id ? { ...m, content: editContent } : m));
    setEditingId(null);
  };

  // 表示切替
  const toggleHide = (id: string) => {
    setMessages(messages.map(m => m.id === id ? { ...m, isHidden: !m.isHidden } : m));
  };

  // 削除
  const handleDelete = (id: string) => {
    setMessages(messages.filter(m => m.id !== id));
  };

  // ファイル読み込み
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setAttachedFiles(prev => [...prev, { name: file.name, content }]);
      };
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  // インポート / エクスポート
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_export_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        setMessages(imported);
        alert('履歴を復元しました');
      } catch {
        alert('ファイルの読み込みに失敗しました');
      }
    };
    reader.readAsText(file);
  };

  // テーマ・スタイルクラス（ダークモード対応強化）
  const themeClass = theme === 'dark' ? 'bg-gray-900 text-gray-100' : theme === 'pink' ? 'theme-pink' : 'bg-gray-50 text-gray-800';
  const cardClass = theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : theme === 'pink' ? 'bg-white border-pink-200 text-gray-800' : 'bg-white border-gray-200 text-gray-800';
  const inputBgClass = theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300';
  const fontClass = fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg' : 'text-base';

  // ノート風：ユーザーとAIで明確に色分けされた背景スタイル
  const getUserMsgStyle = () => {
    if (theme === 'dark') return 'bg-blue-950/50 border-blue-800 text-blue-100';
    if (theme === 'pink') return 'bg-pink-100/80 border-pink-300 text-pink-950';
    return 'bg-blue-50 border-blue-200 text-blue-950';
  };

  const getAiMsgStyle = () => {
    if (theme === 'dark') return 'bg-gray-800 border-gray-700 text-gray-100';
    if (theme === 'pink') return 'bg-white border-pink-200 text-gray-900';
    return 'bg-white border-gray-200 text-gray-900';
  };

  return (
    <div className={`min-h-screen flex flex-col ${themeClass} ${fontClass}`}>
      {/* ノート風ヘッダー */}
      <header className={`p-4 border-b flex justify-between items-center ${cardClass}`}>
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
          <h1 className="font-bold text-base tracking-wide">Notebook Chat</h1>
        </div>

        {/* モデル選択（選択時に固定保存） & 設定ボタン */}
        <div className="flex items-center gap-2">
          <select 
            value={selectedModel.id}
            onChange={(e) => {
              const m = models.find(mod => mod.id === e.target.value) || models[0];
              setSelectedModel(m);
              localStorage.setItem('llm_selected_model', m.id); // モデル固定
            }}
            className={`p-2 rounded border text-xs font-medium outline-none ${inputBgClass}`}
          >
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          <button onClick={() => setShowSettings(true)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ノート風メインコンテンツ */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-3xl mx-auto w-full">
        {/* システムプロンプト欄 */}
        <div className={`p-3 rounded-lg border text-xs ${cardClass}`}>
          <span className="font-bold opacity-75">システム指示 (System Prompt):</span>
          <input 
            type="text" 
            value={systemPrompt} 
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="AIの前提条件やキャラクター設定を入力..." 
            className="w-full mt-1 bg-transparent border-b border-gray-300 dark:border-gray-600 outline-none"
          />
        </div>

        {/* ノート形式のメッセージストリーム */}
        {messages.map((m) => (
          <div 
            key={m.id} 
            className={`p-4 rounded-lg border-l-4 border-y border-r transition-all ${
              m.role === 'user' ? getUserMsgStyle() : getAiMsgStyle()
            } ${m.isHidden ? 'opacity-40 border-dashed' : ''}`}
          >
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-black/5 dark:border-white/10">
              <span className="text-xs font-bold flex items-center gap-1">
                {m.role === 'user' ? '👤 User' : `🤖 ${selectedModel.name}`}
                {m.isHidden && ' (※隠しプロンプト / 非表示)'}
              </span>

              {/* 操作ボタン */}
              <div className="flex gap-2 opacity-70 hover:opacity-100">
                <button onClick={() => toggleHide(m.id)} title="表示/非表示切替">
                  {m.isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => { setEditingId(m.id); setEditContent(m.content); }} title="編集">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(m.id)} title="削除">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 本文表示 or 編集 */}
            {editingId === m.id ? (
              <div className="space-y-2 mt-2">
                <textarea 
                  value={editContent} 
                  onChange={(e) => setEditContent(e.target.value)}
                  className={`w-full p-2 border rounded font-mono text-sm ${inputBgClass}`} 
                  rows={4} 
                />
                <button onClick={() => handleSaveEdit(m.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1">
                  <Check className="w-3 h-3" /> 保存
                </button>
              </div>
            ) : (
              <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
            )}
          </div>
        ))}
        {loading && <div className="text-center text-xs opacity-60 animate-pulse">AIが回答をノートに記入中...</div>}
        <div ref={chatEndRef} />
      </main>

      {/* サブツールバー */}
      <div className={`p-2 border-t max-w-3xl mx-auto w-full flex flex-wrap gap-2 text-xs ${cardClass}`}>
        <button onClick={() => handleAddDummy('user', false)} className="p-1 px-2 border rounded hover:bg-black/5 dark:hover:bg-white/10">+ 発言追加</button>
        <button onClick={() => handleAddDummy('user', true)} className="p-1 px-2 border rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700">+ 隠し指示追加</button>
        <button onClick={() => handleAddDummy('assistant', false)} className="p-1 px-2 border rounded hover:bg-black/5 dark:hover:bg-white/10">+ AI回答捏造</button>
        
        <div className="ml-auto flex gap-2">
          <button onClick={handleExport} className="p-1 px-2 border rounded flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/10"><Download className="w-3 h-3" /> 出力</button>
          <label className="p-1 px-2 border rounded cursor-pointer flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/10">
            <Upload className="w-3 h-3" /> 復元
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      {/* 固定＆拡大入力エリア */}
      <footer className={`sticky bottom-0 p-4 border-t max-w-3xl mx-auto w-full shadow-lg ${cardClass}`}>
        {attachedFiles.length > 0 && (
          <div className="flex gap-2 mb-2">
            {attachedFiles.map((f, i) => (
              <span key={i} className="text-xs bg-black/10 dark:bg-white/10 p-1 rounded">📎 {f.name}</span>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end">
          <label className="p-3 border rounded cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 flex-shrink-0">
            <Paperclip className="w-5 h-5 opacity-60" />
            <input type="file" multiple onChange={handleFileUpload} className="hidden" />
          </label>
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="メッセージを入力... (Shift+Enterで改行)"
            className={`flex-1 p-3 border rounded-lg resize-y min-h-[80px] max-h-[250px] outline-none ${inputBgClass}`}
            rows={3}
            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <button onClick={handleSend} disabled={loading} className="p-3.5 bg-pink-500 hover:bg-pink-600 text-white rounded-lg disabled:opacity-50 flex-shrink-0">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </footer>

      {/* 設定モーダル（ダークモード完全修復） */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className={`p-6 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto space-y-4 border shadow-2xl ${cardClass}`}>
            <h2 className="text-base font-bold border-b pb-2 border-gray-200 dark:border-gray-700">アプリ設定</h2>

            {/* テーマ切り替え */}
            <div>
              <label className="text-xs font-bold block mb-1">テーマ設定</label>
              <div className="flex gap-2">
                <button onClick={() => setTheme('light')} className={`p-2 border rounded flex-1 flex items-center justify-center gap-1 ${theme === 'light' ? 'border-pink-500 font-bold' : ''}`}><Sun className="w-4 h-4" /> ライト</button>
                <button onClick={() => setTheme('dark')} className={`p-2 border rounded flex-1 flex items-center justify-center gap-1 ${theme === 'dark' ? 'border-pink-500 font-bold' : ''}`}><Moon className="w-4 h-4" /> ダーク</button>
                <button onClick={() => setTheme('pink')} className={`p-2 border rounded flex-1 flex items-center justify-center gap-1 text-pink-500 ${theme === 'pink' ? 'border-pink-500 font-bold' : ''}`}><Heart className="w-4 h-4" /> ピンク</button>
              </div>
            </div>

            {/* 文字サイズ */}
            <div>
              <label className="text-xs font-bold block mb-1">文字サイズ</label>
              <div className="flex gap-2">
                <button onClick={() => setFontSize('sm')} className="p-2 border rounded flex-1 text-sm">小</button>
                <button onClick={() => setFontSize('base')} className="p-2 border rounded flex-1 text-base">中</button>
                <button onClick={() => setFontSize('lg')} className="p-2 border rounded flex-1 text-lg">大</button>
              </div>
            </div>

            {/* APIキー設定 */}
            <div className="space-y-2 border-t pt-2 border-gray-200 dark:border-gray-700">
              <label className="text-xs font-bold block">APIキー設定</label>
              {(['openai', 'anthropic', 'gemini', 'grok'] as Provider[]).map((p) => (
                <div key={p}>
                  <span className="text-xs uppercase font-mono opacity-80">{p}</span>
                  <input 
                    type="password" 
                    value={apiKeys[p]} 
                    onChange={(e) => setApiKeys({ ...apiKeys, [p]: e.target.value })}
                    placeholder={`${p} API Key`}
                    className={`w-full p-2 border rounded text-xs mt-1 ${inputBgClass}`}
                  />
                </div>
              ))}
            </div>

            {/* モデル追加 */}
            <div className="border-t pt-2 space-y-2 border-gray-200 dark:border-gray-700">
              <label className="text-xs font-bold block">新しいモデルを追加</label>
              <input type="text" placeholder="モデルID (例: gpt-4.5-preview)" value={newModelId} onChange={(e) => setNewModelId(e.target.value)} className={`w-full p-2 border rounded text-xs ${inputBgClass}`} />
              <input type="text" placeholder="表示名 (例: ChatGPT 4.5)" value={newModelName} onChange={(e) => setNewModelName(e.target.value)} className={`w-full p-2 border rounded text-xs ${inputBgClass}`} />
              <select value={newModelProvider} onChange={(e) => setNewModelProvider(e.target.value as any)} className={`w-full p-2 border rounded text-xs ${inputBgClass}`}>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="gemini">Gemini</option>
                <option value="grok">Grok</option>
              </select>
              <button onClick={handleAddModel} className="w-full p-2 border rounded text-xs font-bold hover:bg-black/5 dark:hover:bg-white/10">+ モデルを追加</button>
            </div>

            <div className="flex gap-2 border-t pt-4 border-gray-200 dark:border-gray-700">
              <button onClick={handleSaveKeys} className="flex-1 p-2 bg-pink-500 hover:bg-pink-600 text-white rounded font-bold">保存</button>
              <button onClick={() => setShowSettings(false)} className="p-2 border rounded">閉じる</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
