/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { Evaluator, Example } from '@kbn/evals';
import { leadSchema } from '@kbn/security-solution-plugin/common/entity_analytics/lead_generation/types';
import type {
  Lead,
  Observation,
  LeadEntity,
  RelatedEntity,
  LeadOrigin,
  LeadGenerationStatus,
  LeadChangesResponse,
} from '@kbn/security-solution-plugin/common/entity_analytics/lead_generation/types';
import type { LeadGenerationClient } from './clients/lead_generation_client';

// ---------------------------------------------------------------------------
// Domain types re-exported from the real API contract (single source of
// truth — see `common/entity_analytics/lead_generation/types.ts`)
// ---------------------------------------------------------------------------

export { leadSchema };
export type {
  Lead,
  Observation,
  LeadEntity,
  RelatedEntity,
  LeadOrigin,
  LeadGenerationStatus,
  LeadChangesResponse,
};

// ---------------------------------------------------------------------------
// Task output
// ---------------------------------------------------------------------------

/** Reference output stored in a dataset example for rubric evaluation. */
export interface LeadGenerationTaskExpectedOutput {
  leads: Lead[];
}

/** What the task function returns after executing the pipeline. */
export interface LeadGenerationTaskOutput {
  leads: Lead[] | null;
  errors?: string[];
  raw?: {
    executionUuid?: string;
    total?: number;
  };
}

// ---------------------------------------------------------------------------
// Dataset example type
// ---------------------------------------------------------------------------

export type LeadGenerationDatasetMetadata = Record<string, unknown> & {
  Title?: string;
  description?: string;
  scenario?: string;
  dataset_split?: unknown;
};

/** The pipeline has no per-run configuration, so examples carry no `input`. */
export type LeadGenerationDatasetExample = Example<
  Record<string, unknown>,
  LeadGenerationTaskExpectedOutput,
  LeadGenerationDatasetMetadata
>;

// ---------------------------------------------------------------------------
// Scenario harness
// ---------------------------------------------------------------------------

export interface ScenarioContext {
  esClient: Client;
  kbnClient: KbnClient;
  leadGenerationClient: LeadGenerationClient;
  connectorId: string;
  evaluationInferenceClient: BoundInferenceClient;
  log: ToolingLog;
  prefix: string;
}

export interface StepResult {
  label: string;
  leads: Lead[];
  errors?: string[];
  status?: LeadGenerationStatus;
  changes?: LeadChangesResponse;
}

export interface ScenarioTaskOutput extends LeadGenerationTaskOutput {
  steps: StepResult[];
}

export interface Scenario {
  name: string;
  description: string;
  euids: readonly string[];
  rubricCriteria?: string;
  seed: (ctx: ScenarioContext) => Promise<void>;
  run: (ctx: ScenarioContext) => Promise<StepResult[]>;
  evaluators: (
    ctx: ScenarioContext
  ) => Array<Evaluator<LeadGenerationDatasetExample, ScenarioTaskOutput>>;
}
