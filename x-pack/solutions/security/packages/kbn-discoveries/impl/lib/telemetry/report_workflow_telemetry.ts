/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';

interface ScheduleInfo {
  actions: string[];
  id: string;
  interval: string;
}

interface WorkflowSuccessTelemetryParams {
  actionTypeId: string;
  alertsContextCount: number;
  alertsCount: number;
  configuredAlertsCount: number;
  custom_retrieval_workflow_count: number;
  dateRangeDuration: number;
  alert_retrieval_mode: string;
  discoveriesGenerated: number;
  duplicatesDroppedCount?: number;
  durationMs: number;
  hallucinations_filtered_count?: number;
  execution_mode: string;
  hasFilter: boolean;
  isDefaultDateRange: boolean;
  model?: string;
  prebuilt_step_types_used: string[];
  provider?: string;
  retrieval_workflow_count: number;
  scheduleInfo?: ScheduleInfo;
  trigger: string;
  uses_default_retrieval: boolean;
  uses_default_validation: boolean;
  validation_discoveries_count?: number;
}

interface WorkflowErrorTelemetryParams {
  actionTypeId: string;
  errorMessage: string;
  execution_mode: string;
  failed_step?: string;
  misconfiguration_detected?: boolean;
  model?: string;
  provider?: string;
  scheduleInfo?: ScheduleInfo;
  trigger: string;
}

export const reportWorkflowSuccess = ({
  analytics,
  logger,
  params,
}: {
  analytics: AnalyticsServiceSetup;
  logger: Logger;
  params: WorkflowSuccessTelemetryParams;
}): void => {
  try {
    analytics.reportEvent('attack_discovery_success', params);
  } catch (error) {
    logger.debug(() => `Failed to report attack_discovery_success telemetry: ${error.message}`);
  }
};

export const reportWorkflowError = ({
  analytics,
  logger,
  params,
}: {
  analytics: AnalyticsServiceSetup;
  logger: Logger;
  params: WorkflowErrorTelemetryParams;
}): void => {
  try {
    analytics.reportEvent('attack_discovery_error', params);
  } catch (error) {
    logger.debug(() => `Failed to report attack_discovery_error telemetry: ${error.message}`);
  }
};
