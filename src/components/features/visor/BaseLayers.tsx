import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';

import { IconPhoto, IconVector, IconMountain } from '@tabler/icons-react';

/**
 * CAPAS
 */

export const VertorialBaseLayer = new TileLayer({ source: new OSM() });

export const AerialBaseLayer = new TileLayer({
    source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    })
});

export const TopoBaseLayer = new TileLayer({
    source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    })
});

/**
 * SELECTOR
 */

interface BaseLayersSelectorProps {
    selected: string;
    onSelect: (key: string) => void;
}


export const BaseLayersSelector = ({ selected, onSelect }: BaseLayersSelectorProps) => {

    // CAPAS
    const baseLayers = [
        {
            key: "aerea",
            title: "Aérea",
            description: "Imágenes satelitales (World Imagery)",
            icon: IconPhoto,
        },
        {
            key: "vectorial",
            title: "Vectorial",
            description: "Mapa base vectorial (OSM)",
            icon: IconVector,
        },
        {
            key: "topografico",
            title: "Topográfico",
            description: "Mapa topográfico",
            icon: IconMountain,
        }
    ];

    // SELECTOR
    return (
        <div className="space-y-2">
            {baseLayers.map(function(layer) { 
                const Icon = layer.icon;
                return (
                    <div
                        key={layer.key}
                        onClick={() => onSelect(layer.key)}
                        className={`flex flex-row items-center gap-4 p-3 cursor-pointer transition-colors border rounded-md 
                            ${selected === layer.key ? "bg-primary/10 border-primary" : "hover:bg-muted"}
                        `}
                        tabIndex={0}
                        role="button"
                        aria-pressed={selected === layer.key}
                    >
                        <div className="text-primary shrink-0"><Icon /></div>
                        <div>
                            <div className="font-medium text-sm">{layer.title}</div>
                            <div className="text-muted-foreground text-xs">{layer.description}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};