/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { useAssetDetailsRedirect } from './use_asset_details_redirect';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(() => ({
    pathname: '',
    search: '',
  })),
}));

const MOCK_HREF = '/app/r?l=ASSET_DETAILS_LOCATOR&v=8.15.0&lz=MoCkLoCaToRvAlUe';
const coreStartMock = coreMock.createStart();
const shareMock = sharePluginMock.createSetupContract();

// @ts-expect-error This object is missing some properties that we're not using in the UI
shareMock.url.locators.get = (id: string) => ({
  getRedirectUrl: (params: Record<string, any>): string | undefined => MOCK_HREF,
  navigate: () => {},
});

const wrapper = ({ children }: { children: React.ReactNode }): JSX.Element => (
  <KibanaContextProvider services={{ ...coreStartMock, share: shareMock }}>
    {children}
  </KibanaContextProvider>
);

describe('useNodeDetailsRedirect', () => {
  it('should return the LinkProperties for assetType pod', () => {
    const { result } = renderHook(() => useAssetDetailsRedirect(), { wrapper });

    const fromDateStrig = '2019-01-01T11:00:00Z';
    const toDateStrig = '2019-01-01T12:00:00Z';

    const getLinkProps = result.current.getAssetDetailUrl({
      assetType: 'pod',
      assetId: 'example-01',
      search: {
        from: new Date(fromDateStrig).getTime(),
        to: new Date(toDateStrig).getTime(),
      },
    });

    expect(getLinkProps).toHaveProperty('href');
    expect(getLinkProps.href).toEqual(MOCK_HREF);
    expect(getLinkProps).toHaveProperty('onClick');
  });

  it('should return the LinkProperties for assetType host', () => {
    const { result } = renderHook(() => useAssetDetailsRedirect(), { wrapper });

    const fromDateStrig = '2019-01-01T11:00:00Z';
    const toDateStrig = '2019-01-01T12:00:00Z';

    const getLinkProps = result.current.getAssetDetailUrl({
      assetType: 'host',
      assetId: 'example-01',
      search: {
        from: new Date(fromDateStrig).getTime(),
        to: new Date(toDateStrig).getTime(),
        name: 'example-01',
      },
    });

    expect(getLinkProps).toHaveProperty('href');
    expect(getLinkProps.href).toEqual(MOCK_HREF);
    expect(getLinkProps).toHaveProperty('onClick');
  });
});
