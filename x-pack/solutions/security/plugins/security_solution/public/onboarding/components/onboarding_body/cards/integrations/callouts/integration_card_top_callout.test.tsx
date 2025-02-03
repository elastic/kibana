/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { of } from 'rxjs';
import { IntegrationCardTopCallout } from './integration_card_top_callout';
import { useOnboardingService } from '../../../../hooks/use_onboarding_service';
import { IntegrationTabId } from '../types';

jest.mock('../../../../hooks/use_onboarding_service', () => ({
  useOnboardingService: jest.fn(),
}));

jest.mock('./agentless_available_callout');
jest.mock('./installed_integrations_callout');
jest.mock('./endpoint_callout');

describe('IntegrationCardTopCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders EndpointCallout when endpoint tab selected and no integrations installed', async () => {
    (useOnboardingService as jest.Mock).mockReturnValue({
      isAgentlessAvailable$: of(true),
    });

    const { getByTestId } = render(
      <IntegrationCardTopCallout
        installedIntegrationsCount={0}
        isAgentRequired={false}
        selectedTabId={IntegrationTabId.endpoint}
      />
    );

    await waitFor(() => {
      expect(getByTestId('endpointCallout')).toBeInTheDocument();
    });
  });

  test('renders AgentlessAvailableCallout when agentless is available and no integrations installed', async () => {
    (useOnboardingService as jest.Mock).mockReturnValue({
      isAgentlessAvailable$: of(true),
    });

    const { getByTestId } = render(
      <IntegrationCardTopCallout
        installedIntegrationsCount={0}
        isAgentRequired={false}
        selectedTabId={IntegrationTabId.cloud}
      />
    );

    await waitFor(() => {
      expect(getByTestId('agentlessAvailableCallout')).toBeInTheDocument();
    });
  });

  test('renders InstalledIntegrationsCallout when there are installed integrations', async () => {
    (useOnboardingService as jest.Mock).mockReturnValue({
      isAgentlessAvailable$: of(false),
    });

    const { getByTestId } = render(
      <IntegrationCardTopCallout
        installedIntegrationsCount={5}
        isAgentRequired={true}
        selectedTabId={IntegrationTabId.cloud}
      />
    );

    await waitFor(() => {
      expect(getByTestId('installedIntegrationsCallout')).toBeInTheDocument();
    });
  });
});
