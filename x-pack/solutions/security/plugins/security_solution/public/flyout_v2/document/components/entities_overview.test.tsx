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
import { mockGetFieldsData } from '../../shared/mocks/mock_get_fields_data';
import type { GetFieldsData } from '../../shared/hooks/use_get_fields_data';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import {
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../../../flyout_v2/shared/components/test_ids';
import { useRiskScore } from '../../../../entity_analytics/api/hooks/use_risk_score';
import { useNavigateToLeftPanel } from '../../shared/hooks/use_navigate_to_left_panel';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { useEntityFromStore } from '../../../entity_details/shared/hooks/use_entity_from_store';

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const actual = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...actual,
    useUiSetting: jest.fn(),
  };
});

jest.mock('@kbn/entity-store/public', () => {
  const actual = jest.requireActual('@kbn/entity-store/public');
  const { euid } = jest.requireActual('@kbn/entity-store/common/euid_helpers');
  return {
    ...actual,
    useEntityStoreEuidApi: jest.fn(() => ({ euid })),
  };
});

const from = '2022-04-05T12:00:00.000Z';
const to = '2022-04-08T12:00:00.000Z';
const selectedPatterns = 'alerts';

jest.mock('../../../entity_details/shared/hooks/use_entity_from_store');
jest.mock('../../shared/hooks/use_navigate_to_left_panel');

const mockUseGlobalTime = jest.fn().mockReturnValue({ from, to });
jest.mock('../../../../common/containers/use_global_time', () => {
  return {
    useGlobalTime: (...props: unknown[]) => mockUseGlobalTime(...props),
  };
});

const mockUseSourcererDataView = jest.fn().mockReturnValue({ selectedPatterns });
jest.mock('../../../../sourcerer/containers', () => {
  return {
    useSourcererDataView: (...props: unknown[]) => mockUseSourcererDataView(...props),
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

const mockUseUiSetting = useUiSetting as jest.Mock;
const mockUseEntityFromStore = useEntityFromStore as jest.Mock;

const TOGGLE_ICON_TEST_ID = EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(INSIGHTS_ENTITIES_TEST_ID);
const TITLE_LINK_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(INSIGHTS_ENTITIES_TEST_ID);
const TITLE_ICON_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(INSIGHTS_ENTITIES_TEST_ID);
const TITLE_TEXT_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(INSIGHTS_ENTITIES_TEST_ID);

const mockNavigateToLeftPanel = jest.fn();

const ecsScalarOrArrayToFieldValues = (value: unknown): string[] => {
  if (value == null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map(String);
  }
  return [String(value)];
};

/**
 * Keeps `getFieldsData('host.name' | 'user.name')` aligned with `dataAsNestedObject` so tests that
 * override nested ECS shapes stay consistent with field accessors (matches real flyout behavior).
 */
const getFieldsDataForNestedObject =
  (dataAsNestedObject: Ecs): GetFieldsData =>
  (field: string) => {
    if (field === 'host.name') {
      return ecsScalarOrArrayToFieldValues(dataAsNestedObject.host?.name);
    }
    if (field === 'user.name') {
      return ecsScalarOrArrayToFieldValues(dataAsNestedObject.user?.name);
    }
    return mockGetFieldsData(field);
  };

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
    mockUseUiSetting.mockReturnValue(false);
    mockUseEntityFromStore.mockImplementation(({ entityType }: { entityType: string }) => ({
      entityRecord: null,
      entity: null,
      firstSeen: null,
      lastSeen: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    }));
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
    // User EUID on alert-shaped docs needs a non-IDP identity branch (e.g. host.id) alongside user.name.
    const dataAsNestedObject = {
      ...mockContextValue.dataAsNestedObject,
      host: {
        id: ['host-id-for-user-euid'],
        name: ['host-name'],
      },
      user: { name: ['user1'] },
    };
    const contextValue = {
      ...mockContextValue,
      dataAsNestedObject,
      getFieldsData: getFieldsDataForNestedObject(dataAsNestedObject),
    } as unknown as DocumentDetailsContext;

    const { getByTestId, queryByText } = renderEntitiesOverview(contextValue);
    expect(getByTestId(ENTITIES_USER_OVERVIEW_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ENTITIES_HOST_OVERVIEW_TEST_ID)).toBeInTheDocument();
    expect(queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
  });

  it('should only render user when host name is null', () => {
    // Without host.* on the document, user identity must use an IDP-style branch (asset + module).
    const dataAsNestedObject = {
      ...mockContextValue.dataAsNestedObject,
      host: {},
      user: { name: ['user1'] },
      event: {
        ...mockContextValue.dataAsNestedObject.event,
        kind: ['asset'],
        module: ['okta'],
      },
    };
    const contextValue = {
      ...mockContextValue,
      dataAsNestedObject,
      getFieldsData: getFieldsDataForNestedObject(dataAsNestedObject),
    } as unknown as DocumentDetailsContext;

    const { queryByTestId, getByTestId, queryByText } = renderEntitiesOverview(contextValue);

    expect(getByTestId(ENTITIES_USER_OVERVIEW_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(ENTITIES_HOST_OVERVIEW_TEST_ID)).not.toBeInTheDocument();
    expect(queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
  });

  it('should only render host when user name is null', () => {
    const dataAsNestedObject = {
      ...mockContextValue.dataAsNestedObject,
      host: { name: ['host-name'] },
      user: {},
    };
    const contextValue = {
      ...mockContextValue,
      dataAsNestedObject,
      getFieldsData: getFieldsDataForNestedObject(dataAsNestedObject),
    } as unknown as DocumentDetailsContext;

    const { queryByTestId, getByTestId, queryByText } = renderEntitiesOverview(contextValue);

    expect(getByTestId(ENTITIES_HOST_OVERVIEW_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(ENTITIES_USER_OVERVIEW_TEST_ID)).not.toBeInTheDocument();
    expect(queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
  });

  it('should render no data message if both host name and user name are null/blank', () => {
    const dataAsNestedObject = {
      ...mockContextValue.dataAsNestedObject,
      host: {},
      user: {},
    };
    const contextValue = {
      ...mockContextValue,
      dataAsNestedObject,
      getFieldsData: getFieldsDataForNestedObject(dataAsNestedObject),
    } as unknown as DocumentDetailsContext;

    const { getByText } = renderEntitiesOverview(contextValue);
    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });

  it('should render user and host overviews from document fields when entity store v2 is enabled and no entity record exists', () => {
    mockUseUiSetting.mockReturnValue(true);
    mockUseEntityFromStore.mockReturnValue({
      entityRecord: null,
      entity: null,
      firstSeen: null,
      lastSeen: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    const { queryByText, getByTestId } = renderEntitiesOverview(mockContextValue);
    expect(queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
    expect(getByTestId(ENTITIES_USER_OVERVIEW_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ENTITIES_HOST_OVERVIEW_TEST_ID)).toBeInTheDocument();
  });
});
