/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@kbn/evals';

// ---------------------------------------------------------------------------
// Minimal domain types (mirrors the common lead schemas without importing
// server-side or plugin code into this test-only package)
// ---------------------------------------------------------------------------

export interface LeadEntity {
  type: string;
  name: string;
}

export interface Observation {
  entityId: string;
  moduleId: string;
  type: string;
  score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  metadata: Record<string, unknown>;
}

export interface Lead {
  id: string;
  title: string;
  byline: string;
  description: string;
  entities: LeadEntity[];
  tags: string[];
  priority: number;
  chatRecommendations: string[];
  timestamp: string;
  staleness: 'fresh' | 'stale' | 'expired';
  status: 'active' | 'dismissed' | 'expired';
  observations: Observation[];
  executionUuid: string;
  sourceType: 'adhoc' | 'scheduled';
}

export interface LeadGenerationStatus {
  isEnabled: boolean;
  indexExists: boolean;
  totalLeads: number;
  lastRun: string | null;
  connectorId?: string;
  lastExecutionUuid?: string;
  lastError?: string | null;
}

// ---------------------------------------------------------------------------
// Task input / output
// ---------------------------------------------------------------------------

/**
 * Input for a lead generation evaluation run. Currently the pipeline is
 * triggered with minimal configuration; future dataset examples may add
 * scenario-specific knobs (entity filters, time ranges, etc.).
 */
export interface LeadGenerationTaskInput extends Record<string, unknown> {
  /** Optionally cap the number of leads returned. Passed through to the API. */
  maxLeads?: number;
}

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
  scenario?: string;
  dataset_split?: unknown;
};

export type LeadGenerationDatasetExample = Example<
  LeadGenerationTaskInput,
  LeadGenerationTaskExpectedOutput,
  LeadGenerationDatasetMetadata
>;
