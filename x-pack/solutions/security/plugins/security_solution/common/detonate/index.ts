/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  DETONATE_AI_SUMMARY_PATH,
  DETONATE_COMPLETED_WORKER,
  DETONATE_INTERNAL_BASE_PATH,
  DETONATE_PROTECTION_EVENT_CODES,
  DETONATE_TABLE_LIMIT,
  DETONATE_TASKS_INDEX,
  DETONATE_TOP_FAMILIES_LIMIT,
  isProtectionEventCode,
} from './constants';
export type { ProtectionEventCode } from './constants';

export {
  collectMalwareCategories,
  collectMalwareFamilies,
  parseMalwareSignature,
} from './malware_signature';
export type { MalwareSignature } from './malware_signature';

export { mergeThreatBlocks } from './mitre';
export type {
  DetonationThreatBucket,
  MitreNodeSummary,
  MitreTacticSummary,
  MitreTechniqueSummary,
  RawThreatBlock,
} from './mitre';

export { DETONATION_SEVERITY_ORDER } from './types';
export type {
  BreakdownCount,
  DetonationAiSummary,
  DetonationKpis,
  DetonationSeverity,
  DetonationSummary,
  MalwareFamilyCount,
} from './types';
