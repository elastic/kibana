/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Entity AI summary domain helpers: staleness detection and structural caps.
 *
 * Deliberately kept out of the page-load `common` barrel (index) so this runtime logic
 * ships only in the chunks that use it — the lazy entity-details flyout and the server —
 * rather than on every page load. The corresponding *types* stay in the barrel (they are
 * erased at build time, so they cost nothing on page load).
 *
 * @example
 * import { computeEntitySummaryStalenessReasons } from '@kbn/entity-store/common/entity_summary';
 */

export {
  ENTITY_SUMMARY_STALENESS_SIGNALS,
  DEFAULT_ENTITY_SUMMARY_STALENESS_SIGNALS,
  buildEntitySummaryStaleness,
  computeEntitySummaryStalenessReasons,
  getChangedStalenessSignals,
} from './domain/definitions/entity_summary_staleness';

export {
  MAX_ENTITY_SUMMARY_HIGHLIGHTS,
  MAX_ENTITY_SUMMARY_RECOMMENDED_ACTIONS,
  MAX_ENTITY_ID_LENGTH,
  MAX_ENTITY_TYPE_LENGTH,
  MAX_SUMMARY_HIGHLIGHT_TITLE_LENGTH,
  MAX_SUMMARY_TEXT_LENGTH,
  MAX_SUMMARY_ANOMALY_JOB_ID_LENGTH,
  MAX_SUMMARY_VARIANT_ID_LENGTH,
  capEntitySummaryContent,
} from './domain/definitions/entity_summary_limits';

export type {
  EntitySummaryContent,
  CappedEntitySummaryContent,
} from './domain/definitions/entity_summary_limits';
