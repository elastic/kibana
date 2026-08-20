/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_WORKFLOW_ORIGIN_TYPE, ALERTS_WORKFLOW_ORIGIN_TYPE } from '@kbn/cases-plugin/common';
import type { CaseWorkflowRunOrigin } from '@kbn/cases-plugin/common';
import type { RunWorkflowExecutorParams } from '@kbn/workflows-ui';

export const getCaseAlertWorkflowOrigin = (
  caseId: string,
  { inputs }: RunWorkflowExecutorParams
): CaseWorkflowRunOrigin => {
  const event =
    typeof inputs.event === 'object' && inputs.event !== null
      ? (inputs.event as Record<string, unknown>)
      : undefined;
  const selectedAlerts = Array.isArray(event?.alertIds) ? event.alertIds : [];
  const firstAlert =
    selectedAlerts.length === 1 &&
    typeof selectedAlerts[0] === 'object' &&
    selectedAlerts[0] !== null
      ? (selectedAlerts[0] as Record<string, unknown>)
      : undefined;

  return typeof firstAlert?._id === 'string'
    ? { type: ALERT_WORKFLOW_ORIGIN_TYPE, id: firstAlert._id }
    : { type: ALERTS_WORKFLOW_ORIGIN_TYPE, id: caseId };
};
