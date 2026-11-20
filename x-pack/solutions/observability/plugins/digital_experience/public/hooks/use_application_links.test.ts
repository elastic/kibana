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

describe('useApplicationLinks', () => {
  it("keeps the mobile page's platform and release in its Overview link", () => {
    mockSearch('?source=mobile&platform=ios&release=2.0.0');

    const { result } = renderHook(() => useApplicationLinks('shop-mobile', 'mobile'));

    expect(result.current.overviewHref).toBe(
      '/app/digital_experience/shop-mobile?platform=ios&rangeFrom=now-15m&rangeTo=now&release=2.0.0&source=mobile'
    );
  });

  it('leaves out an invalid platform, and the mobile filters of a web application', () => {
    mockSearch('?platform=windows&release=2.0.0');

    const mobile = renderHook(() => useApplicationLinks('shop-mobile', 'mobile'));
    const web = renderHook(() => useApplicationLinks('shop', 'otel'));

    expect(mobile.result.current.overviewHref).not.toContain('platform=');
    expect(web.result.current.overviewHref).not.toContain('release=');
  });
});
