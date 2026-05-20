import type { ExploratoryEmbeddableComponentProps } from './embeddable';
export declare const useEmbeddableAttributes: ({ attributes, dataViewState, reportType, reportConfigMap, dslFilters, }: ExploratoryEmbeddableComponentProps) => {
    title: string;
    description?: string | undefined;
    version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
    references: import("@kbn/content-management-utils").Reference[];
    visualizationType: string;
    state: {
        query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
        filters: import("@kbn/es-query").Filter[];
        adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
        globalPalette?: {
            activePaletteId: string;
            state?: unknown;
        } | undefined;
        needsRefresh?: boolean | undefined;
        internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
        datasourceStates: {
            formBased?: import("@kbn/lens-common").FormBasedPersistedState;
            textBased?: import("@kbn/lens-common").TextBasedPersistedState;
        };
        visualization: unknown;
    };
} | undefined;
