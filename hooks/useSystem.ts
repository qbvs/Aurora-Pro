
import { useState, useEffect } from 'react';
import { LogEntry } from '../types';
import { subscribeLogs, getLogs, initLogger } from '../services/logger';

const getFormattedDate = () => {
    const date = new Date();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
    return `${month}月${day}日 ${weekday}`;
};

const mapWeatherCode = (code: number): { icon: string; text: string } => {
    if (code === 0) return { icon: 'Sun', text: '晴' };
    if ([1, 2, 3].includes(code)) return { icon: 'Cloud', text: '多云' };
    if ([45, 48].includes(code)) return { icon: 'CloudFog', text: '雾' };
    if ([51, 53, 55, 56, 57].includes(code)) return { icon: 'CloudDrizzle', text: '小雨' };
    if ([61, 63, 65, 66, 67].includes(code)) return { icon: 'CloudRain', text: '雨' };
    if ([71, 73, 75, 77].includes(code)) return { icon: 'CloudSnow', text: '雪' };
    if ([80, 81, 82].includes(code)) return { icon: 'CloudRainWind', text: '阵雨' };
    if ([95, 96, 99].includes(code)) return { icon: 'CloudLightning', text: '雷暴' };
    return { icon: 'Thermometer', text: '未知' };
};

export const useSystem = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [clock, setClock] = useState(new Date()); 
  const [dateInfo, setDateInfo] = useState<string>('');
  const [greetingTime, setGreetingTime] = useState<string>('');
  const [weatherInfo, setWeatherInfo] = useState<{ icon: string; text: string } | 'loading' | 'error' | null>(null);

  // Logger Subscription
  useEffect(() => { 
      initLogger();
      const unsub = subscribeLogs(() => setLogs(getLogs())); 
      setLogs(getLogs()); 
      return unsub; 
  }, []);

  // Clock & Date
  useEffect(() => {
      setDateInfo(getFormattedDate());
      const t = setInterval(() => {
          setClock(new Date());
          const h = new Date().getHours();
          setGreetingTime(h < 6 ? '凌晨' : h < 12 ? '上午' : h < 18 ? '下午' : '晚上');
      }, 1000);
      return () => clearInterval(t);
  }, []);

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
                  const weather = mapWeatherCode(weather_code);
                  setWeatherInfo({
                      icon: weather.icon,
                      text: `${weather.text} ${Math.round(temperature_2m)}°C`
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
