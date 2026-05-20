import React from 'react';
import type { RelatedDashboard } from '@kbn/observability-schema';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import type { ActionButtonProps } from './dashboard_tile';
export declare function DashboardTiles({ title, isLoadingDashboards, dashboards, dataTestSubj, timeRange, }: {
    title: string;
    isLoadingDashboards: boolean;
    dashboards?: Array<RelatedDashboard & {
        actionButtonProps?: ActionButtonProps;
    }>;
    dataTestSubj: string;
    timeRange: NonNullable<DashboardLocatorParams['time_range']>;
}): React.JSX.Element;
