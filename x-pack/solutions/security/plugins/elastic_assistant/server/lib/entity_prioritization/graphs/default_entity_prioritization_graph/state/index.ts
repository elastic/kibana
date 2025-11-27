/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Replacements } from '@kbn/elastic-assistant-common';
import { Annotation } from '@langchain/langgraph';

import type { DateMath } from '@elastic/elasticsearch/lib/api/types';
import type { CombinedPrompts } from '..';
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

export interface ThreatHuntingPriority {
  title: string; // A few words summarizing the threat
  byline: string; // A sentence expanding on the threat
  description: string; // More detailed description of the threat and investigation steps
  entities: ThreatHuntingPriorityEntity[];
  tags: string[]; // Key themes or MITRE ATT&CK techniques
  priority: number; // 1-10, where 10 is highest priority
  chatRecommendations: string[]; // Questions the user could ask the chat agent to continue investigating
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

/**
 * Properties for a risk score spike discovery
 */
export interface RiskScoreSpikeDiscoveryProperties {
  baseline: number; // The baseline risk score (past score)
  spike: number; // The spike value (new/current score)
  riskScore: number; // Current risk score (same as spike value)
}

/**
 * Properties for a high score alerts discovery
 * TODO: Implement when adding high score alerts discovery
 */
export interface HighScoreAlertsDiscoveryProperties {
  alertCount: number;
  highScoreCount: number;
}

/**
 * Properties for a high alert count discovery
 * TODO: Implement when adding high alert count discovery
 */
export interface HighAlertCountDiscoveryProperties {
  alertCount: number;
}

/**
 * Properties for an anomaly discovery
 * TODO: Implement when adding anomaly discovery
 */
export interface AnomalyDiscoveryProperties {
  anomalyType: string;
  severity: number;
}

/**
 * Discriminated union type for entity discoveries
 * Each discovery type has its own specific properties
 */
export type EntityDiscovery =
  | {
      type: 'risk_score_spike';
      score: number; // Importance score from 0-100
      properties: RiskScoreSpikeDiscoveryProperties;
    }
  | {
      type: 'high_score_alerts';
      score: number;
      properties: HighScoreAlertsDiscoveryProperties;
    }
  | {
      type: 'high_alert_count';
      score: number;
      properties: HighAlertCountDiscoveryProperties;
    }
  | {
      type: 'anomaly';
      score: number;
      properties: AnomalyDiscoveryProperties;
    };

/**
 * Union type of all discovery type names
 */
export type EntityDiscoveryType = EntityDiscovery['type'];

/**
 * Represents a candidate entity that may have been discovered through multiple methods
 */
export interface CandidateEntity {
  entityId: string;
  entityType: 'user' | 'host';
  discoveries: EntityDiscovery[]; // Array of discoveries from different sources
}

export interface Options {
  end?: string;
  filter?: Record<string, unknown> | null;
  prompts: CombinedPrompts;
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
      default: () => prompts.default || '',
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
      default: () => prompts.continue || '',
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
      default: () => prompts.refine || '',
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
