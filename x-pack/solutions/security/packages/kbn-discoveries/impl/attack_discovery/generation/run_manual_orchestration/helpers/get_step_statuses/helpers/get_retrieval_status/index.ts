/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertRetrievalResult } from '../../../../../invoke_alert_retrieval_workflow';
import type { StepStatus } from '../../../build_execution_summary_log';
import type { FailedPipelineStep } from '../../../resolve_failed_step';

/** Returns the final status of the alert-retrieval pipeline step. */
export const getRetrievalStatus = ({
  alertRetrievalResult,
  failedStep,
}: {
  alertRetrievalResult: AlertRetrievalResult | undefined;
  failedStep: FailedPipelineStep | undefined;
}): StepStatus => {
  if (alertRetrievalResult != null) return 'succeeded';
  if (failedStep === 'retrieval') return 'failed';
  return 'not_started';
};
