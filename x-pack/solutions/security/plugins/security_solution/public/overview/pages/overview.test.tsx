/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { merge } from 'lodash';

import { TestProviders } from '../../common/mock';
import type { UseMessagesStorage } from '../../common/containers/local_storage/use_messages_storage';
import { useMessagesStorage } from '../../common/containers/local_storage/use_messages_storage';
import { Overview } from '.';
import { useUserPrivileges } from '../../common/components/user_privileges';
import { useFetchIndex } from '../../common/containers/source';
import { useAllTiDataSources } from '../containers/overview_cti_links/use_all_ti_data_sources';
import { mockCtiLinksResponse, mockTiDataSources } from '../components/overview_cti_links/mock';
import { useCtiDashboardLinks } from '../containers/overview_cti_links';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { initialUserPrivilegesState } from '../../common/components/user_privileges/user_privileges_context';
import type { EndpointPrivileges } from '../../../common/endpoint/types';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
import { useRiskScore } from '../../entity_analytics/api/hooks/use_risk_score';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';

const mockNavigateToApp = vi.fn();
vi.mock('../../common/components/empty_prompt');
vi.mock('../../common/lib/kibana', async () => {
  const original = await vi.importActual('../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        ...original.useKibana().services,
        application: {
          ...original.useKibana().services.application,
          navigateToApp: mockNavigateToApp,
        },
        cases: {
          ...mockCasesContract(),
        },
      },
    }),
  };
});
vi.mock('../../common/containers/source');
vi.mock('../../common/components/visualization_actions/lens_embeddable');
vi.mock('../../common/containers/use_global_time', () => {
  const mocked = {
    useGlobalTime: vi.fn().mockReturnValue({
      from: '2020-07-07T08:20:18.966Z',
      isInitializing: false,
      to: '2020-07-08T08:20:18.966Z',
      setQuery: vi.fn(),
    }),
  };
  return { ...mocked, default: mocked };
});

// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar and QueryBar
vi.mock('../../common/components/search_bar', () => {
  const mocked = {
    SiemSearchBar: () => null,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../common/components/query_bar', () => {
  const mocked = {
    QueryBar: () => null,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../common/components/user_privileges');
vi.mock('../../detections/containers/detection_engine/alerts/use_alerts_privileges');
vi.mock('../../common/containers/local_storage/use_messages_storage');
vi.mock('../containers/overview_cti_links');
vi.mock('../../common/components/visualization_actions/actions');
vi.mock('../../data_view_manager/hooks/use_data_view');

const useCtiDashboardLinksMock = useCtiDashboardLinks as Mock;
useCtiDashboardLinksMock.mockReturnValue(mockCtiLinksResponse);

vi.mock('../containers/overview_cti_links/use_all_ti_data_sources');
const useAllTiDataSourcesMock = useAllTiDataSources as Mock;
useAllTiDataSourcesMock.mockReturnValue(mockTiDataSources);

vi.mock('../../entity_analytics/api/hooks/use_risk_score');
const useRiskScoreMock = useRiskScore as Mock;
useRiskScoreMock.mockReturnValue({ loading: false, data: [], hasEngineBeenInstalled: false });

vi.mock('../../common/hooks/use_experimental_features');
const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as Mock;
useIsExperimentalFeatureEnabledMock.mockReturnValue(false);

const defaultAlertsPrivileges = {
  hasAlertsAll: true,
  hasAlertsRead: true,
  hasEncryptionKey: true,
  hasIndexManage: true,
  hasIndexMaintenance: true,
  hasIndexRead: true,
  hasIndexWrite: true,
  hasIndexUpdateDelete: true,
  isAuthenticated: true,
  loading: false,
};

const endpointNoticeMessage = (hasMessageValue: boolean) => {
  return {
    hasMessage: () => hasMessageValue,
    getMessages: () => [],
    addMessage: () => undefined,
    removeMessage: () => undefined,
    clearAllMessages: () => undefined,
  };
};

const mockUseUserPrivileges = useUserPrivileges as Mock;
const mockUseAlertsPrivileges = useAlertsPrivileges as Mock;
const mockUseFetchIndex = useFetchIndex as Mock;
const mockUseMessagesStorage: Mock = useMessagesStorage as Mock<
  (...args: unknown[]) => UseMessagesStorage
>;

describe('Overview', () => {
  const loadedUserPrivilegesState = (
    endpointOverrides: Partial<EndpointPrivileges> = {}
  ): ReturnType<typeof initialUserPrivilegesState> =>
    merge(initialUserPrivilegesState(), {
      endpointPrivileges: {
        loading: false,
        canAccessFleet: true,
        canAccessEndpointManagement: true,
        ...endpointOverrides,
      },
    });

  beforeEach(() => {
    mockUseUserPrivileges.mockReturnValue(loadedUserPrivilegesState());
    mockUseAlertsPrivileges.mockReturnValue(defaultAlertsPrivileges);
    mockUseFetchIndex.mockReturnValue([
      false,
      {
        indexExists: true,
      },
    ]);
    (useDataView as Mock).mockReturnValue({
      dataView: {
        hasMatchedIndices: vi.fn(),
        matchedIndices: ['index-1'],
      },
      status: 'ready',
    });
  });

  describe('rendering', () => {
    test('it DOES NOT render the Getting started text when an index is available', () => {
      mockUseMessagesStorage.mockImplementation(() => endpointNoticeMessage(false));

      render(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );

      expect(mockNavigateToApp).not.toHaveBeenCalled();
    });

    test('it DOES render the Endpoint banner when the endpoint index is NOT available AND storage is NOT set', () => {
      mockUseFetchIndex.mockReturnValue([
        false,
        {
          indexExists: false,
        },
      ]);
      mockUseMessagesStorage.mockImplementation(() => endpointNoticeMessage(false));

      render(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );

      expect(screen.getByTestId('endpoint-prompt-banner')).toBeInTheDocument();
    });

    test('it does NOT render the Endpoint banner when the endpoint index is NOT available but storage is set', () => {
      mockUseFetchIndex.mockReturnValue([
        false,
        {
          indexExists: false,
        },
      ]);
      mockUseMessagesStorage.mockImplementation(() => endpointNoticeMessage(true));

      render(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );

      expect(screen.queryByTestId('endpoint-prompt-banner')).not.toBeInTheDocument();
    });

    test('it does NOT render the Endpoint banner when the endpoint index is available AND storage is set', () => {
      mockUseMessagesStorage.mockImplementation(() => endpointNoticeMessage(true));

      render(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );

      expect(screen.queryByTestId('endpoint-prompt-banner')).not.toBeInTheDocument();
    });

    test('it does NOT render the Endpoint banner when an index IS available but storage is NOT set', () => {
      mockUseMessagesStorage.mockImplementation(() => endpointNoticeMessage(false));

      render(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );
      expect(screen.queryByTestId('endpoint-prompt-banner')).not.toBeInTheDocument();
    });

    test('it does NOT render the Endpoint banner when Ingest is NOT available', () => {
      mockUseMessagesStorage.mockImplementation(() => endpointNoticeMessage(true));
      mockUseUserPrivileges.mockReturnValue(loadedUserPrivilegesState({ canAccessFleet: false }));

      render(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );

      expect(screen.queryByTestId('endpoint-prompt-banner')).not.toBeInTheDocument();
    });

    describe('when no index is available', () => {
      beforeEach(() => {
        mockUseUserPrivileges.mockReturnValue(loadedUserPrivilegesState({ canAccessFleet: false }));
        mockUseMessagesStorage.mockImplementation(() => endpointNoticeMessage(false));
      });

      it('renders getting started page', () => {
        (useDataView as Mock).mockReturnValue({
          dataView: {
            matchedIndices: [],
          },
          status: 'ready',
        });

        render(
          <TestProviders>
            <MemoryRouter>
              <Overview />
            </MemoryRouter>
          </TestProviders>
        );

        expect(screen.getByTestId('empty-prompt')).toBeInTheDocument();
      });
    });
  });

  describe('Threat Intel Dashboard Links', () => {
    it('invokes useAllTiDataSourcesMock hook only once', () => {
      mockUseMessagesStorage.mockImplementation(() => endpointNoticeMessage(false));
      useAllTiDataSourcesMock.mockClear();
      render(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );
      expect(useAllTiDataSourcesMock).toHaveBeenCalledTimes(1);
    });
  });
});
