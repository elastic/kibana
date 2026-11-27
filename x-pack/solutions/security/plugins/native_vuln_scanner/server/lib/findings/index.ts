/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { FINDINGS_ALIAS, FINDINGS_INDEX } from './constants';
export type { FindingState } from './constants';
export type { FindingDoc, FindingSeverity, HostMeta } from './finding_doc';
export { findingId, toFindingDoc, toSeverity } from './finding_doc';
export { ensureFindingsIndex, OPEN_FINDINGS_FILTER } from './index_setup';
export type { WriteFindingsParams, WriteFindingsResult } from './writer';
export { FindingsWriteError, writeFindings } from './writer';
