import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
export declare const getTransforms: (drilldownTransforms: DrilldownTransforms) => {
    transformOut: (storedState: import("../types").AlertsEmbeddableState, panelReferences?: import("@kbn/content-management-utils").Reference[]) => Readonly<{
        title?: string | undefined;
        description?: string | undefined;
        hide_title?: boolean | undefined;
        hide_border?: boolean | undefined;
        drilldowns?: import("@kbn/embeddable-plugin/server").DrilldownState[] | undefined;
    } & {
        slos: Readonly<{} & {
            slo_id: string;
            slo_instance_id: string;
        }>[];
    }> & {
        drilldowns?: Array<{
            label: string;
            trigger: string;
            type: string;
        }>;
    };
    transformIn: <State extends import("@kbn/embeddable-plugin/server").SerializedDrilldowns>(state: State) => {
        state: State;
        references: never[];
    } | {
        state: State & {
            drilldowns: import("@kbn/embeddable-plugin/server").DrilldownState[];
        };
        references: import("@kbn/content-management-utils").Reference[];
    };
};
