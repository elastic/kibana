/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

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

vi.mock('./use_query_tab_header_data', () => {
  const mocked = {
    useQueryTabHeaderData: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../hooks/use_show_alerts_only_migration_message', () => {
  const mocked = {
    useShouldShowAlertsOnlyMigrationMessage: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../search_or_filter', () => {
  const mocked = {
    StatefulSearchOrFilter: () => <div data-test-subj="mock-search-or-filter" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../data_providers', () => {
  const mocked = {
    DataProviders: () => <div data-test-subj="mock-data-providers" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./migration_message_callout', () => {
  const mocked = {
    MigrationMessageCallout: () => <div data-test-subj="mock-migration-callout" />,
  };
  return { ...mocked, default: mocked };
});

// InPortal renders children directly in tests.
vi.mock('react-reverse-portal', () => {
  const mocked = {
    InPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
  return { ...mocked, default: mocked };
});

const mockUseQueryTabHeaderData = useQueryTabHeaderData as MockedFunction<
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
    vi.clearAllMocks();
    mockUseQueryTabHeaderData.mockReturnValue({
      timelineEventsCountPortalNode: null as never,
      shouldShowQueryBuilder: false,
    });
    (useShouldShowAlertsOnlyMigrationMessage as Mock).mockReturnValue(false);
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
