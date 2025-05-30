/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import type { Document } from '@langchain/core/documents';
import { Annotation } from '@langchain/langgraph';

import type { DateMath } from '@elastic/elasticsearch/lib/api/types';
import { AttackDiscoveryPrompts } from '../prompts';
import {
  DEFAULT_MAX_GENERATION_ATTEMPTS,
  DEFAULT_MAX_HALLUCINATION_FAILURES,
  DEFAULT_MAX_REPEATED_GENERATIONS,
} from '../constants';

export interface Options {
  end?: string;
  filter?: Record<string, unknown> | null;
  prompts: AttackDiscoveryPrompts;
  start?: string;
}

export const getDefaultGraphAnnotation = ({ end, filter, prompts, start }: Options) =>
  Annotation.Root({
    insights: Annotation<AttackDiscovery[] | null>({
      reducer: (x: AttackDiscovery[] | null, y?: AttackDiscovery[] | null) => y ?? x,
      default: () => null,
    }),
    prompt: Annotation<string>({
      reducer: (x: string, y?: string) => y ?? x,
      default: () => prompts.default,
    }),
    anonymizedDocuments: Annotation<Document[]>({
      reducer: (x: Document[], y?: Document[]) => y ?? x,
      default: () => [],
    }),
    combinedGenerations: Annotation<string>({
      reducer: (x: string, y?: string) => y ?? x,
      default: () => '',
    }),
    combinedRefinements: Annotation<string>({
      reducer: (x: string, y?: string) => y ?? x,
      default: () => '',
    }),
    continuePrompt: Annotation<string, string>({
      reducer: (x: string, y?: string) => y ?? x,
      default: () => prompts.continue,
    }),
    end: Annotation<DateMath | undefined>({
      reducer: (x?: DateMath, y?: DateMath) => y ?? x,
      default: () => end,
    }),
    errors: Annotation<string[], string[]>({
      reducer: (x: string[], y?: string[]) => y ?? x,
      default: () => [],
    }),
    filter: Annotation<Record<string, unknown> | null | undefined>({
      reducer: (x?: Record<string, unknown> | null, y?: Record<string, unknown> | null) => y ?? x,
      default: () => filter,
    }),
    generationAttempts: Annotation<number>({
      reducer: (x: number, y?: number) => y ?? x,
      default: () => 0,
    }),
    generations: Annotation<string[]>({
      reducer: (x: string[], y?: string[]) => y ?? x,
      default: () => [],
    }),
    hallucinationFailures: Annotation<number>({
      reducer: (x: number, y?: number) => y ?? x,
      default: () => 0,
    }),
    refinePrompt: Annotation<string>({
      reducer: (x: string, y?: string) => y ?? x,
      default: () => prompts.refine,
    }),
    maxGenerationAttempts: Annotation<number>({
      reducer: (x: number, y?: number) => y ?? x,
      default: () => DEFAULT_MAX_GENERATION_ATTEMPTS,
    }),
    maxHallucinationFailures: Annotation<number>({
      reducer: (x: number, y?: number) => y ?? x,
      default: () => DEFAULT_MAX_HALLUCINATION_FAILURES,
    }),
    maxRepeatedGenerations: Annotation<number>({
      reducer: (x: number, y?: number) => y ?? x,
      default: () => DEFAULT_MAX_REPEATED_GENERATIONS,
    }),
    refinements: Annotation<string[]>({
      reducer: (x: string[], y?: string[]) => y ?? x,
      default: () => [],
    }),
    replacements: Annotation<Replacements>({
      reducer: (x: Replacements, y?: Replacements) => y ?? x,
      default: () => ({}),
    }),
    start: Annotation<DateMath | undefined, DateMath | undefined>({
      reducer: (x?: DateMath, y?: DateMath) => y ?? x,
      default: () => start,
    }),
    unrefinedResults: Annotation<AttackDiscovery[] | null>({
      reducer: (x: AttackDiscovery[] | null, y?: AttackDiscovery[] | null) => y ?? x,
      default: () => null,
    }),
  });
