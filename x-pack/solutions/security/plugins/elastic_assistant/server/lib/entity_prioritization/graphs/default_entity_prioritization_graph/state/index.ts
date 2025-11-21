/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Replacements } from '@kbn/elastic-assistant-common';
import { Annotation } from '@langchain/langgraph';

import type { DateMath } from '@elastic/elasticsearch/lib/api/types';
import type { ThreatHuntingPrioritiesPrompts } from '../prompts';
import {
  DEFAULT_MAX_GENERATION_ATTEMPTS,
  DEFAULT_MAX_HALLUCINATION_FAILURES,
  DEFAULT_MAX_REPEATED_GENERATIONS,
} from '../constants';

export interface ThreatHuntingPriorityEntity {
  type: 'user' | 'host';
  idField: string; // e.g., 'host.name', 'user.name'
  idValue: string; // The actual entity identifier value
}

// TODO: Define ThreatHuntingPriority type based on your requirements
export interface ThreatHuntingPriority {
  title: string;
  description: string;
  entities: ThreatHuntingPriorityEntity[];
  tags: string[]; // Key themes or MITRE ATT&CK techniques
  priority: number; // 1-10, where 10 is highest priority
  enrichedData?: {
    entityRecord?: unknown;
    alerts?: unknown[];
    riskScoreHistory?: unknown[];
    riskScore?: unknown[];
    assetCriticality?: unknown[];
    vulnerabilities?: {
      vulnerabilitiesAnonymized?: unknown[];
      vulnerabilitiesTotal?: Record<string, number>;
    };
    anomalies?: Record<string, string[]>[];
  };
}

// TODO: Define CandidateEntity type
export interface CandidateEntity {
  entityId: string;
  entityType: 'user' | 'host';
  riskScore?: number;
  riskScoreSpike?: boolean;
  spike?: number; // The spike value from getRiskScoreSpikes
  baseline?: number; // The baseline value from getRiskScoreSpikes
  alertCount?: number;
  highScoreAlerts?: number;
}

export interface Options {
  end?: string;
  filter?: Record<string, unknown> | null;
  prompts: ThreatHuntingPrioritiesPrompts;
  start?: string;
}

export const getDefaultGraphAnnotation = ({ end, filter, prompts, start }: Options) =>
  Annotation.Root({
    priorities: Annotation<ThreatHuntingPriority[] | null>({
      reducer: (x: ThreatHuntingPriority[] | null, y?: ThreatHuntingPriority[] | null) => y ?? x,
      default: () => null,
    }),
    prompt: Annotation<string>({
      reducer: (x: string, y?: string) => y ?? x,
      default: () => prompts.default,
    }),
    candidateEntities: Annotation<CandidateEntity[]>({
      reducer: (x: CandidateEntity[], y?: CandidateEntity[]) => y ?? x,
      default: () => [],
    }),
    selectedCandidateIds: Annotation<string[]>({
      reducer: (x: string[], y?: string[]) => y ?? x,
      default: () => [],
    }),
    enrichedEntities: Annotation<Map<string, ThreatHuntingPriority['enrichedData']>>({
      reducer: (
        x: Map<string, ThreatHuntingPriority['enrichedData']>,
        y?: Map<string, ThreatHuntingPriority['enrichedData']>
      ) => y ?? x,
      default: () => new Map(),
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
    unrefinedResults: Annotation<ThreatHuntingPriority[] | null>({
      reducer: (x: ThreatHuntingPriority[] | null, y?: ThreatHuntingPriority[] | null) => y ?? x,
      default: () => null,
    }),
  });

// State type definition matching the annotation structure
export interface ThreatHuntingPrioritiesGraphState {
  priorities: ThreatHuntingPriority[] | null;
  prompt: string;
  candidateEntities: CandidateEntity[];
  selectedCandidateIds: string[];
  enrichedEntities: Map<string, ThreatHuntingPriority['enrichedData']>;
  combinedGenerations: string;
  combinedRefinements: string;
  continuePrompt: string;
  end?: DateMath;
  errors: string[];
  filter?: Record<string, unknown> | null;
  generationAttempts: number;
  generations: string[];
  hallucinationFailures: number;
  refinePrompt: string;
  maxGenerationAttempts: number;
  maxHallucinationFailures: number;
  maxRepeatedGenerations: number;
  refinements: string[];
  replacements: Replacements;
  start?: DateMath;
  unrefinedResults: ThreatHuntingPriority[] | null;
}
