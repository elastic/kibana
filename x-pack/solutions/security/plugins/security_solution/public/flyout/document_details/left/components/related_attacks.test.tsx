/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { TestProviders } from '../../../../common/mock';
import { DocumentDetailsContext } from '../../shared/context';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { mockFlyoutApi } from '../../shared/mocks/mock_flyout_context';
import {
  CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TEST_ID,
  CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TABLE_TEST_ID,
} from './test_ids';
import { RelatedAttacks } from './related_attacks';
import {
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../../../flyout_v2/shared/components/test_ids';
import { usePaginatedAlerts } from '../hooks/use_paginated_alerts';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { getMockDataViewWithMatchedIndices } from '../../../../data_view_manager/mocks/mock_data_view';
import { AttackDetailsPreviewPanelKey } from '../../../attack_details/constants/panel_keys';

jest.mock('../hooks/use_paginated_alerts');
jest.mock('../../../../data_view_manager/hooks/use_data_view');
jest.mock('@kbn/expandable-flyout');

const attackIds = ['attack-id-1'];
const scopeId = 'scopeId';
const eventId = 'event-id';

const TOGGLE_ICON = EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(
  CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TEST_ID
);
const TITLE_ICON = EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(
  CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TEST_ID
);
const TITLE_TEXT = EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(
  CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TEST_ID
);

const renderRelatedAttacks = () =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={mockContextValue}>
        <RelatedAttacks attackIds={attackIds} scopeId={scopeId} eventId={eventId} />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('<RelatedAttacks />', () => {
  beforeEach(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
    jest.mocked(mockFlyoutApi.openPreviewPanel).mockReset();
    jest.mocked(useDataView).mockReturnValue({
      dataView: getMockDataViewWithMatchedIndices([
        '.alerts-security.attack.discovery.alerts-default',
      ]),
      status: 'ready',
    });
  });

  it('should render related attacks correctly', () => {
    (usePaginatedAlerts as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [
        {
          _id: 'attack-id-1',
          _index: 'index',
          fields: {
            'kibana.alert.attack_discovery.title': ['Attack 1'],
            'kibana.alert.workflow_status': ['open'],
            'kibana.alert.attack_discovery.alert_ids': ['alert-1', 'alert-2'],
          },
        },
      ],
    });

    const { getAllByTestId, getByTestId } = renderRelatedAttacks();
    expect(getByTestId(TOGGLE_ICON)).toBeInTheDocument();
    expect(getByTestId(TITLE_ICON)).toBeInTheDocument();
    expect(getByTestId(TITLE_TEXT)).toBeInTheDocument();
    expect(
      getByTestId(`${CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TEST_ID}InvestigateInTimeline`)
    ).toBeInTheDocument();
    expect(
      getAllByTestId(`${CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TEST_ID}AlertPreviewButton`)
    ).toHaveLength(1);
    getAllByTestId(
      `${CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TEST_ID}AlertPreviewButton`
    )[0].click();
    expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
      id: AttackDetailsPreviewPanelKey,
      params: {
        attackId: 'attack-id-1',
        indexName: 'index',
        banner: {
          backgroundColor: 'warning',
          textColor: 'warning',
          title: 'Preview attack details',
        },
      },
    });
    expect(
      getByTestId(CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TABLE_TEST_ID)
    ).toBeInTheDocument();
    expect(
      getByTestId(CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TABLE_TEST_ID)
    ).toHaveTextContent('Attack 1');
    expect(
      getByTestId(CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TABLE_TEST_ID)
    ).toHaveTextContent('open');
    expect(
      getByTestId(CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TABLE_TEST_ID)
    ).toHaveTextContent('2');
  });

  it('should render no data message', () => {
    (usePaginatedAlerts as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
    });

    const { getByText } = renderRelatedAttacks();
    expect(getByText('No related attacks.')).toBeInTheDocument();
  });
});
