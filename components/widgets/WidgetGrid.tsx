import React from 'react';
import { WidgetConfig, AppSettings } from '../../types';
import { ClockWidget } from './ClockWidget';
import { WeatherWidget } from './WeatherWidget';
import { TodoWidget } from './TodoWidget';
import { CalendarWidget } from './CalendarWidget';

interface WidgetGridProps {
  widgets: WidgetConfig[];
  isEditMode?: boolean;
  onRemoveWidget?: (id: string) => void;
  onUpdateWidgetData?: (id: string, data: any) => void;
  weatherInfo?: any;
}

export const WidgetGrid: React.FC<WidgetGridProps> = ({ widgets, isEditMode, onRemoveWidget, onUpdateWidgetData, weatherInfo }) => {
  if (!widgets || widgets.length === 0) return null;

  const renderWidget = (widget: WidgetConfig) => {
      const props = {
          key: widget.id,
          title: widget.title,
          colSpan: widget.w,
          data: widget.data,
          isEditMode,
          onRemove: () => onRemoveWidget?.(widget.id),
          onUpdate: (data: any) => onUpdateWidgetData?.(widget.id, data)
      };

      switch (widget.type) {
          case 'clock': return <ClockWidget {...props} />;
          case 'weather': return <WeatherWidget {...props} weatherInfo={weatherInfo} />;
          case 'todo': return <TodoWidget {...props} />;
          case 'calendar': return <CalendarWidget {...props} />;
          default: return null;
      }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10 animate-fade-in">
        {widgets.map(widget => renderWidget(widget))}
    </div>
  );
};