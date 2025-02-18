/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import type { Document } from '@langchain/core/documents';
import { Annotation } from '@langchain/langgraph';

import { AttackDiscoveryPrompts } from '../nodes/helpers/prompts';
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
    attackDiscoveries: Annotation<AttackDiscovery[] | null>({
      value: (x: AttackDiscovery[] | null, y?: AttackDiscovery[] | null) => y ?? x,
      default: () => null,
    }),
    attackDiscoveryPrompt: Annotation<string>({
      value: (x: string, y?: string) => y ?? x,
      default: () => prompts.default,
    }),
    anonymizedAlerts: Annotation<Document[]>({
      value: (x: Document[], y?: Document[]) => y ?? x,
      default: () => [],
    }),
    combinedGenerations: Annotation<string>({
      value: (x: string, y?: string) => y ?? x,
      default: () => '',
    }),
    combinedRefinements: Annotation<string>({
      value: (x: string, y?: string) => y ?? x,
      default: () => '',
    }),
    continuePrompt: Annotation<string, string>({
      value: (x: string, y?: string) => y ?? x,
      default: () => '',
    }),
    end: Annotation<string | null | undefined>({
      value: (x?: string | null, y?: string | null) => y ?? x,
      default: () => end,
    }),
    errors: Annotation<string[], string[]>({
      value: (x: string[], y?: string[]) => y ?? x,
      default: () => [],
    }),
    filter: Annotation<Record<string, unknown> | null | undefined>({
      value: (x?: Record<string, unknown> | null, y?: Record<string, unknown> | null) => y ?? x,
      default: () => filter,
    }),
    generationAttempts: Annotation<number>({
      value: (x: number, y?: number) => y ?? x,
      default: () => 0,
    }),
    generations: Annotation<string[]>({
      value: (x: string[], y?: string[]) => y ?? x,
      default: () => [],
    }),
    hallucinationFailures: Annotation<number>({
      value: (x: number, y?: number) => y ?? x,
      default: () => 0,
    }),
    refinePrompt: Annotation<string>({
      value: (x: string, y?: string) => y ?? x,
      default: () => prompts.refine,
    }),
    maxGenerationAttempts: Annotation<number>({
      value: (x: number, y?: number) => y ?? x,
      default: () => DEFAULT_MAX_GENERATION_ATTEMPTS,
    }),
    maxHallucinationFailures: Annotation<number>({
      value: (x: number, y?: number) => y ?? x,
      default: () => DEFAULT_MAX_HALLUCINATION_FAILURES,
    }),
    maxRepeatedGenerations: Annotation<number>({
      value: (x: number, y?: number) => y ?? x,
      default: () => DEFAULT_MAX_REPEATED_GENERATIONS,
    }),
    refinements: Annotation<string[]>({
      value: (x: string[], y?: string[]) => y ?? x,
      default: () => [],
    }),
    replacements: Annotation<Replacements>({
      value: (x: Replacements, y?: Replacements) => y ?? x,
      default: () => ({}),
    }),
    start: Annotation<string | null | undefined, string | null | undefined>({
      value: (x?: string | null, y?: string | null) => y ?? x,
      default: () => start,
    }),
    unrefinedResults: Annotation<AttackDiscovery[] | null>({
      value: (x: AttackDiscovery[] | null, y?: AttackDiscovery[] | null) => y ?? x,
      default: () => null,
    }),
  });
