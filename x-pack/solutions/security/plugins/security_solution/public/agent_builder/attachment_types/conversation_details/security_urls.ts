/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode as risonEncode } from '@kbn/rison';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { APP_UI_ID } from '../../../../common/constants';

// ---------------------------------------------------------------------------
// URL param key constants
// Mirror the keys from security_solution/public/common/hooks/constants.ts
// (avoiding an import from the public layer to keep the chunk small).
const FILTERS_KEY = 'filters';
const TIMERANGE_KEY = 'timerange';
const PAGE_FILTERS_KEY = 'pageFilters';
const ESQL_QUERY_KEY = 'cspq';

const getSecurityUrl = (application: ApplicationStart, path: string) =>
  application.getUrlForApp(APP_UI_ID, { path });

// ---------------------------------------------------------------------------
// Shared filter builders

const buildPhraseFilter = (id: string) => ({
  /* eslint-disable @typescript-eslint/naming-convention */
  $state: { store: 'appState' },
  meta: {
    alias: null,
    disabled: false,
    key: '_id',
    negate: false,
    params: { query: id },
    type: 'phrase',
  },
  query: { match_phrase: { _id: id } },
});

const buildPhrasesFilter = (ids: readonly string[]) => ({
  /* eslint-disable @typescript-eslint/naming-convention */
  $state: { store: 'appState' },
  meta: {
    alias: null,
    disabled: false,
    key: '_id',
    negate: false,
    params: [...ids],
    type: 'phrases',
  },
  query: {
    bool: { minimum_should_match: 1, should: ids.map((id) => ({ match_phrase: { _id: id } })) },
  },
});

const buildIdsFilter = (ids: readonly string[]) =>
  ids.length === 1 ? buildPhraseFilter(ids[0]) : buildPhrasesFilter(ids);

const ALL_STATUSES_PAGE_FILTER = [
  {
    display_settings: { hide_action_bar: false },
    exclude: false,
    exists_selected: false,
    field_name: 'kibana.alert.workflow_status',
    selected_options: [],
    title: 'Status',
  },
];

const buildAbsoluteTimerange = (from: string, to: string) => ({
  global: { linkTo: [], timerange: { from, kind: 'absolute', to } },
  timeline: { linkTo: [], timerange: { from, kind: 'absolute', to } },
});

/** `from = createdAt − 7d`, `to = updatedAt + 1 min`. */
const buildAlertTimeWindow = (
  createdAt: string,
  updatedAt: string
): { from: string; to: string } => {
  const fromMs = new Date(createdAt).getTime() - 7 * 24 * 60 * 60 * 1000;
  const toMs = new Date(updatedAt).getTime() + 60 * 1000;
  return { from: new Date(fromMs).toISOString(), to: new Date(toMs).toISOString() };
};

// ---------------------------------------------------------------------------
// Per-page URL builders

export interface AlertsUrlOptions {
  ids: readonly string[];
  /** ISO string of the earliest attachment version `created_at` (lower bound). */
  createdAt: string;
  /** ISO string of the latest attachment version `created_at` (upper bound). */
  updatedAt: string;
  application: ApplicationStart;
}

export const buildAlertsPageUrl = ({
  ids,
  createdAt,
  updatedAt,
  application,
}: AlertsUrlOptions): string => {
  const { from, to } = buildAlertTimeWindow(createdAt, updatedAt);
  const params = new URLSearchParams();
  params.set(FILTERS_KEY, risonEncode([buildIdsFilter(ids)]));
  params.set(TIMERANGE_KEY, risonEncode(buildAbsoluteTimerange(from, to)));
  params.set(PAGE_FILTERS_KEY, risonEncode(ALL_STATUSES_PAGE_FILTER));
  return getSecurityUrl(application, `/alerts?${params.toString()}`);
};

export interface AttacksUrlOptions {
  ids: readonly string[];
  createdAt: string;
  updatedAt: string;
  application: ApplicationStart;
}

export const buildAttacksPageUrl = ({
  ids,
  createdAt,
  updatedAt,
  application,
}: AttacksUrlOptions): string => {
  const { from, to } = buildAlertTimeWindow(createdAt, updatedAt);
  const params = new URLSearchParams();
  params.set(FILTERS_KEY, risonEncode([buildIdsFilter(ids)]));
  params.set(TIMERANGE_KEY, risonEncode(buildAbsoluteTimerange(from, to)));
  params.set(PAGE_FILTERS_KEY, risonEncode(ALL_STATUSES_PAGE_FILTER));
  return getSecurityUrl(application, `/attacks?${params.toString()}`);
};

export interface EntitiesUrlOptions {
  terms: readonly string[];
  application: ApplicationStart;
}

const escapeKqlPhrase = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

export const buildEntitiesPageUrl = ({ terms, application }: EntitiesUrlOptions): string => {
  const query = terms
    .map((t) => `entity.id: "${escapeKqlPhrase(t)}" or entity.name: "${escapeKqlPhrase(t)}"`)
    .join(' or ');
  const cspq = risonEncode({ filters: [], pageIndex: 0, query: { language: 'kuery', query } });
  const params = new URLSearchParams();
  params.set(ESQL_QUERY_KEY, cspq);
  return getSecurityUrl(application, `/entity_analytics_home_page?${params.toString()}`);
};

export interface RulesUrlOptions {
  ruleName?: string;
  application: ApplicationStart;
}

export const buildRulesPageUrl = ({ ruleName, application }: RulesUrlOptions): string => {
  if (ruleName) {
    const params = new URLSearchParams();
    params.set('rulesTable', risonEncode({ searchTerm: ruleName }));
    return getSecurityUrl(application, `/rules/management?${params.toString()}`);
  }
  return getSecurityUrl(application, '/rules/management');
};
