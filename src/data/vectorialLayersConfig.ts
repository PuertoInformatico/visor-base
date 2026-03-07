import type { LayerVectorCategory } from '@/components/features/visor/VectorialLayers';

export const vectorialLayersConfig: LayerVectorCategory[] = [
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
    }
];
