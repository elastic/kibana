import * as React from 'react';
import type { UXMetrics } from '@kbn/observability-shared-plugin/public';
export interface CoreVitalProps {
    loading: boolean;
    data?: UXMetrics | null;
    displayServiceName?: boolean;
    serviceName?: string;
    totalPageViews?: number;
    displayTrafficMetric?: boolean;
}
export default function CoreVitals({ data, loading, displayServiceName, serviceName, totalPageViews, displayTrafficMetric, }: CoreVitalProps): React.JSX.Element;
