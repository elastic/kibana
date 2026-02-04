/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ALERTS_PAGE_LOADING_TEST_ID, AlertsPage } from './alerts';
import { useUserData } from '../../components/user_info';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useListsConfig } from '../../containers/detection_engine/lists/use_lists_config';
import { useSignalHelpers } from '../../../sourcerer/containers/use_signal_helpers';
import { TestProviders } from '../../../common/mock';
import { USER_UNAUTHENTICATED_TEST_ID } from '../../components/alerts/empty_pages/user_unauthenticated_empty_page';
import { NO_INDEX_TEST_ID } from '../../components/alerts/empty_pages/no_index_empty_page';
import { NO_INTEGRATION_CALLOUT_TEST_ID } from '../../components/callouts/no_api_integration_key_callout';
import { NEED_ADMIN_CALLOUT_TEST_ID } from '../../../detection_engine/rule_management/components/callouts/need_admin_for_update_rules_callout';
import { useMissingPrivileges } from '../../../common/hooks/use_missing_privileges';

jest.mock('../../components/user_info');
jest.mock('../../../common/components/user_privileges');
jest.mock('../../containers/detection_engine/lists/use_lists_config');
jest.mock('../../../sourcerer/containers/use_signal_helpers');
jest.mock('../../../common/hooks/use_missing_privileges');
jest.mock('../../components/alerts/wrapper', () => ({
  Wrapper: () => <div data-test-subj={'alerts-page-data-view-wrapper'} />,
}));

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

describe('<AlertsPageWrapper />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    doMockRulesPrivileges({});
  });

  describe('showing loading spinner', () => {
    it('should render a loading spinner if userInfoLoading is true', () => {
      (useUserData as jest.Mock).mockReturnValue([{ loading: true }]);
      (useListsConfig as jest.Mock).mockReturnValue({ loading: false });
      (useSignalHelpers as jest.Mock).mockReturnValue({});

      const { getByTestId } = render(
        <TestProviders>
          <AlertsPage />
        </TestProviders>
      );

      expect(getByTestId('header-page-title')).toBeInTheDocument();
      expect(getByTestId(ALERTS_PAGE_LOADING_TEST_ID)).toBeInTheDocument();
    });

    it('should render a loading spinner if listsConfigLoading is true', () => {
      (useUserData as jest.Mock).mockReturnValue([{ loading: false }]);
      (useListsConfig as jest.Mock).mockReturnValue({ loading: true });
      (useSignalHelpers as jest.Mock).mockReturnValue({});

      const { getByTestId } = render(
        <TestProviders>
          <AlertsPage />
        </TestProviders>
      );

      expect(getByTestId('header-page-title')).toBeInTheDocument();
      expect(getByTestId(ALERTS_PAGE_LOADING_TEST_ID)).toBeInTheDocument();
    });
  });

  describe('showing user not authenticated', () => {
    it('should render unauthenticated page', () => {
      (useUserData as jest.Mock).mockReturnValue([{ isAuthenticated: false }]);
      (useListsConfig as jest.Mock).mockReturnValue({});
      (useSignalHelpers as jest.Mock).mockReturnValue({});

      const { getByTestId, queryByTestId } = render(
        <TestProviders>
          <AlertsPage />
        </TestProviders>
      );

      expect(getByTestId('header-page-title')).toBeInTheDocument();
      expect(queryByTestId(ALERTS_PAGE_LOADING_TEST_ID)).not.toBeInTheDocument();
      expect(getByTestId(USER_UNAUTHENTICATED_TEST_ID)).toBeInTheDocument();
    });
  });

  describe('showing no index', () => {
    it('should render no index page if  if signalIndexNeedsInit is true', () => {
      (useUserData as jest.Mock).mockReturnValue([{}]);
      (useListsConfig as jest.Mock).mockReturnValue({});
      (useSignalHelpers as jest.Mock).mockReturnValue({ signalIndexNeedsInit: true });

      const { getByTestId, queryByTestId } = render(
        <TestProviders>
          <AlertsPage />
        </TestProviders>
      );

      expect(getByTestId('header-page-title')).toBeInTheDocument();
      expect(queryByTestId(ALERTS_PAGE_LOADING_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(USER_UNAUTHENTICATED_TEST_ID)).not.toBeInTheDocument();
      expect(getByTestId(NO_INDEX_TEST_ID)).toBeInTheDocument();
    });

    it('should render no index page if needsListsConfiguration is true', () => {
      (useUserData as jest.Mock).mockReturnValue([{}]);
      (useListsConfig as jest.Mock).mockReturnValue({ needsConfiguration: true });
      (useSignalHelpers as jest.Mock).mockReturnValue({});

      const { getByTestId, queryByTestId } = render(
        <TestProviders>
          <AlertsPage />
        </TestProviders>
      );

      expect(getByTestId('header-page-title')).toBeInTheDocument();
      expect(queryByTestId(ALERTS_PAGE_LOADING_TEST_ID)).not.toBeInTheDocument();
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
          hasIndexRead: true,
          hasEncryptionKey: false,
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
        <TestProviders>
          <AlertsPage />
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
          hasIndexRead: true,
          signalIndexMappingOutdated: true,
          hasIndexManage: false,
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
        <TestProviders>
          <AlertsPage />
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
          hasIndexRead: true,
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
        indexPrivileges: [['index', ['privilege']]],
        featurePrivileges: [['feature', ['privilege']]],
      });

      const { getByText, queryByTestId } = render(
        <TestProviders>
          <AlertsPage />
        </TestProviders>
      );

      expect(queryByTestId('header-page-title')).not.toBeInTheDocument();
      expect(getByText('Insufficient privileges')).toBeInTheDocument();
    });
  });

  describe('showing the actual content', () => {
    it('should render NoPrivileges', () => {
      (useUserData as jest.Mock).mockReturnValue([
        {
          loading: false,
          isAuthenticated: true,
          hasIndexRead: false,
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
        <TestProviders>
          <AlertsPage />
        </TestProviders>
      );

      expect(queryByTestId('header-page-title')).not.toBeInTheDocument();
      expect(queryByTestId('alerts-page-data-view-wrapper')).not.toBeInTheDocument();
      expect(getByTestId('noPrivilegesPage')).toBeInTheDocument();
    });

    it('should render AlertsPageDataViewWrapper', () => {
      (useUserData as jest.Mock).mockReturnValue([
        {
          loading: false,
          isAuthenticated: true,
          hasIndexRead: true,
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
        <TestProviders>
          <AlertsPage />
        </TestProviders>
      );

      expect(queryByTestId('header-page-title')).not.toBeInTheDocument();
      expect(queryByTestId('noPrivilegesPage')).not.toBeInTheDocument();
      expect(getByTestId('alerts-page-data-view-wrapper')).toBeInTheDocument();
    });
  });
});
