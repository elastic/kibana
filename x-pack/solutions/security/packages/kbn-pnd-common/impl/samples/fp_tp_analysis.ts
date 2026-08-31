/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FpTpFailure } from '../schemas/analysis/fp_tp_failure.gen';
import type { FpTpResult } from '../schemas/analysis/fp_tp_result.gen';

const analysisMetadata = {
  workflow_id: 'system-security-attack-discovery-fp-tp-analysis',
  workflow_execution_id: 'exec-fp-tp-001',
  configuration_version: '1',
  completed_at: '2026-08-31T12:00:00.000Z',
} as const;

export const MOCK_FP_TP_TRUE_POSITIVE_RESULT: FpTpResult = {
  schema_version: '1',
  attack_discovery_id: 'ad-001',
  investigation_id: 'inv-001',
  classification: 'true_positive',
  summary: 'Correlated alerts describe a coherent attack chain.',
  reasoning: 'Referenced alerts share the same host, user, and MITRE tactics in a tight window.',
  corroborating_evidence: [
    {
      id: 'ad-document',
      source: 'attack_discovery',
      result: 'supports',
      details: 'Title and details describe lateral movement followed by credential access.',
    },
    {
      id: 'related-alerts',
      source: 'related_alerts',
      result: 'supports',
      details: 'All referenced alert documents were found in the space alerts index.',
    },
  ],
  caveats: [],
  checks: [
    {
      id: 'load_attack_discovery',
      name: 'Load persisted Attack Discovery',
      status: 'completed',
    },
    {
      id: 'load_referenced_alerts',
      name: 'Load referenced alerts',
      status: 'completed',
    },
  ],
  analysis_metadata: analysisMetadata,
};

export const MOCK_FP_TP_INCONCLUSIVE_RESULT: FpTpResult = {
  schema_version: '1',
  attack_discovery_id: 'ad-002',
  investigation_id: 'inv-002',
  classification: 'inconclusive',
  summary: 'Available evidence is insufficient to classify the attack.',
  reasoning: 'The Attack Discovery loaded, but referenced alerts were sparse and contradictory.',
  corroborating_evidence: [
    {
      id: 'ad-document',
      source: 'attack_discovery',
      result: 'neutral',
    },
  ],
  caveats: ['Referenced alerts could not establish a consistent kill chain.'],
  checks: [
    {
      id: 'load_attack_discovery',
      name: 'Load persisted Attack Discovery',
      status: 'completed',
    },
    {
      id: 'load_referenced_alerts',
      name: 'Load referenced alerts',
      status: 'skipped',
      details: 'Attack Discovery listed no alert IDs.',
    },
  ],
  analysis_metadata: {
    ...analysisMetadata,
    workflow_execution_id: 'exec-fp-tp-002',
  },
};

export const MOCK_FP_TP_FAILURE: FpTpFailure = {
  status: 'failed',
  attack_discovery_id: 'ad-missing',
  investigation_id: 'inv-003',
  error: {
    code: 'attack_discovery_not_found',
    message: 'No persisted Attack Discovery matched attack_discovery_id.',
    retryable: false,
  },
};
