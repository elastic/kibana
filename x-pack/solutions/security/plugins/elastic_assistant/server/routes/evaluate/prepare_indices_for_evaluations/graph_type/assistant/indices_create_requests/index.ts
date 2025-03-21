import { metricsApmIndexCreateRequest } from "./metrics-apm.evaluations.2025.03.21";
import { tracesApmIndexCreateRequest } from "./traces-apm.evlauations.2025.03.21";
import { nycTaxisIndexCreateRequest } from "./nyc_taxis.evaluations.2025.03.21";
import { postgresLogsIndexCreateRequest } from "./postgres-logs.evaluations.2025.03.21";
import { employeesIndexCreateRequest } from "./employees.evaluations.2025.03.21";
import { metricbeatIndexCreateRequest } from "./metricbeat.evaluations-2025.03.21";

export const indicesCreateRequests = {
    metricsApmIndexCreateRequest,
    tracesApmIndexCreateRequest,
    nycTaxisIndexCreateRequest,
    postgresLogsIndexCreateRequest,
    employeesIndexCreateRequest,
    metricbeatIndexCreateRequest,
}