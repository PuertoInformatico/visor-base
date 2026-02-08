import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';

import { Map, View } from 'ol';
import 'ol/ol.css';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import GeoJSON from 'ol/format/GeoJSON';
import { bbox as bboxStrategy } from 'ol/loadingstrategy';
import { transformExtent } from 'ol/proj';
import { MousePosition, ScaleLine  } from 'ol/control';
import { DragPan, MouseWheelZoom, Select } from 'ol/interaction';
import { click, pointerMove } from 'ol/events/condition';
import { Style, Fill, Stroke } from 'ol/style';
import { transform } from 'ol/proj';
import type { FeatureLike } from 'ol/Feature';

import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';

import {     
    IconMenu2, 
    IconStack2, 
    IconMap, 
    IconArrowsMaximize,
    IconX,
    IconListSearch,
    IconClipboardList,
    IconCurrentLocation,
    IconCaptureFilled 
} from '@tabler/icons-react';

import styles from '@/assets/css/visor.module.css';

import { VertorialBaseLayer, AerialBaseLayer, TopoBaseLayer, BaseLayersSelector } from '@/components/features/visor/BaseLayers';
import type { LayerVector, LayerVectorCategory } from '@/components/features/visor/VectorialLayers';
import { createVectorLayerFromConfig, LayerVectorTree } from '@/components/features/visor/VectorialLayers';


//const MAX_RESOLUTION = 0.0012;

/*
const [vectorialDisponibles, setVectorialDisponibles] = useState<LayerVectorCategory[]>([
    {
        key: "denuncias",
        title: "Denuncias",
        description: "Capa de denuncias ciudadanas",
        layers: [
            {
                key: "denuncias_puntos",
                title: "Puntos de denuncias",
                description: "Ubicación de denuncias ciudadanas",
                format: "wfs",
                url: "https://geoportal.minam.gob.pe/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=public:denuncias_puntos&outputFormat=application/json",
                srs: "EPSG:4326",
                geometry: "Point",
                color: "#FF5722",
                column: "name",
                active: true
            }
        ]
    }
]);
*/

