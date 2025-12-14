
import { useState, useEffect } from 'react';
import { LogEntry, Language } from '../types';
import { subscribeLogs, getLogs, initLogger } from '../services/logger';

// 移除硬编码的日期格式化函数，改为使用 Intl API
const getLocalizedDate = (lang: Language) => {
    const localeMap = { zh: 'zh-CN', en: 'en-US', ja: 'ja-JP' };
    const locale = localeMap[lang] || 'zh-CN';
    
    return new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
        weekday: 'short'
    }).format(new Date());
};

// 将天气代码映射为翻译键 (Key)，而不是直接返回中文
const mapWeatherCodeToKey = (code: number): { icon: string; key: string } => {
    if (code === 0) return { icon: 'Sun', key: 'weather.sunny' };
    if ([1, 2, 3].includes(code)) return { icon: 'Cloud', key: 'weather.cloudy' };
    if ([45, 48].includes(code)) return { icon: 'CloudFog', key: 'weather.fog' };
    if ([51, 53, 55, 56, 57].includes(code)) return { icon: 'CloudDrizzle', key: 'weather.rain' }; // Drizzle maps to rain for simplicity
    if ([61, 63, 65, 66, 67].includes(code)) return { icon: 'CloudRain', key: 'weather.rain' };
    if ([71, 73, 75, 77].includes(code)) return { icon: 'CloudSnow', key: 'weather.snow' };
    if ([80, 81, 82].includes(code)) return { icon: 'CloudRainWind', key: 'weather.rain' };
    if ([95, 96, 99].includes(code)) return { icon: 'CloudLightning', key: 'weather.thunder' };
    return { icon: 'Thermometer', key: 'weather.unknown' };
};

export const useSystem = (language: Language) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [clock, setClock] = useState(new Date()); 
  const [dateInfo, setDateInfo] = useState<string>('');
  // greetingTime 现在返回时间段 key (early, morning, afternoon, evening)
  const [greetingTime, setGreetingTime] = useState<string>('morning');
  // weatherInfo.text 现在是翻译键
  const [weatherInfo, setWeatherInfo] = useState<{ icon: string; textKey: string; temp: number } | 'loading' | 'error' | null>(null);

  // Logger Subscription
  useEffect(() => { 
      initLogger();
      const unsub = subscribeLogs(() => setLogs(getLogs())); 
      setLogs(getLogs()); 
      return unsub; 
  }, []);

  // Clock & Date & Greeting Phase
  useEffect(() => {
      // 立即更新一次日期
      setDateInfo(getLocalizedDate(language));

      const t = setInterval(() => {
          const now = new Date();
          setClock(now);
          const h = now.getHours();
          // 更新问候时段 key
          setGreetingTime(h < 6 ? 'early' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening');
      }, 1000);
      return () => clearInterval(t);
  }, [language]); // 当语言变化时重新运行

  // Weather
  useEffect(() => {
      if (!navigator.geolocation) {
          setWeatherInfo('error');
          return;
      }
      setWeatherInfo('loading');
      navigator.geolocation.getCurrentPosition(
          async (position) => {
              const { latitude, longitude } = position.coords;
              try {
                  const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`);
                  if (!res.ok) throw new Error('天气服务响应失败');
                  const data = await res.json();
                  const { temperature_2m, weather_code } = data.current;
                  const weather = mapWeatherCodeToKey(weather_code);
                  setWeatherInfo({
                      icon: weather.icon,
                      textKey: weather.key,
                      temp: Math.round(temperature_2m)
                  });
              } catch (error) {
                  setWeatherInfo('error');
              }
          },
          () => setWeatherInfo('error')
      );
  }, []);

  return { logs, setLogs, clock, dateInfo, greetingTime, weatherInfo };
};
