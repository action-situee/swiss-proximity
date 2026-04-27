import * as Switch from '@radix-ui/react-switch';
import { ExternalLink } from 'lucide-react';
import type { ContextLayerConfig } from '../lib/contextLayers';

interface ContextPanelProps {
  layers: ContextLayerConfig[];
  onLayerToggle: (id: string, enabled: boolean) => void;
}

export function ContextPanel({ layers, onLayerToggle }: ContextPanelProps) {
  return (
    <div className="flex-1 overflow-auto px-6 py-4">
      <div className="mb-4 text-[10px] uppercase tracking-wider text-gray-500">
        Services SITG
      </div>

      <div className="space-y-4">
        {layers.map(layer => (
          <div key={layer.id} className="border-b border-gray-200 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 border border-gray-300" style={{ backgroundColor: layer.color }} />
                  <span className={`text-xs ${layer.enabled ? 'text-gray-900' : 'text-gray-500'}`}>
                    {layer.name}
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-4 text-gray-500">{layer.description}</p>
                <a
                  href={layer.catalogueUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-gray-500 hover:text-gray-900"
                >
                  Catalogue SITG
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <Switch.Root
                checked={layer.enabled}
                onCheckedChange={(enabled) => onLayerToggle(layer.id, enabled)}
                className="relative h-4.5 w-9 shrink-0 bg-gray-300 transition-colors data-[state=checked]:bg-red-600"
              >
                <Switch.Thumb className="block h-3.5 w-3.5 translate-x-0.5 bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[19px]" />
              </Switch.Root>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
