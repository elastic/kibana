/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { isDemoArchived } from '../../data/investigations/demo_archive_store';
import type {
  InvestigationsSeverityFilter,
  InvestigationsStateFilter,
} from '../../data/investigations/investigations_url';
import { lastUpdatedMs } from './investigations_histogram_series';

export type InvestigationsTableSortField = 'title' | 'state' | 'severity' | 'updated_at';

export interface InvestigationsTableSort {
  field: InvestigationsTableSortField;
  direction: 'asc' | 'desc';
}

export const DEFAULT_INVESTIGATIONS_TABLE_SORT: InvestigationsTableSort = {
  field: 'updated_at',
  direction: 'desc',
};

const SEVERITY_ORDER: InvestigationsSeverityFilter[] = [
  'critical',
  'high',
  'medium',
  'low',
  'none',
];

const STATE_ORDER: InvestigationsStateFilter[] = ['in-progress', 'open', 'closed', 'archived'];

const investigationState = (
  investigation: InvestigationSummary,
  spaceKey: string
): InvestigationsStateFilter => {
  if (isDemoArchived(investigation, spaceKey)) {
    return 'archived';
  }
  if (investigation.metadata.status === 'closed') {
    return 'closed';
  }
  if (investigation.in_progress) {
    return 'in-progress';
  }
  return 'open';
};

const severityRank = (investigation: InvestigationSummary): number => {
  const severity: InvestigationsSeverityFilter = investigation.metadata.severity ?? 'none';
  const index = SEVERITY_ORDER.indexOf(severity);
  return index === -1 ? SEVERITY_ORDER.indexOf('none') : index;
};

const stateRank = (investigation: InvestigationSummary, spaceKey: string): number =>
  STATE_ORDER.indexOf(investigationState(investigation, spaceKey));

const compare = (a: number | string, b: number | string, direction: 'asc' | 'desc'): number => {
  const result =
    typeof a === 'string' && typeof b === 'string' ? a.localeCompare(b) : Number(a) - Number(b);
  return direction === 'asc' ? result : -result;
};

/** Client-side sort for the Investigations table (EuiBasicTable controlled sorting). */
export const sortInvestigationsForTable = (
  items: InvestigationSummary[],
  sort: InvestigationsTableSort,
  spaceKey: string
): InvestigationSummary[] =>
  [...items].sort((left, right) => {
    switch (sort.field) {
      case 'title':
        return compare(left.title || left.id, right.title || right.id, sort.direction);
      case 'state':
        return compare(stateRank(left, spaceKey), stateRank(right, spaceKey), sort.direction);
      case 'severity':
        return compare(severityRank(left), severityRank(right), sort.direction);
      case 'updated_at':
      default:
        return compare(lastUpdatedMs(left) ?? 0, lastUpdatedMs(right) ?? 0, sort.direction);
    }
  });

export const isInvestigationsTableSortField = (
  field: string | number | symbol | undefined
): field is InvestigationsTableSortField =>
  field === 'title' || field === 'state' || field === 'severity' || field === 'updated_at';
