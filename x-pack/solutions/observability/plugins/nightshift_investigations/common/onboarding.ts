/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_ONBOARDING_SUGGESTIONS = 6;
export const MAX_ONBOARDING_SUGGESTION_TITLE_LENGTH = 120;
export const MAX_ONBOARDING_SUGGESTION_PROMPT_LENGTH = 1000;
export const MAX_ONBOARDING_SUGGESTION_RATIONALE_LENGTH = 300;
/** How many of the newest tool calls the onboarding response reports as live progress. */
export const MAX_ONBOARDING_PROGRESS_STEPS = 20;
export const MAX_ONBOARDING_PROGRESS_INTENT_LENGTH = 200;

export const ONBOARDING_SUGGESTION_SOURCES = [
  'alert',
  'slo',
  'case',
  'error_spike',
  'latency',
  'code_change',
  'discussion',
  'other',
] as const;
export type OnboardingSuggestionSource = (typeof ONBOARDING_SUGGESTION_SOURCES)[number];

/** A first investigation the onboarding agent proposes. */
export interface OnboardingSuggestion {
  title: string;
  prompt: string;
  rationale: string;
  source: OnboardingSuggestionSource;
}

/** A tool call of the exploring agent, reported while the run is in progress. Never carries params or results. */
export interface OnboardingProgressStep {
  tool_call_id: string;
  tool_id: string;
  /** What the agent said it is doing with this call, when it said. */
  intent?: string;
}

/** Lifecycle of an onboarding suggestions workflow execution, collapsed for the UI. */
export type OnboardingSuggestionsStatus = 'running' | 'succeeded' | 'failed';

/** The latest onboarding suggestions workflow execution of the space. */
export interface OnboardingSuggestionsExecution {
  execution_id: string;
  status: OnboardingSuggestionsStatus;
  started_at?: string;
  finished_at?: string;
  error?: string;
  /** The suggestions (its outputs), once it succeeded. */
  suggestions?: OnboardingSuggestion[];
  /** The agent's latest tool calls, oldest first. Only while running, and when they could be read. */
  progress?: OnboardingProgressStep[];
}

export interface GetOnboardingResponse {
  agent_installed: boolean;
  execution?: OnboardingSuggestionsExecution;
}

export interface EnableOnboardingResponse {
  agent_installed: true;
}

export interface StartOnboardingSuggestionsResponse {
  execution_id: string;
}
