/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { mobilePanelDiscoverEsql } from '../../../../common/mobile/discover';
import { useDiscoverHref } from '../../../hooks/use_discover_href';
import { useEnvironment } from '../../../hooks/use_environment';
import { useQueryParam } from '../../../hooks/use_query_param';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useMobileDiscoverHref } from './use_mobile_discover_href';

jest.mock('../../../hooks/use_discover_href');
jest.mock('../../../hooks/use_environment');
jest.mock('../../../hooks/use_query_param');
jest.mock('../../../hooks/use_time_range');

const mockUrl = ({
  environment,
  osName,
  release,
}: { environment?: string; osName?: string; release?: string } = {}) => {
  jest.mocked(useTimeRange).mockReturnValue({
    timeRange: { rangeFrom: 'now-2h', rangeTo: 'now' },
    isTimeRangeInUrl: true,
    setTimeRange: jest.fn(),
  });
  jest.mocked(useEnvironment).mockReturnValue({ environment, setEnvironment: jest.fn() });
  jest.mocked(useQueryParam).mockImplementation(
    (key) =>
      ({
        value: { osName, release }[key as 'osName' | 'release'],
        setValue: jest.fn(),
      } as ReturnType<typeof useQueryParam>)
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useDiscoverHref).mockReturnValue('/app/discover');
});

describe('useMobileDiscoverHref', () => {
  it("opens the page's events with every filter of its URL, over its time range", () => {
    mockUrl({ environment: 'production', osName: 'iOS', release: '2.0.0' });

    const { result } = renderHook(() => useMobileDiscoverHref('shop-mobile'));

    expect(result.current).toBe('/app/discover');
    const [esql, timeRange] = jest.mocked(useDiscoverHref).mock.calls.at(-1) ?? [];
    expect(timeRange).toEqual({ from: 'now-2h', to: 'now' });
    // The same query as the page's KPIs, written for Discover.
    expect(esql).toBe(
      mobilePanelDiscoverEsql(
        { serviceName: 'shop-mobile', osName: 'iOS', release: '2.0.0' },
        { environment: 'production' }
      )
    );
    expect(esql).toContain('`service.name` == "shop-mobile"');
    expect(esql).toContain('`resource.attributes.os.name` == "iOS"');
    expect(esql).toContain('`service.version` == "2.0.0"');
    expect(esql).toContain('`service.environment` == "production"');
  });

  it('opens every event of the application without filters', () => {
    mockUrl();

    renderHook(() => useMobileDiscoverHref('shop-mobile'));

    const [esql] = jest.mocked(useDiscoverHref).mock.calls.at(-1) ?? [];
    expect(esql).toContain('`service.name` == "shop-mobile"');
    expect(esql).not.toContain('os.name` ==');
    expect(esql).not.toContain('service.version` ==');
  });

  it('follows a filter change, so it never opens the previous selection', () => {
    mockUrl({ osName: 'iOS' });
    const { rerender } = renderHook(() => useMobileDiscoverHref('shop-mobile'));

    mockUrl({ osName: 'Android' });
    rerender();

    const [esql] = jest.mocked(useDiscoverHref).mock.calls.at(-1) ?? [];
    expect(esql).toContain('`resource.attributes.os.name` == "Android"');
  });

  it('has no link without access to Discover', () => {
    mockUrl();
    jest.mocked(useDiscoverHref).mockReturnValue(undefined);

    expect(renderHook(() => useMobileDiscoverHref('shop-mobile')).result.current).toBeUndefined();
  });
});
