/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AIValue } from './ai_value';
import { useSyncTimerangeUrlParam } from '../../common/hooks/search_bar/use_sync_timerange_url_param';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useSourcererDataView } from '../../sourcerer/containers';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { useHasSecurityCapability } from '../../helper_hooks';
import { TestProviders } from '../../common/mock/test_providers';
import * as i18n from './translations';

// Mock all dependencies before imports to avoid issues
jest.mock('../../common/hooks/search_bar/use_sync_timerange_url_param', () => ({
  useSyncTimerangeUrlParam: jest.fn(),
}));

jest.mock('../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));

jest.mock('../../sourcerer/containers', () => ({
  useSourcererDataView: jest.fn(),
}));

jest.mock('../../detections/containers/detection_engine/alerts/use_alerts_privileges', () => ({
  useAlertsPrivileges: jest.fn(),
}));

jest.mock('../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: jest.fn(),
}));

jest.mock('../../helper_hooks', () => ({
  useHasSecurityCapability: jest.fn(),
}));

// Mock docLinks for NoPrivileges component
jest.mock('@kbn/doc-links', () => ({
  getDocLinksMeta: jest.fn(() => ({})),
  getDocLinks: jest.fn(() => ({
    links: {
      siem: {
        privileges: 'test-privileges-link',
      },
    },
  })),
}));

// Mock the problematic components
jest.mock('../../common/components/page_wrapper', () => ({
  SecuritySolutionPageWrapper: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
}));

jest.mock('../../common/components/page_loader', () => ({
  PageLoader: (props: Record<string, unknown>) => <div data-test-subj="page-loader" {...props} />,
}));

