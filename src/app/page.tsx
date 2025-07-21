'use client';

import { useState, useEffect, Dispatch, SetStateAction, FormEvent } from 'react';

const SUPERVISOR_URL = 'https://supervisor-service-497428235894.asia-northeast1.run.app/';
const MONITOR_URL = 'https://monitor-service-497428235894.asia-northeast1.run.app/logs';

// --- タイプ定義 ---
type Log = {
  id: string;
  user_prompt: string;
  summary: string;
  ai_outputs: Record<string, string>;
  timestamp: string;
};

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

interface LogViewerProps {
  logs: Log[];
  fetchLogs: () => Promise<void>;
}

interface LogItemProps {
  log: Log;
}

// --- メインコンポーネント ---
export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, ServiceStatus>>({
    supervisor: 'loading',
    orchestrator: 'loading',
    monitor: 'loading',
  });

  // --- データ取得＆状態監視 ---
  const fetchLogs = async () => {
    try {
      const response = await fetch(`${MONITOR_URL}?limit=20&t=${new Date().getTime()}`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      const data: Log[] = await response.json();
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const checkServiceStatus = async () => {
    const services = {
      supervisor: 'https://supervisor-service-497428235894.asia-northeast1.run.app/health',
      orchestrator: 'https://orchestrator-service-497428235894.asia-northeast1.run.app/health',
      monitor: 'https://monitor-service-497428235894.asia-northeast1.run.app/logs', // /healthがないためlogsで代用
    };
    for (const [name, url] of Object.entries(services)) {
      try {
        const response = await fetch(url);
        setStatuses((prev) => ({ ...prev, [name]: response.ok ? 'ok' : 'error' }));
      } catch {
        setStatuses((prev) => ({ ...prev, [name]: 'error' }));
      }
    }
  };

  useEffect(() => {
    fetchLogs();
    checkServiceStatus();
  }, []);

  // --- イベントハンドラ ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(SUPERVISOR_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`Supervisor request failed with status ${response.status}`);
      }

      // 待機と結果の再取得
      setTimeout(() => {
        fetchLogs().finally(() => setIsLoading(false));
      }, 8000); // 8秒待機

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit prompt');
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
        <LogViewer logs={logs} fetchLogs={fetchLogs} />
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

const LogViewer = ({ logs, fetchLogs }: LogViewerProps) => (
  <div className="mt-8">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-3xl font-bold text-cyan-400">メインモニター (Log Viewer)</h2>
      <button onClick={fetchLogs} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition">更新</button>
    </div>
    <div className="space-y-6">
      {logs.length > 0 ? (
        logs.map((log) => <LogItem key={log.id} log={log} />)
      ) : (
        <p className="text-gray-500 text-center py-8">ログがありません。</p>
      )}
    </div>
  </div>
);

const LogItem = ({ log }: LogItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div className="bg-gray-800 p-5 rounded-lg shadow-md transition hover:shadow-cyan-500/20">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
          <p className="text-gray-300 mt-2"><span className="font-bold text-cyan-400">You:</span> {log.user_prompt}</p>
          <p className="text-gray-300 mt-1"><span className="font-bold text-green-400">J.A.E.V.I.S.:</span> {log.summary}</p>
        </div>
        <button onClick={() => setIsExpanded(!isExpanded)} className="text-sm text-cyan-400 hover:underline">
          {isExpanded ? '詳細を閉じる' : '詳細表示'}
        </button>
      </div>
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h4 className="font-semibold text-gray-400 mb-2">AI Outputs:</h4>
          <pre className="bg-gray-900 p-3 rounded-md text-xs text-gray-300 overflow-x-auto">
            {JSON.stringify(log.ai_outputs, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
