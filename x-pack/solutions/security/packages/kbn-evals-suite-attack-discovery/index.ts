/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * Elastic License 2.0; you may use this file except in compliance with the Elastic
 * License 2.0.
 */

/**
 * Public surface of the Attack Discovery eval suite. The worker suite
 * (`@kbn/evals-suite-attack-discovery-worker`) imports the audit failure classes and evaluators
 * from here instead of carrying copies: one definition of every check, fixed in one place.
 */

export {
  AUDIT_INPUT_VARIANTS,
  AUDIT_SCENARIOS,
  buildAuditExamples,
  getAuditExampleName,
  getAuditRendering,
  getGoldForVariant,
  resolveAuditReference,
  validateGold,
  type AuditReference,
  type AuditReferenceResolver,
} from './src/audit_failure_classes/registry';
export {
  getAnonymizationSeed,
  getAnonymizationFields,
  getVariantFields,
  renderAlerts,
  type RenderedAlerts,
} from './src/audit_failure_classes/render_alert';
export { parseAlerts, parseAlertCsv } from './src/audit_failure_classes/alert_csv';
export { deanonymizeDiscoveries } from './src/audit_failure_classes/deanonymize_discoveries';
export { DEFAULT_ALLOWLIST, ENRICHED_FIELDS } from './src/audit_failure_classes/default_allowlist';
export {
  defineAlerts,
  toAlertId,
  type AlertDraft,
} from './src/audit_failure_classes/define_alerts';
export { getDiscoveryMarkdown } from './src/audit_failure_classes/discovery_text';
export type {
  AuditAlert,
  AuditExampleMetadata,
  AuditExpectedDiscoveries,
  AuditGold,
  AuditGoldVariantOverride,
  AuditInputVariant,
  AuditScenario,
} from './src/audit_failure_classes/types';

export { benignBatchScenario } from './src/audit_failure_classes/scenarios/benign_batch';
export { positiveChainWithNoiseScenario } from './src/audit_failure_classes/scenarios/positive_chain_with_noise';
export { sameDisplayNameCrossAccountScenario } from './src/audit_failure_classes/scenarios/same_display_name_cross_account';
export { sharedCiEgressScenario } from './src/audit_failure_classes/scenarios/shared_ci_egress';
export { thresholdMetaAlertsScenario } from './src/audit_failure_classes/scenarios/threshold_meta_alerts';

export {
  AUDIT_CONDITIONAL_REMEDIATION_EVALUATOR_NAME,
  createAuditConditionalRemediationEvaluator,
  findUnconditionalContainment,
} from './src/evaluators/audit_conditional_remediation_evaluator';
export {
  AUDIT_CONDITIONAL_REMEDIATION_JUDGE_EVALUATOR_NAME,
  createAuditConditionalRemediationJudgeEvaluator,
} from './src/evaluators/audit_conditional_remediation_judge_evaluator';
export {
  AUDIT_ENTITY_CO_OCCURRENCE_EVALUATOR_NAME,
  createAuditEntityCoOccurrenceEvaluator,
} from './src/evaluators/audit_entity_co_occurrence_evaluator';
export {
  AUDIT_FORBIDDEN_JOIN_EVALUATOR_NAME,
  createAuditForbiddenJoinEvaluator,
} from './src/evaluators/audit_forbidden_join_evaluator';
export {
  AUDIT_META_ALERT_AS_EVIDENCE_EVALUATOR_NAME,
  createAuditMetaAlertAsEvidenceEvaluator,
} from './src/evaluators/audit_meta_alert_as_evidence_evaluator';
export {
  AUDIT_NEGATIVE_CONTROL_EVALUATOR_NAME,
  createAuditNegativeControlEvaluator,
} from './src/evaluators/audit_negative_control_evaluator';
export {
  AUDIT_POSITIVE_CONTROL_RECALL_EVALUATOR_NAME,
  POSITIVE_CONTROL_RECALL_THRESHOLD,
  createAuditPositiveControlRecallEvaluator,
} from './src/evaluators/audit_positive_control_recall_evaluator';
export {
  notApplicable,
  resolveAuditInputs,
  resolveScoredDiscoveries,
  selectScoredDiscoveries,
} from './src/evaluators/audit_evaluator_helpers';
