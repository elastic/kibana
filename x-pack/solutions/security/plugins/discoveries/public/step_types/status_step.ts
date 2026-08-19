/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { StatusStepCommonDefinition, StatusStepTypeId } from '../../common/step_types/status_step';

export const statusStepPublicDefinition: PublicStepDefinition = {
  ...StatusStepCommonDefinition,

  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/clock').then(({ icon }) => ({
      default: icon,
    }))
  ),

  documentation: {
    details: i18n.translate('xpack.discoveries.workflowSteps.status.documentation.details', {
      defaultMessage: `Resolves an Attack Discovery generation by its {executionUuidField} and, once the pipeline completes, returns the persisted discoveries.

**When to use:**
- The {runStep} step returns {pendingStatus} when generation exceeds its soft deadline. Poll this step (e.g. in a {whileLoop} loop with a {waitStep} step) until {status} is {succeeded} or {failed}, then read {discoveriesField}.

**Output:**
- {status}: one of succeeded, running, failed, not_found
- {phaseField}: current phase while running (alert_retrieval, generation, validation)
- {discoveriesField}: persisted discoveries when succeeded (null otherwise)
- {countField}: number of discoveries when succeeded`,
      values: {
        executionUuidField: '`execution_uuid`',
        runStep: '`security.attack-discovery.run`',
        pendingStatus: '`status: "pending"`',
        whileLoop: '`while`',
        waitStep: '`wait`',
        status: '`status`',
        succeeded: '`succeeded`',
        failed: '`failed`',
        phaseField: '`phase`',
        discoveriesField: '`attack_discoveries`',
        countField: '`discovery_count`',
      },
    }),
    examples: [
      `## Poll a run until it completes
\`\`\`yaml
- name: run_attack_discovery
  type: security.attack-discovery.run
  with:
    mode: async

- name: poll_status
  type: while
  condition: "\${{ steps.check_status.output.status == 'running' }}"
  max-iterations: 30
  steps:
    - name: wait_before_poll
      type: wait
      with:
        duration: '10s'
    - name: check_status
      type: ${StatusStepTypeId}
      with:
        execution_uuid: "{{ steps.run_attack_discovery.output.execution_uuid }}"
\`\`\``,
    ],
  },
};
