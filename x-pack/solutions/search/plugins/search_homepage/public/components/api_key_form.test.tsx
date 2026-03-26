/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { Status, useSearchApiKey } from '@kbn/search-api-keys-components';

import { ApiKeyForm } from './api_key_form';
import { useKibana } from '../hooks/use_kibana';

// Mock the hooks
jest.mock('@kbn/search-api-keys-components', () => ({
  ...jest.requireActual('@kbn/search-api-keys-components'),
  useSearchApiKey: jest.fn(),
  ApiKeyFlyoutWrapper: () => null,
  Status: {
    showPreviewKey: 'showPreviewKey',
    showHiddenKey: 'showHiddenKey',
    showUserPrivilegesError: 'showUserPrivilegesError',
  },
}));

jest.mock('../hooks/use_kibana');

const mockUseSearchApiKey = useSearchApiKey as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </I18nProvider>
);

describe('ApiKeyForm', () => {
  const mockToggleApiKeyVisibility = jest.fn();
  const mockUpdateApiKey = jest.fn();

  const renderWithStatus = (status: Status) => {
    mockUseSearchApiKey.mockReturnValue({
      apiKey: 'test-api-key-123',
      status,
      toggleApiKeyVisibility: mockToggleApiKeyVisibility,
      updateApiKey: mockUpdateApiKey,
    });
    return render(
      <Wrapper>
        <ApiKeyForm />
      </Wrapper>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        share: {
          url: {
            locators: {
              get: () => ({
                useUrl: () => '',
              }),
            },
          },
        },
      },
    });
  });

  describe('accessibility', () => {
    it('should have aria-label "Show API key" when API key is hidden', () => {
      renderWithStatus(Status.showHiddenKey);

      const toggleButton = screen.getByTestId('searchHomepageShowAPIKeyButton');
      expect(toggleButton).toHaveAttribute('aria-label', 'Show API key');
    });

    it('should have aria-label "Hide API key" when API key is visible', () => {
      renderWithStatus(Status.showPreviewKey);

      const toggleButton = screen.getByTestId('searchHomepageShowAPIKeyButton');
      expect(toggleButton).toHaveAttribute('aria-label', 'Hide API key');
    });

    it('should update aria-label when toggling visibility', () => {
      const { rerender } = renderWithStatus(Status.showHiddenKey);

      const toggleButton = screen.getByTestId('searchHomepageShowAPIKeyButton');
      expect(toggleButton).toHaveAttribute('aria-label', 'Show API key');

      // Simulate clicking the toggle
      fireEvent.click(toggleButton);
      expect(mockToggleApiKeyVisibility).toHaveBeenCalled();

      // Simulate the status change after toggle
      mockUseSearchApiKey.mockReturnValue({
        apiKey: 'test-api-key-123',
        status: Status.showPreviewKey,
        toggleApiKeyVisibility: mockToggleApiKeyVisibility,
        updateApiKey: mockUpdateApiKey,
      });

      rerender(
        <Wrapper>
          <ApiKeyForm />
        </Wrapper>
      );

      const updatedToggleButton = screen.getByTestId('searchHomepageShowAPIKeyButton');
      expect(updatedToggleButton).toHaveAttribute('aria-label', 'Hide API key');
    });
  });

  describe('icon changes', () => {
    it('should show "eye" icon when API key is hidden', () => {
      renderWithStatus(Status.showHiddenKey);

      const toggleButton = screen.getByTestId('searchHomepageShowAPIKeyButton');
      expect(toggleButton.querySelector('[data-euiicon-type="eye"]')).toBeInTheDocument();
    });

    it('should show "eyeClosed" icon when API key is visible', () => {
      renderWithStatus(Status.showPreviewKey);

      const toggleButton = screen.getByTestId('searchHomepageShowAPIKeyButton');
      expect(toggleButton.querySelector('[data-euiicon-type="eyeClosed"]')).toBeInTheDocument();
    });
  });
});
