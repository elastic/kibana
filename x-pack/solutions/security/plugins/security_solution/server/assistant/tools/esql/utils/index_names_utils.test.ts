/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateIndexNamesWithWildcards } from './index_names_utils';

describe('index names', () => {
  it('should return the available index names', async () => {
    const inputStrings = [
      '.ds-.edr-workflow-insights-default-2025.03.10-000001',
      '.ds-.items-default-2025.03.10-000001',
      '.ds-.kibana-elastic-ai-assistant-anonymization-fields-default-2025.03.10-000001',
      '.ds-.kibana-elastic-ai-assistant-conversations-default-2025.03.10-000001',
      '.ds-.kibana-elastic-ai-assistant-knowledge-base-default-2025.03.10-000001',
      '.ds-.kibana-elastic-ai-assistant-prompts-default-2025.03.10-000001',
      '.ds-.kibana-event-log-ds-2025.03.10-000001',
      '.ds-.lists-default-2025.03.10-000001',
      '.ds-.logs-deprecation.elasticsearch-default-2025.03.10-000001',
      '.ds-ilm-history-7-2025.03.10-000001',
      '.ds-logs-endpoint.alerts-default-2025.03.10-000001',
      '.ds-logs-endpoint.events.process-default-2025.03.10-000001',
      '.ds-metrics-endpoint.metadata-default-2025.03.10-000001',
      '.ds-metrics-endpoint.policy-default-2025.03.10-000001',
    ];

    expect(generateIndexNamesWithWildcards(inputStrings)).toEqual([
      '.ds-.edr-workflow-insights-default-2025.03.10-000001',
      '.ds-.items-default-2025.03.10-000001',
      '.ds-.kibana-elastic-ai-assistant-anonymization-fields-default-2025.03.10-000001',
      '.ds-.kibana-elastic-ai-assistant-conversations-default-2025.03.10-000001',
      '.ds-.kibana-elastic-ai-assistant-knowledge-base-default-2025.03.10-000001',
      '.ds-.kibana-elastic-ai-assistant-prompts-default-2025.03.10-000001',
      '.ds-.kibana-event-log-ds-2025.03.10-000001',
      '.ds-.lists-default-2025.03.10-000001',
      '.ds-.logs-deprecation.elasticsearch-default-2025.03.10-000001',
      '.ds-ilm-history-7-2025.03.10-000001',
      '.ds-logs-endpoint.alerts-default-2025.03.10-000001',
      '.ds-logs-endpoint.events.process-default-2025.03.10-000001',
      '.ds-metrics-endpoint.metadata-default-2025.03.10-000001',
      '.ds-metrics-endpoint.policy-default-2025.03.10-000001',
      '.ds-.*.03.10-000001',
      '*.ds-.*.03.10-000001',
      '.*.*.03.10-000001',
      '*.*.*.03.10-000001',
      '.ds-.*.*.10-000001',
      '*.ds-.*.*.10-000001',
      '.*.*.*.10-000001',
      '*.*.*.*.10-000001',
      '.ds-.*.03.*',
      '*.ds-.*.03.*',
      '.*.*.03.*',
      '*.*.*.03.*',
      '.ds-.*.*.*',
      '*.ds-.*.*.*',
      '.*.*.*.*',
      '*.*.*.*.*',
      '.*.*.*.03.10-000001',
      '*.*.*.*.03.10-000001',
      '.*.*.*.*.10-000001',
      '*.*.*.*.*.10-000001',
      '.*.*.*.03.*',
      '*.*.*.*.03.*',
      '.*.*.*.*.*',
      '*.*.*.*.*.*',
      '.ds-metrics-endpoint.*.03.10-000001',
      '*.ds-metrics-endpoint.*.03.10-000001',
      '.ds-metrics-endpoint.*.*.10-000001',
      '*.ds-metrics-endpoint.*.*.10-000001',
    ]);
  });
});