jest.mock('../../common/components/no_privileges', () => ({
  NoPrivileges: ({
    docLinkSelector,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-test-subj="no-privileges" {...props}>
      {'No Privileges'}
    </div>
  ),
}));

jest.mock('../../common/hooks/use_selector', () => ({
  useDeepEqualSelector: jest.fn(),
  useShallowEqualSelector: jest.fn(),
}));

// Mock global filters
jest.mock('../../common/hooks/use_global_filter_query', () => ({
  useGlobalFilterQuery: jest.fn(() => ({
    globalFilters: [],
    globalFilterQuery: '',
  })),
}));

// Mock Lens components
jest.mock('../../common/components/visualization_actions/lens_embeddable', () => ({
  LensEmbeddable: (props: Record<string, unknown>) => (
    <div data-testid="lens-embeddable" {...props} />
  ),
}));

jest.mock('../../common/components/visualization_actions/use_lens_attributes', () => ({
  useLensAttributes: jest.fn(() => ({
    attributes: {},
    loading: false,
  })),
}));

// Type the mocked functions
const mockUseSyncTimerangeUrlParam = useSyncTimerangeUrlParam as jest.MockedFunction<
  typeof useSyncTimerangeUrlParam
>;
const mockUseDeepEqualSelector = useDeepEqualSelector as jest.MockedFunction<
  typeof useDeepEqualSelector
>;
const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.MockedFunction<
  typeof useIsExperimentalFeatureEnabled
>;
const mockUseSourcererDataView = useSourcererDataView as jest.MockedFunction<
  typeof useSourcererDataView
>;
const mockUseAlertsPrivileges = useAlertsPrivileges as jest.MockedFunction<
  typeof useAlertsPrivileges
>;
const mockUseDataView = useDataView as jest.MockedFunction<typeof useDataView>;
const mockUseHasSecurityCapability = useHasSecurityCapability as jest.MockedFunction<
  typeof useHasSecurityCapability
>;

describe('AIValue', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mock values
    mockUseSyncTimerangeUrlParam.mockReturnValue(undefined);
    mockUseDeepEqualSelector.mockReturnValue({
      from: '2023-01-01T00:00:00.000Z',
      to: '2023-01-31T23:59:59.999Z',
    });
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
    mockUseSourcererDataView.mockReturnValue({
      loading: false,
      browserFields: {},
      dataViewId: 'test-id',
      indicesExist: true,
      selectedPatterns: [],
      sourcererDataView: {} as Record<string, unknown>,
    });
    mockUseAlertsPrivileges.mockReturnValue({
      hasKibanaREAD: true,
      hasIndexRead: true,
      hasIndexUpdateDelete: false,
      hasKibanaCRUD: false,
      loading: false,
      isAuthenticated: true,
      hasEncryptionKey: true,
      hasIndexManage: false,
      hasIndexWrite: false,
      hasIndexMaintenance: false,
    });
    mockUseDataView.mockReturnValue({
      status: 'ready',
      dataView: {} as never,
    });
    mockUseHasSecurityCapability.mockReturnValue(true);
  });

  describe('Access states', () => {
    it('shows no privileges when user lacks soc management capability', () => {
      mockUseHasSecurityCapability.mockReturnValue(false);

      render(
        <TestProviders>
          <AIValue />
        </TestProviders>
      );

      expect(screen.getByTestId('no-privileges')).toBeInTheDocument();
    });

    it('shows page loader when new data view picker is enabled and status is pristine', () => {
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
      mockUseDataView.mockReturnValue({
        status: 'pristine',
        dataView: {} as never,
      });

      render(
        <TestProviders>
          <AIValue />
        </TestProviders>
      );

      expect(screen.getByTestId('page-loader')).toBeInTheDocument();
    });

    it('shows loading spinner when sourcerer is loading', () => {
      mockUseSourcererDataView.mockReturnValue({
        loading: true,
        browserFields: {},
        dataViewId: 'test-id',
        indicesExist: true,
        selectedPatterns: [],
        sourcererDataView: {} as Record<string, unknown>,
      });

      render(
        <TestProviders>
          <AIValue />
        </TestProviders>
      );

      expect(screen.getByTestId('aiValueLoader')).toBeInTheDocument();
    });
  });

  describe('Access Control', () => {
    it('shows no privileges when user lacks soc management capability', () => {
      mockUseHasSecurityCapability.mockReturnValue(false);

      render(
        <TestProviders>
          <AIValue />
        </TestProviders>
      );

      expect(screen.getByTestId('no-privileges')).toBeInTheDocument();
    });
  });

  describe('Main Content Rendering', () => {
    it('renders main content when all conditions are met', () => {
      render(
        <TestProviders>
          <AIValue />
        </TestProviders>
      );

      expect(screen.getByTestId('aiValuePage')).toBeInTheDocument();
    });

    it('renders correct page title', () => {
      render(
        <TestProviders>
          <AIValue />
        </TestProviders>
      );

      expect(screen.getByText(i18n.AI_VALUE_DASHBOARD)).toBeInTheDocument();
    });

    it('renders super date picker with correct id', () => {
      render(
        <TestProviders>
          <AIValue />
        </TestProviders>
      );

      const datePicker = screen.getByTestId('superDatePickerToggleQuickMenuButton');
      expect(datePicker).toBeInTheDocument();
    });
  });

  describe('Hook Integration', () => {
    it('calls all required hooks', () => {
      render(
        <TestProviders>
          <AIValue />
        </TestProviders>
      );

      expect(mockUseSyncTimerangeUrlParam).toHaveBeenCalled();
      expect(mockUseDeepEqualSelector).toHaveBeenCalledWith(expect.any(Function));
      expect(mockUseIsExperimentalFeatureEnabled).toHaveBeenCalledWith('newDataViewPickerEnabled');
      expect(mockUseHasSecurityCapability).toHaveBeenCalledWith('socManagement');
      expect(mockUseAlertsPrivileges).toHaveBeenCalled();
    });
  });

  describe('Data View Picker Integration', () => {
    it('uses old sourcerer loading when new data view picker is disabled', () => {
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
      mockUseSourcererDataView.mockReturnValue({
        loading: true,
        browserFields: {},
        dataViewId: 'test-id',
        indicesExist: true,
        selectedPatterns: [],
        sourcererDataView: {} as Record<string, unknown>,
      });

      render(
        <TestProviders>
          <AIValue />
        </TestProviders>
      );

      expect(screen.getByTestId('aiValueLoader')).toBeInTheDocument();
    });

    it('uses new data view status when new data view picker is enabled', () => {
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
      mockUseDataView.mockReturnValue({
        status: 'loading',
        dataView: {} as never,
      });

      render(
        <TestProviders>
          <AIValue />
        </TestProviders>
      );

      expect(screen.getByTestId('aiValueLoader')).toBeInTheDocument();
    });
  });
});
