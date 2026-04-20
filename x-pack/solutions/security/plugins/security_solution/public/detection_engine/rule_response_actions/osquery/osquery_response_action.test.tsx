/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { OsqueryResponseAction } from './osquery_response_action';
import { ProductFeatureKey } from '@kbn/security-solution-features/keys';
import * as useUpsellingModule from '../../../common/hooks/use_upselling';
import type { ArrayItem } from '../../../shared_imports';

// Mock useKibana with configurable osquery service
const mockFetchInstallationStatus = jest.fn();
const mockCapabilities = {
  osquery: {
    writeLiveQueries: true,
    runSavedQueries: true,
    readSavedQueries: true,
    readPacks: true,
  },
};

jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      osquery: {
        fetchInstallationStatus: mockFetchInstallationStatus,
        LiveQueryField: jest.fn(() => null),
      },
      application: {
        capabilities: mockCapabilities,
      },
    },
  }),
}));

// Mock useIsMounted to always return true
jest.mock('@kbn/securitysolution-hook-utils', () => ({
  useIsMounted: () => () => true,
}));

// Mock shared_imports to avoid form context dependency
jest.mock('../../../shared_imports', () => ({
  UseField: ({ component: Component }: { component: React.ComponentType }) =>
    Component ? <Component /> : null,
}));

// Mock the form field to avoid deep osquery plugin dependencies
jest.mock('./osquery_response_action_form_field', () => ({
  ResponseActionFormField: () => <div data-test-subj="osquery-response-action-form" />,
}));

const useUpsellingComponentSpy = jest.spyOn(useUpsellingModule, 'useUpsellingComponent');

const mockItem: ArrayItem = {
  id: 0,
  path: 'responseActions[0]',
  isNew: false,
};

const renderComponent = () =>
  render(
    <IntlProvider locale="en">
      <OsqueryResponseAction item={mockItem} />
    </IntlProvider>
  );

describe('OsqueryResponseAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchInstallationStatus.mockReturnValue({ disabled: false, permissionDenied: false });
    useUpsellingComponentSpy.mockReturnValue(null);
  });

  describe('tier gating', () => {
    it('renders the osquery form when user has Complete tier (no upselling)', () => {
      useUpsellingComponentSpy.mockReturnValue(null);

      renderComponent();

      expect(screen.getByTestId('osquery-response-action-form')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-upselling')).not.toBeInTheDocument();
    });

    it('renders upselling component when user lacks Complete tier', () => {
      const MockUpselling = () => (
        <div data-test-subj="mock-upselling">{'Upgrade to Endpoint Complete'}</div>
      );
      useUpsellingComponentSpy.mockReturnValue(MockUpselling);

      renderComponent();

      expect(screen.getByTestId('mock-upselling')).toBeInTheDocument();
      expect(screen.getByText('Upgrade to Endpoint Complete')).toBeInTheDocument();
      expect(screen.queryByTestId('osquery-response-action-form')).not.toBeInTheDocument();
    });

    it('calls useUpsellingComponent with osqueryAutomatedResponseActions key', () => {
      renderComponent();

      expect(useUpsellingComponentSpy).toHaveBeenCalledWith(
        ProductFeatureKey.osqueryAutomatedResponseActions
      );
    });
  });

  describe('permission denied', () => {
    it('renders permission denied when osquery reports permissionDenied', () => {
      mockFetchInstallationStatus.mockReturnValue({ disabled: false, permissionDenied: true });

      renderComponent();

      expect(screen.getByText('Permission denied')).toBeInTheDocument();
      expect(screen.queryByTestId('osquery-response-action-form')).not.toBeInTheDocument();
    });
  });

  describe('osquery not available', () => {
    it('renders not available prompt when osquery is disabled', () => {
      mockFetchInstallationStatus.mockReturnValue({ disabled: true, permissionDenied: false });

      renderComponent();

      expect(screen.getByText('Osquery is not available')).toBeInTheDocument();
      expect(screen.queryByTestId('osquery-response-action-form')).not.toBeInTheDocument();
    });
  });
});
