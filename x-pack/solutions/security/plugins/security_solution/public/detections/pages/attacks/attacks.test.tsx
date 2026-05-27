/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { Router } from '@kbn/shared-ux-router';
import { ATTACKS_PAGE_LOADING_TEST_ID, AttacksPage } from './attacks';
import { useUserData } from '../../components/user_info';
import { useListsConfig } from '../../containers/detection_engine/lists/use_lists_config';
import { useSignalHelpers } from '../../../sourcerer/containers/use_signal_helpers';
import { TestProviders } from '../../../common/mock';
import { mockHistory } from '../../../common/utils/route/mocks';
import { USER_UNAUTHENTICATED_TEST_ID } from '../../components/alerts/empty_pages/user_unauthenticated_empty_page';
import { NO_INDEX_TEST_ID } from '../../components/alerts/empty_pages/no_index_empty_page';
import { NO_INTEGRATION_CALLOUT_TEST_ID } from '../../components/callouts/no_api_integration_key_callout';
import { NEED_ADMIN_CALLOUT_TEST_ID } from '../../../detection_engine/rule_management/components/callouts/need_admin_for_update_rules_callout';
import { useMissingPrivileges } from '../../../common/hooks/use_missing_privileges';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useAlertsPrivileges } from '../../containers/detection_engine/alerts/use_alerts_privileges';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';
import { ATTACK_ID_URL_PARAM, ATTACK_INDEX_URL_PARAM } from './utils';
import { ATTACKS_PATH } from '../../../../common/constants';

jest.mock('../../components/user_info');
jest.mock('../../../common/components/user_privileges');
jest.mock('../../containers/detection_engine/lists/use_lists_config');
jest.mock('../../../sourcerer/containers/use_signal_helpers');
jest.mock('../../../common/hooks/use_missing_privileges');
jest.mock('../../containers/detection_engine/alerts/use_alerts_privileges');
jest.mock('../../../common/hooks/use_experimental_features');
jest.mock('../../../flyout/attack_details/hooks/use_attack_hit', () => ({
  useAttackHit: () => ({ hit: null, loading: true, refetch: jest.fn() }),
}));
jest.mock('../../../flyout_v2/shared/components/flyout_provider', () => ({
  flyoutProviders: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../../../flyout_v2/attack_details/main', () => ({
  AttackDetails: () => <div data-test-subj="mock-attack-details" />,
}));
jest.mock('../../components/attacks/wrapper', () => ({
  Wrapper: () => <div data-test-subj={'attacks-page-data-view-wrapper'} />,
}));

const mockUseAlertsPrivileges = useAlertsPrivileges as jest.Mock;

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

const doMockRulesPrivileges = ({ read = false }) => {
  (useUserPrivileges as jest.Mock).mockReturnValue({
    rulesPrivileges: {
      rules: {
        read,
        edit: false,
      },
    },
  });
};

