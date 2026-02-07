import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import GeoJSON from 'ol/format/GeoJSON';
import { bbox as bboxStrategy } from 'ol/loadingstrategy';
import { transformExtent } from 'ol/proj';
import { Fill, Stroke, Style } from 'ol/style';

export interface LayerVectorCategory {
    key: string;
    title: string;
    description: string;
    layers: LayerVector[];
}

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
    text: string;
    active: boolean;   
}

const DEFAULT_MAP_SRS = 'EPSG:4326';

const hexToRgba = (hex: string, alpha = 1) => {
    if (!hex) return `rgba(255,255,255,${alpha})`;
    let sanitized = hex.replace('#', '');
    if (![3, 6].includes(sanitized.length)) {
        return `rgba(255,255,255,${alpha})`;
    }
    if (sanitized.length === 3) {
        sanitized = sanitized.split('').map((char) => char + char).join('');
    }
    const numeric = parseInt(sanitized, 16);
    const r = (numeric >> 16) & 255;
    const g = (numeric >> 8) & 255;
    const b = numeric & 255;
    return `rgba(${r},${g},${b},${alpha})`;
};

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

export const createVectorLayerFromConfig = (layer: LayerVector) => {
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

    const vectorLayer = new VectorLayer({
        source,
        style: new Style({
            stroke: new Stroke({ color, width: 1.25 }),
            fill: new Fill({ color: hexToRgba(color, 0.25) }),
        }),
    });

    vectorLayer.set('layerKey', layer.key);
    return vectorLayer;
};
