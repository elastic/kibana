/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_ALERTS_INDEX, DEFAULT_PREVIEW_INDEX } from '../../../../common/constants';

/**
 * A document's `_index` for an alert points at the hidden backing index (e.g.
 * `.internal.alerts-security.alerts-<spaceId>` for alerts, `.internal.preview.alerts-security.alerts-<spaceId>`
 * for rule-preview alerts), which the request user is not authorized to query directly. Callers that
 * route a search *at* the index (rather than filtering on `_index` inside an authorized data view)
 * must therefore resolve the backing index to its public alias first.
 *
 * Returns the alias for a known backing index, or `undefined` for anything else (a regular source
 * index, a cross-cluster name, etc.) so callers can fall back to the original index unchanged.
 */
export const getAlertIndexAlias = (
  index: string,
  spaceId: string = 'default'
): string | undefined => {
  if (index.startsWith(`.internal${DEFAULT_ALERTS_INDEX}`)) {
    return `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
  } else if (index.startsWith(`.internal${DEFAULT_PREVIEW_INDEX}`)) {
    return `${DEFAULT_PREVIEW_INDEX}-${spaceId}`;
  }
};
