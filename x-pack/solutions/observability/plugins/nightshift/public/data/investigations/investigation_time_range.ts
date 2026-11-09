/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import dateMath from '@kbn/datemath';

const lastUpdatedMs = (investigation: InvestigationSummary): number | null => {
  const updated = Date.parse(investigation.updated_at || investigation.created_at);
  return Number.isFinite(updated) ? updated : null;
};

/** Time picker bounds are applied to last update, not creation. */
export const matchesInvestigationUpdatedAtRange = (
  investigation: InvestigationSummary,
  rangeFrom: string,
  rangeTo: string
): boolean => {
  const updated = lastUpdatedMs(investigation);
  if (updated == null) {
    return false;
  }
  const from = dateMath.parse(rangeFrom);
  const to = dateMath.parse(rangeTo, { roundUp: true });
  if (from == null || to == null || !from.isValid() || !to.isValid()) {
    return true;
  }
  return updated >= from.valueOf() && updated <= to.valueOf();
};
