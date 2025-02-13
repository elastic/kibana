/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CombinedFilter } from '@kbn/es-query';
import { FILTERS, BooleanRelation, FilterStateStore } from '@kbn/es-query';
import { filtersToInsightProviders } from './provider';

const flatValueFilters = [
  {
    query: {
      exists: {
        field: 'Memory_protection.thread_count',
      },
    },
    meta: {
      negate: false,
      index: 'security-solution-default',
      key: 'Memory_protection.thread_count',
      field: 'Memory_protection.thread_count',
      value: 'exists',
      type: 'exists',
    },
  },
  {
    meta: {
      negate: false,
      index: 'security-solution-default',
      key: 'process.session_leader.entity_id',
      field: 'process.session_leader.entity_id',
      params: {
        query: 'fbqfoee0al',
      },
      type: 'phrase',
    },
    query: {
      match_phrase: {
        'process.session_leader.entity_id': 'fbqfoee0al',
      },
    },
  },
];

const combinedFilter: CombinedFilter = {
  $state: {
    store: FilterStateStore.APP_STATE,
  },
  meta: {
    type: FILTERS.COMBINED,
    relation: BooleanRelation.OR,
    params: flatValueFilters,
    index: 'security-solution-default',
    disabled: false,
    negate: false,
  },
};

const combined = [
  {
    $state: {
      store: FilterStateStore.APP_STATE,
    },
    meta: {
      type: 'combined',
      relation: 'OR',
      params: [
        {
          query: {
            exists: {
              field: '_index',
            },
          },
          meta: {
            negate: false,
            index: 'logs-*',
            key: '_index',
            field: '_index',
            value: 'exists',
            type: 'exists',
          },
        },
        {
          $state: {
            store: FilterStateStore.APP_STATE,
          },
          meta: {
            type: 'combined',
            relation: 'AND',
            params: [
              {
                query: {
                  exists: {
                    field: 'Endpoint.policy.applied.artifacts.global.identifiers.sha256',
                  },
                },
                meta: {
                  negate: false,
                  index: 'security-solution-default',
                  key: 'Endpoint.policy.applied.artifacts.global.identifiers.sha256',
                  field: 'Endpoint.policy.applied.artifacts.global.identifiers.sha256',
                  value: 'exists',
                  type: 'exists',
                },
              },
              {
                meta: {
                  negate: true,
                  index: 'security-solution-default',
                  key: 'Ransomware.child_processes.files.entropy',
                  field: 'Ransomware.child_processes.files.entropy',
                  params: {
                    query: '0',
                  },
                  type: 'phrase',
                },
                query: {
                  match_phrase: {
                    'Ransomware.child_processes.files.entropy': '0',
                  },
                },
              },
            ],
            index: 'security-solution-default',
            disabled: false,
            negate: false,
          },
        },
      ],
      index: 'security-solution-default',
      disabled: false,
      negate: false,
    },
  },
];

describe('filter to provider conversion', () => {
  it('should return a single array for ANDed top level values', () => {
    const result = filtersToInsightProviders(flatValueFilters);
    expect(result.length).toBe(1);
  });

  it('should return a 2d array for a top level OR', () => {
    const result = filtersToInsightProviders([combinedFilter]);
    expect(result.length).toBe(2);
  });

  it('should return an array with 2 top level providers, and one with multiple', () => {
    const result = filtersToInsightProviders(combined);
    const [first, second] = result;
    expect(result.length).toBe(2);
    expect(first.length).toBe(1);
    expect(second.length).toBe(2);
  });
});
