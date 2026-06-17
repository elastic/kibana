/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { OBSERVABILITY_ONBOARDING_APP_ID } from '@kbn/deeplinks-observability';
import type { ObservabilityOnboardingAppServices } from '..';
import { AwsIntegrationRedirect } from './aws_integration_redirect';

jest.mock('@kbn/kibana-react-plugin/public');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const setup = () => {
  const get = jest.fn().mockResolvedValue({ item: { version: '0.2.1' } });
  const navigateToApp = jest.fn();
  const getUrlForApp = jest.fn(() => '/app/observabilityOnboarding?category=cloud');

  mockUseKibana.mockReturnValue({
    services: {
      http: { get },
      application: { navigateToApp, getUrlForApp },
    },
  } as unknown as ReturnType<typeof useKibana<ObservabilityOnboardingAppServices>>);

  return { get, navigateToApp, getUrlForApp };
};

describe('AwsIntegrationRedirect', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves the package version and redirects to the Fleet add-integration page with back-link state', async () => {
    const { get, navigateToApp, getUrlForApp } = setup();

    render(<AwsIntegrationRedirect />);

    expect(screen.getByTestId('awsIntegrationRedirectLoading')).toBeInTheDocument();

    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));

    expect(get).toHaveBeenCalledWith('/api/fleet/epm/packages/aws_cloudwatch_input_otel', {
      query: { prerelease: true },
    });

    expect(getUrlForApp).toHaveBeenCalledWith(OBSERVABILITY_ONBOARDING_APP_ID, {
      path: '?category=cloud',
    });

    await waitFor(() =>
      expect(navigateToApp).toHaveBeenCalledWith('fleet', {
        path: '/integrations/aws_cloudwatch_input_otel-0.2.1/add-integration',
        state: {
          onCancelNavigateTo: ['observabilityOnboarding', { path: '?category=cloud' }],
          onCancelUrl: '/app/observabilityOnboarding?category=cloud',
        },
        replace: true,
      })
    );
  });

  it('falls back to the Fleet integrations list when version resolution fails', async () => {
    const { get, navigateToApp } = setup();
    get.mockRejectedValueOnce(new Error('boom'));

    render(<AwsIntegrationRedirect />);

    await waitFor(() =>
      expect(navigateToApp).toHaveBeenCalledWith('integrations', { replace: true })
    );
  });

  it('falls back to the Fleet integrations list when the package version is missing or empty', async () => {
    const { get, navigateToApp } = setup();
    get.mockResolvedValueOnce({ item: { version: '' } });

    render(<AwsIntegrationRedirect />);

    await waitFor(() =>
      expect(navigateToApp).toHaveBeenCalledWith('integrations', { replace: true })
    );
    expect(navigateToApp).not.toHaveBeenCalledWith(
      'fleet',
      expect.objectContaining({ path: expect.stringContaining('add-integration') })
    );
  });
});
