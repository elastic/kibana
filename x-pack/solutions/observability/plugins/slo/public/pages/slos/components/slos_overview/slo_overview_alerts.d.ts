import React from 'react';
import type { GetSLOStatsOverviewResponse } from '@kbn/slo-schema/src/rest_specs/routes/get_slo_stats_overview';
export declare function SLOOverviewAlerts({ data, isLoading, }: {
    data?: GetSLOStatsOverviewResponse;
    isLoading: boolean;
}): React.JSX.Element;
