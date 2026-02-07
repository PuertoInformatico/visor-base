import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';

import { Map, View } from 'ol';
import 'ol/ol.css';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import GeoJSON from 'ol/format/GeoJSON';
import { bbox as bboxStrategy } from 'ol/loadingstrategy';
import { transformExtent } from 'ol/proj';

import { Button } from "@/components/ui/button";

import {     
    IconMenu2, 
    IconStack2, 
    IconMap, 
    IconArrowsMaximize,
    IconX,
    IconListSearch
} from '@tabler/icons-react';

import styles from '@/assets/css/visor.module.css';

import { VertorialBaseLayer, AerialBaseLayer, TopoBaseLayer, BaseLayersSelector } from '@/components/features/visor/BaseLayers';
import type { LayerVector, LayerVectorCategory } from '@/components/features/visor/VectorialLayers';
import { createVectorLayerFromConfig } from '@/components/features/visor/VectorialLayers';


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
    const [isMapLoading, setMapLoading] = useState(false);// se carga alguna capa o recurso geográfico en el mapa
    const [menuColapsed, setMenuColapsed] = useState(false);
    const toggleMenuColapsed = (e: React.MouseEvent<HTMLButtonElement>) => {//ocular o muestra menu lateral
        e.preventDefault();
        setMenuColapsed(menuColapsed ? false : true);
    }

    const [panelIzquierda, setPanelIzquierda] = useState('capas');// panel activo en la sección izquierda
    const cerrarPanelIzquierda = () => {// cerrar paneles de controles
        setPanelIzquierda('');
    }
    const abrirPanelIzquierda = (e: React.MouseEvent<HTMLButtonElement>, panel: string) => {// abrir paneles de controles
        e.preventDefault();
        setPanelIzquierda(panel);
    }

    /**
     * MAPA PRINCIPAL
     */

    const mapElementRef = useRef<HTMLDivElement | null>(null);// elemento html del mapa
    const mapRef = useRef<Map | null>(null);// referencia al objeto mapa de OpenLayers
    const [mapReady, setMapReady] = useState(false);// el mapa ha sido cargado 

    //Renderizar el mapa
    useEffect(() => {
        if (!mapElementRef.current) return;     
        
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
            interactions: undefined,
            controls: [] /*controls.length ? controls : [],*/
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
            key: "concesiones",
            title: "Concesiones",
            description: "Capas oficiales de concesiones forestales",
            layers: [
                {
                    key: "concesiones_forestales",
                    title: "Concesiones forestales",
                    description: "Concesiones inscritas (Fuente: IDE Madre de Dios)",
                    abbreviation: "CONFORFINMAD",
                    format: "wfs",
                    url: "https://ide.regionmadrededios.gob.pe/geoserver/Servicio_OGC/ows?service=WFS&request=GetFeature&typeName=Servicio_OGC:Con_ConcesionForFinMad",
                    srs: "EPSG:32719",
                    geometry: "Polygon",
                    color: "#0ea5e9",
                    text: "NOMBRE",
                    active: true
                }
            ]
        }
    ]);

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

    // capas vectoriales activas en el mapa
    const activeVectorLayers = useMemo(() => {
        return vectorialDisponibles
            .flatMap((category) => category.layers)
            .filter((layer) => layer.active)
            .map((layer) => createVectorLayerFromConfig(layer));
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


    const [itemVectorSelected, setItemVectorSelected] = useState(undefined);
    


    return (
        <div className="flex-1 relative bg-black/10">
            
            {/* LOADING */}
            { isMapLoading && <div className="w-full h-[5px] bg-white/50 overflow-hidden relative z-2"><div className="absolute left-0 top-0 h-full w-1/3 bg-purple-500 animate-indeterminate"></div></div> }


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
                    <div className="flex flex-col gap-2">
                        <p className="text-xs text-muted-foreground">Funcionalidad en desarrollo...</p>
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
                    <div className="flex flex-col gap-3">
                        {vectorialDisponibles.map((category) => (
                            <div key={category.key} className="border rounded-md p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium">{category.title}</p>
                                        <p className="text-xs text-muted-foreground">{category.description}</p>
                                    </div>
                                    <span className="text-[11px] text-muted-foreground">
                                        {category.layers.filter((layer) => layer.active).length}/{category.layers.length}
                                    </span>
                                </div>
                                <div className="mt-3 flex flex-col gap-2">
                                    {category.layers.map((layer) => (
                                        <label key={layer.key} className="flex items-start justify-between gap-3 text-xs">
                                            <div>
                                                <p className="font-semibold text-xs uppercase tracking-wide">{layer.title}</p>
                                                <p className="text-[11px] text-muted-foreground">{layer.description}</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 mt-1"
                                                checked={layer.active}
                                                onChange={(event) => toggleLayerVisibility(category.key, layer.key, event.target.checked)}
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
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
                    SSSSS
                </div>

            </div>

        </div>
    );
}