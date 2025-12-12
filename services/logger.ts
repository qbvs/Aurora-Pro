export interface LogEntry {
  id: string;
  time: string;
  level: 'info' | 'error' | 'warn';
  message: string;
}

const logs: LogEntry[] = [];
const listeners: (() => void)[] = [];

const notifyListeners = () => {
  listeners.forEach(l => l());
};

export const addLog = (level: 'info' | 'error' | 'warn', message: any) => {
  const timestamp = new Date().toLocaleTimeString();
  const msgStr = typeof message === 'object' 
    ? (message instanceof Error ? message.message + '\n' + message.stack : JSON.stringify(message)) 
    : String(message);
    
  logs.unshift({ 
    id: Math.random().toString(36).substr(2, 9),
    time: timestamp, 
    level, 
    message: msgStr 
  });
  
  // Keep limit
  if (logs.length > 50) logs.pop();
  
  // Console mirroring
  if (level === 'error') console.error(message);
  else if (level === 'warn') console.warn(message);
  else console.log(message);

  notifyListeners();
};

export const getLogs = () => [...logs];

export const subscribeLogs = (callback: () => void) => {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx > -1) listeners.splice(idx, 1);
  };
};

export const clearLogs = () => {
    logs.length = 0;
    notifyListeners();
};