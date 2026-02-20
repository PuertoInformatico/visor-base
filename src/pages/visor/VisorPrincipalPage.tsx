import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';

import { Map, View } from 'ol';
import 'ol/ol.css';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { MousePosition, ScaleLine  } from 'ol/control';
import { DragPan, MouseWheelZoom, Select } from 'ol/interaction';
import { click, pointerMove } from 'ol/events/condition';
import { Style, Fill, Stroke, Text } from 'ol/style';
import { transform } from 'ol/proj';
import type { FeatureLike } from 'ol/Feature';
import Feature from 'ol/Feature';

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {     
    IconMenu2, 
    IconStack2, 
    IconMap, 
    IconArrowsMaximize,
    IconX,
    IconListSearch,
    IconClipboardList,
    IconCurrentLocation,
    IconCaptureFilled,
    IconFileDescription,
    IconSearch,
    IconUser,
    IconIdBadge2,
    IconCalendarEvent
} from '@tabler/icons-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from "@/components/ui/input-group";

import styles from '@/assets/css/visor.module.css';

import { VertorialBaseLayer, AerialBaseLayer, TopoBaseLayer, BaseLayersSelector } from '@/components/features/visor/BaseLayers';
import type { LayerVectorCategory, FeatureVectorDetails, FeatureVectorItem } from '@/components/features/visor/VectorialLayers';
import { createVectorLayerFromConfig, LayerVectorTree, extractFeatureDetails, formatDateFromText } from '@/components/features/visor/VectorialLayers';

