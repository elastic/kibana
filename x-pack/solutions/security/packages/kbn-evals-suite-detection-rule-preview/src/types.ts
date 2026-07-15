/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@kbn/evals';

export const PROMPT_VAGUE =
  'Create an ES|QL detection rule that finds events where event.outcome is failure. ' +
  'After the rule is created in the attachment, preview it for exactly the last hour ' +
  '(use --timeframe-start now-1h --interval 1h on the preview command). ' +
  'If you are unsure of the preview tool syntax, call security.run_rule_preview with --help first. ' +
  'Render the rule preview attachment inline when you have results.';

export const PROMPT_INDEXED =
  'Create an ES|QL detection rule on index logs-endpoint.events.process-default that finds events ' +
  'where event.outcome is failure. After creating the rule attachment, preview it for exactly the ' +
  'last hour using --timeframe-start now-1h --interval 1h. Use security.run_rule_preview with a ' +
  'CLI command string (not a rule object). Render the preview attachment inline.';

export type PreviewPromptMode = 'vague' | 'indexed';

export interface PreviewConverseTaskInput extends Record<string, unknown> {
  prompt: string;
}

export interface PreviewConverseToolResult {
  type?: string;
  data?: Record<string, unknown>;
}

export interface PreviewConverseStep {
  type?: string;
  tool_id?: string;
  params?: Record<string, unknown>;
  results?: PreviewConverseToolResult[];
}

export interface PreviewConverseTaskOutput {
  steps: PreviewConverseStep[];
  message: string;
  previewIds: string[];
  previewAlertCounts: number[];
}

export interface PreviewConverseResponse {
  steps: PreviewConverseStep[];
  message: string;
  traceId?: string;
}

export interface PreviewExampleMetadata extends Record<string, unknown> {
  promptMode: PreviewPromptMode;
  minAlertCount: number;
}

export type PreviewExample = Example<
  PreviewConverseTaskInput,
  null,
  PreviewExampleMetadata
>;
