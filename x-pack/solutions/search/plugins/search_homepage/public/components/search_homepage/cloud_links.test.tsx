/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { CloudLinks } from './cloud_links';
import { useKibana } from '../../hooks/use_kibana';

jest.mock('../../hooks/use_kibana');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const createCloudMock = (overrides: Record<string, unknown> = {}) => ({
  isCloudEnabled: true,
  baseUrl: 'https://cloud.elastic.co',
  organizationUrl: 'https://cloud.elastic.co/account/members',
  getPrivilegedUrls: jest.fn().mockResolvedValue({
    billingUrl: 'https://cloud.elastic.co/billing',
  }),
  ...overrides,
});

const setCloudMock = (cloud: Record<string, unknown> | undefined) => {
  mockUseKibana.mockReturnValue({ services: { cloud } } as unknown as ReturnType<typeof useKibana>);
};

const renderCloudLinks = () =>
  render(
    <EuiThemeProvider>
      <CloudLinks />
    </EuiThemeProvider>
  );

describe('CloudLinks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when cloud is undefined', () => {
    setCloudMock(undefined);
    const { container } = renderCloudLinks();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when cloud is not enabled', async () => {
    setCloudMock(createCloudMock({ isCloudEnabled: false }));
    const { container } = renderCloudLinks();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when baseUrl is missing', async () => {
    setCloudMock(createCloudMock({ baseUrl: undefined }));
    const { container } = renderCloudLinks();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders cloud logo and all links when cloud is enabled', async () => {
    setCloudMock(createCloudMock());
    const { getByTestId } = renderCloudLinks();

    await waitFor(() => {
      expect(getByTestId('searchHomepageCloudLink-home')).toBeInTheDocument();
      expect(getByTestId('searchHomepageCloudLink-elasticCloud')).toBeInTheDocument();
      expect(getByTestId('searchHomepageCloudLink-usage')).toBeInTheDocument();
      expect(getByTestId('searchHomepageCloudLink-organization')).toBeInTheDocument();
    });
  });

  it('uses URLs directly from cloud object and getPrivilegedUrls', async () => {
    setCloudMock(createCloudMock());
    const { getByTestId } = renderCloudLinks();

    await waitFor(() => {
      expect(getByTestId('searchHomepageCloudLink-home')).toHaveAttribute(
        'href',
        'https://cloud.elastic.co'
      );
      expect(getByTestId('searchHomepageCloudLink-elasticCloud')).toHaveAttribute(
        'href',
        'https://cloud.elastic.co'
      );
      expect(getByTestId('searchHomepageCloudLink-organization')).toHaveAttribute(
        'href',
        'https://cloud.elastic.co/account/members'
      );
    });

    await waitFor(() => {
      expect(getByTestId('searchHomepageCloudLink-usage')).toHaveAttribute(
        'href',
        'https://cloud.elastic.co/billing'
      );
    });
  });

  it('does not render usage link when user lacks billing access', async () => {
    const mock = createCloudMock({
      getPrivilegedUrls: jest.fn().mockResolvedValue({}),
    });
    setCloudMock(mock);
    const { queryByTestId } = renderCloudLinks();

    await waitFor(() => {
      expect(mock.getPrivilegedUrls).toHaveBeenCalled();
    });

    expect(queryByTestId('searchHomepageCloudLink-usage')).not.toBeInTheDocument();
  });

  it('does not render usage link when getPrivilegedUrls rejects', async () => {
    const mock = createCloudMock({
      getPrivilegedUrls: jest.fn().mockRejectedValue(new Error('forbidden')),
    });
    setCloudMock(mock);
    const { queryByTestId } = renderCloudLinks();

    await waitFor(() => {
      expect(mock.getPrivilegedUrls).toHaveBeenCalled();
    });

    expect(queryByTestId('searchHomepageCloudLink-usage')).not.toBeInTheDocument();
  });

  it('opens links in a new tab', async () => {
    setCloudMock(createCloudMock());
    const { getByTestId } = renderCloudLinks();

    await waitFor(() => {
      expect(getByTestId('searchHomepageCloudLink-usage')).toBeInTheDocument();
    });

    expect(getByTestId('searchHomepageCloudLink-home')).toHaveAttribute('target', '_blank');
    expect(getByTestId('searchHomepageCloudLink-elasticCloud')).toHaveAttribute('target', '_blank');
    expect(getByTestId('searchHomepageCloudLink-organization')).toHaveAttribute('target', '_blank');
    expect(getByTestId('searchHomepageCloudLink-usage')).toHaveAttribute('target', '_blank');
  });
});