export const VisorPrincipalPage = () => {

    /**
     * CONSTANTES
     */

    const appName = import.meta.env.VITE_APP_NAME || 'PORTAL WEB';
    const defaultCoordLon = parseFloat(import.meta.env.VITE_DEFAULT_COORD_LON) || -70.455322;
    const defaultCoordLat = parseFloat(import.meta.env.VITE_DEFAULT_COORD_LAT) || -11.700652;    
    const defaultZoom = parseInt(import.meta.env.VITE_DEFAULT_ZOOM) || 9;
    const maxZoom = parseInt(import.meta.env.VITE_MAX_ZOOM) || 17;
    const defaultViewProjection = import.meta.env.VITE_DEFAULT_VIEW_PROJECTION || "EPSG:4326";
    const defaultLayersProjection = import.meta.env.VITE_DEFAULT_LAYERS_PROJECTION || "EPSG:32719";
    const defaultLayersProjectionName = import.meta.env.VITE_DEFAULT_LAYERS_PROJECTION_NAME || "UTM ZONE 19S";

    const isMobile = window.innerWidth <= 768;

    /**
     * ELEMENTOS DEL VISOR
     */

    //const [isVisorLoading, setVisorLoading] = useState(false);// carga inicial de todos los elementos necesarios para el visor
    const [isMapLoading, setMapLoading] = useState(true);// se carga alguna capa o recurso geográfico en el mapa
    const [menuColapsed, setMenuColapsed] = useState(false);
    const toggleMenuColapsed = (e: React.MouseEvent<HTMLButtonElement>) => {//ocular o muestra menu lateral
        e.preventDefault();
        setMenuColapsed(menuColapsed ? false : true);
    }

    const [panelIzquierda, setPanelIzquierda] = useState('buscar');// panel activo en la sección izquierda
    const cerrarPanelIzquierda = () => {// cerrar paneles de controles
        setPanelIzquierda('');
    }
    const abrirPanelIzquierda = (e: React.MouseEvent<HTMLButtonElement>, panel: string) => {// abrir paneles de controles
        e.preventDefault();
        setPanelIzquierda(panel);
    }
    const mousePositionDivRef = useRef<HTMLDivElement>(null);// control de posicion del mouse en el mapa (coordenadas)

    
    /**
     * MAPA PRINCIPAL
     */

    const mapElementRef = useRef<HTMLDivElement | null>(null);// elemento html del mapa
    const mapRef = useRef<Map | null>(null);// referencia al objeto mapa de OpenLayers
    const [mapReady, setMapReady] = useState(false);// el mapa ha sido cargado

    //Renderizar el mapa
    useEffect(() => {

        if (!mapElementRef.current) return;    
        
        // limpiamos el control de posicion del mouse
        if(mousePositionDivRef.current) {
            mousePositionDivRef.current.innerHTML = '';
        }

        // definimos el control de coordenadas y transformacion a UTM19S
        const mouseControl = new MousePosition({
            projection: defaultViewProjection,
            coordinateFormat: (coord) => {
                if (!coord) return '—';
                const utmCoord = transform(coord, defaultViewProjection, defaultLayersProjection);
                return `E: ${utmCoord[0].toFixed(2)}, N: ${utmCoord[1].toFixed(2)}`;
            },
            target: mousePositionDivRef.current || undefined,
            className: 'custom-mouse-position',
        });

        // sobrescribimos updateHTML para manejar coordenadas no definidas
        (mouseControl as any).updateHTML = function (coord: number[] | undefined) {
            const el = this.getTargetElement();
            if (!el) return;
            el.innerHTML = coord ? this.getCoordinateFormat()(coord) : '—';
        };

        // control de escala
        const scaleControl = new ScaleLine();

        // Crear el mapa        
        const map = new Map({
            target: mapElementRef.current,
            layers: [
                baseLayerMap[baseLayerKey],// mapa base
            ],
            view: new View({
                projection: defaultViewProjection,
                center: [defaultCoordLon, defaultCoordLat],
                zoom: defaultZoom,
                maxZoom: maxZoom
            }),
            interactions: [dragPan, mouseWheelZoom, hoverInteraction, clickInteraction],
            controls: [mouseControl, scaleControl]
        });
      
        // 
        mapRef.current = map;
        setMapReady(true);
       
        return () => {
            map.setTarget(undefined);
            setMapReady(false);
        };
    }, []);


    /**
     * INTERACCIONES DEL MAPA
     */
    
    // interaccion de mover el mapa 
    const dragPan = new DragPan();

    // interaccion de zoom con la rueda del mouse
    const mouseWheelZoom = new MouseWheelZoom();

    // interaccion de hover en objetos del mapa
    const hoverStyle = new Style({
        stroke: new Stroke({
            color: 'rgba(255, 255, 255, 0.7)',
            width: 2,
        }),
        fill: new Fill({
            color: 'rgba(255, 255, 255, 0.30)',
        }),
        text: new Text({
            font: 'bold 12px Arial',
            fill: new Fill({ color: 'rgba(0, 0, 0, 0.7)' }),
            stroke: new Stroke({ color: 'rgba(255, 255, 255, 0.7)', width: 3 }),
            overflow: true,
        })
    });

    const hoverInteraction = new Select({            
        condition: pointerMove,
        style: function(feature) {
            // obtener el column_textde la capa para mostrarlo como label en el hover
            const layerMeta = (feature as any).get('__layer');
            const labelText = layerMeta && layerMeta.column_text ? feature.get(layerMeta.column_text) : '';
            hoverStyle.getText()?.setText(labelText);
            return hoverStyle;
        }
    });

    // aplicar pointer mouse en hover
    hoverInteraction.on('select', (e) => {
        const mapElement = document.getElementById('mapaPrincipal');
        if(!mapElement) return;
        mapElement.style.cursor = e.selected.length > 0 ? 'pointer' : '';
    });

    // interaccion de click en objetos del mapa
    const clickStyle = new Style({
        stroke: new Stroke({
            color: 'rgba(38, 34, 255, 1)',
            width: 2,
        }),
        fill: new Fill({
            color: 'rgba(38, 34, 255, 0.80)',
        }),
        text: new Text({
            font: 'bold 12px Arial',
            fill: new Fill({ color: 'rgba(255, 255, 255, 1)' }),
            stroke: new Stroke({ color: 'rgba(38, 34, 255, 1)', width: 3 }),
            overflow: true,
        })
    });

    const [clickInteraction] = useState(() => {
        const clickInteraction = new Select({
            condition: click,
            style: function(feature) {
                // obtener el column_text de la capa para mostrarlo como label en el click
                const layerMeta = (feature as any).get('__layer');
                const labelText = layerMeta && layerMeta.column_text ? feature.get(layerMeta.column_text) : '';
                clickStyle.getText()?.setText(labelText);
                return clickStyle;
            }
        });

        clickInteraction.on('select', (e) => {
            const feature = e.selected[0];
            if (feature) {
                zoomGeometry(feature);
                handleFeatureClick(feature);
                return;
            }

            if (e.deselected.length > 0) {
                setItemVectorSelected(undefined);
                setItemDetailSelected(undefined);
            }
        });

        return clickInteraction;
    });
    

    /**
     * ZOOM
     */

    const zoomDefault = () => {
        if (!mapRef.current) return;
        const view = mapRef.current.getView();
        view.setCenter([defaultCoordLon, defaultCoordLat]);
        view.setZoom(defaultZoom);
    }

    const zoomGeometry = (feature: Feature) => {  
        const geometry = feature.getGeometry();
        if (mapRef.current && geometry) {
            const extent = geometry.getExtent();
            const mapTarget = mapRef.current.getTargetElement();
            const width = mapTarget.clientWidth;
            const height = mapTarget.clientHeight;
            const paddingX = Math.floor(width / 4);
            const paddingY = Math.floor(height / 4);

            const padding: [number, number, number, number] = isMobile // [top, right, bottom, left]
                ? [30, paddingX, height / 2, paddingX] // top, right, bottom, left
                : [paddingY, paddingX, paddingY, paddingX];

                mapRef.current.getView().fit(extent, {
                    padding: padding, 
                    duration: 300
                });
        }       
    };

    const zoomVectorSelected = () => {
        if (!mapRef.current || !itemVectorSelected) return;
        const geometry = itemVectorSelected.getGeometry();
        if (!geometry) return;
        zoomGeometry(itemVectorSelected as Feature);
    }
        

    const zoomCoordinates = (lon: number, lat: number) => {
        if (!mapRef.current) return;
        const view = mapRef.current.getView();
        view.setCenter([lon, lat]);
        view.setZoom(defaultZoom);
    }

    /**
     * CAPA MAPAS BASE
     */

    const [baseLayerKey, setBaseLayerKey] = useState<string>('aerea');// opción de mapa base seleccionada
    const baseLayerMap: Record<string, any> = {// opciones de mapa base
        aerea: AerialBaseLayer,
        vectorial: VertorialBaseLayer,
        topografico: TopoBaseLayer,
    };

    useEffect(() => {
        if (mapRef.current) {
            const layers = mapRef.current.getLayers();
            layers.setAt(0, baseLayerMap[baseLayerKey]); // reemplazamos la capa (asumimos que baseLayer es siempre la primera capa)            
        }
    }, [baseLayerKey]);


    /**
     * CAPAS VECTORIALES
     */

    // capas vectoriales disponibles
    const [vectorialDisponibles, setVectorialDisponibles] = useState<LayerVectorCategory[]>([
        {
            key: "forestal",
            title: "Gerencia Forestal",
            active: true,
            layers: [
                {
                    key: "concesiones_maderables",
                    title: "Concesiones Maderables",
                    description: "Concesiones forestales con fines maderables",
                    abbreviation: "CONFORFINMAD",
                    format: "wfs",
                    url: "https://ide.regionmadrededios.gob.pe/geoserver/Servicio_OGC/ows?service=WFS&request=GetFeature&typeName=Servicio_OGC:Con_ConcesionForFinMad",
                    srs: "EPSG:32719",
                    geometry: "Polygon",
                    color: "14,165,233",
                    column_id: "CONTRA",
                    column_text: "CONTRA",
                    column_owner: "NOMTIT",
                    column_identity: "NRODOC",
                    column_date: "FECCON",
                    column_status: "ESTCON",
                    columns_search: ["CONTRA", "NOMTIT", "NOMREL", "NRODOC"],
                    active: true
                },
                {
                    key: "concesiones_reforestacion",
                    title: "Concesiones Reforestación",
                    description: "Concesiones para Forestación y/o Reforestación",
                    abbreviation: "CONFORREF",
                    format: "wfs",
                    url: "https://ide.regionmadrededios.gob.pe/geoserver/Servicio_OGC/ows?service=WFS&request=GetFeature&typeName=Servicio_OGC:Con_ConcesionForRef",
                    srs: "EPSG:32719",
                    geometry: "Polygon",
                    color: "209,171,47",
                    column_id: "CONTRA",
                    column_text: "CONTRA",
                    column_owner: "NOMTIT",
                    column_identity: "NRODOC",
                    column_date: "FECCON",
                    column_status: "ESTCON",
                    columns_search: ["CONTRA", "NOMTIT", "NOMREL", "NRODOC"],
                    active: true
                }
            ]
        },
        
        
    ]);
 
    // capas vectoriales activas
    const activeLayerConfigs = useMemo(() => {
        return vectorialDisponibles
            .flatMap((category) => category.layers)
            .filter((layer) => layer.active);
    }, [vectorialDisponibles]);

    // agrega las capas cuando el mapa esta cargado y cuando cambian las capas activas
    useEffect(() => {
        if (!mapReady || !mapRef.current) return;

        const map = mapRef.current;
        
        // obtener todas las capas vectoriales actualmente en el mapa
        const currentLayers = map.getLayers().getArray()
            .filter((layer): layer is VectorLayer<VectorSource> => 
                layer instanceof VectorLayer && layer.get('layerKey') !== undefined
            );

        // obtener los layerKeys actuales y deseados
        const currentKeys = new Set(currentLayers.map(layer => layer.get('layerKey')));
        const desiredKeys = new Set(activeLayerConfigs.map(config => config.key));

        // eliminar capas que ya no están activas
        currentLayers.forEach((layer) => {
            const layerKey = layer.get('layerKey');
            if (!desiredKeys.has(layerKey)) {
                map.removeLayer(layer);
            }
        });

        // agregar capas nuevas que no estaban en el mapa
        activeLayerConfigs.forEach((config) => {
            if (!currentKeys.has(config.key)) {
                const newLayer = createVectorLayerFromConfig(config, setMapLoading);
                map.addLayer(newLayer);
            }
        });

    }, [activeLayerConfigs, mapReady]);


    /**
     * BUSCADOR
     */

    const [searchText, setSearchText] = useState('');// texto ingresado en el buscador
    const [searchResults, setSearchResults] = useState<FeatureVectorItem[]>([]);// resultados de la busqueda
    const [withResults, setWithResults] = useState(false);// indicador para mostrar mensaje de "sin resultados"

    /**
     * DEBOUNCE TEXTO BUSCAR
     */

    // Texto local:
    const [searchInsideText, setSearchInsideText] = useState(searchText);

    // sincroniza searchInsideText con searchText con debounce
    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchInsideText !== searchText) {
                setSearchText(searchInsideText);
            }
        }, 300);
        return () => clearTimeout(handler);
    }, [searchInsideText]);

    const handleSearch = () => {
        if (!searchText) return;

        if(searchText.length < 3) {
            alert('Ingrese al menos 3 caracteres para realizar la búsqueda');
            return;
        }
       
        const map = mapRef.current;
        if (!map) return;

        // obtener todas las capas vectoriales actualmente en el mapa (solo capas vectoriales con 'layerkey')
        const vectorLayers = map.getLayers().getArray()
            .filter((layer): layer is VectorLayer<VectorSource> => 
                layer instanceof VectorLayer && layer.get('layerKey') !== undefined
            );

        const results: FeatureVectorItem[] = [];     

        // recorremos cada capa vectorial para buscar el texto ingresado en las columnas configuradas para búsqueda (columns_search)
        vectorLayers.forEach((layer) => {
            //obtenemos el nombre de la capa
            const layerKey = layer.get('layerKey');
            // recorremos las capas disponibles en busca de la que tenga el mismo key
            const layerConfig = vectorialDisponibles.find(cat => cat.layers.some(l => l.key === layerKey))?.layers.find(l => l.key === layerKey);
            if (!layerConfig) return;
        
            const source = layer.getSource();
            if (!source) return;

            const features = source.getFeatures();

            // recorremos las features de la capa para buscar el texto en las columnas configuradas
            features.forEach((feature) => {
                const properties = feature.getProperties();
                // obtenemos los valores de las columnas a buscar los concatenamos en un solo string para hacer una búsqueda simple
                const searchableValues = layerConfig.columns_search.map(col => String(properties[col] || '')).join(' ').toLowerCase();
                if (searchableValues.includes(searchText.toLowerCase())) {
                    results.push({
                        layer_key: layerConfig?.key || '',
                        layer_name: layerConfig?.title || '',
                        layer_format: layerConfig?.format || '',
                        layer_srs: layerConfig?.srs || '',
                        layer_geometry: layerConfig?.geometry || '',
                        layer_color: layerConfig?.color || '',
                        feature_id: properties[layerConfig?.column_id] || '',
                        feature_name: properties[layerConfig?.column_text] || '',
                        feature_owner: properties[layerConfig?.column_owner] || '',
                        feature_identity: properties[layerConfig?.column_identity] || '',
                        feature_date: properties[layerConfig?.column_date] || '',
                        feature_status: properties[layerConfig?.column_status] || '',
                        feature: feature
                    });
                }
            });
        });

        setSearchResults(results);
        setWithResults(true);
    }

    const handleClearSearch = () => {
        setSearchInsideText('');
        setSearchText('');
        setSearchResults([]);
        setWithResults(false);
    }

    // Memoizar la lista de resultados para evitar renders innecesarios
    const listaResultados = useMemo(() => (
        <div className="space-y-2">
            {searchResults.map((result, index) => (
                <div key={index} className="p-2 border rounded-md hover:bg-gray-50 cursor-pointer" onClick={() => handleFeatureClick(result.feature)}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 mb-1">
                            <IconStack2 className="w-4 h-4 shrink-0"/> 
                            <div className="font-medium text-xs">{result.layer_name}</div>
                        </div>
                        <div className="w-4 h-4 rounded-sm border border-gray-300" style={{ backgroundColor: `rgb(${result.layer_color})` }}></div>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                        <IconFileDescription className="w-4 h-4 shrink-0"/>
                        <div className="text-xs">{result.feature_name}</div>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                        <IconUser className="w-4 h-4 shrink-0"/>
                        <div className="text-xs">{result.feature_owner}</div>
                    </div>
                    <div className="flex items-center">
                        <div className="flex items-center gap-2 mb-1 w-1/2">
                            <IconIdBadge2 className="w-4 h-4 shrink-0"/>
                            <div className="text-xs">{result.feature_identity}</div>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                            <IconCalendarEvent className="w-4 h-4 shrink-0"/>
                            <div className="text-xs">{formatDateFromText(result.feature_date)}</div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{result.layer_geometry.toLocaleUpperCase()}</span>
                            <Separator orientation="vertical" />
                            <span>{result.layer_srs.toLocaleUpperCase()}</span>
                        </div>
                        <div>
                            {result.feature_status as boolean ? (
                                <Badge variant={result.feature_status ? "default" : "destructive"} className="text-xs">{result.feature_status ? "Activo" : "Inactivo"}</Badge>
                            ) : (
                                <span className="text-xs text-muted-foreground">{result.feature_status}</span>
                            )} 
                        </div>
                    </div>                                      
                </div>
            ))}
            <div className="border rounded-md bg-muted/50 p-2">
                <span className="text-sm text-muted-foreground">
                    {searchResults.length} registros encontrados
                </span>
            </div>
        </div>
    ), [searchResults]);


    /**
     * DETALLE DE OBJETO SELECCIONADO
     */

    const [itemVectorSelected, setItemVectorSelected] = useState<FeatureLike | undefined>(undefined); // objeto vectorial seleccionado
    const [itemDetailSelected, setItemDetailSelected] = useState<FeatureVectorDetails | undefined>(undefined); // metadatos de la capa del objeto seleccionado (para mostrar titulo, columnas, etc)

    
    const handleFeatureClick = useCallback((feature: FeatureLike) => {
        setItemVectorSelected(feature);
        console.log('Feature seleccionada:', feature);
        // extraer metadatos de la capa adjuntados en createVectorLayerFromConfig
        try {
            const itemDetail = extractFeatureDetails(feature);
            setItemDetailSelected(itemDetail);            
        } catch (err) {
            console.warn('No se pudo leer __layer de la feature', err);            
        }
    }, [setItemVectorSelected]);

    const cerrarPanelDerecha = () => {
        clickInteraction.getFeatures().clear();
        setItemVectorSelected(undefined);
        setItemDetailSelected(undefined);        
    }
    

    /**
     * ON LOAD
     */
    useEffect(() => {
        document.title = appName+' - Visor';
    }, []);


    return (
        <div className="flex-1 relative bg-black/10">
            
            {/* LOADING */}
            {isMapLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                    <span className={styles.loader}></span>
                </div>
            )}

            {/* MAPA */}
            <div className="absolute inset-0 z-0" id="mapaPrincipal" ref={mapElementRef} style={{ backgroundColor: '#2c2c2c' }}></div>

            {/* CONTROLES */}
            <div className="absolute top-0 left-0 p-2 md:p-3">
                <div className={'flex flex-col gap-1 bg-white border rounded-md p-1 shadow-md ' + (menuColapsed ? styles.menuColapsed : '')}>
                    <Button
                        type="button"
                        variant="ghost"                           
                        size="icon"
                        className="cursor-pointer"
                        onClick={toggleMenuColapsed}
                        >
                        <IconMenu2 />
                    </Button>
                    <Button
                            type="button"
                            variant="ghost"
                            title="RESTABLECER POSICIÓN"
                            size="icon"
                            className="cursor-pointer"
                            onClick={() => zoomDefault()}
                        >
                            <IconArrowsMaximize />
                    </Button>
                    <Button
                            type="button"
                            variant="ghost"
                            title="BUSCAR"
                            size="icon"
                            className={'cursor-pointer ' + (panelIzquierda == 'buscar' ? 'text-primary' : '')}
                            onClick={(e) => abrirPanelIzquierda(e, 'buscar')}
                        >
                            <IconListSearch />
                    </Button>                     
                    <Button
                            type="button"
                            variant="ghost"
                            title="CAPAS"
                            size="icon"
                            className={'cursor-pointer ' + (panelIzquierda == 'capas' ? 'text-primary' : '')}
                            onClick={(e) => abrirPanelIzquierda(e, 'capas')}
                        >
                            <IconStack2 />
                    </Button>
                    <Button
                            type="button"
                            variant="ghost"
                            title="MAPAS BASE"
                            size="icon"
                            className={'cursor-pointer ' + (panelIzquierda == 'mapasbase' ? 'text-primary' : '')}
                            onClick={(e) => abrirPanelIzquierda(e, 'mapasbase')}
                        >
                            <IconMap />
                    </Button>
                </div>
            </div>

            {/* SECCION IZQUIERDA */}
            <div className="absolute top-auto md:top-0 left-0 md:left-[66px] bottom-0 py-2 md:py-3 px-2 md:px-0 w-full md:w-[400px] pointer-events-none">

                {/* BUSCAR */}
                <div className={"bg-white border rounded-md px-4 pb-4 pt-3 shadow-md pointer-events-auto " + (!menuColapsed && panelIzquierda == 'buscar' ? "block" : "hidden")} >
                    <div className="flex items-center mb-3 justify-between">
                        <div className="flex items-center gap-2">
                            <IconListSearch className="w-5 h-5" />
                            <h2 className="text-sm font-medium">Buscar en las capas</h2>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="cursor-pointer" onClick={cerrarPanelIzquierda}>
                            <IconX />
                        </Button>
                    </div>                   
                    <div className="flex items-center gap-2 mb-2">
                            <InputGroup className="flex-auto">
                                <InputGroupInput 
                                    placeholder="Texto a buscar.." 
                                    value={searchInsideText}
                                    onChange={(e) => setSearchInsideText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSearch();
                                        }
                                    }}
                                />                                
                                <InputGroupAddon align="inline-end">
                                    <InputGroupButton
                                        aria-label="Limpiar"
                                        title="Limpiar"
                                        size="icon-xs"
                                        className={'cursor-pointer ' + (searchResults.length > 0 || searchInsideText != '' ? 'visible' : 'invisible')}
                                        onClick={handleClearSearch}
                                    >
                                        <IconX />
                                    </InputGroupButton>
                                </InputGroupAddon>                               
                            </InputGroup>                            
                            <Button type="button" variant="default" title="BUSCAR" className="cursor-pointer" onClick={handleSearch}>
                                <IconSearch className="w-4 h-4" />
                                Buscar
                            </Button>
                        </div>
                    <div className={"overflow-y-auto max-h-[40vh] md:max-h-[calc(100dvh-250px)] "+(styles.scrollbarThin)}>                       
                        {searchResults.length > 0 ? (
                            listaResultados
                        ) : (
                            <div>
                                <div className="border rounded-md p-2 flex gap-2 items-center p-3 bg-gray-50">
                                 <p className="text-muted-foreground text-xs">{withResults ? 'Sin resultados' : 'Busque dentro de las capas disponibles.'}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* CAPAS */} 
                <div className={"bg-white border rounded-md px-4 pb-4 pt-3 shadow-md pointer-events-auto " + (!menuColapsed && panelIzquierda == 'capas' ? "block" : "hidden")} >
                    <div className="flex items-center mb-3 justify-between">
                        <div className="flex items-center gap-2">
                            <IconStack2 className="w-5 h-5" />
                            <h2 className="text-sm font-medium">Capas disponibles</h2>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="cursor-pointer" onClick={cerrarPanelIzquierda}>
                            <IconX />
                        </Button>
                    </div>
                    <div className={"overflow-y-auto max-h-[40vh] md:max-h-[calc(100dvh-250px)] "+(styles.scrollbarThin)}>
                        <LayerVectorTree data={vectorialDisponibles} setData={setVectorialDisponibles} />
                    </div>
                </div>

                {/* MAPAS BASE */}
                <div className={"bg-white border rounded-md px-4 pb-4 pt-3 shadow-md pointer-events-auto " + (!menuColapsed && panelIzquierda == 'mapasbase' ? "block" : "hidden")} >
                    <div className="flex items-center mb-3 justify-between">
                        <div className="flex items-center gap-2">
                            <IconMap className="w-5 h-5" />
                            <h2 className="text-sm font-medium">Mapas Base</h2>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="cursor-pointer" onClick={cerrarPanelIzquierda}>
                            <IconX />
                        </Button>
                    </div>
                    <div className={"overflow-y-auto max-h-[40vh] md:max-h-[calc(100dvh-250px)] "+(styles.scrollbarThin)}>
                        <BaseLayersSelector selected={baseLayerKey} onSelect={setBaseLayerKey}/>
                    </div>
                </div>
            </div>

            {/* SECCION DERECHA */}
            <div className="absolute top-auto md:top-0 right-0 bottom-0 md:bottom-[70px] p-3 md:p-4 w-full md:w-[550px] pointer-events-none">
                <div className={"bg-white border rounded-md px-4 pb-4 pt-3 shadow-md pointer-events-auto " + (itemVectorSelected != undefined ? "block" : "hidden")} >
                    <div className="flex items-center mb-3 justify-between">                        
                        <div className="flex items-center gap-2">
                            <IconClipboardList className="w-5 h-5" />
                            <h2 className="text-sm font-medium">Detalles de objeto</h2>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button type="button" variant="ghost" size="icon" className="cursor-pointer" onClick={zoomVectorSelected} title="ZOOM AL OBJETO">
                                <IconCaptureFilled />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="cursor-pointer" onClick={cerrarPanelDerecha}>
                                <IconX />
                            </Button>
                        </div>                        
                    </div>
                    {itemDetailSelected != undefined ? (
                        <div className="border rounded-md p-2 text-sm mb-3">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <IconStack2 className="w-4 h-4"/> 
                                    <div className="font-medium">{itemDetailSelected.layer_name}</div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{itemDetailSelected.layer_geometry.toLocaleUpperCase()}</span>
                                    <Separator orientation="vertical" />
                                    <span>{itemDetailSelected.layer_srs.toLocaleUpperCase()}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <IconFileDescription className="w-4 h-4"/> 
                                    <div className="">{itemDetailSelected.feature_name}</div>
                                </div>
                                <div>
                                    {itemDetailSelected.feature_status as boolean ? (
                                        <Badge variant={itemDetailSelected.feature_status ? "default" : "destructive"} className="text-xs">{itemDetailSelected.feature_status ? "Activo" : "Inactivo"}</Badge>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">{itemDetailSelected.feature_status}</span>
                                    )} 
                                </div>
                            </div>
                        </div>
                    ):(
                        <div className="border rounded-md p-2 flex gap-2 items-center p-3 bg-gray-50">
                            <p className="text-muted-foreground text-xs">No se encontraron detalles del objeto.</p>
                        </div>
                    )}
                    {
                        itemDetailSelected && itemDetailSelected.feature_attributes.length > 0 &&
                        <div className={"overflow-y-auto max-h-[40vh] md:max-h-[calc(100dvh-300px)] "+(styles.scrollbarThin)}>                            
                            <table className="w-full table-auto border-collapse">
                                <tbody>
                                    <tr>
                                        <th className="border px-2 py-1 text-xs font-medium w-1/3 bg-gray-100">ATRIBUTO</th>
                                        <th className="border px-2 py-1 text-xs font-medium bg-gray-100">VALOR</th>
                                    </tr>
                                    {itemDetailSelected.feature_attributes.map((attr, index) => (
                                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                                            <td className="border px-2 py-1 text-xs font-medium w-1/3">{attr.label}</td>
                                            <td className="border px-2 py-1 text-xs">{String(attr.value)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    }
                </div>
            </div>

             {/* SECCION INFERIOR */}
            <div className='absolute bottom-0 right-0 p-3 md:p-4 w-full md:w-[450px] hidden md:block'>
                <div className="flex gap-2 items-center rounded-md p-2 shadow-md" style={{ backgroundColor: 'rgb(37 37 37 / 76%)'}}>
                    <div className="flex-auto">
                        <div className="flex px-2 text-white items-center gap-3 text-xs">
                            <div>{defaultLayersProjectionName}</div>
                            <div className='utm_separator w-[1px] h-[20px] bg-white'></div>
                            <div ref={mousePositionDivRef} id="mouse-position" className='inline-block'></div>
                        </div>
                    </div>
                    <Button type="button" variant="outline" size="icon" title="INGRESAR COORDENADAS" className="cursor-pointer">
                        <IconCurrentLocation />
                    </Button>
                </div>               
            </div>

            {/* MENSAJE DE ALERTA*/}
            <div className="">                
                
            </div>

        </div>
    );
}