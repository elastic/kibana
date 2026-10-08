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
export const MAX_ONBOARDING_ENTITIES = 5;
export const MAX_ONBOARDING_ENTITY_LENGTH = 120;

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

export const ONBOARDING_SUGGESTION_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
export type OnboardingSuggestionSeverity = (typeof ONBOARDING_SUGGESTION_SEVERITIES)[number];

/** A first investigation the onboarding agent proposes. */
export interface OnboardingSuggestion {
  title: string;
  prompt: string;
  rationale: string;
  source: OnboardingSuggestionSource;
  severity?: OnboardingSuggestionSeverity;
  entities?: string[];
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
}

export interface GetOnboardingResponse {
  execution?: OnboardingSuggestionsExecution;
}

export interface StartOnboardingSuggestionsResponse {
  execution_id: string;
}
