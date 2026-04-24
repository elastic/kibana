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
import { useOnboardingService } from '../../../../../hooks/use_onboarding_service';
import { IntegrationTabId } from '../../../../../../../common/lib/integrations/types';
import { useShowMigrationCallout } from './migrations_callout';

jest.mock('../../../../../hooks/use_onboarding_service', () => ({
  useOnboardingService: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  matchPath: jest.fn(),
  useLocation: jest.fn().mockReturnValue({
    pathname: '/test-path',
  }),
}));
jest.mock('./agentless_available_callout');
jest.mock('./active_integrations_callout');
jest.mock('./endpoint_callout');
jest.mock('./migrations_callout', () => ({
  MigrationsCallout: () => <div data-test-subj="migrationsCallout" />,
  useShowMigrationCallout: jest.fn(() => true),
}));

describe('IntegrationCardTopCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useShowMigrationCallout as jest.Mock).mockReturnValue(true);
  });

  test('renders EndpointCallout when endpoint tab selected and no integrations installed', async () => {
    (useOnboardingService as jest.Mock).mockReturnValue({
      isAgentlessAvailable$: of(true),
    });

    const { getByTestId } = render(
      <IntegrationCardTopCallout
        activeIntegrationsCount={0}
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
        activeIntegrationsCount={0}
        isAgentRequired={false}
        selectedTabId={IntegrationTabId.cloud}
      />
    );

    await waitFor(() => {
      expect(getByTestId('agentlessAvailableCallout')).toBeInTheDocument();
    });
  });

  test('renders InstalledIntegrationsCallout when there are active integrations', async () => {
    (useOnboardingService as jest.Mock).mockReturnValue({
      isAgentlessAvailable$: of(false),
    });

    const { getByTestId } = render(
      <IntegrationCardTopCallout
        activeIntegrationsCount={5}
        isAgentRequired={true}
        selectedTabId={IntegrationTabId.cloud}
      />
    );

    await waitFor(() => {
      expect(getByTestId('activeIntegrationsCallout')).toBeInTheDocument();
    });
  });

  test('does not render MigrationsCallout when visibility hook returns false', () => {
    (useOnboardingService as jest.Mock).mockReturnValue({
      isAgentlessAvailable$: of(false),
    });
    (useShowMigrationCallout as jest.Mock).mockReturnValue(false);

    const { queryByTestId } = render(
      <IntegrationCardTopCallout
        activeIntegrationsCount={0}
        isAgentRequired={false}
        selectedTabId={IntegrationTabId.cloud}
      />
    );

    expect(queryByTestId('migrationsCallout')).not.toBeInTheDocument();
  });
});
