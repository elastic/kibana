/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_ONBOARDING_ENTITIES,
  MAX_ONBOARDING_ENTITY_LENGTH,
  MAX_ONBOARDING_SUGGESTIONS,
  MAX_ONBOARDING_SUGGESTION_PROMPT_LENGTH,
  MAX_ONBOARDING_SUGGESTION_RATIONALE_LENGTH,
  MAX_ONBOARDING_SUGGESTION_TITLE_LENGTH,
  ONBOARDING_SUGGESTION_SEVERITIES,
  ONBOARDING_SUGGESTION_SOURCES,
  type OnboardingSuggestion,
  type OnboardingSuggestionSeverity,
  type OnboardingSuggestionSource,
} from '../../common/onboarding';

const clip = (value: unknown, maxLength: number): string =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (values as readonly string[]).includes(value);

/** Normalizes the workflow output to suggestions, dropping anything unusable. */
export const parseSuggestions = (output: { suggestions?: unknown }): OnboardingSuggestion[] => {
  const raw = output.suggestions;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: Record<string, unknown> | null): OnboardingSuggestion | undefined => {
      const title = clip(item?.title, MAX_ONBOARDING_SUGGESTION_TITLE_LENGTH);
      const prompt = clip(item?.prompt, MAX_ONBOARDING_SUGGESTION_PROMPT_LENGTH);
      if (!title || !prompt) return undefined;
      const source: OnboardingSuggestionSource = isOneOf(
        ONBOARDING_SUGGESTION_SOURCES,
        item?.source
      )
        ? item.source
        : 'other';
      const severity: OnboardingSuggestionSeverity | undefined = isOneOf(
        ONBOARDING_SUGGESTION_SEVERITIES,
        item?.severity
      )
        ? item.severity
        : undefined;
      const entities = Array.isArray(item?.entities)
        ? item.entities
            .map((entity: unknown) => clip(entity, MAX_ONBOARDING_ENTITY_LENGTH))
            .filter(Boolean)
            .slice(0, MAX_ONBOARDING_ENTITIES)
        : [];
      return {
        title,
        prompt,
        rationale: clip(item?.rationale, MAX_ONBOARDING_SUGGESTION_RATIONALE_LENGTH),
        source,
        ...(severity ? { severity } : {}),
        ...(entities.length ? { entities } : {}),
      };
    })
    .filter((suggestion): suggestion is OnboardingSuggestion => Boolean(suggestion))
    .slice(0, MAX_ONBOARDING_SUGGESTIONS);
};
