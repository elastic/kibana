/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  AT_CAVEATS_MAX,
  caveatPrefixValues,
  healthReasonValues,
  healthStateValues,
  namedCaveatValues,
} from './contracts/diagnosis_enums';
export type {
  CaveatPrefix,
  HealthReason,
  HealthState,
  NamedCaveat,
} from './contracts/diagnosis_enums';

export {
  AT_ACTIONS_MAX,
  AT_CANDIDATES_MAX,
  AT_COMPONENTS_MAX,
  AT_MESSAGE_MAX_CHARS,
  AT_UNITS_MAX,
  atFleetAgentComponentSchema,
  atFleetAgentComponentUnitSchema,
  atFleetAgentSchema,
  atHealthSchema,
  atHostPolicyActionSchema,
  atHostPolicyResponseSchema,
  troubleshootingDiagnosisInventoryCountsSchema,
  troubleshootingDiagnosisOmittedSchema,
  troubleshootingDiagnosisPackageStatusSchema,
  troubleshootingDiagnosisSchema,
} from './contracts/diagnosis';
export type { TroubleshootingDiagnosis } from './contracts/diagnosis';

export {
  FinalizeTroubleshootingDiagnosisStepId,
  finalizeTroubleshootingDiagnosisInputSchema,
  finalizeTroubleshootingDiagnosisStepCommonDefinition,
} from './finalize_troubleshooting_diagnosis_step_common';