export const VisorPrincipalPage = () => {

    /**
     * ELEMENTOS DEL VISOR
     */

    const [isVisorLoading, setVisorLoading] = useState(false);// carga inicial de todos los elementos necesarios para el visor
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
    const mousePositionDivRef = useRef<HTMLDivElement>(null);


    
    /**
     * MAPA PRINCIPAL
     */

    const mapElementRef = useRef<HTMLDivElement | null>(null);// elemento html del mapa
    const mapRef = useRef<Map | null>(null);// referencia al objeto mapa de OpenLayers
    const [mapReady, setMapReady] = useState(false);// el mapa ha sido cargado 

           

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
    });

    const hoverInteraction = new Select({            
        condition: pointerMove,
        style: hoverStyle
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
    });

    const [clickInteraction] = useState(() => {
        const clickInteraction = new Select({
            condition: click,
            style: clickStyle
        });

        clickInteraction.on('select', (e) => {
            const feature = e.selected[0];
            if (feature) {
                handleFeatureClick(feature);
                return;
            }

            if (e.deselected.length > 0) {
                setItemVectorSelected(undefined);
            }
        });

        return clickInteraction;
    });
    

    //Renderizar el mapa
    useEffect(() => {

        if (!mapElementRef.current) return;    
        
        // limpiamos el control de posicion del mouse
        if(mousePositionDivRef.current) {
            mousePositionDivRef.current.innerHTML = '';
        }

        // definimos el control de coordenadas y transformacion a UTM19S
        const mouseControl = new MousePosition({
            projection: 'EPSG:4326',
            coordinateFormat: (coord) => {
                if (!coord) return '—';
                const utmCoord = transform(coord, 'EPSG:4326', 'EPSG:32719'); // Transformar a UTM zona 19S
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
                projection: 'EPSG:4326',
                center: [-70.455322, -11.700652],
                zoom: 9,
                maxZoom: 17
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

    // capas vectoriales disponibles para agregar al mapa
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
                    column_status: "ESTCON",
                    columns_search: ["CONTRA", "NOMTIT", "NOMREL", "NRODOC"],
                    active: true
                }
            ]
        },
        
        
    ]);

    // arbol de capas para mostrar en el panel de capas disponibles



    /*
    // función para activar o desactivar capas vectoriales
    const toggleLayerVisibility = useCallback((categoryKey: string, layerKey: string, active: boolean) => {
        setVectorialDisponibles((prev) => prev.map((category) => {
            if (category.key !== categoryKey) return category;
            return {
                ...category,
                layers: category.layers.map((layer) =>
                    layer.key === layerKey ? { ...layer, active } : layer
                )
            };
        }));
    }, [setVectorialDisponibles]);
    */

    // capas vectoriales activas en el mapa
    const activeVectorLayers = useMemo(() => {
        return vectorialDisponibles
            .flatMap((category) => category.layers)
            .filter((layer) => layer.active)
            .map((layer) => createVectorLayerFromConfig(layer, setMapLoading));
    }, [vectorialDisponibles]);

    // carga las capas vectoriales activas en el mapa
    useEffect(() => {
        if (!mapReady || !mapRef.current) return;

        const map = mapRef.current;
        activeVectorLayers.forEach((layer) => map.addLayer(layer));

        return () => {
            activeVectorLayers.forEach((layer) => map.removeLayer(layer));
        };
    }, [activeVectorLayers, mapReady]);




    //const [vectorialLayers, setVectorialLayers] = useState<VectorLayer[]>([]);


    //------------------------------------------

    /*

    const [ vectorWfsSource, setVectorWfsSource ] = useState(
        new VectorSource({
            format: new GeoJSON(),
            url: function (extent) {
                const extent32719 = transformExtent(extent, 'EPSG:4326', 'EPSG:32719');
                return (
                    'https://ide.regionmadrededios.gob.pe/geoserver/Servicio_OGC/ows?service=WFS' +
                    '&version=2.0.0&request=GetFeature&typeName=Servicio_OGC%3ACon_ConcesionForFinMad' +
                    '&outputFormat=application/json&srsname=EPSG:32719&' +
                    'bbox=' +
                    extent32719.join(',') +
                    ',EPSG:32719'
                );
            },
            strategy: bboxStrategy,
        })
    );
   
    const [ vectorWfsLayer, setVectorWfsLayer ] = useState(
        new VectorLayer({
            source: vectorWfsSource,
            style: {
                'stroke-width': 0.75,
                'stroke-color': 'white',
                'fill-color': 'rgba(100,100,100,0.25)',
            },
        })
    );

    */
    

    /**
     * DETALLE DE OBJETO SELECCIONADO
     */

    const [itemVectorSelected, setItemVectorSelected] = useState<FeatureLike | undefined>(undefined);
    const [itemVectorLayerMeta, setItemVectorLayerMeta] = useState<any>(undefined);
    const handleFeatureClick = useCallback((feature: FeatureLike) => {
        setItemVectorSelected(feature);
        // extraer metadatos de la capa adjuntados en createVectorLayerFromConfig
        try {
            const layerMeta = (feature as any).get ? (feature as any).get('__layer') : undefined;
            setItemVectorLayerMeta(layerMeta);
            console.log('Feature seleccionada:', feature);
            console.log('Layer meta:', layerMeta);
        } catch (err) {
            console.warn('No se pudo leer __layer de la feature', err);
            setItemVectorLayerMeta(undefined);
        }
    }, [setItemVectorSelected]);

    const cerrarPanelDerecha = () => {
        clickInteraction.getFeatures().clear();
        setItemVectorSelected(undefined);
        setItemVectorLayerMeta(undefined);
    }





   
    
    


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
                            onClick={() => {}}
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
                            <Input 
                                type="text" 
                                placeholder="Texto a buscar..." 
                                className="flex-auto"
                                
                                
                            />
                            <Button type="button" variant="default" title="BUSCAR" className="cursor-pointer" >
                                Buscar
                            </Button>
                        </div>
                    <div className="overflow-y-auto scrollbar-thin max-h-[40vh] md:max-h-[calc(100dvh-250px)]">
                        <div>
                            <div className="border rounded-md p-2 flex gap-2 items-center p-3 bg-gray-50">
                                <p className="text-muted-foreground text-xs">Ingrese algún parámetro para la búsqueda.</p>
                            </div>
                        </div>
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
                    <div className="overflow-y-auto scrollbar-thin max-h-[40vh] md:max-h-[calc(100dvh-250px)]">
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
                    <div className="overflow-y-auto scrollbar-thin max-h-[40vh] md:max-h-[calc(100dvh-250px)]">
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
                            <Button type="button" variant="ghost" size="icon" className="cursor-pointer">
                                <IconCaptureFilled />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="cursor-pointer" onClick={cerrarPanelDerecha}>
                                <IconX />
                            </Button>
                        </div>
                        
                    </div>
                    <div className="border rounded-md p-2 text-sm mb-2">
                        <div className="flex items-center gap-2">
                            <IconStack2 className="w-4 h-4"/> 
                        </div>
                    </div>
                    <div className="overflow-y-auto scrollbar-thin max-h-[40vh] md:max-h-[calc(100dvh-280px)]">
                        {itemVectorLayerMeta && (
                            <div className="mb-3">
                                <div className="text-xs font-medium">Capa</div>
                                <div className="text-sm">{itemVectorLayerMeta.title} ({itemVectorLayerMeta.key})</div>
                                {itemVectorLayerMeta.abbreviation && <div className="text-xs text-muted-foreground">{itemVectorLayerMeta.abbreviation}</div>}
                            </div>
                        )}

                        {itemVectorSelected ? (
                            <div className="text-xs">
                                <div className="font-medium mb-2">Atributos</div>
                                <div className="grid grid-cols-1 gap-1">
                                    {Object.entries(((itemVectorSelected as any).getProperties ? (itemVectorSelected as any).getProperties() : {}) || {})
                                        .filter(([k]) => k !== 'geometry' && k !== '__layer')
                                        .map(([k, v]) => (
                                            <div key={k} className="flex justify-between">
                                                <div className="text-muted-foreground">{k}</div>
                                                <div className="text-right">{String(v)}</div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground">Seleccione un objeto en el mapa para ver detalles.</div>
                        )}
                    </div>
                </div>

            </div>

             {/* SECCION INFERIOR */}
            <div className='absolute bottom-0 right-0 p-3 md:p-4 w-full md:w-[450px] hidden md:block'>
                <div className="flex gap-2 items-center rounded-md p-2 shadow-md" style={{ backgroundColor: 'rgb(37 37 37 / 76%)'}}>
                    <div className="flex-auto">
                        <div className="flex px-2 text-white items-center gap-3 text-xs">
                            <div>UTM ZONE 19S</div>
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