/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PREVIEW_CONNECTORS = {
  sonnet5: '.anthropic-claude-5-sonnet-chat_completion',
  haiku45: '.anthropic-claude-4.5-haiku-chat_completion',
  geminiFlash: '.google-gemini-2.5-flash-chat_completion',
  gpt54Mini: '.openai-gpt-5.4-mini-chat_completion',
} as const;

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

export interface PreviewConverseCase {
  id: string;
  connectorId: string;
  prompt: string;
  metadata: {
    model: keyof typeof PREVIEW_CONNECTORS;
    promptMode: 'vague' | 'indexed';
    minAlertCount: number;
  };
}

const MODELS = Object.entries(PREVIEW_CONNECTORS) as Array<
  [keyof typeof PREVIEW_CONNECTORS, string]
>;

export const previewConverseMatrix: PreviewConverseCase[] = MODELS.flatMap(
  ([model, connectorId]) => [
    {
      id: `${model}-vague`,
      connectorId,
      prompt: PROMPT_VAGUE,
      metadata: { model, promptMode: 'vague', minAlertCount: 1 },
    },
    {
      id: `${model}-indexed`,
      connectorId,
      prompt: PROMPT_INDEXED,
      metadata: { model, promptMode: 'indexed', minAlertCount: 1 },
    },
  ]
);
