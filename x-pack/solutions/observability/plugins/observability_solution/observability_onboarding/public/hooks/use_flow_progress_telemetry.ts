/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { EuiStepsProps } from '@elastic/eui';
import { type LogsFlowProgressStepId } from '../../common/logs_flow_progress_step_id';
import { OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT } from '../../common/telemetry_events';
import { useKibana } from './use_kibana';

export type EuiStepStatus = EuiStepsProps['steps'][number]['status'];

export type StepsProgress = Partial<
  Record<LogsFlowProgressStepId, { status: EuiStepStatus; message?: string }>
>;

const TRACKED_STEPS: LogsFlowProgressStepId[] = ['ea-download', 'ea-status', 'logs-ingest'];
const TRACKED_STATUSES: EuiStepStatus[] = ['danger', 'warning', 'complete'];

export function useFlowProgressTelemetry(progress: StepsProgress | undefined, flowId: string) {
  const {
    services: { analytics },
  } = useKibana();
  const [previousReportedSteps] = useState<Map<LogsFlowProgressStepId, EuiStepStatus>>(new Map());

  useEffect(() => {
    if (!progress) {
      return;
    }

    TRACKED_STEPS.forEach((stepId) => {
      const step = progress[stepId];

      if (
        !step ||
        !TRACKED_STATUSES.includes(step.status) ||
        previousReportedSteps.get(stepId) === step.status
      ) {
        return;
      }

      analytics.reportEvent(OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT.eventType, {
        uses_legacy_onboarding_page: false,
        flow: flowId,
        step: stepId,
        step_status: step.status,
        step_message: step.message,
      });
      previousReportedSteps.set(stepId, step.status);
    });
  }, [analytics, flowId, progress, previousReportedSteps]);
}
