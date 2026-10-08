/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Connector type of a connected Elastic deployment: the External Elasticsearch connector spec. */
export const ONBOARDING_CONNECTOR_TYPE_ID = '.elasticsearch';

/** Connector types onboarding can connect and explore. At least one Elastic deployment is required. */
export const ONBOARDING_CONNECTOR_TYPE_IDS = ['.elasticsearch', '.slack2', '.github'] as const;
export type OnboardingConnectorTypeId = (typeof ONBOARDING_CONNECTOR_TYPE_IDS)[number];

export const isOnboardingConnectorTypeId = (value: string): value is OnboardingConnectorTypeId =>
  (ONBOARDING_CONNECTOR_TYPE_IDS as readonly string[]).includes(value);

export const MAX_ONBOARDING_CONNECTORS = 10;

export const MAX_ONBOARDING_SUGGESTIONS = 6;
export const MAX_ONBOARDING_SUGGESTION_TITLE_LENGTH = 120;
export const MAX_ONBOARDING_SUGGESTION_PROMPT_LENGTH = 1000;
export const MAX_ONBOARDING_SUGGESTION_RATIONALE_LENGTH = 300;
export const MAX_ONBOARDING_CONNECTOR_ID_LENGTH = 256;
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

export interface OnboardingConnectorSummary {
  id: string;
  name: string;
  connector_type_id: string;
  url?: string;
  kibana_url?: string;
}

/** The latest onboarding suggestions workflow execution of the space. */
export interface OnboardingSuggestionsExecution {
  execution_id: string;
  status: OnboardingSuggestionsStatus;
  started_at?: string;
  finished_at?: string;
  error?: string;
  /** The connectors the execution explored (its inputs). */
  connectors: OnboardingConnectorSummary[];
  /** The suggestions (its outputs), once it succeeded. */
  suggestions?: OnboardingSuggestion[];
  /** Whether the user's custom context (hints about their system) guided the exploration. */
  used_custom_context: boolean;
}

export interface GetOnboardingResponse {
  execution?: OnboardingSuggestionsExecution;
}

export interface StartOnboardingSuggestionsResponse {
  execution_id: string;
}
