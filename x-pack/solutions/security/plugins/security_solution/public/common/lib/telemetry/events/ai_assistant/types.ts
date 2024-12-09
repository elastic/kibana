/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';

export enum AssistantEventTypes {
  AssistantInvoked = 'Assistant Invoked',
  AssistantMessageSent = 'Assistant Message Sent',
  AssistantQuickPrompt = 'Assistant Quick Prompt',
  AssistantSettingToggled = 'Assistant Setting Toggled',
}

export interface ReportAssistantInvokedParams {
  conversationId: string;
  invokedBy: string;
}

export interface ReportAssistantMessageSentParams {
  conversationId: string;
  role: string;
  actionTypeId: string;
  provider?: string;
  model?: string;
  isEnabledKnowledgeBase: boolean;
}

export interface ReportAssistantQuickPromptParams {
  conversationId: string;
  promptTitle: string;
}

export interface ReportAssistantSettingToggledParams {
  alertsCountUpdated?: boolean;
  assistantStreamingEnabled?: boolean;
}

export interface AssistantTelemetryEventsMap {
  [AssistantEventTypes.AssistantInvoked]: ReportAssistantInvokedParams;
  [AssistantEventTypes.AssistantMessageSent]: ReportAssistantMessageSentParams;
  [AssistantEventTypes.AssistantQuickPrompt]: ReportAssistantQuickPromptParams;
  [AssistantEventTypes.AssistantSettingToggled]: ReportAssistantSettingToggledParams;
}

export interface AssistantTelemetryEvent {
  eventType: AssistantEventTypes;
  schema: RootSchema<AssistantTelemetryEventsMap[AssistantEventTypes]>;
}
