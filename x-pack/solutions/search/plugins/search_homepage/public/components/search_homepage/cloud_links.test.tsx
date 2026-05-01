/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { CloudLinks } from './cloud_links';
import { useKibana } from '../../hooks/use_kibana';

jest.mock('../../hooks/use_kibana');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const createCloudMock = (overrides: Record<string, unknown> = {}) => ({
  isCloudEnabled: true,
  baseUrl: 'https://cloud.elastic.co',
  ...overrides,
});

const setCloudMock = (cloud: Record<string, unknown> | undefined) => {
  mockUseKibana.mockReturnValue({ services: { cloud } } as unknown as ReturnType<typeof useKibana>);
};

describe('CloudLinks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when cloud is undefined', () => {
    setCloudMock(undefined);
    const { container } = render(<CloudLinks />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when cloud is not enabled', () => {
    setCloudMock(createCloudMock({ isCloudEnabled: false }));
    const { container } = render(<CloudLinks />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when baseUrl is missing', () => {
    setCloudMock(createCloudMock({ baseUrl: undefined }));
    const { container } = render(<CloudLinks />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders cloud logo and all links when cloud is enabled', () => {
    setCloudMock(createCloudMock());
    const { getByTestId } = render(<CloudLinks />);

    expect(getByTestId('searchHomepageCloudLink-home')).toBeInTheDocument();
    expect(getByTestId('searchHomepageCloudLink-elasticCloud')).toBeInTheDocument();
    expect(getByTestId('searchHomepageCloudLink-usage')).toBeInTheDocument();
    expect(getByTestId('searchHomepageCloudLink-organization')).toBeInTheDocument();
  });

  it('constructs correct hrefs from baseUrl', () => {
    setCloudMock(createCloudMock({ baseUrl: 'https://cloud.elastic.co/' }));
    const { getByTestId } = render(<CloudLinks />);

    expect(getByTestId('searchHomepageCloudLink-home')).toHaveAttribute(
      'href',
      'https://cloud.elastic.co/home'
    );
    expect(getByTestId('searchHomepageCloudLink-elasticCloud')).toHaveAttribute(
      'href',
      'https://cloud.elastic.co/home'
    );
    expect(getByTestId('searchHomepageCloudLink-usage')).toHaveAttribute(
      'href',
      'https://cloud.elastic.co/billing/usage'
    );
    expect(getByTestId('searchHomepageCloudLink-organization')).toHaveAttribute(
      'href',
      'https://cloud.elastic.co/account/members'
    );
  });

  it('opens links in a new tab', () => {
    setCloudMock(createCloudMock());
    const { getByTestId } = render(<CloudLinks />);

    expect(getByTestId('searchHomepageCloudLink-home')).toHaveAttribute('target', '_blank');
    expect(getByTestId('searchHomepageCloudLink-elasticCloud')).toHaveAttribute('target', '_blank');
    expect(getByTestId('searchHomepageCloudLink-usage')).toHaveAttribute('target', '_blank');
    expect(getByTestId('searchHomepageCloudLink-organization')).toHaveAttribute('target', '_blank');
  });

  it('strips trailing slash from baseUrl', () => {
    setCloudMock(createCloudMock({ baseUrl: 'https://cloud.elastic.co/' }));
    const { getByTestId } = render(<CloudLinks />);

    expect(getByTestId('searchHomepageCloudLink-usage')).toHaveAttribute(
      'href',
      'https://cloud.elastic.co/billing/usage'
    );
  });
});
