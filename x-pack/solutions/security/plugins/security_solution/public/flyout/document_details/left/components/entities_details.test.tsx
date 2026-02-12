/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DocumentDetailsContext } from '../../shared/context';
import { TestProviders } from '../../../../common/mock';
import { EntitiesDetails } from './entities_details';
import { ENTITIES_DETAILS_TEST_ID, HOST_DETAILS_TEST_ID, USER_DETAILS_TEST_ID } from './test_ids';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { EXPANDABLE_PANEL_CONTENT_TEST_ID } from '../../../shared/components/test_ids';
import type { Anomalies } from '../../../../common/components/ml/types';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { mockAnomalies } from '../../../../common/components/ml/mock';
import { useHostDetails } from '../../../../explore/hosts/containers/hosts/details';
import { useHostRelatedUsers } from '../../../../common/containers/related_entities/related_users';
import { useObservedUserDetails } from '../../../../explore/users/containers/users/observed_details';
import { useUserRelatedHosts } from '../../../../common/containers/related_entities/related_hosts';
import { useRiskScore } from '../../../../entity_analytics/api/hooks/use_risk_score';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

jest.mock('../../../../resolver/view/use_resolver_query_params_cleaner');

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

const from = '2022-07-28T08:20:18.966Z';
const to = '2022-07-28T08:20:18.966Z';
jest.mock('../../../../common/containers/use_global_time', () => {
  const actual = jest.requireActual('../../../../common/containers/use_global_time');
  return {
    ...actual,
    useGlobalTime: jest
      .fn()
      .mockReturnValue({ from, to, setQuery: jest.fn(), deleteQuery: jest.fn() }),
  };
});

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('uuid'),
}));

jest.mock('../../../../common/components/ml/hooks/use_ml_capabilities');
const mockUseMlUserPermissions = useMlCapabilities as jest.Mock;

const mockUseHasSecurityCapability = jest.fn().mockReturnValue(false);
jest.mock('../../../../helper_hooks', () => ({
  useHasSecurityCapability: () => mockUseHasSecurityCapability(),
}));

jest.mock('../../../../common/components/ml/anomaly/anomaly_table_provider', () => ({
  AnomalyTableProvider: ({
    children,
  }: {
    children: (args: {
      anomaliesData: Anomalies;
      isLoadingAnomaliesData: boolean;
      jobNameById: Record<string, string | undefined>;
    }) => React.ReactNode;
  }) => children({ anomaliesData: mockAnomalies, isLoadingAnomaliesData: false, jobNameById: {} }),
}));

jest.mock('../../../../explore/hosts/containers/hosts/details');
const mockUseHostDetails = useHostDetails as jest.Mock;

jest.mock('../../../../common/containers/related_entities/related_users');
const mockUseHostsRelatedUsers = useHostRelatedUsers as jest.Mock;

jest.mock('../../../../entity_analytics/api/hooks/use_risk_score');
const mockUseRiskScore = useRiskScore as jest.Mock;

jest.mock('../../../../explore/users/containers/users/observed_details');
const mockUseObservedUserDetails = useObservedUserDetails as jest.Mock;

jest.mock('../../../../common/containers/related_entities/related_hosts');
const mockUseUsersRelatedHosts = useUserRelatedHosts as jest.Mock;

const USER_TEST_ID = EXPANDABLE_PANEL_CONTENT_TEST_ID(USER_DETAILS_TEST_ID);
const HOST_TEST_ID = EXPANDABLE_PANEL_CONTENT_TEST_ID(HOST_DETAILS_TEST_ID);

const NO_DATA_MESSAGE = 'Host and user information are unavailable for this alert.';

const renderEntitiesDetails = (contextValue: DocumentDetailsContext) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={contextValue}>
        <EntitiesDetails />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('<EntitiesDetails />', () => {
  beforeEach(() => {
    mockUseMlUserPermissions.mockReturnValue({ isPlatinumOrTrialLicense: false, capabilities: {} });
    mockUseHasSecurityCapability.mockReturnValue(false);
    mockUseHostDetails.mockReturnValue([false, {}]);
    mockUseRiskScore.mockReturnValue({ data: [], isAuthorized: false });
    mockUseHostsRelatedUsers.mockReturnValue({
      inspect: jest.fn(),
      refetch: jest.fn(),
      relatedUsers: [],
      loading: false,
    });
    mockUseObservedUserDetails.mockReturnValue([false, {}]);
    mockUseUsersRelatedHosts.mockReturnValue({
      inspect: jest.fn(),
      refetch: jest.fn(),
      relatedHosts: [],
      loading: false,
    });
  });

  it('renders entities details correctly', () => {
    const { getByTestId, queryByText } = renderEntitiesDetails(mockContextValue);
    expect(getByTestId(ENTITIES_DETAILS_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(USER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(HOST_TEST_ID)).toBeInTheDocument();
    expect(queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
  });

  it('should render no data message if user name and host name are not available', () => {
    const contextValue = {
      ...mockContextValue,
      getFieldsData: (fieldName: string) =>
        fieldName === '@timestamp' ? ['2022-07-25T08:20:18.966Z'] : [],
    };
    const { getByText, queryByTestId } = renderEntitiesDetails(contextValue);
    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
    expect(queryByTestId(USER_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(HOST_TEST_ID)).not.toBeInTheDocument();
  });

  it('does not render user and host details if @timestamp is not available', () => {
    const contextValue = {
      ...mockContextValue,
      getFieldsData: (fieldName: string) => {
        switch (fieldName) {
          case 'host.name':
            return ['host1'];
          case 'user.name':
            return ['user1'];
          default:
            return [];
        }
      },
    };
    const { getByText, queryByTestId } = renderEntitiesDetails(contextValue);
    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
    expect(queryByTestId(USER_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(HOST_TEST_ID)).not.toBeInTheDocument();
  });
});
