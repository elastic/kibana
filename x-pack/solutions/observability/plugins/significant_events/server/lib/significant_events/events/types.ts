/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity, SignificantEventStatus } from '@kbn/significant-events-schema';
import type {
  SignificantEventInvestigationState,
  SignificantEventsSortField,
  SignificantEventsSortOrder,
} from '../../../../common/events_list';
import type { PaginatedSearchOptions } from '../query_utils';

/** Filters shared by every "latest current state" read path over `.rule-events`. */
export interface EventsFilterOptions {
  status?: SignificantEventStatus[];
  severity?: Severity[];
  sourceIds?: string[];
  search?: string;
  eventIds?: string[];
  ruleUuids?: string[];
  topologyFeatureIds?: string[];
  unassignedEntityIds?: string[];
  investigationStates?: SignificantEventInvestigationState[];
}

export type EventsPaginatedSearchOptions = PaginatedSearchOptions &
  EventsFilterOptions & {
    /** Defaults to the latest revision time, newest first. */
    sortField?: SignificantEventsSortField;
    sortOrder?: SignificantEventsSortOrder;
  };
