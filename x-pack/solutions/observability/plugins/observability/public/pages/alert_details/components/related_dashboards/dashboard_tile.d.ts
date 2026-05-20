import React from 'react';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import type { RelatedDashboard } from '@kbn/observability-schema';
export interface ActionButtonProps {
    onClick: (dashboard: RelatedDashboard) => void;
    label: string;
    isLoading: boolean;
    isDisabled: boolean;
    ruleType: string;
}
export declare function DashboardTile({ dashboard, actionButtonProps, timeRange, }: {
    dashboard: RelatedDashboard;
    actionButtonProps?: ActionButtonProps;
    timeRange: NonNullable<DashboardLocatorParams['time_range']>;
}): React.JSX.Element;
