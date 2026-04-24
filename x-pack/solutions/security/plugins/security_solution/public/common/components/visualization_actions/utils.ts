/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';

import type { ESBoolQuery } from '../../../../common/typed_json';
import { SecurityPageName } from '../../../../common/constants';
import type { Request } from './types';

export const VISUALIZATION_ACTIONS_BUTTON_CLASS = 'histogram-actions-trigger';
export const FILTER_IN_LEGEND_ACTION = `filterIn`;
export const FILTER_OUT_LEGEND_ACTION = `filterOut`;

const pageFilterFieldMap: Record<string, string> = {
  [SecurityPageName.hosts]: 'host',
  [SecurityPageName.users]: 'user',
};

export const getDetailsPageFilter = (pageName: string, detailName?: string): Filter[] => {
  const field = pageFilterFieldMap[pageName];
  return field && detailName
    ? [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: `${field}.name`,
            params: {
              query: detailName,
            },
          },
          query: {
            match_phrase: {
              [`${field}.name`]: detailName,
            },
          },
        },
      ]
    : [];
};

/**
 * Events table filter: keep documents where at least one ECS / EUID field is present
 * (aligned with Entity Store host identity branches and canonical `entity.id`).
 */
export const HOST_EXPLORE_EVENTS_EXISTENCE_FIELDS = [
  'host.entity.id',
  'host.id',
  'host.name',
  'host.hostname',
  'entity.id',
] as const;

/**
 * Events table filter: keep documents where at least one ECS / EUID field is present
 * (aligned with Entity Store user identity inputs and canonical `entity.id`).
 */
export const USER_EXPLORE_EVENTS_EXISTENCE_FIELDS = [
  'user.entity.id',
  'user.name',
  'user.id',
  'user.email',
  'entity.id',
] as const;

export const buildAnyFieldExistsFilter = (fields: readonly string[]): Filter[] => {
  const query = {
    bool: {
      filter: [
        {
          bool: {
            should: fields.map((field) => ({ exists: { field } })),
            minimum_should_match: 1,
          },
        },
      ],
    },
  };
  return [
    {
      query,
      meta: {
        alias: '',
        disabled: false,
        key: 'bool',
        negate: false,
        type: 'custom',
        value: JSON.stringify({ query }),
      },
    },
  ];
};

/** Hosts explore Events tab — any host / EUID identifier field present */
export const hostNameExistsFilter = buildAnyFieldExistsFilter(HOST_EXPLORE_EVENTS_EXISTENCE_FIELDS);

/** Users explore Events tab — any user / EUID identifier field present */
export const userNameExistsFilter = buildAnyFieldExistsFilter(USER_EXPLORE_EVENTS_EXISTENCE_FIELDS);

