/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type AssistantTelemetry } from '@kbn/elastic-assistant';
import { useCallback } from 'react';
import { useKibana } from '../../common/lib/kibana';
import type {
  ReportAssistantInvokedParams,
  ReportAssistantMessageSentParams,
  ReportAssistantQuickPromptParams,
  ReportAssistantSettingToggledParams,
} from '../../common/lib/telemetry';
import { AssistantEventTypes } from '../../common/lib/telemetry';
export const useAssistantTelemetry = (): AssistantTelemetry => {
  const {
    services: { telemetry },
  } = useKibana();

  const reportTelemetry = useCallback(
    async ({
      eventType,
      params,
    }: {
      eventType: AssistantEventTypes;
      params:
        | ReportAssistantInvokedParams
        | ReportAssistantMessageSentParams
        | ReportAssistantQuickPromptParams;
    }) => telemetry.reportEvent(eventType, params),
    [telemetry]
  );

  return {
    reportAssistantInvoked: (params: ReportAssistantInvokedParams) =>
      reportTelemetry({ eventType: AssistantEventTypes.AssistantInvoked, params }),
    reportAssistantMessageSent: (params: ReportAssistantMessageSentParams) =>
      reportTelemetry({ eventType: AssistantEventTypes.AssistantMessageSent, params }),
    reportAssistantQuickPrompt: (params: ReportAssistantQuickPromptParams) =>
      reportTelemetry({ eventType: AssistantEventTypes.AssistantQuickPrompt, params }),
    reportAssistantSettingToggled: (params: ReportAssistantSettingToggledParams) =>
      telemetry.reportEvent(AssistantEventTypes.AssistantSettingToggled, params),
  };
};
