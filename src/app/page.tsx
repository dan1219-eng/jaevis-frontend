'use client';

import { useState, useEffect, Dispatch, SetStateAction, FormEvent } from 'react';

const SUPERVISOR_URL = 'https://jaevis-orchestrator-4mlg2xcs5q-an.a.run.app';

// --- タイプ定義 ---
type AiOutputs = Record<string, string>;
type ServiceStatus = 'ok' | 'error' | 'loading';

// --- Prop Types ---
interface ControlPanelProps {
  prompt: string;
  setPrompt: Dispatch<SetStateAction<string>>;
  handleSubmit: (e: FormEvent) => Promise<void>;
  isLoading: boolean;
}

interface SystemStatusProps {
  statuses: Record<string, ServiceStatus>;
}

interface ResponseViewerProps {
  response: AiOutputs | null;
}

// --- メインコンポーネント ---
export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [lastResponse, setLastResponse] = useState<AiOutputs | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, ServiceStatus>>({
    supervisor: 'loading',
  });

  // --- 状態監視 ---
  const checkServiceStatus = async () => {
    try {
      const response = await fetch(`${SUPERVISOR_URL}/health`); // Assuming a /health endpoint exists
      setStatuses({ supervisor: response.ok ? 'ok' : 'error' });
    } catch {
      setStatuses({ supervisor: 'error' });
    }
  };

  useEffect(() => {
    checkServiceStatus();
  }, []);

  // --- イベントハンドラ ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setLastResponse(null);

    try {
      const response = await fetch(SUPERVISOR_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Request failed with status ${response.status}` }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data: AiOutputs = await response.json();
      setLastResponse(data);
      setPrompt('');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit prompt');
    } finally {
      setIsLoading(false);
    }
  };

  // --- レンダリング ---
  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen font-sans">
      <main className="container mx-auto p-4 md:p-8">
        <Header />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2">
            <ControlPanel prompt={prompt} setPrompt={setPrompt} handleSubmit={handleSubmit} isLoading={isLoading} />
            {error && <p className="text-red-400 mt-4">Error: {error}</p>}
          </div>
          <SystemStatus statuses={statuses} />
        </div>
        <ResponseViewer response={lastResponse} />
      </main>
    </div>
  );
}

// --- UIサブコンポーネント ---
const Header = () => (
  <header className="text-center">
    <h1 className="text-5xl font-bold text-cyan-400">J.A.E.V.I.S.</h1>
    <p className="text-gray-400 mt-2">Just A Rather Very Intelligent System - Interface</p>
  </header>
);

const ControlPanel = ({ prompt, setPrompt, handleSubmit, isLoading }: ControlPanelProps) => (
  <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
    <h2 className="text-2xl font-semibold text-cyan-400 mb-4">指令室 (Control Panel)</h2>
    <form onSubmit={handleSubmit}>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="J.A.E.V.I.S.への指示を入力..."
        className="w-full h-32 p-3 bg-gray-700 text-gray-200 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading}
        className="w-full mt-4 px-4 py-3 bg-cyan-600 text-white font-bold rounded-md hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-300 flex items-center justify-center"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            思考中...
          </>
        ) : (
          'J.A.E.V.I.S.に指令を送信'
        )}
      </button>
    </form>
  </div>
);

const SystemStatus = ({ statuses }: SystemStatusProps) => (
  <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
    <h2 className="text-2xl font-semibold text-cyan-400 mb-4">システムステータス</h2>
    <ul className="space-y-3">
      {Object.entries(statuses).map(([name, status]) => (
        <li key={name} className="flex items-center justify-between">
          <span className="capitalize text-gray-300">{name} Service</span>
          <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${{
            ok: 'bg-green-500/20 text-green-300',
            error: 'bg-red-500/20 text-red-300',
            loading: 'bg-yellow-500/20 text-yellow-300 animate-pulse'
          }[status]}`}>
            <span className={`h-2 w-2 mr-2 rounded-full ${{
              ok: 'bg-green-400',
              error: 'bg-red-400',
              loading: 'bg-yellow-400'
            }[status]}`}></span>
            {status}
          </div>
        </li>
      ))}
    </ul>
  </div>
);

const ResponseViewer = ({ response }: ResponseViewerProps) => {
  if (!response) return null;

  return (
    <div className="mt-8">
      <h2 className="text-3xl font-bold text-cyan-400 mb-4">AIからの応答</h2>
      <div className="bg-gray-800 p-5 rounded-lg shadow-md">
        <pre className="bg-gray-900 p-3 rounded-md text-sm text-gray-300 overflow-x-auto">
          {JSON.stringify(response, null, 2)}
        </pre>
      </div>
    </div>
  );
};