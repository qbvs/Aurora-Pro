import React from 'react';
import { WidgetBase } from './WidgetBase';
import { Icon } from '../Icon';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export const WeatherWidget: React.FC<any> = (props) => {
  // 接收父组件传递的 weatherInfo，避免在组件内部调用 hooks 导致参数错误
  const { weatherInfo } = props;

  return (
    <WidgetBase {...props} title="今日天气" className="min-h-[140px]">
        <div className="flex items-center justify-between h-full">
            {weatherInfo === 'loading' && <div className="flex items-center gap-2 text-slate-400"><LoadingSpinner/> 获取中...</div>}
            {weatherInfo === 'error' && <div className="text-amber-500 text-sm">定位失败或服务不可用</div>}
            {typeof weatherInfo === 'object' && weatherInfo !== null && (
                <>
                    <div className="flex flex-col">
                        <span className="text-4xl font-bold text-slate-800 dark:text-slate-100">{weatherInfo.text.split(' ')[1]}</span>
                        <span className="text-slate-500 dark:text-slate-400 font-medium">{weatherInfo.text.split(' ')[0]}</span>
                    </div>
                    <div className="text-cyan-500 dark:text-cyan-400">
                        <Icon name={weatherInfo.icon} size={48} />
                    </div>
                </>
            )}
        </div>
    </WidgetBase>
  );
};