import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import type { RelatedDashboard } from '@kbn/observability-schema';
export declare const useAddSuggestedDashboards: ({ rule, onSuccessAddSuggestedDashboard, }: {
    rule: Rule;
    onSuccessAddSuggestedDashboard: () => Promise<void>;
}) => {
    onClickAddSuggestedDashboard: (d: RelatedDashboard) => void;
    addingDashboardId: string | undefined;
};
