/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import moment from 'moment';
import { useDiscoverUrl } from './use_discover_url';
import { useKibana } from '../../../utils/kibana_react';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import type { Rule } from '@kbn/alerts-ui-shared';
import type { TopAlert } from '../../../typings/alerts';

jest.mock('../../../utils/kibana_react', () => ({
  useKibana: jest.fn(),
}));

const mockGetRedirectUrl = jest.fn();

const getServices = () => ({
  services: {
    discover: {
      locator: {
        getRedirectUrl: mockGetRedirectUrl,
      },
    },
  },
});

const MOCK_ALERT = {
  start: Date.now(),
} as unknown as TopAlert;

describe('useDiscoverUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue(getServices());
  });

  it('returns null when rule or alert missing', () => {
    const { result } = renderHook(() => useDiscoverUrl({ alert: null, rule: undefined }));
    expect(result.current.discoverUrl).toBeNull();
    expect(mockGetRedirectUrl).not.toHaveBeenCalled();
  });

  it('builds Discover url for custom threshold rule including filters', () => {
    const query = { language: 'kuery', query: 'message: error' };
    const rule = {
      ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
      params: {
        searchConfiguration: {
          index: 'logs-data-view',
          query,
        },
        criteria: [{ metrics: [{ filter: 'service.name:test' }] }],
      },
    } as unknown as Rule;

    const expectedTimeRange = {
      from: moment(MOCK_ALERT.start).subtract(30, 'minutes').toISOString(),
      to: moment(MOCK_ALERT.start).add(30, 'minutes').toISOString(),
    };

    mockGetRedirectUrl.mockReturnValue('discover-url');

    const { result } = renderHook(() => useDiscoverUrl({ alert: MOCK_ALERT, rule }));

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      dataViewId: 'logs-data-view',
      timeRange: expectedTimeRange,
      query,
      filters: [
        {
          $state: { store: 'appState' },
          bool: { minimum_should_match: 1, should: [{ match: { 'service.name': 'test' } }] },
          meta: {
            alias: null,
            disabled: true,
            index: 'logs-data-view',
            negate: false,
            type: 'custom',
          },
        },
      ],
    });
    expect(result.current.discoverUrl).toBe('discover-url');
  });

  it('ignores unsupported rule types', () => {
    const rule = {
      ruleTypeId: 'some_unsupported_rule',
      params: {},
    } as unknown as Rule;

    const { result } = renderHook(() => useDiscoverUrl({ alert: MOCK_ALERT, rule }));

    expect(result.current.discoverUrl).toBeNull();
    expect(mockGetRedirectUrl).not.toHaveBeenCalled();
  });
});
