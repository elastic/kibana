/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { DocumentDetailsContext } from '../../shared/context';
import { mockContextValue } from '../../shared/mocks/mock_context';
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

jest.mock('../hooks/use_paginated_alerts');
jest.mock('../../../../data_view_manager/hooks/use_data_view');

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
            '@timestamp': ['2022-01-01'],
            'kibana.alert.rule.name': ['Rule1'],
            'kibana.alert.reason': ['Reason1'],
            'kibana.alert.severity': ['Severity1'],
          },
        },
      ],
    });

    const { getByTestId } = renderRelatedAttacks();
    expect(getByTestId(TOGGLE_ICON)).toBeInTheDocument();
    expect(getByTestId(TITLE_ICON)).toBeInTheDocument();
    expect(getByTestId(TITLE_TEXT)).toBeInTheDocument();
    expect(
      getByTestId(`${CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TEST_ID}InvestigateInTimeline`)
    ).toBeInTheDocument();
    expect(
      getByTestId(CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TABLE_TEST_ID)
    ).toBeInTheDocument();
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
