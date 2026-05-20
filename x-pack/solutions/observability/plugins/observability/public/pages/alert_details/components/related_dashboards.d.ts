import React from 'react';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import type { LinkedDashboard, SuggestedDashboard } from '@kbn/observability-schema';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
interface RelatedDashboardsProps {
    rule: Rule;
    suggestedDashboards?: SuggestedDashboard[];
    linkedDashboards?: LinkedDashboard[];
    isLoadingRelatedDashboards: boolean;
    onSuccessAddSuggestedDashboard: () => Promise<void>;
    timeRange: NonNullable<DashboardLocatorParams['time_range']>;
}
export declare function RelatedDashboards({ rule, isLoadingRelatedDashboards, linkedDashboards, suggestedDashboards, onSuccessAddSuggestedDashboard, timeRange, }: RelatedDashboardsProps): React.JSX.Element;
export {};
