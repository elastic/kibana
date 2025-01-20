/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformSource } from '@elastic/elasticsearch/lib/api/types';
import { getSLOTransformTemplate } from './slo_transform_template';
import { createKQLCustomIndicator, createSLO } from '../../services/fixtures/slo';

describe('slo transform template', () => {
  const transformId = 'irrelevant';
  const description = 'irrelevant';
  const destination = {
    pipeline: '.slo-observability.sli.pipeline-v3',
    index: '.slo-observability.sli-v3.2',
  };
  const source = {
    index: ['my-index*', 'my-other-index*'],
    runtime_mappings: {
      'slo.id': {
        type: 'keyword',
        script: { source: "emit('5870c69e-b8a3-4ec4-a94e-87bc17ee5e2f')" },
      },
      'slo.revision': { type: 'long', script: { source: 'emit(1)' } },
      'slo.instanceId': { type: 'keyword', script: { source: "emit('*')" } },
    },
    query: {
      bool: {
        filter: [
          { range: { log_timestamp: { gte: 'now-7d/d' } } },
          {
            bool: {
              should: [{ match: { 'labels.groupId': 'group-3' } }],
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
  } as TransformSource;
  const groupBy = {
    'slo.id': { terms: { field: 'slo.id' } },
    'slo.revision': { terms: { field: 'slo.revision' } },
    'slo.instanceId': { terms: { field: 'slo.instanceId' } },
    '@timestamp': { date_histogram: { field: 'log_timestamp', fixed_interval: '1m' } },
  };
  const aggregations = {
    'slo.numerator': {
      filter: {
        bool: { should: [{ range: { latency: { lt: '300' } } }], minimum_should_match: 1 },
      },
    },
    'slo.denominator': {
      filter: {
        bool: { should: [{ exists: { field: 'http.status_code' } }], minimum_should_match: 1 },
      },
    },
  };
  const settings = { frequency: '1m', sync_field: 'log_timestamp', sync_delay: '1m' };

  it('should return transform template', () => {
    const slo = createSLO({ id: 'irrelevant', indicator: createKQLCustomIndicator() });

    const result = getSLOTransformTemplate(
      transformId,
      description,
      source,
      destination,
      groupBy,
      aggregations,
      settings,
      slo
    );

    expect(result).toEqual({
      transform_id: transformId,
      description,
      source: {
        index: ['my-index*', 'my-other-index*'],
        query: {
          bool: {
            filter: [
              {
                range: {
                  log_timestamp: {
                    gte: 'now-7d/d',
                  },
                },
              },
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      match: {
                        'labels.groupId': 'group-3',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        runtime_mappings: {
          'slo.id': {
            script: {
              source: "emit('5870c69e-b8a3-4ec4-a94e-87bc17ee5e2f')",
            },
            type: 'keyword',
          },
          'slo.instanceId': {
            script: {
              source: "emit('*')",
            },
            type: 'keyword',
          },
          'slo.revision': {
            script: {
              source: 'emit(1)',
            },
            type: 'long',
          },
        },
      },
      frequency: settings.frequency,
      dest: destination,
      settings: {
        deduce_mappings: false,
        unattended: true,
      },
      sync: {
        time: {
          field: settings.sync_field,
          delay: settings.sync_delay,
        },
      },
      pivot: {
        group_by: groupBy,
        aggregations,
      },
      defer_validation: true,
      _meta: {
        version: 3.4,
        managed: true,
        managed_by: 'observability',
      },
    });
  });

  it('adds group by exists filters', () => {
    const slo = createSLO({
      id: 'irrelevant',
      indicator: createKQLCustomIndicator(),
      groupBy: ['field1', 'field2'],
    });

    const result = getSLOTransformTemplate(
      transformId,
      description,
      source,
      destination,
      groupBy,
      aggregations,
      settings,
      slo
    );

    expect(result).toEqual({
      transform_id: transformId,
      description,
      source: {
        index: ['my-index*', 'my-other-index*'],
        query: {
          bool: {
            filter: [
              {
                range: {
                  log_timestamp: {
                    gte: 'now-7d/d',
                  },
                },
              },
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      match: {
                        'labels.groupId': 'group-3',
                      },
                    },
                  ],
                },
              },
              {
                exists: {
                  field: 'field1',
                },
              },
              {
                exists: {
                  field: 'field2',
                },
              },
            ],
          },
        },
        runtime_mappings: {
          'slo.id': {
            script: {
              source: "emit('5870c69e-b8a3-4ec4-a94e-87bc17ee5e2f')",
            },
            type: 'keyword',
          },
          'slo.instanceId': {
            script: {
              source: "emit('*')",
            },
            type: 'keyword',
          },
          'slo.revision': {
            script: {
              source: 'emit(1)',
            },
            type: 'long',
          },
        },
      },
      frequency: settings.frequency,
      dest: destination,
      settings: {
        deduce_mappings: false,
        unattended: true,
      },
      sync: {
        time: {
          field: settings.sync_field,
          delay: settings.sync_delay,
        },
      },
      pivot: {
        group_by: groupBy,
        aggregations,
      },
      defer_validation: true,
      _meta: {
        version: 3.4,
        managed: true,
        managed_by: 'observability',
      },
    });
  });
});
