/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '../hooks/use_kibana';
import { OnboardingEnableStep } from './enable_step';

jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.Mock;

const setup = ({ canManage = true }: { canManage?: boolean } = {}) => {
  const fetch = jest.fn().mockResolvedValue({ agent_installed: true });
  const addSuccess = jest.fn();
  mockUseKibana.mockReturnValue({
    services: {
      notifications: { toasts: { addSuccess, addError: jest.fn() } },
      application: {
        capabilities: { nightshift: { show: true, manage: canManage, configure: canManage } },
      },
      nightshiftInvestigations: { investigationsClient: { fetch } },
    },
  });
  const queryClient = new QueryClient();
  render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <OnboardingEnableStep />
      </QueryClientProvider>
    </I18nProvider>
  );
  return { fetch, addSuccess };
};

describe('OnboardingEnableStep', () => {
  it('installs the investigation agent in the space and confirms with a toast', async () => {
    const { fetch, addSuccess } = setup();

    expect(screen.getByTestId('nightshiftOnboardingEnableStep')).toHaveTextContent(
      'installs its investigation agent in this space'
    );
    fireEvent.click(screen.getByTestId('nightshiftOnboardingEnableButton'));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        'POST /internal/nightshift/onboarding/enable',
        expect.anything()
      )
    );
    await waitFor(() =>
      expect(addSuccess).toHaveBeenCalledWith({ title: 'Elastic Nightshift enabled' })
    );
  });

  it('asks for an administrator when the user cannot manage Nightshift', () => {
    setup({ canManage: false });

    expect(screen.getByTestId('nightshiftOnboardingEnableStep')).toHaveTextContent(
      'Ask them to turn it on'
    );
    expect(screen.getByTestId('nightshiftOnboardingEnableButton')).toBeDisabled();
  });
});
