/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Observability Agent', function () {
    // tools
    loadTestFile(require.resolve('./tools/get_alerts.spec.ts'));
    loadTestFile(require.resolve('./tools/get_downstream_dependencies.spec.ts'));
    loadTestFile(require.resolve('./tools/get_services.spec.ts'));
    loadTestFile(require.resolve('./tools/get_anomaly_detection_jobs.spec.ts'));
    loadTestFile(require.resolve('./tools/get_runtime_metrics.spec.ts'));
    loadTestFile(require.resolve('./tools/run_log_rate_analysis.spec.ts'));
    loadTestFile(require.resolve('./tools/get_log_groups.spec.ts'));
    loadTestFile(require.resolve('./tools/get_correlated_logs.spec.ts'));
    loadTestFile(require.resolve('./tools/get_hosts.spec.ts'));
    loadTestFile(require.resolve('./tools/get_trace_metrics.spec.ts'));
    loadTestFile(require.resolve('./tools/get_log_change_points.spec.ts'));
    loadTestFile(require.resolve('./tools/get_metric_change_points.spec.ts'));
    loadTestFile(require.resolve('./tools/get_trace_change_points.spec.ts'));
    loadTestFile(require.resolve('./tools/get_index_info.spec.ts'));
    loadTestFile(require.resolve('./tools/get_traces.spec.ts'));

    // ai insights
    loadTestFile(require.resolve('./ai_insights/error.spec.ts'));
    loadTestFile(require.resolve('./ai_insights/alert.spec.ts'));
    loadTestFile(require.resolve('./ai_insights/log.spec.ts'));
  });
}
