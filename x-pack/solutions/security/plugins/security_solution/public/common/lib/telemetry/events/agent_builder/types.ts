/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';

export enum AgentBuilderEventTypes {
  OptInStepReached = 'Agent Builder Opt-In Step Reached',
  OptInConfirmationShown = 'Agent Builder Opt-In Confirmation Shown',
  OptInConfirmed = 'Agent Builder Opt-In Confirmed',
  OptInCancelled = 'Agent Builder Opt-In Cancelled',
  OptOut = 'Agent Builder Opt-Out',
  AddToChatClicked = 'Add to Chat Clicked',
  MessageSent = 'Agent Builder Message Sent',
  MessageReceived = 'Agent Builder Message Received',
  Error = 'Agent Builder Error',
}

export type OptInSource = 'security_settings_menu' | 'stack_management' | 'security_ab_tour';
export type OptInStep = 'initial' | 'confirmation_modal' | 'final';
export type AttachmentType = 'alert' | 'entity' | 'rule' | 'attack_discovery' | 'other';
export type Pathway =
  | 'alerts_flyout'
  | 'entity_flyout'
  | 'rules_table'
  | 'rule_creation'
  | 'attack_discovery'
  | 'other';
export type ErrorContext = 'opt_in' | 'message_send' | 'tool_execution' | 'invocation' | 'other';

interface ReportOptInStepReachedParams {
  step: OptInStep;
  source: OptInSource;
}

interface ReportOptInConfirmationShownParams {
  source: OptInSource;
}

interface ReportOptInConfirmedParams {
  source: OptInSource;
}

interface ReportOptInCancelledParams {
  source: OptInSource;
  step: OptInStep;
}

interface ReportOptOutParams {
  source: 'security_settings_menu' | 'stack_management';
}

interface ReportAddToChatClickedParams {
  pathway: Pathway;
  attachmentType?: AttachmentType;
  attachmentCount?: number;
}

interface ReportMessageSentParams {
  conversationId: string;
  messageLength?: number;
  hasAttachments: boolean;
  attachmentCount?: number;
  attachmentTypes?: string[];
  agentId?: string;
}

interface ReportMessageReceivedParams {
  conversationId: string;
  responseLength?: number;
  roundNumber?: number;
  agentId?: string;
  toolsUsed?: string[];
  toolCount?: number;
  toolsInvoked?: string[];
}

interface ReportErrorParams {
  errorType: string;
  errorMessage?: string;
  context?: ErrorContext;
  conversationId?: string;
  agentId?: string;
  pathway?: string;
}

export interface AgentBuilderTelemetryEventsMap {
  [AgentBuilderEventTypes.OptInStepReached]: ReportOptInStepReachedParams;
  [AgentBuilderEventTypes.OptInConfirmationShown]: ReportOptInConfirmationShownParams;
  [AgentBuilderEventTypes.OptInConfirmed]: ReportOptInConfirmedParams;
  [AgentBuilderEventTypes.OptInCancelled]: ReportOptInCancelledParams;
  [AgentBuilderEventTypes.OptOut]: ReportOptOutParams;
  [AgentBuilderEventTypes.AddToChatClicked]: ReportAddToChatClickedParams;
  [AgentBuilderEventTypes.MessageSent]: ReportMessageSentParams;
  [AgentBuilderEventTypes.MessageReceived]: ReportMessageReceivedParams;
  [AgentBuilderEventTypes.Error]: ReportErrorParams;
}

export interface AgentBuilderTelemetryEvent {
  eventType: AgentBuilderEventTypes;
  schema: RootSchema<AgentBuilderTelemetryEventsMap[AgentBuilderEventTypes]>;
}

