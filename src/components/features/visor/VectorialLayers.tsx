import React, { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { IconChevronDown, IconChevronRight  } from '@tabler/icons-react';

import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import GeoJSON from 'ol/format/GeoJSON';
import { bbox as bboxStrategy } from 'ol/loadingstrategy';
import { transformExtent } from 'ol/proj';
import { Fill, Stroke, Style } from 'ol/style';

/**
 * ELEMENTOS DE SELECCIÓN DE CAPAS VECTORIALES
 */

// categoria de capa vectorial
export interface LayerVectorCategory {
    key: string;
    title: string;
    layers: LayerVector[];
    active: boolean;
}

// capa vectorial
export interface LayerVector {
    key: string;
    title: string;
    description: string;
    abbreviation: string;
    format: string;
    url: string;
    srs: string;
    geometry: string;
    color: string;
    column_id: string;
    column_text: string;
    column_status: string;
    columns_search: string[];
    active: boolean;   
}


interface LayerVectorTreeProps {
    data: LayerVectorCategory[];
    setData: React.Dispatch<React.SetStateAction<LayerVectorCategory[]>>;
}

export const LayerVectorTree: React.FC<LayerVectorTreeProps> = ({ data, setData }) => {

    // estado para controlar qué categorías están expandidas
    const [openItems, setOpenItems] = useState<Set<string>>(
        () => new Set(data.filter((category) => category.active).map((category) => category.key)),
    )

    // función para alternar la expansión de una categoría
    const toggleItem = (itemId: string) => {
        setOpenItems((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(itemId)) {
                newSet.delete(itemId)
            } else {
                newSet.add(itemId)
            }
            return newSet
        })
    }

    // función para manejar el cambio de estado de una categoría (padre)
    const handleParentChange = (itemId: string, checked: boolean) => {
        setData((prevData) =>
            prevData.map((item) =>
            item.key === itemId
                ? {
                    ...item,
                    active: checked,
                    layers: item.layers.map((layer) => ({
                    ...layer,
                    active: checked,
                    })),
                }
                : item,
            ),
        )
    }

    // función para manejar el cambio de estado de una capa (hijo)
    const handleSubitemChange = (parentKey: string, subitemKey: string, checked: boolean) => {
        setData((prevData) =>
          prevData.map((item) =>
            item.key === parentKey
              ? {
                  ...item,
                  layers: item.layers.map((layer) =>
                    layer.key === subitemKey ? { ...layer, active: checked } : layer,
                  ),
                  active: item.layers.every((layer) => (layer.key === subitemKey ? checked : layer.active)),
                }
              : item,
          ),
        )
    }

    // función para determinar el estado del checkbox de la categoría (padre) basado en el estado de sus capas (hijos)
    const getParentCheckboxState = (item: LayerVectorCategory) => {
        const checkedCount = item.layers.filter((layer) => layer.active).length
        if (checkedCount === 0) return false
        if (checkedCount === item.layers.length) return true
        return "indeterminate"
    }

    return (
        <div className="space-y-2">
            {data.map((item) => (
                <Collapsible key={item.key} open={openItems.has(item.key)} onOpenChange={() => toggleItem(item.key)}>
                    <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-md">
                        <Checkbox
                            checked={getParentCheckboxState(item)}
                            onCheckedChange={(checked) => handleParentChange(item.key, checked as boolean)}
                        />
                        <CollapsibleTrigger className="flex items-center space-x-2 flex-1 text-left cursor-pointer">
                            {openItems.has(item.key) ? <IconChevronDown className="h-4 w-4" /> : <IconChevronRight className="h-4 w-4" />}
                            <span className="font-medium text-sm">{item.title}</span>
                        </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="ml-6 space-y-1">
                        {item.layers.map((layer) => (
                            <div key={layer.key} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-md" title={layer.description}>
                                <Checkbox
                                    checked={layer.active}
                                    onCheckedChange={(checked) => handleSubitemChange(item.key, layer.key, checked as boolean)}
                                />
                                <div
                                    className="w-4 h-4 rounded-sm border border-gray-300 flex-none"
                                    style={{ backgroundColor: `rgb(${layer.color})` }}
                                ></div>
                                <span className="text-xs">{layer.title}</span>
                            </div>
                        ))}
                    </CollapsibleContent>
                </Collapsible>
            ))}
        </div>
    );
};

/**
 * ELEMENTOS DE CREACIÓN DE CAPAS VECTORIALES
 */

const DEFAULT_MAP_SRS = 'EPSG:4326';


const buildWfsRequestUrl = (layer: LayerVector, extent: number[]) => {
    const targetSrs = layer.srs || DEFAULT_MAP_SRS;
    const transformedExtent = targetSrs !== DEFAULT_MAP_SRS
        ? transformExtent(extent, DEFAULT_MAP_SRS, targetSrs)
        : extent;
    const bboxParam = `${transformedExtent.join(',')},${targetSrs}`;

    try {
        const requestUrl = new URL(layer.url);
        if (!requestUrl.searchParams.has('service')) {
            requestUrl.searchParams.set('service', 'WFS');
        }
        if (!requestUrl.searchParams.has('request')) {
            requestUrl.searchParams.set('request', 'GetFeature');
        }
        if (!requestUrl.searchParams.has('version')) {
            requestUrl.searchParams.set('version', '2.0.0');
        }
        requestUrl.searchParams.set('bbox', bboxParam);
        requestUrl.searchParams.set('srsname', targetSrs);
        if (!requestUrl.searchParams.has('outputFormat')) {
            requestUrl.searchParams.set('outputFormat', 'application/json');
        }
        return requestUrl.toString();
    } catch (error) {
        const separator = layer.url.includes('?') ? '&' : '?';
        return `${layer.url}${separator}bbox=${bboxParam}&srsname=${targetSrs}`;
    }
};

export const createVectorLayerFromConfig = (layer: LayerVector, setMapLoading: React.Dispatch<React.SetStateAction<boolean>>) => {
    const format = (layer.format || '').toLowerCase();
    const color = layer.color || '#ffffff';

    const source = new VectorSource({
        format: new GeoJSON(),
        ...(format === 'wfs'
            ? {
                url: (extent: number[]) => buildWfsRequestUrl(layer, extent),
                strategy: bboxStrategy,
            }
            : {
                url: layer.url,
            }),
    });

    // Adjuntar metadatos de la capa a cada feature cargada
    source.on('addfeature', function(evt) {
        const feature = (evt as any).feature;
        const layerMeta = {
            key: layer.key,
            title: layer.title,            
            format: layer.format,            
            srs: layer.srs,
            geometry: layer.geometry,
            color: layer.color,
            column_id: layer.column_id,
            column_text: layer.column_text,
            column_status: layer.column_status
        };
        feature.set('__layer', layerMeta);
    });

    source.on('featuresloadstart', function() {
        setMapLoading(true); 
    });

    source.on('featuresloadend', function() {
        setMapLoading(false);
    });

    source.on('featuresloaderror', function() {
        setMapLoading(false);
    });

    const vectorLayer = new VectorLayer({
        source,
        style: new Style({
            stroke: new Stroke({ color: `rgba(${color}, 0.50)`, width: 1.25 }),
            fill: new Fill({ color: `rgba(${color}, 0.30)` }),
        }),
    });

    vectorLayer.set('layerKey', layer.key);
    return vectorLayer;
};


/**
 * FEATURES
 */

