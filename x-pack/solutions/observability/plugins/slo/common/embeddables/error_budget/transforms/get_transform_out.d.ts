import type { Reference } from '@kbn/content-management-utils';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { ErrorBudgetEmbeddableState } from '../../../../server/lib/embeddables/error_budget_schema';
export declare const getTransformOut: (transformDrilldownsOut: DrilldownTransforms["transformOut"]) => (storedState: ErrorBudgetEmbeddableState, panelReferences?: Reference[]) => Readonly<{
    title?: string | undefined;
    description?: string | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    drilldowns?: import("@kbn/embeddable-plugin/server").DrilldownState[] | undefined;
} & {
    slo_id: string;
    slo_instance_id: string;
}> & {
    drilldowns?: Array<{
        label: string;
        trigger: string;
        type: string;
    }>;
};
