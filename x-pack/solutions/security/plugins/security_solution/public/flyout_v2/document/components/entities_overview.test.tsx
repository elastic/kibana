/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import {
  ENTITIES_HOST_OVERVIEW_TEST_ID,
  ENTITIES_USER_OVERVIEW_TEST_ID,
  INSIGHTS_ENTITIES_TEST_ID,
} from './test_ids';
import { EntitiesOverview } from './entities_overview';
import { TestProviders } from '../../../common/mock';
import { useFirstLastSeen } from '../../../common/containers/use_first_last_seen';
import { useObservedUserDetails } from '../../../explore/users/containers/users/observed_details';
import { useHostDetails } from '../../../explore/hosts/containers/hosts/details';
import {
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../shared/components/test_ids';
import { useRiskScore } from '../../../entity_analytics/api/hooks/use_risk_score';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { useEntityFromStore } from '../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import { useEventDetails } from '../../../flyout/document_details/shared/hooks/use_event_details';

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const actual = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...actual,
    useUiSetting: jest.fn(),
  };
});

jest.mock('../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(false),
}));

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

jest.mock('../../../flyout/entity_details/shared/hooks/use_entity_from_store');
jest.mock('../../../flyout/document_details/shared/hooks/use_event_details');

const mockUseGlobalTime = jest.fn().mockReturnValue({ from, to });
jest.mock('../../../common/containers/use_global_time', () => {
  return {
    useGlobalTime: (...props: unknown[]) => mockUseGlobalTime(...props),
  };
});

const mockUseSourcererDataView = jest.fn().mockReturnValue({ selectedPatterns });
jest.mock('../../../sourcerer/containers', () => {
  return {
    useSourcererDataView: (...props: unknown[]) => mockUseSourcererDataView(...props),
  };
});

const mockUseUserDetails = useObservedUserDetails as jest.Mock;
jest.mock('../../../explore/users/containers/users/observed_details');

const mockUseRiskScore = useRiskScore as jest.Mock;
jest.mock('../../../entity_analytics/api/hooks/use_risk_score');

const mockUseFirstLastSeen = useFirstLastSeen as jest.Mock;
jest.mock('../../../common/containers/use_first_last_seen');

const mockUseHostDetails = useHostDetails as jest.Mock;
jest.mock('../../../explore/hosts/containers/hosts/details');

const mockUseUiSetting = useUiSetting as jest.Mock;
const mockUseEntityFromStore = useEntityFromStore as jest.Mock;
const mockUseEventDetails = useEventDetails as jest.Mock;

const TOGGLE_ICON_TEST_ID = EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(INSIGHTS_ENTITIES_TEST_ID);
const TITLE_LINK_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(INSIGHTS_ENTITIES_TEST_ID);
const TITLE_ICON_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(INSIGHTS_ENTITIES_TEST_ID);
const TITLE_TEXT_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(INSIGHTS_ENTITIES_TEST_ID);

const buildHit = (source: Record<string, unknown>): DataTableRecord =>
  buildDataTableRecord({ _id: 'id-1', _index: 'idx-1', _source: source });

const renderEntitiesOverview = (props: {
  hit: DataTableRecord;
  dataAsNestedObject?: Ecs | null;
  onShowEntitiesDetails?: () => void;
  showIcon?: boolean;
}) =>
  render(
    <TestProviders>
      <EntitiesOverview {...props} />
    </TestProviders>
  );

const NO_DATA_MESSAGE = 'Host and user information are unavailable for this alert.';

const baseEcs: Ecs = {
  _id: 'id-1',
  _index: 'idx-1',
  timestamp: '2026-05-07T00:00:00.000Z',
  event: { kind: ['signal'] },
} as unknown as Ecs;

