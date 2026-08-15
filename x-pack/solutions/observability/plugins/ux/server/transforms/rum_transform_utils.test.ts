/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RUM_CANONICAL_SESSION_ID_FIELD } from '../../common/rum_sessions';
import {
  installedRetentionMaxAge,
  installedSourceIndex,
  installedSourceLookbackGte,
  transformSourceWindowUpdate,
} from './rum_transform_utils';

const current = {
  transforms: [
    {
      source: {
        index: ['traces-*.otel-*'],
        query: {
          bool: {
            filter: [
              { range: { '@timestamp': { gte: 'now-30d' } } },
              { exists: { field: RUM_CANONICAL_SESSION_ID_FIELD } },
            ],
          },
        },
      },
      retention_policy: { time: { field: 'end_time', max_age: '30d' } },
    },
  ],
};

describe('transform source window helpers', () => {
  it('reads the installed lookback and retention', () => {
    expect(installedSourceIndex(current)).toEqual(['traces-*.otel-*']);
    expect(installedSourceLookbackGte(current)).toBe('now-30d');
    expect(installedRetentionMaxAge(current)).toBe('30d');
  });

  it('builds an _update body that includes source.index', () => {
    expect(
      transformSourceWindowUpdate({
        index: ['traces-*.otel-*'],
        lookbackGte: 'now-90d',
        retentionMaxAge: '93d',
      })
    ).toEqual({
      source: {
        index: ['traces-*.otel-*'],
        query: {
          bool: {
            filter: [
              { range: { '@timestamp': { gte: 'now-90d' } } },
              { exists: { field: RUM_CANONICAL_SESSION_ID_FIELD } },
            ],
          },
        },
      },
      retention_policy: { time: { field: 'end_time', max_age: '93d' } },
    });
  });
});
