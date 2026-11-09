/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationSectionId } from './use_investigation_sections';

export type InvestigationsSeverityFilter = 'critical' | 'high' | 'medium' | 'low' | 'none';

/** List/filter states only — `in_progress` is a Home label, not a list state (it is Open). */
export type InvestigationsStateFilter = 'open' | 'closed';

export interface InvestigationsUrlState {
  query: string;
  severity: InvestigationsSeverityFilter[];
  state: InvestigationsStateFilter[];
  rangeFrom: string;
  rangeTo: string;
}

export const DEFAULT_INVESTIGATIONS_TIME_RANGE = { from: 'now-12h', to: 'now' } as const;

/** Home time picker default — last 3 calendar days (rounded). */
export const DEFAULT_HOMEPAGE_TIME_RANGE = { from: 'now-3d/d', to: 'now' } as const;

export const INVESTIGATIONS_SEVERITY_OPTIONS: readonly InvestigationsSeverityFilter[] = [
  'critical',
  'high',
  'medium',
  'low',
  'none',
] as const;

export const INVESTIGATIONS_STATE_OPTIONS: readonly InvestigationsStateFilter[] = [
  'open',
  'closed',
] as const;

const SEVERITY_PARAMS = new Set<string>(INVESTIGATIONS_SEVERITY_OPTIONS);
const STATE_PARAMS = new Set<string>(INVESTIGATIONS_STATE_OPTIONS);

/** Home accordion → Investigations filters (severity and/or state). */
export const sectionIdToInvestigationsFilters = (
  id: InvestigationSectionId
): Pick<InvestigationsUrlState, 'severity' | 'state'> => {
  switch (id) {
    case 'recent':
      return { severity: [], state: [] };
    case 'in-progress':
      // In progress is a Home label; those investigations are Open on the list.
      return { severity: [], state: ['open'] };
    case 'closed':
      return { severity: [], state: ['closed'] };
    case 'not-rated':
      return { severity: ['none'], state: [] };
    case 'critical':
    case 'high':
    case 'medium':
    case 'low':
      return { severity: [id], state: [] };
    default: {
      const exhaustive: never = id;
      throw new Error(`Unhandled investigation section: ${exhaustive}`);
    }
  }
};

/** Maps a legacy `group=` deep link onto severity/state. */
const legacyGroupToFilters = (
  group: string
): Pick<InvestigationsUrlState, 'severity' | 'state'> => {
  switch (group) {
    case 'recent':
      return { severity: [], state: [] };
    case 'in-progress':
      return { severity: [], state: ['open'] };
    case 'closed':
      return { severity: [], state: ['closed'] };
    case 'not-rated':
      return { severity: ['none'], state: [] };
    case 'critical':
    case 'high':
    case 'medium':
    case 'low':
      return { severity: [group], state: [] };
    default:
      return { severity: [], state: [] };
  }
};

export const buildInvestigationsSearch = ({
  query,
  severity,
  state,
  rangeFrom,
  rangeTo,
}: InvestigationsUrlState): string => {
  const params = new URLSearchParams();
  const trimmed = query.trim();
  if (trimmed) {
    params.set('query', trimmed);
  }
  for (const value of severity) {
    params.append('severity', value);
  }
  for (const value of state) {
    params.append('state', value);
  }
  if (rangeFrom !== DEFAULT_INVESTIGATIONS_TIME_RANGE.from) {
    params.set('rangeFrom', rangeFrom);
  }
  if (rangeTo !== DEFAULT_INVESTIGATIONS_TIME_RANGE.to) {
    params.set('rangeTo', rangeTo);
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
};

export const buildInvestigationsPath = (state: InvestigationsUrlState): string =>
  `/investigations${buildInvestigationsSearch(state)}`;

export const parseInvestigationsSearch = (search: string): InvestigationsUrlState => {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const query = params.get('query') ?? '';

  let severity = params
    .getAll('severity')
    .filter((value): value is InvestigationsSeverityFilter => SEVERITY_PARAMS.has(value));
  let state = params.getAll('state').flatMap((value): InvestigationsStateFilter[] => {
    // Older links used state=in-progress; that label is Open on the list.
    if (value === 'in-progress') {
      return ['open'];
    }
    return STATE_PARAMS.has(value) ? [value as InvestigationsStateFilter] : [];
  });

  // Older Home “View all” links used `group=`; map once if the new params are absent.
  const groupRaw = params.get('group');
  if (groupRaw && severity.length === 0 && state.length === 0) {
    const mapped = legacyGroupToFilters(groupRaw);
    severity = mapped.severity;
    state = mapped.state;
  }

  const rangeFrom = params.get('rangeFrom') ?? DEFAULT_INVESTIGATIONS_TIME_RANGE.from;
  const rangeTo = params.get('rangeTo') ?? DEFAULT_INVESTIGATIONS_TIME_RANGE.to;

  return { query, severity, state, rangeFrom, rangeTo };
};
