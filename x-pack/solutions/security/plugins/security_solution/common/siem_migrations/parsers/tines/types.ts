/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TINES_AGENT_TYPES = {
  WEBHOOK: 'Agents::WebhookAgent',
  TRIGGER: 'Agents::TriggerAgent',
  HTTP_REQUEST: 'Agents::HTTPRequestAgent',
  EMAIL: 'Agents::EmailAgent',
  EVENT_TRANSFORMATION: 'Agents::EventTransformationAgent',
  SLACK: 'Agents::SlackAgent',
} as const;

export type TinesAgentType = (typeof TINES_AGENT_TYPES)[keyof typeof TINES_AGENT_TYPES] | string;

export interface TinesTriggerRule {
  type?: string;
  value?: string;
  path?: string;
}

export interface TinesAgentOptions {
  mode?: string;
  path?: string;
  to?: string;
  url?: string;
  method?: string;
  content_type?: string;
  payload?: Record<string, unknown> | string;
  body?: string;
  subject?: string;
  recipients?: string;
  message?: string;
  text?: string;
  channel?: string;
  rules?: TinesTriggerRule[];
  secret?: string;
  verbs?: string;
  [key: string]: unknown;
}

export interface TinesAgent {
  type: string;
  name: string;
  guid: string;
  disabled?: boolean;
  description?: string | null;
  options?: TinesAgentOptions;
}

export interface TinesLink {
  /** Index into the export `agents` array (not a GUID). */
  source: number;
  /** Index into the export `agents` array (not a GUID). */
  receiver: number;
}

export interface TinesStoryExport {
  name: string;
  description?: string | null;
  guid?: string;
  tags?: string[];
  agents: TinesAgent[];
  links?: TinesLink[];
}
