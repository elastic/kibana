/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useEsqlGlobalFilterQuery } from './use_esql_global_filter';
import { TestProviders } from '../../mock';

jest.mock('../../containers/use_global_time', () => ({
  useGlobalTime: jest.fn(() => ({
    from: '2024-01-01T00:00:00.000Z',
    to: '2024-01-02T00:00:00.000Z',
  })),
}));

describe('useEsqlGlobalFilterQuery', () => {
  it('returns the expected ESBoolQuery with time range filter', () => {
    const { result } = renderHook(() => useEsqlGlobalFilterQuery(), { wrapper: TestProviders });

    expect(result.current).toEqual({
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gte: '2024-01-01T00:00:00.000Z',
                lt: '2024-01-02T00:00:00.000Z',
              },
            },
          },
        ],
        must: [],
        must_not: [],
        should: [],
      },
    });
  });
});
