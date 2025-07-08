/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type AssistantTelemetry } from '@kbn/elastic-assistant';
import { useCallback, useMemo } from 'react';
import { useKibana } from '../../context/typed_kibana_context/typed_kibana_context';
import {
  AssistantEventTypes,
  ReportAssistantInvokedParams,
  ReportAssistantMessageSentParams,
  ReportAssistantQuickPromptParams,
  ReportAssistantStarterPromptParams,
  ReportAssistantSettingToggledParams,
} from '../../common/lib/telemetry/events/ai_assistant/types';

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
    }) => {
      telemetry.reportEvent(eventType, params);
    },
    [telemetry]
  );

  return useMemo<AssistantTelemetry>(
    () => ({
      reportAssistantInvoked: (params: ReportAssistantInvokedParams) =>
        reportTelemetry({ eventType: AssistantEventTypes.AssistantInvoked, params }),
      reportAssistantMessageSent: (params: ReportAssistantMessageSentParams) =>
        reportTelemetry({ eventType: AssistantEventTypes.AssistantMessageSent, params }),
      reportAssistantQuickPrompt: (params: ReportAssistantQuickPromptParams) =>
        reportTelemetry({ eventType: AssistantEventTypes.AssistantQuickPrompt, params }),
      reportAssistantStarterPrompt: (params: ReportAssistantStarterPromptParams) =>
        reportTelemetry({ eventType: AssistantEventTypes.AssistantStarterPrompt, params }),
      reportAssistantSettingToggled: (params: ReportAssistantSettingToggledParams) =>
        telemetry.reportEvent(AssistantEventTypes.AssistantSettingToggled, params),
    }),
    [reportTelemetry, telemetry]
  );
};
