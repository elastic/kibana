import type { CoreStart } from '@kbn/core/public';
import React from 'react';
import type { MetricsDataClient } from '../../../lib/metrics_client';
import type { NodeMetricsTableProps } from '../shared';
export declare function createLazyPodMetricsTable(core: CoreStart, metricsClient: MetricsDataClient): ({ timerange, kuery, sourceId, isOtel }: NodeMetricsTableProps) => React.JSX.Element;
