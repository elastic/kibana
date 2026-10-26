/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import type { SignificantEventInvestigationState } from '@kbn/significant-events-plugin/common';
import type { Severity, SignificantEventStatus } from '@kbn/significant-events-schema';

export interface SignificantEventsFilters {
  from: string;
  to: string;
  search: string;
  status: SignificantEventStatus[];
  severity: Severity[];
  investigation: SignificantEventInvestigationState[];
  entities: string[];
  unassigned: boolean;
}

const nonEmpty = <Value>(values: Value[]): Value[] | undefined =>
  values.length > 0 ? values : undefined;

/** Query params shared by the events list and facets requests. */
export const toEventsFilterQuery = ({
  from,
  to,
  search,
  status,
  severity,
  investigation,
  entities,
  unassigned,
}: SignificantEventsFilters) => ({
  ...getAbsoluteTimeRange({ from, to }, { forceNow: new Date() }),
  search: search || undefined,
  status: nonEmpty(status),
  severity: nonEmpty(severity),
  investigation_state: nonEmpty(investigation),
  topology_feature_id: nonEmpty(entities),
  unassigned_entities: unassigned || undefined,
});
