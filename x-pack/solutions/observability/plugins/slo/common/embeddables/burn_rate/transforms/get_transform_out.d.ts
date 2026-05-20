import type { Reference } from '@kbn/content-management-utils';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { BurnRateEmbeddableState } from '../types';
export declare const getTransformOut: (transformDrilldownsOut: DrilldownTransforms["transformOut"]) => (storedState: BurnRateEmbeddableState, panelReferences?: Reference[]) => Readonly<{
    title?: string | undefined;
    description?: string | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    drilldowns?: import("@kbn/embeddable-plugin/server").DrilldownState[] | undefined;
} & {
    duration: string;
    slo_id: string;
    slo_instance_id: string;
}> & {
    drilldowns?: Array<{
        label: string;
        trigger: string;
        type: string;
    }>;
};
