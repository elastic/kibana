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
import { TimelineStatusEnum } from '../../../../../../../common/api/timeline';
import { useShouldShowAlertsOnlyMigrationMessage } from '../hooks/use_show_alerts_only_migration_message';
import { RegularQueryTabHeader } from './regular_query_tab_header';
import { useQueryTabHeaderData } from './use_query_tab_header_data';

jest.mock('./use_query_tab_header_data', () => ({
  useQueryTabHeaderData: jest.fn(),
}));
jest.mock('../hooks/use_show_alerts_only_migration_message', () => ({
  useShouldShowAlertsOnlyMigrationMessage: jest.fn(),
}));

jest.mock('../../../search_or_filter', () => ({
  StatefulSearchOrFilter: () => <div data-test-subj="mock-search-or-filter" />,
}));

jest.mock('../../../data_providers', () => ({
  DataProviders: () => <div data-test-subj="mock-data-providers" />,
}));

jest.mock('./migration_message_callout', () => ({
  MigrationMessageCallout: () => <div data-test-subj="mock-migration-callout" />,
}));

// InPortal renders children directly in tests.
jest.mock('react-reverse-portal', () => ({
  InPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockUseQueryTabHeaderData = useQueryTabHeaderData as jest.MockedFunction<
  typeof useQueryTabHeaderData
>;

const mockUiSettings = coreMock.createStart().uiSettings;

describe('RegularQueryTabHeader', () => {
  const filterManager = new FilterManager(mockUiSettings);

  const defaultProps = {
    activeTab: TimelineTabs.query,
    currentIndices: ['index-1'],
    dataViewId: null,
    filterManager,
    show: false,
    showCallOutUnauthorizedMsg: false,
    showEventsCountBadge: false,
    status: TimelineStatusEnum.active,
    timelineId: 'test-timeline',
    totalCount: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryTabHeaderData.mockReturnValue({
      timelineEventsCountPortalNode: null as never,
      shouldShowQueryBuilder: false,
    });
    (useShouldShowAlertsOnlyMigrationMessage as jest.Mock).mockReturnValue(false);
  });

  it('renders StatefulSearchOrFilter', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RegularQueryTabHeader {...defaultProps} />
      </TestProviders>
    );

    expect(getByTestId('mock-search-or-filter')).toBeInTheDocument();
  });

  it('renders the unauthorized callout when showCallOutUnauthorizedMsg is true', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RegularQueryTabHeader {...defaultProps} showCallOutUnauthorizedMsg={true} />
      </TestProviders>
    );

    expect(getByTestId('timelineCallOutUnauthorized')).toBeInTheDocument();
  });

  it('does NOT render the unauthorized callout when showCallOutUnauthorizedMsg is false', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <RegularQueryTabHeader {...defaultProps} showCallOutUnauthorizedMsg={false} />
      </TestProviders>
    );

    expect(queryByTestId('timelineCallOutUnauthorized')).not.toBeInTheDocument();
  });

  it('renders the immutable callout when status is immutable', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RegularQueryTabHeader {...defaultProps} status={TimelineStatusEnum.immutable} />
      </TestProviders>
    );

    expect(getByTestId('timelineImmutableCallOut')).toBeInTheDocument();
  });

  it('renders DataProviders when show is true', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RegularQueryTabHeader {...defaultProps} show={true} />
      </TestProviders>
    );

    expect(getByTestId('mock-data-providers')).toBeInTheDocument();
  });

  it('does NOT render DataProviders when show is false', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <RegularQueryTabHeader {...defaultProps} show={false} />
      </TestProviders>
    );

    expect(queryByTestId('mock-data-providers')).not.toBeInTheDocument();
  });
});
