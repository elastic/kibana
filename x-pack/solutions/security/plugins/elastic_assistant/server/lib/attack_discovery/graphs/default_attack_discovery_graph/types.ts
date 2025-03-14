/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import type { Document } from '@langchain/core/documents';

export interface GraphState {
  attackDiscoveries: AttackDiscovery[] | null;
  attackDiscoveryPrompt: string;
  anonymizedAlerts: Document[];
  combinedGenerations: string;
  combinedRefinements: string;
  continuePrompt: string;
  end?: string | null;
  errors: string[];
  filter?: Record<string, unknown> | null;
  generationAttempts: number;
  generations: string[];
  hallucinationFailures: number;
  maxGenerationAttempts: number;
  maxHallucinationFailures: number;
  maxRepeatedGenerations: number;
  refinements: string[];
  refinePrompt: string;
  replacements: Replacements;
  start?: string | null;
  unrefinedResults: AttackDiscovery[] | null;
}
