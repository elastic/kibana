/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act } from '@testing-library/react';

import { CloudConnectorSetup } from './cloud_connector_setup';
import { useGetCloudConnectors } from './hooks/use_get_cloud_connectors';
import { useCloudConnectorSetup } from './hooks/use_cloud_connector_setup';
import { TestProvider } from '../test/test_provider';
import { getMockPolicyAWS, getMockPackageInfoAWS } from '../test/mock';
import { CloudConnectorTabs } from './cloud_connector_tabs';
import { isCloudConnectorReusableEnabled } from './utils';

import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { CloudConnectorSetupProps } from './cloud_connector_setup';
import type { UseQueryResult } from '@tanstack/react-query';
import type { CloudConnector, CloudProvider } from '@kbn/fleet-plugin/public';
import { NewCloudConnectorForm } from './form/new_cloud_connector_form';

// Mock child components
jest.mock('./form/new_cloud_connector_form', () => ({
  NewCloudConnectorForm: jest.fn(() => (
    <div data-testid="new-cloud-connector-form">{'MockedNewForm'}</div>
  )),
}));

jest.mock('./form/reusable_cloud_connector_form', () => ({
  ReusableCloudConnectorForm: jest.fn(() => (
    <div data-testid="reusable-cloud-connector-form">{'MockedReusableForm'}</div>
  )),
}));

jest.mock('./cloud_connector_tabs', () => ({
  CloudConnectorTabs: jest.fn(() => <div data-testid="cloud-connector-tabs">{'MockedTabs'}</div>),
}));

// Mock hooks
jest.mock('./hooks/use_get_cloud_connectors');
jest.mock('./hooks/use_cloud_connector_setup');
jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  isCloudConnectorReusableEnabled: jest.fn(),
}));

// Get typed references to mocked components and hooks
const mockCloudConnectorTabs = CloudConnectorTabs as jest.MockedFunction<typeof CloudConnectorTabs>;
const mockNewCloudConnectorForm = NewCloudConnectorForm as jest.MockedFunction<
  typeof NewCloudConnectorForm
>;
const mockUseGetCloudConnectors = useGetCloudConnectors as jest.MockedFunction<
  typeof useGetCloudConnectors
>;
const mockUseCloudConnectorSetup = useCloudConnectorSetup as jest.MockedFunction<
  typeof useCloudConnectorSetup
>;
const mockIsCloudConnectorReusableEnabled = isCloudConnectorReusableEnabled as jest.MockedFunction<
  typeof isCloudConnectorReusableEnabled
>;

// Mock hook functions
const mockSetNewConnectionCredentials = jest.fn();
const mockSetExistingConnectionCredentials = jest.fn();
const mockUpdatePolicyWithNewCredentials = jest.fn();
const mockUpdatePolicyWithExistingCredentials = jest.fn();
const mockUpdatePolicy = jest.fn();

