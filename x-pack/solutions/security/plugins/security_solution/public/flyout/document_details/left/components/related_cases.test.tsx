/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  CORRELATIONS_DETAILS_CASES_SECTION_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_CASES_SECTION_TEST_ID,
} from './test_ids';
import { RelatedCases } from './related_cases';
import { useFetchRelatedCases } from '../../shared/hooks/use_fetch_related_cases';
import {
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../../shared/components/test_ids';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { TestProviders } from '../../../../common/mock';
import { APP_UI_ID } from '../../../../../common';

jest.mock('../../shared/hooks/use_fetch_related_cases');

const mockNavigateToApp = jest.fn();
jest.mock('../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...original,
    useKibana: () => ({
      services: {
        application: {
          navigateToApp: mockNavigateToApp,
        },
      },
    }),
  };
});

const eventId = 'eventId';

const TOGGLE_ICON = EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(
  CORRELATIONS_DETAILS_CASES_SECTION_TEST_ID
);
const TITLE_ICON = EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(
  CORRELATIONS_DETAILS_CASES_SECTION_TEST_ID
);
const TITLE_TEXT = EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(
  CORRELATIONS_DETAILS_CASES_SECTION_TEST_ID
);

const renderRelatedCases = () =>
  render(
    <TestProviders>
      <RelatedCases eventId={eventId} />
    </TestProviders>
  );

describe('<RelatedCases />', () => {
  it('should render many related cases correctly', () => {
    (useFetchRelatedCases as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [
        {
          id: 'id1',
          title: 'title1',
          description: 'description1',
          status: 'open',
        },
        {
          id: 'id2',
          title: 'title2',
          description: 'description2',
          status: 'in-progress',
        },
        {
          id: 'id3',
          title: 'title3',
          description: 'description3',
          status: 'closed',
        },
      ],
      dataCount: 3,
    });

    const { getByTestId, getByText } = renderRelatedCases();
    expect(getByTestId(TOGGLE_ICON)).toBeInTheDocument();
    expect(getByTestId(TITLE_ICON)).toBeInTheDocument();
    expect(getByTestId(TITLE_TEXT)).toHaveTextContent('3 related cases');
    expect(getByTestId(CORRELATIONS_DETAILS_CASES_SECTION_TABLE_TEST_ID)).toBeInTheDocument();
    expect(getByText('title1')).toBeInTheDocument();
    expect(getByText('open')).toBeInTheDocument();
    expect(getByText('title2')).toBeInTheDocument();
    expect(getByText('in-progress')).toBeInTheDocument();
    expect(getByText('title3')).toBeInTheDocument();
    expect(getByText('closed')).toBeInTheDocument();
  });

  it('should open new tab when clicking on the case link', () => {
    (useFetchRelatedCases as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [
        {
          id: 'id',
          title: 'title',
          description: 'description',
          status: 'open',
        },
      ],
      dataCount: 1,
    });

    const { getByTestId } = renderRelatedCases();
    getByTestId('case-details-link').click();
    expect(mockNavigateToApp).toHaveBeenCalledWith(APP_UI_ID, {
      deepLinkId: SecurityPageName.case,
      path: '/id',
      openInNewTab: true,
    });
  });

  it('should render null if error', () => {
    (useFetchRelatedCases as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
    });

    const { container } = renderRelatedCases();
    expect(container).toBeEmptyDOMElement();
  });

  it('should render no data message', () => {
    (useFetchRelatedCases as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
      dataCount: 0,
    });

    const { getByText } = renderRelatedCases();
    expect(getByText('No related cases.')).toBeInTheDocument();
  });
});
