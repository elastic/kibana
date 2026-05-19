import type { Request } from '@kbn/inspector-plugin/common';
export type ObservabilityApp = 'infra_metrics' | 'infra_logs' | 'apm' | 'uptime' | 'synthetics' | 'observability-overview' | 'ux' | 'fleet' | 'universal_profiling';
export type { Coordinates } from '../public/typings/fetch_overview_data';
export type InspectResponse = Request[];
