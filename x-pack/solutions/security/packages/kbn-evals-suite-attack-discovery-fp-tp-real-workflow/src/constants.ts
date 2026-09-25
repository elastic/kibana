/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared constants for the attack-discovery FP/TP eval suite.
 *
 * Route paths and API versions are intentionally inlined (rather than imported
 * from `@kbn/security-solution-plugin` / `@kbn/workflows/managed`) to keep this
 * functional-tests package free of a runtime dependency on the security
 * solution plugin. They mirror the alert-analysis-workflow suite's constants.
 */

/** Public workflows_management API version (`Elastic-Api-Version` header). */
export const WORKFLOWS_API_VERSION = '2023-10-31';

/**
 * The AD (attack discovery) workflow that produces attack documents. The
 * suite's task module grades the FP/TP analysis workflow
 * (`FP_TP_ANALYSIS_WORKFLOW_ID`) against those documents' persisted
 * `kibana.alert.attack_discovery.*` fields.
 */
export const ATTACK_DISCOVERY_WORKFLOW_ID = 'system-security-attack-discovery';

/**
 * The FP/TP analysis workflow this suite grades
 * (`ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW_ID` in
 * kbn-workflows' alertzero managed definitions). The task module runs THIS
 * workflow; the AD (`ATTACK_DISCOVERY_WORKFLOW_ID`) id is kept for reference.
 */
export const FP_TP_ANALYSIS_WORKFLOW_ID = 'system-security-attack-discovery-fp-tp-analysis';

/** Verdict labels the canonical case schema's gold enum admits. */
export const LABELS = ['true_positive', 'false_positive', 'inconclusive'] as const;

export type Label = (typeof LABELS)[number];

/** Label provenance values enforced by the loader (mirrors validate.py). */
export const LABEL_PROVENANCES = ['public', 'replay', 'synthetic', 'adversarial-mutation'] as const;

export type LabelProvenance = (typeof LABEL_PROVENANCES)[number];

/** Vendored corpus names and their known case counts (regression guard). */
export const CORPUS_CASE_COUNTS = {
  'guide-sanity': 750,
  'botsv3-benign-day': 96,
  'botsv3-fp-alerts': 54,
  'tp-chains': 3,
  'adversarial-twins': 21,
  perturbations: 15,
  'cloud-fp-synthetic': 78,
} as const;

export type CorpusName = keyof typeof CORPUS_CASE_COUNTS;

export const CORPUS_NAMES = Object.keys(CORPUS_CASE_COUNTS) as CorpusName[];

/** Permitted-use flags surfaced on loaded examples. */
export const SANITY_ONLY_CORPORA: readonly CorpusName[] = ['guide-sanity'];

/** Corpora still carrying a PROVISIONAL flag (labels pending human review). */
export const PROVISIONAL_CORPORA: readonly CorpusName[] = [
  'botsv3-fp-alerts',
  'cloud-fp-synthetic',
];
