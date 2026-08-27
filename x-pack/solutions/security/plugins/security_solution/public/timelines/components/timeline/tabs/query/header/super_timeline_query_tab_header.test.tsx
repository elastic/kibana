/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { FilterManager } from '@kbn/data-plugin/public';
import { TestProviders } from '../../../../../../common/mock';
import { TimelineTabs } from '../../../../../../../common/types';
import { SuperTimelineQueryTabHeader } from './super_timeline_query_tab_header';
import { useQueryTabHeaderData } from './use_query_tab_header_data';

jest.mock('./use_query_tab_header_data', () => ({
  useQueryTabHeaderData: jest.fn(),
}));

jest.mock('../../../search_or_filter', () => ({
  StatefulSearchOrFilter: () => <div data-test-subj="mock-search-or-filter" />,
}));

// InPortal renders its children but needs a node — render children directly in tests.
jest.mock('react-reverse-portal', () => ({
  InPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockUseQueryTabHeaderData = useQueryTabHeaderData as jest.MockedFunction<
  typeof useQueryTabHeaderData
>;

const mockUiSettings = coreMock.createStart().uiSettings;

describe('SuperTimelineQueryTabHeader', () => {
  const filterManager = new FilterManager(mockUiSettings);

  const defaultProps = {
    activeTab: TimelineTabs.query,
    filterManager,
    showEventsCountBadge: false,
    timelineId: 'test-timeline',
    totalCount: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryTabHeaderData.mockReturnValue({
      timelineEventsCountPortalNode: null as never,
      shouldShowQueryBuilder: false,
    });
  });

  it('renders StatefulSearchOrFilter', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SuperTimelineQueryTabHeader {...defaultProps} />
      </TestProviders>
    );

    expect(getByTestId('mock-search-or-filter')).toBeInTheDocument();
  });

  it('does NOT render any EuiCallOut', () => {
    const { container } = render(
      <TestProviders>
        <SuperTimelineQueryTabHeader {...defaultProps} />
      </TestProviders>
    );

    // EuiCallOut renders with role="group" when color is set, or an icon/title structure
    expect(container.querySelector('[data-test-subj="timelineCallOutUnauthorized"]')).toBeNull();
    expect(container.querySelector('[data-test-subj="timelineImmutableCallOut"]')).toBeNull();
  });

  it('does NOT render DataProviders', () => {
    const { container } = render(
      <TestProviders>
        <SuperTimelineQueryTabHeader {...defaultProps} />
      </TestProviders>
    );

    expect(container.querySelector('[data-test-subj="dataProviders"]')).toBeNull();
  });
});
