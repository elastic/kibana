/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document } from '@langchain/core/documents';
import type { StateGraphArgs } from '@langchain/langgraph';
import type { DateMath } from '@elastic/elasticsearch/lib/api/types';
import type { DefendInsight, Replacements } from '@kbn/elastic-assistant-common';

import type { DefendInsightsGraphState } from '../../../../langchain/graphs';
import { DefendInsightsPrompts } from '../prompts/incompatible_antivirus';
import {
  DEFAULT_MAX_GENERATION_ATTEMPTS,
  DEFAULT_MAX_HALLUCINATION_FAILURES,
  DEFAULT_MAX_REPEATED_GENERATIONS,
} from '../constants';

export interface Options {
  start?: string;
  end?: string;
  prompts: DefendInsightsPrompts;
}

export const getDefaultGraphState = ({
  start,
  end,
  prompts,
}: Options): StateGraphArgs<DefendInsightsGraphState>['channels'] => ({
  insights: {
    value: (current: DefendInsight[] | null, next?: DefendInsight[] | null) => next ?? current,
    default: () => null,
  },
  prompt: {
    value: (current: string, next?: string) => next ?? current,
    default: () => prompts.default,
  },
  refinePrompt: {
    value: (current: string, next?: string) => next ?? current,
    default: () => prompts.refine,
  },
  continuePrompt: {
    value: (current: string, next?: string) => next ?? current,
    default: () => prompts.continue,
  },
  anonymizedDocuments: {
    value: (current: Document[], next?: Document[]) => next ?? current,
    default: () => [],
  },
  combinedGenerations: {
    value: (current: string, next?: string) => next ?? current,
    default: () => '',
  },
  combinedRefinements: {
    value: (current: string, next?: string) => next ?? current,
    default: () => '',
  },
  errors: {
    value: (current: string[], next?: string[]) => next ?? current,
    default: () => [],
  },
  generationAttempts: {
    value: (current: number, next?: number) => next ?? current,
    default: () => 0,
  },
  generations: {
    value: (current: string[], next?: string[]) => next ?? current,
    default: () => [],
  },
  hallucinationFailures: {
    value: (current: number, next?: number) => next ?? current,
    default: () => 0,
  },

  maxGenerationAttempts: {
    value: (current: number, next?: number) => next ?? current,
    default: () => DEFAULT_MAX_GENERATION_ATTEMPTS,
  },
  maxHallucinationFailures: {
    value: (current: number, next?: number) => next ?? current,
    default: () => DEFAULT_MAX_HALLUCINATION_FAILURES,
  },
  maxRepeatedGenerations: {
    value: (current: number, next?: number) => next ?? current,
    default: () => DEFAULT_MAX_REPEATED_GENERATIONS,
  },
  refinements: {
    value: (current: string[], next?: string[]) => next ?? current,
    default: () => [],
  },
  replacements: {
    value: (current: Replacements, next?: Replacements) => next ?? current,
    default: () => ({}),
  },
  unrefinedResults: {
    value: (current: DefendInsight[] | null, next?: DefendInsight[] | null) => next ?? current,
    default: () => null,
  },
  start: {
    value: (current?: DateMath, next?: DateMath) => next ?? current,
    default: () => start,
  },
  end: {
    value: (current?: DateMath, next?: DateMath) => next ?? current,
    default: () => end,
  },
});