describe('<EntitiesOverview />', () => {
  beforeEach(() => {
    mockUseUiSetting.mockReturnValue(false);
    mockUseEntityFromStore.mockImplementation(() => ({
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
    mockUseEventDetails.mockReturnValue({ dataAsNestedObject: baseEcs, loading: false });
  });

  it('should render wrapper component with link when onShowEntitiesDetails is provided', () => {
    const hit = buildHit({ host: { name: 'host-name' }, user: { name: 'user1' } });
    const { getByTestId, queryByTestId } = renderEntitiesOverview({
      hit,
      onShowEntitiesDetails: jest.fn(),
    });

    expect(queryByTestId(TOGGLE_ICON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(TITLE_LINK_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(TITLE_LINK_TEST_ID)).toHaveTextContent('Entities');
    expect(getByTestId(TITLE_ICON_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(TITLE_TEXT_TEST_ID)).not.toBeInTheDocument();
  });

  it('should hide the link when onShowEntitiesDetails is not provided', () => {
    const hit = buildHit({ host: { name: 'host-name' }, user: { name: 'user1' } });
    const { getByTestId, queryByTestId } = renderEntitiesOverview({ hit });

    expect(queryByTestId(TITLE_LINK_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(TITLE_TEXT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(TITLE_TEXT_TEST_ID)).toHaveTextContent('Entities');
  });

  it('should hide the icon when showIcon is false', () => {
    const hit = buildHit({ host: { name: 'host-name' }, user: { name: 'user1' } });
    const { queryByTestId } = renderEntitiesOverview({
      hit,
      showIcon: false,
      onShowEntitiesDetails: jest.fn(),
    });
    expect(queryByTestId(TITLE_ICON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render user and host', () => {
    // User EUID on alert-shaped docs needs a non-IDP identity branch (e.g. host.id) alongside user.name.
    const dataAsNestedObject = {
      ...baseEcs,
      host: { id: ['host-id-for-user-euid'], name: ['host-name'] },
      user: { name: ['user1'] },
    } as unknown as Ecs;
    const hit = buildHit({ host: { name: 'host-name' }, user: { name: 'user1' } });

    const { getByTestId, queryByText } = renderEntitiesOverview({ hit, dataAsNestedObject });
    expect(getByTestId(ENTITIES_USER_OVERVIEW_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ENTITIES_HOST_OVERVIEW_TEST_ID)).toBeInTheDocument();
    expect(queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
  });

  it('should only render user when host name is null', () => {
    // Without host.* on the document, user identity must use an IDP-style branch (asset + module).
    const dataAsNestedObject = {
      ...baseEcs,
      host: {},
      user: { name: ['user1'] },
      event: { kind: ['asset'], module: ['okta'] },
    } as unknown as Ecs;
    const hit = buildHit({ user: { name: 'user1' } });

    const { queryByTestId, getByTestId, queryByText } = renderEntitiesOverview({
      hit,
      dataAsNestedObject,
    });

    expect(getByTestId(ENTITIES_USER_OVERVIEW_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(ENTITIES_HOST_OVERVIEW_TEST_ID)).not.toBeInTheDocument();
    expect(queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
  });

  it('should only render host when user name is null', () => {
    const dataAsNestedObject = {
      ...baseEcs,
      host: { name: ['host-name'] },
      user: {},
    } as unknown as Ecs;
    const hit = buildHit({ host: { name: 'host-name' } });

    const { queryByTestId, getByTestId, queryByText } = renderEntitiesOverview({
      hit,
      dataAsNestedObject,
    });

    expect(getByTestId(ENTITIES_HOST_OVERVIEW_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(ENTITIES_USER_OVERVIEW_TEST_ID)).not.toBeInTheDocument();
    expect(queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
  });

  it('should render no data message if both host name and user name are null/blank', () => {
    const dataAsNestedObject = { ...baseEcs, host: {}, user: {} } as unknown as Ecs;
    const hit = buildHit({});

    const { getByText } = renderEntitiesOverview({ hit, dataAsNestedObject });
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
    const dataAsNestedObject = {
      ...baseEcs,
      host: { id: ['host-id'], name: ['host-name'] },
      user: { name: ['user1'] },
    } as unknown as Ecs;
    const hit = buildHit({ host: { name: 'host-name' }, user: { name: 'user1' } });
    const { queryByText, getByTestId } = renderEntitiesOverview({ hit, dataAsNestedObject });
    expect(queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
    expect(getByTestId(ENTITIES_USER_OVERVIEW_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ENTITIES_HOST_OVERVIEW_TEST_ID)).toBeInTheDocument();
  });

  it('should use user.name as entity-store fallback when EUID identifiers are unavailable', () => {
    const userEntityRecord = {
      entity: { id: 'user:store-id', name: 'user1' },
      user: { name: ['user1'] },
    };
    mockUseUiSetting.mockReturnValue(true);
    mockUseEntityFromStore.mockImplementation(
      (params: Parameters<typeof useEntityFromStore>[0]) => {
        if (
          params.entityType === 'user' &&
          params.identityFields?.['user.name'] === 'user1' &&
          params.skip === false
        ) {
          return {
            entityRecord: userEntityRecord,
            entity: null,
            firstSeen: null,
            lastSeen: null,
            isLoading: false,
            error: null,
            refetch: jest.fn(),
          };
        }
        return {
          entityRecord: null,
          entity: null,
          firstSeen: null,
          lastSeen: null,
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        };
      }
    );

    const dataAsNestedObject = {
      ...baseEcs,
      host: {},
      user: { name: ['user1'] },
    } as unknown as Ecs;
    const hit = buildHit({ user: { name: 'user1' } });

    const { getByTestId } = renderEntitiesOverview({ hit, dataAsNestedObject });

    expect(mockUseEntityFromStore).toHaveBeenCalledWith(
      expect.objectContaining({
        identityFields: { 'user.name': 'user1' },
        skip: false,
      })
    );

    expect(getByTestId(ENTITIES_USER_OVERVIEW_TEST_ID)).toHaveTextContent('user1');
  });
});
