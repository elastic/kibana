/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { DocumentDetailsContext } from '../../shared/context';
import {
  ENTITIES_HOST_OVERVIEW_TEST_ID,
  ENTITIES_USER_OVERVIEW_TEST_ID,
  INSIGHTS_ENTITIES_TEST_ID,
} from './test_ids';
import { EntitiesOverview } from './entities_overview';
import { TestProviders } from '../../../../common/mock';
import { useFirstLastSeen } from '../../../../common/containers/use_first_last_seen';
import { useObservedUserDetails } from '../../../../explore/users/containers/users/observed_details';
import { useHostDetails } from '../../../../explore/hosts/containers/hosts/details';
import { mockContextValue } from '../../shared/mocks/mock_context';
import {
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../../shared/components/test_ids';
import { useRiskScore } from '../../../../entity_analytics/api/hooks/use_risk_score';
import { useNavigateToLeftPanel } from '../../shared/hooks/use_navigate_to_left_panel';

const from = '2022-04-05T12:00:00.000Z';
const to = '2022-04-08T12:00:00.;000Z';

jest.mock('../../shared/hooks/use_navigate_to_left_panel');

const mockUseGlobalTime = jest.fn().mockReturnValue({ from, to });
jest.mock('../../../../common/containers/use_global_time', () => {
  return {
    useGlobalTime: (...props: unknown[]) => mockUseGlobalTime(...props),
  };
});

const mockUseUserDetails = useObservedUserDetails as jest.Mock;
jest.mock('../../../../explore/users/containers/users/observed_details');

const mockUseRiskScore = useRiskScore as jest.Mock;
jest.mock('../../../../entity_analytics/api/hooks/use_risk_score');

const mockUseFirstLastSeen = useFirstLastSeen as jest.Mock;
jest.mock('../../../../common/containers/use_first_last_seen');

const mockUseHostDetails = useHostDetails as jest.Mock;
jest.mock('../../../../explore/hosts/containers/hosts/details');

const TOGGLE_ICON_TEST_ID = EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(INSIGHTS_ENTITIES_TEST_ID);
const TITLE_LINK_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(INSIGHTS_ENTITIES_TEST_ID);
const TITLE_ICON_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(INSIGHTS_ENTITIES_TEST_ID);
const TITLE_TEXT_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(INSIGHTS_ENTITIES_TEST_ID);

const mockNavigateToLeftPanel = jest.fn();

const renderEntitiesOverview = (contextValue: DocumentDetailsContext) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={contextValue}>
        <EntitiesOverview />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

const NO_DATA_MESSAGE = 'Host and user information are unavailable for this alert.';

describe('<EntitiesOverview />', () => {
  beforeEach(() => {
    mockUseUserDetails.mockReturnValue([false, { userDetails: null }]);
    mockUseRiskScore.mockReturnValue({ data: null, isAuthorized: false });
    mockUseHostDetails.mockReturnValue([false, { hostDetails: null }]);
    mockUseFirstLastSeen.mockReturnValue([false, { lastSeen: null }]);
    (useNavigateToLeftPanel as jest.Mock).mockReturnValue(mockNavigateToLeftPanel);
  });
  it('should render wrapper component', () => {
    const { getByTestId, queryByTestId } = renderEntitiesOverview(mockContextValue);

    expect(queryByTestId(TOGGLE_ICON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(TITLE_LINK_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(TITLE_LINK_TEST_ID)).toHaveTextContent('Entities');
    expect(getByTestId(TITLE_ICON_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(TITLE_TEXT_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render link without icon if in preview mode', () => {
    const { getByTestId, queryByTestId } = renderEntitiesOverview({
      ...mockContextValue,
      isPreviewMode: true,
    });
    expect(queryByTestId(TOGGLE_ICON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(TITLE_LINK_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(TITLE_LINK_TEST_ID)).toHaveTextContent('Entities');
    expect(queryByTestId(TITLE_ICON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render user and host', () => {
    const { getByTestId, queryByText } = renderEntitiesOverview(mockContextValue);
    expect(getByTestId(ENTITIES_USER_OVERVIEW_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ENTITIES_HOST_OVERVIEW_TEST_ID)).toBeInTheDocument();
    expect(queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
  });

  it('should only render user when host name is null', () => {
    const contextValue = {
      ...mockContextValue,
      getFieldsData: (field: string) => (field === 'user.name' ? 'user1' : null),
    } as unknown as DocumentDetailsContext;

    const { queryByTestId, getByTestId, queryByText } = renderEntitiesOverview(contextValue);

    expect(getByTestId(ENTITIES_USER_OVERVIEW_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(ENTITIES_HOST_OVERVIEW_TEST_ID)).not.toBeInTheDocument();
    expect(queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
  });

  it('should only render host when user name is null', () => {
    const contextValue = {
      ...mockContextValue,
      getFieldsData: (field: string) => (field === 'host.name' ? 'host1' : null),
    } as unknown as DocumentDetailsContext;

    const { queryByTestId, getByTestId, queryByText } = renderEntitiesOverview(contextValue);

    expect(getByTestId(ENTITIES_HOST_OVERVIEW_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(ENTITIES_USER_OVERVIEW_TEST_ID)).not.toBeInTheDocument();
    expect(queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
  });

  it('should render no data message if both host name and user name are null/blank', () => {
    const contextValue = {
      ...mockContextValue,
      getFieldsData: (field: string) => {},
    } as unknown as DocumentDetailsContext;

    const { getByText } = renderEntitiesOverview(contextValue);
    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });
});
