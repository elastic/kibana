/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { findRelatedAlerts } from '../../../lib/alert_analysis/services/find_related_alerts';
import { getRelatedAlertsStepCommonDefinition } from '../../../../common/workflows/step_types/get_related_alerts_step/get_related_alerts_step_common';

/**
 * Workflow step that wraps the shared `findRelatedAlerts` service.
 *
 * This is the workflow-side surface of the same service exposed as an inline
 * Agent Builder tool (security.alert-analysis.get-related-alerts). One handler,
 * two consumers — no duplication. See the linked PR body for the analysis of
 * why this beats the workflow_execute_step + kibana.request alternative for
 * single-API-call use cases.
 */
export const getRelatedAlertsStepDefinition = createServerStepDefinition({
  ...getRelatedAlertsStepCommonDefinition,
  handler: async (context) => {
    try {
      const {
        alertId,
        alertIndex,
        timeWindowHours,
        maxResults,
        hostNames,
        userNames,
        sourceIps,
        destIps,
      } = context.input;

      const esClient = context.contextManager.getScopedEsClient();

      const result = await findRelatedAlerts(esClient, {
        alertId,
        alertsIndex: alertIndex,
        timeWindowHours,
        maxResults,
        hostNames,
        userNames,
        sourceIps,
        destIps,
      });

      if (!result.ok) {
        return { error: new Error(result.message) };
      }

      const { ok: _ok, ...output } = result;
      return { output };
    } catch (error) {
      context.logger.error('Failed to get related alerts', error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to get related alerts'),
      };
    }
  },
});
