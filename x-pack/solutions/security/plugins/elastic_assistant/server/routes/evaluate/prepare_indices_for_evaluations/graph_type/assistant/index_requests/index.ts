import { metricsApmIndexRequest } from './metrics-apm-[environment].evaluations.[date]';
import { tracesApmIndexRequest } from './traces-apm-[environment].evlauations.[date]';

export const indexRequests = [
    metricsApmIndexRequest,
    tracesApmIndexRequest,
]
