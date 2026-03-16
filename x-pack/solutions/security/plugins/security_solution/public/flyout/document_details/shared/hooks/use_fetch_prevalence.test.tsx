/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { buildEsQuery } from '@kbn/es-query';
import { useQuery } from '@kbn/react-query';
import { useSelector } from 'react-redux';
import { useFetchPrevalence } from './use_fetch_prevalence';
import { createFetchData } from '../utils/fetch_data';
import { useKibana } from '../../../../common/lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useSecurityDefaultPatterns } from '../../../../data_view_manager/hooks/use_security_default_patterns';

jest.mock('@kbn/es-query');
jest.mock('@kbn/react-query');
jest.mock('react-redux');
jest.mock('../utils/fetch_data');
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/hooks/use_experimental_features');
jest.mock('../../../../data_view_manager/hooks/use_security_default_patterns');

const highlightedFieldsFilters: Record<string, QueryDslQueryContainer> = {
  'host.name': { term: { 'host.name': 'host-1' } },
};

const interval = {
  from: 'now-30d',
  to: 'now',
};

const searchServiceMock = {} as unknown;
const uiSettingsGetMock = jest.fn();
let mockServerless: unknown;

describe('useFetchPrevalence', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockServerless = undefined;
    (useKibana as jest.Mock).mockImplementation(() => ({
      services: {
        data: { search: searchServiceMock },
        uiSettings: { get: uiSettingsGetMock },
        serverless: mockServerless,
      },
    }));
    (useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    (useSelector as jest.Mock).mockReturnValue({ patternList: ['alerts-*', 'logs-*'] });
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    (useSecurityDefaultPatterns as jest.Mock).mockReturnValue({ indexPatterns: ['security-*'] });
    (buildEsQuery as jest.Mock).mockReturnValue({ bool: { filter: [] } });
    (createFetchData as jest.Mock).mockResolvedValue({});
    uiSettingsGetMock.mockReturnValue(true);
  });

  it('returns loading, error and data from useQuery', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { aggregations: {} },
      isLoading: false,
      isError: true,
    });

    const { result } = renderHook(() => useFetchPrevalence({ highlightedFieldsFilters, interval }));

    expect(result.current).toEqual({
      loading: false,
      error: true,
      data: { aggregations: {} },
    });
  });

  it('uses old default patterns and excludes cold/frozen tiers when ui setting is enabled', async () => {
    renderHook(() => useFetchPrevalence({ highlightedFieldsFilters, interval }));

    const [, , filters] = (buildEsQuery as jest.Mock).mock.calls[0];
    expect(filters[0].query.bool.filter).toEqual(
      expect.arrayContaining([
        {
          bool: {
            must_not: {
              terms: {
                _tier: ['data_frozen', 'data_cold'],
              },
            },
          },
        },
      ])
    );

    const queryFn = (useQuery as jest.Mock).mock.calls[0][1];
    await queryFn();

    expect(createFetchData).toHaveBeenCalledWith(
      searchServiceMock,
      expect.objectContaining({
        params: expect.objectContaining({
          index: ['alerts-*', 'logs-*'],
        }),
      })
    );
  });

  it('uses experimental patterns and does not exclude cold/frozen tiers when ui setting is disabled', () => {
    uiSettingsGetMock.mockReturnValue(false);
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);

    renderHook(() => useFetchPrevalence({ highlightedFieldsFilters, interval }));

    const [, , filters] = (buildEsQuery as jest.Mock).mock.calls[0];
    expect(filters[0].query.bool.filter).toEqual(
      expect.arrayContaining([
        {
          range: {
            '@timestamp': {
              gte: interval.from,
              lte: interval.to,
            },
          },
        },
      ])
    );
    expect(filters[0].query.bool.filter).toHaveLength(1);

    const queryFn = (useQuery as jest.Mock).mock.calls[0][1];
    queryFn();

    expect(createFetchData).toHaveBeenCalledWith(
      searchServiceMock,
      expect.objectContaining({
        params: expect.objectContaining({
          index: ['security-*'],
        }),
      })
    );
  });

  it('does not exclude cold/frozen tiers in serverless even when ui setting is enabled', () => {
    mockServerless = {};
    uiSettingsGetMock.mockReturnValue(true);

    renderHook(() => useFetchPrevalence({ highlightedFieldsFilters, interval }));

    const [, , filters] = (buildEsQuery as jest.Mock).mock.calls[0];
    expect(filters[0].query.bool.filter).toEqual(
      expect.arrayContaining([
        {
          range: {
            '@timestamp': {
              gte: interval.from,
              lte: interval.to,
            },
          },
        },
      ])
    );
    expect(filters[0].query.bool.filter).toHaveLength(1);
  });
});
