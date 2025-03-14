/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document } from '@langchain/core/documents';
import type { DefendInsight, Replacements } from '@kbn/elastic-assistant-common';
import type { DateMath } from '@elastic/elasticsearch/lib/api/types';

export interface GraphState {
  insights: DefendInsight[] | null;
  prompt: string;
  anonymizedEvents: Document[];
  combinedGenerations: string;
  combinedRefinements: string;
  errors: string[];
  generationAttempts: number;
  generations: string[];
  hallucinationFailures: number;
  maxGenerationAttempts: number;
  maxHallucinationFailures: number;
  maxRepeatedGenerations: number;
  refinements: string[];
  refinePrompt: string;
  replacements: Replacements;
  unrefinedResults: DefendInsight[] | null;
  start?: DateMath;
  end?: DateMath;
}
