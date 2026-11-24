/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { digitalExperienceRouter } from '../routes';
import { useApplicationLinks } from './use_application_links';
import { useDigitalExperienceParams } from './use_digital_experience_params';
import { useDigitalExperienceRouter } from './use_digital_experience_router';
import { useKibanaServices } from './use_kibana_services';
import { useListQuery } from './use_list_query';
import { useSharedFilters } from './use_shared_filters';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(),
}));
jest.mock('./use_digital_experience_params');
jest.mock('./use_digital_experience_router');
jest.mock('./use_kibana_services');
jest.mock('./use_list_query');
jest.mock('./use_shared_filters', () => ({
  ...jest.requireActual('./use_shared_filters'),
  useSharedFilters: jest.fn(),
}));

const mockSearch = (search: string) =>
  jest.mocked(useLocation).mockReturnValue({
    search,
    pathname: '/shop-mobile',
    hash: '',
    state: undefined,
    key: '',
  });

beforeEach(() => {
  jest.mocked(useKibanaServices).mockReturnValue({
    application: {
      getUrlForApp: (appId: string, { path }: { path: string }) => `/app/${appId}${path}`,
    },
  } as unknown as ReturnType<typeof useKibanaServices>);
  jest.mocked(useDigitalExperienceRouter).mockReturnValue(digitalExperienceRouter);
  jest.mocked(useListQuery).mockReturnValue({ rangeFrom: 'now-15m', rangeTo: 'now' });
  jest.mocked(useSharedFilters).mockReturnValue({});
  jest.mocked(useDigitalExperienceParams).mockReturnValue({
    query: {},
  } as unknown as ReturnType<typeof useDigitalExperienceParams>);
});

const mockRouteQuery = (query: Record<string, string>) =>
  jest.mocked(useDigitalExperienceParams).mockReturnValue({
    query,
  } as unknown as ReturnType<typeof useDigitalExperienceParams>);

describe('useApplicationLinks', () => {
  it("keeps a mobile application's type, OS and release, as the route validated them", () => {
    jest
      .mocked(useListQuery)
      .mockReturnValue({ rangeFrom: 'now-15m', rangeTo: 'now', applicationType: 'mobile' });
    mockSearch('?source=otel&applicationType=mobile&osName=iOS&release=2.0.0');
    mockRouteQuery({ source: 'otel', applicationType: 'mobile', osName: 'iOS', release: '2.0.0' });

    const { result } = renderHook(() => useApplicationLinks('shop-mobile', 'otel'));

    expect(result.current.overviewHref).toBe(
      '/app/digital_experience/shop-mobile?applicationType=mobile&osName=iOS&rangeFrom=now-15m&rangeTo=now&release=2.0.0&source=otel'
    );
  });

  it("keeps a mobile application's Compare, so its breadcrumb and tab lead back to it", () => {
    jest
      .mocked(useListQuery)
      .mockReturnValue({ rangeFrom: 'now-15m', rangeTo: 'now', applicationType: 'mobile' });
    mockSearch('?source=otel&applicationType=mobile&compare=true');
    mockRouteQuery({ source: 'otel', applicationType: 'mobile', compare: 'true' });

    const { result } = renderHook(() => useApplicationLinks('shop-mobile', 'otel'));

    expect(
      new URL(result.current.overviewHref, 'http://localhost').searchParams.get('compare')
    ).toBe('true');
  });

  it('leaves the OS and release out of the links of a web application', () => {
    mockSearch('?source=otel&osName=iOS&release=2.0.0&compare=true');
    mockRouteQuery({ source: 'otel', osName: 'iOS', release: '2.0.0', compare: 'true' });

    const { result } = renderHook(() => useApplicationLinks('shop', 'otel'));

    expect(result.current.overviewHref).not.toContain('osName=');
    expect(result.current.overviewHref).not.toContain('release=');
    expect(result.current.overviewHref).not.toContain('compare=');
  });
});
