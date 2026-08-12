/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StaleEndpointPackageBanner } from './stale_endpoint_package_banner';

jest.mock('../../../../hooks/insights/use_fetch_endpoint_package_freshness', () => ({
  useFetchEndpointPackageFreshness: jest.fn(),
}));

const mockUseFetchEndpointPackageFreshness = jest.requireMock(
  '../../../../hooks/insights/use_fetch_endpoint_package_freshness'
).useFetchEndpointPackageFreshness;

const STORAGE_KEY_PREFIX =
  'securitySolution.endpointHosts.workflowInsightsAB.stalePackageBannerDismissed';

describe('StaleEndpointPackageBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders nothing while data is undefined', () => {
    mockUseFetchEndpointPackageFreshness.mockReturnValue({ data: undefined });
    const { container } = render(<StaleEndpointPackageBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when package is fresh', () => {
    mockUseFetchEndpointPackageFreshness.mockReturnValue({
      data: { installedVersion: '9.4.0', latestVersion: '9.4.0', stale: false },
    });
    const { container } = render(<StaleEndpointPackageBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the callout when package is stale', () => {
    mockUseFetchEndpointPackageFreshness.mockReturnValue({
      data: { installedVersion: '9.3.0', latestVersion: '9.4.0', stale: true },
    });
    render(<StaleEndpointPackageBanner />);
    expect(screen.getByText(/9\.3\.0/)).toBeInTheDocument();
    expect(screen.getByText(/9\.4\.0/)).toBeInTheDocument();
  });

  it('hides the callout and persists dismissal when closed', () => {
    mockUseFetchEndpointPackageFreshness.mockReturnValue({
      data: { installedVersion: '9.3.0', latestVersion: '9.4.0', stale: true },
    });
    render(<StaleEndpointPackageBanner />);

    fireEvent.click(screen.getByTestId('euiDismissCalloutButton'));

    expect(localStorage.getItem(`${STORAGE_KEY_PREFIX}.9.4.0`)).toBe('true');
    expect(screen.queryByText(/9\.3\.0/)).not.toBeInTheDocument();
  });

  it('renders nothing when storage indicates previously dismissed for this version', () => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}.9.4.0`, 'true');
    mockUseFetchEndpointPackageFreshness.mockReturnValue({
      data: { installedVersion: '9.3.0', latestVersion: '9.4.0', stale: true },
    });
    const { container } = render(<StaleEndpointPackageBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('re-shows when latestVersion changes to a version not yet dismissed', () => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}.9.4.0`, 'true');

    mockUseFetchEndpointPackageFreshness.mockReturnValue({
      data: { installedVersion: '9.3.0', latestVersion: '9.4.0', stale: true },
    });
    const { rerender } = render(<StaleEndpointPackageBanner />);
    expect(screen.queryByText(/9\.3\.0/)).not.toBeInTheDocument();

    mockUseFetchEndpointPackageFreshness.mockReturnValue({
      data: { installedVersion: '9.3.0', latestVersion: '9.5.0', stale: true },
    });
    rerender(<StaleEndpointPackageBanner />);
    expect(screen.getByText(/9\.5\.0/)).toBeInTheDocument();
  });
});
