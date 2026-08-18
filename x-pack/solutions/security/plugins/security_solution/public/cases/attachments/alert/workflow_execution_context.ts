/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createAlertWorkflowExecutionContext,
  createAlertsWorkflowExecutionContext,
} from '@kbn/cases-plugin/common';
import type { ResolveAlertWorkflowExecutionContext } from '../../../detections/components/alerts_table/timeline_actions/alert_workflow_execution_context';

export const createCaseAlertWorkflowExecutionContextResolver =
  (caseId: string): ResolveAlertWorkflowExecutionContext =>
  (alerts) =>
    alerts.length === 1
      ? createAlertWorkflowExecutionContext(alerts[0]._id, caseId)
      : createAlertsWorkflowExecutionContext(caseId);
