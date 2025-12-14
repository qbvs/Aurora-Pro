
import React from 'react';
import { LogEntry } from '../../types';
import { clearLogs as clearLogsService } from '../../services/logger';
import { cn } from '../../utils';

interface LogViewerProps {
  logs: LogEntry[];
  setLogs: (logs: LogEntry[]) => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs, setLogs }) => {
  return (
      <div className="space-y-6 animate-fade-in h-full flex flex-col">
          <div className="flex justify-between items-center mb-4 shrink-0">
              <h2 className="text-2xl font-bold text-slate-200">系统日志</h2>
              <div className="flex gap-2">
                  <button onClick={() => { clearLogsService(); setLogs([]); }} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors">清空日志</button>
                  <button onClick={() => { const text = logs.map(l => `[${l.time}] [${l.level.toUpperCase()}] ${l.message}`).join('\n'); const blob = new Blob([text], {type: 'text/plain'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `aurora-logs-${Date.now()}.txt`; a.click(); }} className="px-3 py-1.5 bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-400 rounded-lg text-xs font-bold transition-colors border border-cyan-500/20">导出</button>
              </div>
          </div>
          <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 p-4 overflow-hidden flex flex-col font-mono text-sm">
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                  {logs.length === 0 && <div className="text-slate-600 text-center mt-10 italic">暂无日志记录</div>}
                  {logs.map(log => (
                      <div key={log.id} className="flex gap-3 hover:bg-white/5 p-1 rounded transition-colors">
                          <span className="text-slate-500 shrink-0 select-none">[{log.time}]</span>
                          <span className={cn("font-bold uppercase shrink-0 w-12 text-center rounded px-1 text-[10px] h-fit py-0.5", 
                              log.level === 'error' ? "bg-red-900/30 text-red-400" : 
                              log.level === 'warn' ? "bg-amber-900/30 text-amber-400" : 
                              "bg-cyan-900/30 text-cyan-400")}>
                              {log.level}
                          </span>
                          <span className={cn("break-all", log.level === 'error' ? "text-red-300" : "text-slate-300")}>{log.message}</span>
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );
};
