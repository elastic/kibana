/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { FilterManager } from '@kbn/data-plugin/public';
import { TestProviders } from '../../../../../../common/mock';
import { TimelineTabs } from '../../../../../../../common/types';
import { SuperTimelineQueryTabHeader } from './super_timeline_query_tab_header';
import { useQueryTabHeaderData } from './use_query_tab_header_data';

vi.mock('./use_query_tab_header_data', () => {
      const mocked = {
      useQueryTabHeaderData: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../search_or_filter', () => {
      const mocked = {
      StatefulSearchOrFilter: () => <div data-test-subj="mock-search-or-filter" />,
    };
      return { ...mocked, default: mocked };
    });

// InPortal renders its children but needs a node — render children directly in tests.
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
    vi.clearAllMocks();
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