describe('<AttacksPageWrapper />', () => {
  const startServices = createStartServicesMock();
  const mockOpenSystemFlyout = startServices.overlays.openSystemFlyout as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    doMockRulesPrivileges({});
    mockUseAlertsPrivileges.mockReturnValue(defaultAlertsPrivileges);
    jest.mocked(useIsExperimentalFeatureEnabled).mockReturnValue(false);
    mockOpenSystemFlyout.mockReset();
  });

  describe('showing loading spinner', () => {
    it('should render a loading spinner if userInfoLoading is true', () => {
      (useUserData as jest.Mock).mockReturnValue([{ loading: true }]);
      (useListsConfig as jest.Mock).mockReturnValue({ loading: false });
      (useSignalHelpers as jest.Mock).mockReturnValue({});

      const { getByTestId } = render(
        <TestProviders startServices={startServices}>
          <Router history={mockHistory}>
            <AttacksPage />
          </Router>
        </TestProviders>
      );

      expect(getByTestId('header-page-title')).toBeInTheDocument();
      expect(getByTestId(ATTACKS_PAGE_LOADING_TEST_ID)).toBeInTheDocument();
    });

    it('should render a loading spinner if listsConfigLoading is true', () => {
      (useUserData as jest.Mock).mockReturnValue([{ loading: false }]);
      (useListsConfig as jest.Mock).mockReturnValue({ loading: true });
      (useSignalHelpers as jest.Mock).mockReturnValue({});

      const { getByTestId } = render(
        <TestProviders startServices={startServices}>
          <Router history={mockHistory}>
            <AttacksPage />
          </Router>
        </TestProviders>
      );

      expect(getByTestId('header-page-title')).toBeInTheDocument();
      expect(getByTestId(ATTACKS_PAGE_LOADING_TEST_ID)).toBeInTheDocument();
    });
  });

  describe('showing user not authenticated', () => {
    it('should render unauthenticated page', () => {
      (useUserData as jest.Mock).mockReturnValue([{ isAuthenticated: false }]);
      (useListsConfig as jest.Mock).mockReturnValue({});
      (useSignalHelpers as jest.Mock).mockReturnValue({});

      const { getByTestId, queryByTestId } = render(
        <TestProviders startServices={startServices}>
          <Router history={mockHistory}>
            <AttacksPage />
          </Router>
        </TestProviders>
      );

      expect(getByTestId('header-page-title')).toBeInTheDocument();
      expect(queryByTestId(ATTACKS_PAGE_LOADING_TEST_ID)).not.toBeInTheDocument();
      expect(getByTestId(USER_UNAUTHENTICATED_TEST_ID)).toBeInTheDocument();
    });
  });

  describe('showing no index', () => {
    it('should render no index page if  if signalIndexNeedsInit is true', () => {
      (useUserData as jest.Mock).mockReturnValue([{}]);
      (useListsConfig as jest.Mock).mockReturnValue({});
      (useSignalHelpers as jest.Mock).mockReturnValue({ signalIndexNeedsInit: true });

      const { getByTestId, queryByTestId } = render(
        <TestProviders startServices={startServices}>
          <Router history={mockHistory}>
            <AttacksPage />
          </Router>
        </TestProviders>
      );

      expect(getByTestId('header-page-title')).toBeInTheDocument();
      expect(queryByTestId(ATTACKS_PAGE_LOADING_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(USER_UNAUTHENTICATED_TEST_ID)).not.toBeInTheDocument();
      expect(getByTestId(NO_INDEX_TEST_ID)).toBeInTheDocument();
    });

    it('should render no index page if needsListsConfiguration is true', () => {
      (useUserData as jest.Mock).mockReturnValue([{}]);
      (useListsConfig as jest.Mock).mockReturnValue({ needsConfiguration: true });
      (useSignalHelpers as jest.Mock).mockReturnValue({});

      const { getByTestId, queryByTestId } = render(
        <TestProviders startServices={startServices}>
          <Router history={mockHistory}>
            <AttacksPage />
          </Router>
        </TestProviders>
      );

      expect(getByTestId('header-page-title')).toBeInTheDocument();
      expect(queryByTestId(ATTACKS_PAGE_LOADING_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(USER_UNAUTHENTICATED_TEST_ID)).not.toBeInTheDocument();
      expect(getByTestId(NO_INDEX_TEST_ID)).toBeInTheDocument();
    });
  });

  describe('showing callouts', () => {
    it('should render NoApiIntegrationKeyCallOut', () => {
      (useUserData as jest.Mock).mockReturnValue([
        {
          loading: false,
          isAuthenticated: true,
          canUserREAD: true,
          hasEncryptionKey: false,
        },
      ]);
      (useListsConfig as jest.Mock).mockReturnValue({
        loading: false,
        needsConfiguration: false,
      });
      (useSignalHelpers as jest.Mock).mockReturnValue({
        signalIndexNeedsInit: false,
      });
      (useMissingPrivileges as jest.Mock).mockReturnValue({
        indexPrivileges: [],
        featurePrivileges: [],
      });

      const { getByTestId, queryByTestId } = render(
        <TestProviders startServices={startServices}>
          <Router history={mockHistory}>
            <AttacksPage />
          </Router>
        </TestProviders>
      );

      expect(queryByTestId('header-page-title')).not.toBeInTheDocument();
      expect(getByTestId(NO_INTEGRATION_CALLOUT_TEST_ID)).toBeInTheDocument();
    });

    it('should render NeedAdminForUpdateRulesCallOut', () => {
      (useUserData as jest.Mock).mockReturnValue([
        {
          loading: false,
          isAuthenticated: true,
          canUserREAD: true,
          signalIndexMappingOutdated: true,
          hasIndexManage: false,
        },
      ]);
      (useListsConfig as jest.Mock).mockReturnValue({
        loading: false,
        needsConfiguration: false,
      });
      (useSignalHelpers as jest.Mock).mockReturnValue({
        signalIndexNeedsInit: false,
      });
      (useMissingPrivileges as jest.Mock).mockReturnValue({
        indexPrivileges: [],
        featurePrivileges: [],
      });

      const { getByTestId, queryByTestId } = render(
        <TestProviders startServices={startServices}>
          <Router history={mockHistory}>
            <AttacksPage />
          </Router>
        </TestProviders>
      );

      expect(queryByTestId('header-page-title')).not.toBeInTheDocument();
      expect(getByTestId(`callout-${NEED_ADMIN_CALLOUT_TEST_ID}`)).toBeInTheDocument();
    });

    it('should render MissingPrivilegesCallOut', () => {
      (useUserData as jest.Mock).mockReturnValue([
        {
          loading: false,
          isAuthenticated: true,
          canUserREAD: true,
        },
      ]);
      (useListsConfig as jest.Mock).mockReturnValue({
        loading: false,
        needsConfiguration: false,
      });
      (useSignalHelpers as jest.Mock).mockReturnValue({
        signalIndexNeedsInit: false,
      });
      (useMissingPrivileges as jest.Mock).mockReturnValue({
        indexPrivileges: [['index', ['privilege']]],
        featurePrivileges: [['feature', ['privilege']]],
      });

      const { getByText, queryByTestId } = render(
        <TestProviders startServices={startServices}>
          <Router history={mockHistory}>
            <AttacksPage />
          </Router>
        </TestProviders>
      );

      expect(queryByTestId('header-page-title')).not.toBeInTheDocument();
      expect(getByText('Insufficient privileges')).toBeInTheDocument();
    });
  });

  describe('showing the actual content', () => {
    it('should render NoPrivileges when the user has no access to alerts', () => {
      (useUserData as jest.Mock).mockReturnValue([
        {
          loading: false,
          isAuthenticated: true,
        },
      ]);
      mockUseAlertsPrivileges.mockReturnValue({
        ...defaultAlertsPrivileges,
        hasAlertsRead: false,
      });
      (useListsConfig as jest.Mock).mockReturnValue({
        loading: false,
        needsConfiguration: false,
      });
      (useSignalHelpers as jest.Mock).mockReturnValue({
        signalIndexNeedsInit: false,
      });
      (useMissingPrivileges as jest.Mock).mockReturnValue({
        indexPrivileges: [],
        featurePrivileges: [],
      });

      const { getByTestId, queryByTestId } = render(
        <TestProviders startServices={startServices}>
          <Router history={mockHistory}>
            <AttacksPage />
          </Router>
        </TestProviders>
      );

      expect(queryByTestId('header-page-title')).not.toBeInTheDocument();
      expect(queryByTestId('attacks-page-data-view-wrapper')).not.toBeInTheDocument();
      expect(getByTestId('noPrivilegesPage')).toBeInTheDocument();
    });

    describe('V2 deep-link opener', () => {
      const renderInLoadedState = (search: string) => {
        (useUserData as jest.Mock).mockReturnValue([{ loading: false, isAuthenticated: true }]);
        doMockRulesPrivileges({ read: true });
        (useListsConfig as jest.Mock).mockReturnValue({
          loading: false,
          needsConfiguration: false,
        });
        (useSignalHelpers as jest.Mock).mockReturnValue({ signalIndexNeedsInit: false });
        (useMissingPrivileges as jest.Mock).mockReturnValue({
          indexPrivileges: [],
          featurePrivileges: [],
        });

        const historyMock = {
          ...mockHistory,
          location: {
            hash: '',
            pathname: ATTACKS_PATH,
            search,
            state: '',
          },
        };

        return {
          historyMock,
          ...render(
            <TestProviders startServices={startServices}>
              <Router history={historyMock}>
                <AttacksPage />
              </Router>
            </TestProviders>
          ),
        };
      };

      it('opens the v2 system flyout when newFlyoutSystemEnabled and both URL params are present', async () => {
        jest.mocked(useIsExperimentalFeatureEnabled).mockReturnValue(true);

        const { historyMock } = renderInLoadedState(
          `?${ATTACK_ID_URL_PARAM}=attack-1&${ATTACK_INDEX_URL_PARAM}=.idx`
        );

        await waitFor(() => {
          expect(mockOpenSystemFlyout).toHaveBeenCalled();
        });

        const element = mockOpenSystemFlyout.mock.calls[0][0];
        expect(element.props.attackId).toBe('attack-1');
        expect(element.props.indexName).toBe('.idx');

        // After opening, the deep-link params are stripped from the URL.
        expect(historyMock.replace).toHaveBeenCalledWith(
          expect.objectContaining({
            pathname: ATTACKS_PATH,
            search: '',
          })
        );
      });

      it('does not open the flyout when newFlyoutSystemEnabled is false', async () => {
        jest.mocked(useIsExperimentalFeatureEnabled).mockReturnValue(false);

        const { historyMock } = renderInLoadedState(
          `?${ATTACK_ID_URL_PARAM}=attack-1&${ATTACK_INDEX_URL_PARAM}=.idx`
        );

        // Give the effect a chance to run.
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(mockOpenSystemFlyout).not.toHaveBeenCalled();
        expect(historyMock.replace).not.toHaveBeenCalled();
      });

      it('does not open the flyout when the URL params are missing', async () => {
        jest.mocked(useIsExperimentalFeatureEnabled).mockReturnValue(true);

        const { historyMock } = renderInLoadedState('');

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(mockOpenSystemFlyout).not.toHaveBeenCalled();
        expect(historyMock.replace).not.toHaveBeenCalled();
      });

      it('preserves unrelated query params when stripping the deep-link keys', async () => {
        jest.mocked(useIsExperimentalFeatureEnabled).mockReturnValue(true);

        const { historyMock } = renderInLoadedState(
          `?query=foo&${ATTACK_ID_URL_PARAM}=attack-1&${ATTACK_INDEX_URL_PARAM}=.idx&timerange=bar`
        );

        await waitFor(() => {
          expect(mockOpenSystemFlyout).toHaveBeenCalled();
        });

        expect(historyMock.replace).toHaveBeenCalledWith(
          expect.objectContaining({
            pathname: ATTACKS_PATH,
            search: '?query=foo&timerange=bar',
          })
        );
      });
    });

    it('should render AttacksPageDataViewWrapper', () => {
      (useUserData as jest.Mock).mockReturnValue([
        {
          loading: false,
          isAuthenticated: true,
        },
      ]);
      doMockRulesPrivileges({ read: true });
      (useListsConfig as jest.Mock).mockReturnValue({
        loading: false,
        needsConfiguration: false,
      });
      (useSignalHelpers as jest.Mock).mockReturnValue({
        signalIndexNeedsInit: false,
      });
      (useMissingPrivileges as jest.Mock).mockReturnValue({
        indexPrivileges: [],
        featurePrivileges: [],
      });

      const { getByTestId, queryByTestId } = render(
        <TestProviders startServices={startServices}>
          <Router history={mockHistory}>
            <AttacksPage />
          </Router>
        </TestProviders>
      );

      expect(queryByTestId('header-page-title')).not.toBeInTheDocument();
      expect(queryByTestId('noPrivilegesPage')).not.toBeInTheDocument();
      expect(getByTestId('attacks-page-data-view-wrapper')).toBeInTheDocument();
    });
  });
});
