/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Cross-cutting result states every PND page shares, so loading, empty, 503 and
 * 500 are told apart identically wherever they appear.
 *
 * Start with `PndQueryState`; reach for an individual state only when a page
 * needs one outside the ordinary query flow (the four-phase view's
 * "could not correlate" is the current example).
 */

export { DemoModeBadge } from './demo_mode_badge';
export {
  classifyQueryError,
  getHttpStatus,
  PND_QUERY_ERROR_KINDS,
} from './helpers/classify_query_error';
export type { PndQueryErrorKind } from './helpers/classify_query_error';
export { getErrorMessage } from './helpers/get_error_message';
export {
  ATTACK_DISCOVERY_WORKFLOWS_UI_SETTING,
  PndAttackDiscoveryDisabledState,
} from './pnd_attack_discovery_disabled_state';
export { PndCorrelationUnavailableState } from './pnd_correlation_unavailable_state';
export { PndEmptyState } from './pnd_empty_state';
export { PndErrorState } from './pnd_error_state';
export { PndLoadingState } from './pnd_loading_state';
export { PndQueryState } from './pnd_query_state';
export type { PndQueryStateProps } from './pnd_query_state';
export { PndWorkflowsUnavailableState } from './pnd_workflows_unavailable_state';
