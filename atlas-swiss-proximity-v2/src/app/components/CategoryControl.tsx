import * as Switch from '@radix-ui/react-switch';
import * as Slider from '@radix-ui/react-slider';
import type { ProximityCategory } from './types';
import * as LucideIcons from 'lucide-react';

interface CategoryControlProps {
  category: ProximityCategory;
  onChange: (category: ProximityCategory) => void;
}

export function CategoryControl({ category, onChange }: CategoryControlProps) {
  const handleToggle = (enabled: boolean) => {
    onChange({ ...category, enabled });
  };

  const handleWeightChange = (value: number[]) => {
    onChange({ ...category, weight: Math.round(value[0] * 10) / 10 });
  };

  const handleDiversityChange = (value: number[]) => {
    onChange({ ...category, diversity: Math.round(value[0]) });
  };

  const IconComponent = (LucideIcons as any)[category.icon] || LucideIcons.Circle;
  const infos = category.infos ?? [];

  return (
    <div className="border-b border-gray-200 pb-3">
      <div className="flex items-center justify-between mb-2">
        <div 
          className="flex items-center gap-2 flex-1 cursor-pointer"
          onClick={() => handleToggle(!category.enabled)}
        >
          <IconComponent className={`w-3.5 h-3.5 ${category.enabled ? 'text-gray-900' : 'text-gray-400'}`} />
          <span className={`text-xs ${category.enabled ? 'text-gray-900' : 'text-gray-500'}`}>{category.name}</span>
        </div>

        <Switch.Root
          checked={category.enabled}
          onCheckedChange={handleToggle}
          className="w-9 h-4.5 bg-gray-300 relative data-[state=checked]:bg-red-600 transition-colors"
        >
          <Switch.Thumb className="block w-3.5 h-3.5 bg-white transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[19px]" />
        </Switch.Root>
      </div>

      {category.enabled && (
        <div className="space-y-2 pl-5">
          {infos.length > 0 && (
            <div className="text-[10px] leading-4 text-gray-500">{infos.join(', ')}</div>
          )}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] uppercase tracking-wider text-gray-500">Pondération</label>
              <span className="text-[10px] text-gray-900">{Math.round(category.weight * 100)}%</span>
            </div>
            <Slider.Root
              value={[category.weight]}
              onValueChange={handleWeightChange}
              min={0}
              max={1}
              step={0.1}
              className="relative flex items-center select-none touch-none w-full h-3"
            >
              <Slider.Track className="bg-gray-200 relative grow h-0.5">
                <Slider.Range className="absolute bg-gray-900 h-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-2.5 h-2.5 bg-gray-900 focus:outline-none" />
            </Slider.Root>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] uppercase tracking-wider text-gray-500">Diversité</label>
              <span className="text-[10px] text-gray-900">{category.diversity}</span>
            </div>
            <Slider.Root
              value={[category.diversity]}
              onValueChange={handleDiversityChange}
              min={1}
              max={5}
              step={1}
              className="relative flex items-center select-none touch-none w-full h-3"
            >
              <Slider.Track className="bg-gray-200 relative grow h-0.5">
                <Slider.Range className="absolute bg-gray-900 h-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-2.5 h-2.5 bg-gray-900 focus:outline-none" />
            </Slider.Root>
          </div>
        </div>
      )}
    </div>
  );
}
