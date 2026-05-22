/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { RunStepCommonDefinition, RunStepTypeId } from '../../common/step_types/run_step';

export const runStepPublicDefinition: PublicStepDefinition = {
  ...RunStepCommonDefinition,

  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/sparkles').then(({ icon }) => ({
      default: icon,
    }))
  ),

  documentation: {
    details: i18n.translate('xpack.discoveries.workflowSteps.run.documentation.details', {
      defaultMessage: `High-level entry point for Attack Discovery. Orchestrates alert retrieval, LLM generation, and validation in a single step.

**Modes:**
- {syncMode}: Waits for the full pipeline and returns discoveries inline (first synchronous AD entry point)
- {asyncMode}: Fires the pipeline and immediately returns {executionUuidField}

**Security:**
- The {replacementsField} map is never included in the output

**Minimal Configuration:**
- Only {connectorIdField} is required — all other fields are optional with sensible defaults

**Performance Notes:**
- Sync mode may take several minutes depending on alert volume and LLM latency
- Async mode returns immediately; poll via execution_uuid for results`,
      values: {
        asyncMode: "`mode: 'async'`",
        connectorIdField: '`connector_id`',
        executionUuidField: '`execution_uuid`',
        replacementsField: '`replacements`',
        syncMode: "`mode: 'sync'`",
      },
    }),
    examples: [
      `## Minimal sync run (connector_id only)
\`\`\`yaml
- name: run_attack_discovery
  type: ${RunStepTypeId}
  timeout: '10m'
  with:
    connector_id: my-connector
\`\`\``,

      `## Async run (fire-and-forget)
\`\`\`yaml
- name: run_attack_discovery
  type: ${RunStepTypeId}
  with:
    connector_id: my-connector
    mode: async
\`\`\``,

      `## Sync run with time range and size
\`\`\`yaml
- name: run_attack_discovery
  type: ${RunStepTypeId}
  timeout: '10m'
  with:
    connector_id: my-connector
    size: 50
    start: 'now-24h'
    end: 'now'
\`\`\``,

      `## With ES|QL alert retrieval
\`\`\`yaml
- name: run_attack_discovery
  type: ${RunStepTypeId}
  timeout: '10m'
  with:
    connector_id: my-connector
    alert_retrieval_mode: esql
    esql_query: 'FROM .alerts-security.alerts-default | WHERE kibana.alert.severity == "critical" | LIMIT 50'
\`\`\``,

      `## With pre-retrieved alerts
\`\`\`yaml
- name: run_attack_discovery
  type: ${RunStepTypeId}
  timeout: '10m'
  with:
    connector_id: my-connector
    alerts: \${{ steps.my_retrieval_step.output.alerts }}
\`\`\``,

      `## With additional context for focused analysis
\`\`\`yaml
- name: run_attack_discovery
  type: ${RunStepTypeId}
  timeout: '10m'
  with:
    connector_id: my-connector
    additional_context: >
      Focus on lateral movement and privilege escalation techniques.
      The environment uses Active Directory for identity management.
\`\`\``,
    ],
  },
};
