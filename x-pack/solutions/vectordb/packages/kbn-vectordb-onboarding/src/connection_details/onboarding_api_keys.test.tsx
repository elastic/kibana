/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { OnboardingApiKeys } from './onboarding_api_keys';
import type { OnboardingServices } from '../services';

const mockOpenWiredConnectionDetails = jest.fn();
jest.mock('@kbn/cloud/connection_details', () => ({
  openWiredConnectionDetails: (...args: unknown[]) => mockOpenWiredConnectionDetails(...args),
}));

const mockCopy = jest.fn();
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiCopy: jest.fn(({ children }) => children(mockCopy)),
}));

const services = {
  notifications: { toasts: { addDanger: jest.fn() } },
  application: { navigateToApp: jest.fn() },
} as unknown as OnboardingServices;

const renderComponent = (props: Partial<React.ComponentProps<typeof OnboardingApiKeys>> = {}) =>
  render(
    <KibanaContextProvider services={services}>
      <OnboardingApiKeys apiKey={null} isLoading={false} telemetryPage="testPage" {...props} />
    </KibanaContextProvider>
  );

describe('OnboardingApiKeys', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenWiredConnectionDetails.mockResolvedValue(undefined);
  });

  describe('when an API key exists', () => {
    it('renders the copy variant of the primary action', () => {
      const { container } = renderComponent({ apiKey: 'test-api-key' });

      const primaryButton = container.querySelector(
        '[data-test-subj="vectordbPathSelectionCopyApiKey"]'
      );

      expect(primaryButton).toBeInTheDocument();
      expect(primaryButton).toHaveAttribute(
        'data-telemetry-id',
        'vectordbOnboarding-testPage-copyApiKey'
      );
      expect(
        container.querySelector('[data-test-subj="vectordbPathSelectionGenerateApiKey"]')
      ).not.toBeInTheDocument();
    });

    it('copies the API key when the primary action is clicked', () => {
      const { container } = renderComponent({ apiKey: 'test-api-key' });

      fireEvent.click(
        container.querySelector('[data-test-subj="vectordbPathSelectionCopyApiKey"]')!
      );

      expect(mockCopy).toHaveBeenCalled();
    });
  });

  describe('when no API key exists', () => {
    it('renders the generate variant of the primary action', () => {
      const { container } = renderComponent({ apiKey: null });

      const primaryButton = container.querySelector(
        '[data-test-subj="vectordbPathSelectionGenerateApiKey"]'
      );

      expect(primaryButton).toBeInTheDocument();
      expect(primaryButton).toHaveAttribute(
        'data-telemetry-id',
        'vectordbOnboarding-testPage-generateApiKey'
      );
      expect(
        container.querySelector('[data-test-subj="vectordbPathSelectionCopyApiKey"]')
      ).not.toBeInTheDocument();
    });

    it('opens the connection details on the API keys tab when clicked', () => {
      const { container } = renderComponent({ apiKey: null });

      fireEvent.click(
        container.querySelector('[data-test-subj="vectordbPathSelectionGenerateApiKey"]')!
      );

      expect(mockOpenWiredConnectionDetails).toHaveBeenCalledWith({
        props: { options: { defaultTabId: 'apiKeys' } },
      });
    });
  });

  describe('options popover', () => {
    const openPopover = (container: HTMLElement) =>
      fireEvent.click(
        container.querySelector('[data-test-subj="vectordbPathSelectionApiKeyDropdown"]')!
      );

    it('opens the options popover from the secondary action', () => {
      const { container } = renderComponent({ apiKey: 'test-api-key' });

      expect(screen.queryByText('Manage API keys')).not.toBeInTheDocument();

      openPopover(container);

      expect(screen.getByText('Manage API keys')).toBeInTheDocument();
      expect(screen.getByText('Connection details')).toBeInTheDocument();
    });

    it('navigates to the management app when "Manage API keys" is clicked', () => {
      const { container } = renderComponent({ apiKey: 'test-api-key' });
      openPopover(container);

      fireEvent.click(screen.getByTestId('vectordbPathSelectionManageApiKeys'));

      expect(services.application.navigateToApp).toHaveBeenCalledWith('management', {
        path: 'security/api_keys',
      });
    });

    it('opens the connection details on the endpoints tab when "Connection details" is clicked', () => {
      const { container } = renderComponent({ apiKey: 'test-api-key' });
      openPopover(container);

      fireEvent.click(screen.getByTestId('vectordbPathSelectionConnectionDetails'));

      expect(mockOpenWiredConnectionDetails).toHaveBeenCalledWith({
        props: { options: { defaultTabId: 'endpoints' } },
      });
    });
  });
});