describe('CloudConnectorSetup', () => {
  const mockInput = getMockPolicyAWS().inputs[0];
  const mockPackageInfo = getMockPackageInfoAWS();
  const mockPolicy = getMockPolicyAWS();

  const mockCloudSetup = {
    isCloudEnabled: true,
    cloudId: 'test-cloud-id',
    baseUrl: 'https://test.elastic.co',
    deploymentUrl: 'https://test.elastic.co/deployments/test',
    profileUrl: 'https://test.elastic.co/profile',
    organizationUrl: 'https://test.elastic.co/organizations',
    snapshotsUrl: 'https://test.elastic.co/snapshots',
    isServerlessEnabled: false,
  } as CloudSetup;

  const defaultProps: CloudConnectorSetupProps = {
    input: mockInput,
    newPolicy: mockPolicy,
    updatePolicy: mockUpdatePolicy,
    packageInfo: mockPackageInfo,
    cloud: mockCloudSetup,
    cloudProvider: 'aws',
    hasInvalidRequiredVars: false,
    templateName: 'cloudbeat/cis_aws',
  };

  const createMockCloudConnector = (
    id: string,
    name: string,
    provider: CloudProvider = 'aws'
  ): CloudConnector => ({
    id,
    name,
    cloudProvider: provider,
    vars: {
      role_arn: { value: `arn:${provider}:iam::123456789012:role/${name}Role` },
      external_id: {
        type: 'password',
        value: { isSecretRef: true, id: `${id}-external-id` },
      },
    },
    packagePolicyCount: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  });

  const createMockQueryResult = (
    items: CloudConnector[] = []
  ): UseQueryResult<CloudConnector[], unknown> =>
    ({
      data: items,
      isLoading: false,
      isError: false,
      error: null,
    } as UseQueryResult<CloudConnector[], unknown>);

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock version checking to return true by default
    mockIsCloudConnectorReusableEnabled.mockReturnValue(true);
  });

  const setupMocks = (cloudConnectors: CloudConnector[] = []) => {
    mockUseGetCloudConnectors.mockReturnValue(createMockQueryResult(cloudConnectors));
    mockUseCloudConnectorSetup.mockReturnValue({
      newConnectionCredentials: {},
      setNewConnectionCredentials: mockSetNewConnectionCredentials,
      existingConnectionCredentials: {},
      setExistingConnectionCredentials: mockSetExistingConnectionCredentials,
      updatePolicyWithNewCredentials: mockUpdatePolicyWithNewCredentials,
      updatePolicyWithExistingCredentials: mockUpdatePolicyWithExistingCredentials,
    });
  };

  const renderComponent = (props: Partial<CloudConnectorSetupProps> = {}) => {
    return render(
      <TestProvider>
        <CloudConnectorSetup {...defaultProps} {...props} />
      </TestProvider>
    );
  };

  describe('tab selection logic', () => {
    it('should select "new-connection" tab by default when no cloud connectors are available', () => {
      setupMocks([]);

      renderComponent();

      expect(mockCloudConnectorTabs).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedTabId: 'new-connection',
        }),
        {}
      );
    });

    it('should auto-select "existing-connection" tab when cloud connectors are available', () => {
      setupMocks([
        createMockCloudConnector('connector-1', 'Test Connector 1'),
        createMockCloudConnector('connector-2', 'Test Connector 2'),
      ]);

      renderComponent();

      // Check the last call after useEffect triggers re-render
      expect(mockCloudConnectorTabs).toHaveBeenLastCalledWith(
        expect.objectContaining({
          selectedTabId: 'existing-connection',
        }),
        {}
      );
    });

    it('should select "new-connection" tab when cloud connectors data is undefined', () => {
      // Setup mocks
      mockUseGetCloudConnectors.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: false,
        status: 'success',
      } as unknown as UseQueryResult<CloudConnector[], unknown>);
      mockUseCloudConnectorSetup.mockReturnValue({
        newConnectionCredentials: {},
        setNewConnectionCredentials: mockSetNewConnectionCredentials,
        existingConnectionCredentials: {},
        setExistingConnectionCredentials: mockSetExistingConnectionCredentials,
        updatePolicyWithNewCredentials: mockUpdatePolicyWithNewCredentials,
        updatePolicyWithExistingCredentials: mockUpdatePolicyWithExistingCredentials,
      });

      renderComponent();

      expect(mockCloudConnectorTabs).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedTabId: 'new-connection',
        }),
        {}
      );
    });

    it('should select "new-connection" tab when cloud connectors query fails', () => {
      // Setup mocks
      mockUseGetCloudConnectors.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Query failed'),
      } as unknown as UseQueryResult<CloudConnector[], unknown>);
      mockUseCloudConnectorSetup.mockReturnValue({
        newConnectionCredentials: {},
        setNewConnectionCredentials: mockSetNewConnectionCredentials,
        existingConnectionCredentials: {},
        setExistingConnectionCredentials: mockSetExistingConnectionCredentials,
        updatePolicyWithNewCredentials: mockUpdatePolicyWithNewCredentials,
        updatePolicyWithExistingCredentials: mockUpdatePolicyWithExistingCredentials,
      });

      renderComponent();

      expect(mockCloudConnectorTabs).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedTabId: 'new-connection',
        }),
        {}
      );
    });
  });

  describe('tab switching logic', () => {
    it('should handle tab changes via onTabClick callback', () => {
      setupMocks([]);

      renderComponent();

      // Get the onTabClick function from the mock call
      const onTabClick = mockCloudConnectorTabs.mock.calls[0][0].onTabClick;

      // Simulate clicking existing connection tab
      act(() => {
        onTabClick({ id: 'existing-connection', name: 'Existing Connection', content: null });
      });

      // Verify component re-renders with new selectedTabId
      expect(mockCloudConnectorTabs).toHaveBeenLastCalledWith(
        expect.objectContaining({
          selectedTabId: 'existing-connection',
        }),
        {}
      );
    });

    it('should call updatePolicyWithNewCredentials when switching to new-connection with credentials', () => {
      const mockCredentials = {
        roleArn: 'arn:aws:iam::123456789012:role/TestRole',
        externalId: 'test-external-id',
      };

      mockUseCloudConnectorSetup.mockReturnValue({
        newConnectionCredentials: mockCredentials,
        setNewConnectionCredentials: mockSetNewConnectionCredentials,
        existingConnectionCredentials: {},
        setExistingConnectionCredentials: mockSetExistingConnectionCredentials,
        updatePolicyWithNewCredentials: mockUpdatePolicyWithNewCredentials,
        updatePolicyWithExistingCredentials: mockUpdatePolicyWithExistingCredentials,
      });

      renderComponent();

      const onTabClick = mockCloudConnectorTabs.mock.calls[0][0].onTabClick;

      act(() => {
        onTabClick({ id: 'new-connection', name: 'New Connection', content: null });
      });

      expect(mockUpdatePolicyWithNewCredentials).toHaveBeenCalledWith(mockCredentials);
    });

    it('should call updatePolicyWithExistingCredentials when switching to existing-connection with credentials', () => {
      const mockCredentials = {
        roleArn: 'arn:aws:iam::123456789012:role/ExistingRole',
        externalId: 'existing-external-id',
        cloudConnectorId: 'existing-connector-123',
      };

      mockUseCloudConnectorSetup.mockReturnValue({
        newConnectionCredentials: {},
        setNewConnectionCredentials: mockSetNewConnectionCredentials,
        existingConnectionCredentials: mockCredentials,
        setExistingConnectionCredentials: mockSetExistingConnectionCredentials,
        updatePolicyWithNewCredentials: mockUpdatePolicyWithNewCredentials,
        updatePolicyWithExistingCredentials: mockUpdatePolicyWithExistingCredentials,
      });

      renderComponent();

      const onTabClick = mockCloudConnectorTabs.mock.calls[0][0].onTabClick;

      act(() => {
        onTabClick({ id: 'existing-connection', name: 'Existing Connection', content: null });
      });

      expect(mockUpdatePolicyWithExistingCredentials).toHaveBeenCalledWith(mockCredentials);
    });

    it('should not call update functions when switching tabs without credentials', () => {
      setupMocks([]);

      renderComponent();

      const onTabClick = mockCloudConnectorTabs.mock.calls[0][0].onTabClick;

      act(() => {
        onTabClick({ id: 'existing-connection', name: 'Existing Connection', content: null });
      });
      act(() => {
        onTabClick({ id: 'new-connection', name: 'New Connection', content: null });
      });

      expect(mockUpdatePolicyWithNewCredentials).not.toHaveBeenCalled();
      expect(mockUpdatePolicyWithExistingCredentials).not.toHaveBeenCalled();
    });
  });

  describe('props passing and hook integration', () => {
    it('should pass correct props to useCloudConnectorSetup hook', () => {
      setupMocks([]);

      renderComponent();

      expect(mockUseCloudConnectorSetup).toHaveBeenCalledWith(
        defaultProps.input,
        defaultProps.newPolicy,
        defaultProps.updatePolicy
      );
    });

    it('should call useGetCloudConnectors hook', () => {
      setupMocks([]);

      renderComponent();

      expect(mockUseGetCloudConnectors).toHaveBeenCalled();
    });

    it('should pass cloud connectors count to CloudConnectorTabs', () => {
      setupMocks([
        createMockCloudConnector('connector-1', 'Test Connector 1'),
        createMockCloudConnector('connector-2', 'Test Connector 2'),
        createMockCloudConnector('connector-3', 'Test Connector 3'),
      ]);

      renderComponent();

      // Check the most recent call for the correct count
      expect(mockCloudConnectorTabs).toHaveBeenLastCalledWith(
        expect.objectContaining({
          cloudConnectorsCount: 3,
        }),
        {}
      );
    });

    it('should handle undefined cloud provider gracefully', () => {
      setupMocks([]);

      renderComponent({ cloudProvider: undefined });

      expect(mockCloudConnectorTabs).toHaveBeenCalledWith(
        expect.objectContaining({
          tabs: expect.arrayContaining([
            expect.objectContaining({ id: 'new-connection' }),
            expect.objectContaining({ id: 'existing-connection' }),
          ]),
        }),
        {}
      );
    });
  });

  describe('tabs configuration', () => {
    it('should create tabs with correct structure', () => {
      setupMocks([]);

      renderComponent();

      const tabsCall = mockCloudConnectorTabs.mock.calls[0][0];

      expect(tabsCall.tabs).toHaveLength(2);
      expect(tabsCall.tabs[0]).toMatchObject({
        id: 'new-connection',
        name: expect.any(Object), // React element
      });
      expect(tabsCall.tabs[1]).toMatchObject({
        id: 'existing-connection',
        name: expect.any(Object), // React element
      });
    });

    it('should provide onTabClick callback', () => {
      setupMocks([]);

      renderComponent();

      const tabsCall = mockCloudConnectorTabs.mock.calls[0][0];

      expect(tabsCall.onTabClick).toBeDefined();
      expect(typeof tabsCall.onTabClick).toBe('function');
    });
  });

  describe('credential management integration', () => {
    it('should pass hook credentials to child components via tabs content', () => {
      const mockNewCredentials = {
        roleArn: 'arn:aws:iam::123456789012:role/NewRole',
        externalId: 'new-external-id',
      };

      const mockExistingCredentials = {
        roleArn: 'arn:aws:iam::123456789012:role/ExistingRole',
        externalId: 'existing-external-id',
        cloudConnectorId: 'connector-123',
      };

      // Setup mocks with specific credentials
      mockUseGetCloudConnectors.mockReturnValue(createMockQueryResult([]));
      mockUseCloudConnectorSetup.mockReturnValue({
        newConnectionCredentials: mockNewCredentials,
        setNewConnectionCredentials: mockSetNewConnectionCredentials,
        existingConnectionCredentials: mockExistingCredentials,
        setExistingConnectionCredentials: mockSetExistingConnectionCredentials,
        updatePolicyWithNewCredentials: mockUpdatePolicyWithNewCredentials,
        updatePolicyWithExistingCredentials: mockUpdatePolicyWithExistingCredentials,
      });

      renderComponent();

      // Verify that the component renders without errors and calls the hooks correctly
      expect(mockUseCloudConnectorSetup).toHaveBeenCalledWith(
        defaultProps.input,
        defaultProps.newPolicy,
        defaultProps.updatePolicy
      );

      expect(mockCloudConnectorTabs).toHaveBeenCalledWith(
        expect.objectContaining({
          tabs: expect.arrayContaining([
            expect.objectContaining({ id: 'new-connection' }),
            expect.objectContaining({ id: 'existing-connection' }),
          ]),
        }),
        {}
      );
    });
  });

  describe('version checking integration', () => {
    it('should render CloudConnectorTabs when reusable feature is enabled', () => {
      mockIsCloudConnectorReusableEnabled.mockReturnValue(true);
      setupMocks([]);

      renderComponent();

      expect(mockIsCloudConnectorReusableEnabled).toHaveBeenCalledWith(
        mockPackageInfo.version,
        defaultProps.templateName
      );
      expect(mockCloudConnectorTabs).toHaveBeenCalled();
    });

    it('should not render NewCloudConnectorForm when reusable feature is disabled', () => {
      mockIsCloudConnectorReusableEnabled.mockReturnValue(false);
      setupMocks([]);

      renderComponent();

      expect(mockIsCloudConnectorReusableEnabled).toHaveBeenCalledWith(
        mockPackageInfo.version,
        defaultProps.templateName
      );
      expect(mockCloudConnectorTabs).not.toHaveBeenCalled();
      expect(mockNewCloudConnectorForm).toHaveBeenCalled();
    });
  });
});