export const fieldNameExistsFilter = (pageName: string): Filter[] => {
  const field = pageFilterFieldMap[pageName];

  return field && pageName
    ? [
        {
          query: {
            bool: {
              should: [
                {
                  exists: {
                    field: `${field}.name`,
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          meta: {
            alias: '',
            disabled: false,
            key: 'bool',
            negate: false,
            type: 'custom',
            value: `{"query": {"bool": {"filter": [{"bool": {"should": [{"exists": {"field": "${field}.name"}}],"minimum_should_match": 1}}]}}}`,
          },
        },
      ]
    : [];
};

export const getNetworkDetailsPageFilter = (ipAddress?: string): Filter[] =>
  ipAddress
    ? [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'source.ip',
            params: {
              query: ipAddress,
            },
          },
          query: {
            bool: {
              should: [
                {
                  match_phrase: {
                    'source.ip': ipAddress,
                  },
                },
                {
                  match_phrase: {
                    'destination.ip': ipAddress,
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        },
      ]
    : [];

export const sourceOrDestinationIpExistsFilter: Filter[] = [
  {
    query: {
      bool: {
        should: [
          {
            exists: {
              field: 'source.ip',
            },
          },
          {
            exists: {
              field: 'destination.ip',
            },
          },
        ],
        minimum_should_match: 1,
      },
    },
    meta: {
      alias: '',
      disabled: false,
      key: 'bool',
      negate: false,
      type: 'custom',
      value:
        '{"bool":{"filter":[{"bool":{"should":[{"bool":{"should":[{"exists":{"field": "source.ip"}}],"minimum_should_match":1}},{"bool":{"should":[{"exists":{"field": "destination.ip"}}],"minimum_should_match":1}}],"minimum_should_match":1}}]}}',
    },
  },
];

/**
 * Index-name prefix shared by all Security Solution alerts backing indices
 * (e.g. `.alerts-security.alerts-default`). Patterns that start with this
 * prefix are alert indices and must be excluded from the Events charts so that
 * alert documents are not counted as events.
 */
export const ALERTS_INDEX_PATTERN = '.alerts-security.alerts';

/**
 * Return a copy of `patterns` with any Security Solution alerts-backing index
 * patterns removed. Equivalent to "duplicating the selected data view and
 * filtering out the alerts indices" without creating a full DataView object.
 */
export const filterAlertsFromIndexPatterns = (patterns: string[]): string[] =>
  patterns.filter((p) => !p.startsWith(ALERTS_INDEX_PATTERN));

export const getIndexFilters = (selectedPatterns: string[]) =>
  selectedPatterns.length >= 1
    ? [
        {
          meta: {
            type: 'phrases',
            key: '_index',
            params: selectedPatterns,
            alias: null,
            negate: false,
            disabled: false,
          },
          query: {
            bool: {
              should: selectedPatterns.map((selectedPattern) => ({
                match_phrase: { _index: selectedPattern },
              })),
              minimum_should_match: 1,
            },
          },
        },
      ]
    : [];

/**
 * Compute the `_index` filters to inject into a Lens chart.
 *
 * When `overridePatterns` is provided (and `signalIndexName` is absent), the
 * caller has supplied a subset of `selectedPatterns` with some entries removed
 * (e.g. alert-backing indices stripped by `filterAlertsFromIndexPatterns`).
 * Rather than emitting an allowlist filter from `overridePatterns` — which
 * would block CPS remote-cluster documents whose index names carry a
 * cluster-alias prefix — we instead emit *negated* filters for the removed
 * patterns only. This lets all remote-event documents through while still
 * excluding local alert-backing index documents.
 */
export const buildIndexFilters = ({
  hasAdHocDataViews,
  selectedPatterns,
  overridePatterns,
  signalIndexName,
}: {
  hasAdHocDataViews: boolean;
  selectedPatterns: string[];
  overridePatterns?: string[];
  signalIndexName?: string | null;
}): Filter[] => {
  // Ad-hoc data views embed their index scope inside the Lens attributes directly.
  if (hasAdHocDataViews) return [];

  // CPS-safe exclusion path: the caller stripped a subset of patterns (e.g. alert
  // indices) before passing overridePatterns. Instead of an allowlist — which would
  // silently drop remote-cluster documents whose index names carry a cluster-alias
  // prefix — emit negated filters for only the removed patterns.
  if (overridePatterns != null && !signalIndexName) {
    const removedPatterns = selectedPatterns.filter((p) => !overridePatterns.includes(p));
    if (removedPatterns.length === 0) return [];
    return getIndexFilters(removedPatterns).map((filter) => ({
      ...filter,
      meta: { ...filter.meta, negate: true },
    }));
  }

  // Default: allowlist the full selected patterns.
  return getIndexFilters(selectedPatterns);
};

export const getESQLGlobalFilters = (globalFilterQuery: ESBoolQuery | undefined) => [
  {
    meta: {
      alias: null,
      disabled: false,
      key: 'globalFilterKey',
      negate: false,
      params: {},
      type: 'string',
    },
    query: {
      bool: {
        filter: globalFilterQuery,
      },
    },
  },
];

export const getRequestsAndResponses = (requests: Request[] | null | undefined) => {
  return (requests ?? []).reduce(
    (acc: { requests: string[]; responses: string[] }, req: Request) => {
      return {
        requests: [
          ...acc.requests,
          JSON.stringify(
            { body: req?.json, index: (req?.stats?.indexFilter?.value ?? '').split(',') },
            null,
            2
          ),
        ],
        responses: [
          ...acc.responses,
          JSON.stringify(req?.response?.json?.rawResponse ?? {}, null, 2),
        ],
      };
    },
    { requests: [], responses: [] }
  );
};

export const parseVisualizationData = <T>(data: string[]): T[] =>
  data.reduce((acc, curr) => {
    try {
      return [...acc, JSON.parse(curr)];
    } catch (e) {
      return acc;
    }
  }, [] as T[]);
