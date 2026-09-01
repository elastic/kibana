/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineTabs } from '../../../../../common/types';
import { DataLoadingState } from '@kbn/unified-data-table';
import React from 'react';
import { UnifiedTimeline } from '../unified_components';
import { defaultUdtHeaders } from './column_headers/default_headers';
import type { UnifiedTimelineBodyProps } from './unified_timeline_body';
import { UnifiedTimelineBody } from './unified_timeline_body';
import { render } from '@testing-library/react';
import { defaultHeaders, mockTimelineData, TestProviders } from '../../../../common/mock';

jest.mock('../unified_components', () => {
  return {
    UnifiedTimeline: jest.fn(),
  };
});

const mockEventsData = structuredClone(mockTimelineData);

const defaultProps: UnifiedTimelineBodyProps = {
  activeTab: TimelineTabs.query,
  columns: defaultUdtHeaders,
  dataLoadingState: DataLoadingState.loading,
  events: mockEventsData,
  header: <div />,
  isTextBasedQuery: false,
  itemsPerPage: 25,
  itemsPerPageOptions: [10, 25, 50],
  onFetchMoreRecords: jest.fn(),
  refetch: jest.fn(),
  rowRenderers: [],
  sort: [],
  timelineId: 'timeline-1',
  totalCount: 0,
  updatedAt: 0,
  onUpdatePageIndex: jest.fn(),
};

const renderTestComponents = (props?: UnifiedTimelineBodyProps) => {
  return render(<UnifiedTimelineBody {...defaultProps} {...props} />, {
    wrapper: TestProviders,
  });
};

const MockUnifiedTimelineComponent = jest.fn(() => <div />);

describe('UnifiedTimelineBody', () => {
  beforeEach(() => {
    (UnifiedTimeline as unknown as jest.Mock).mockImplementation(MockUnifiedTimelineComponent);
  });

  it('should pass default columns when empty column list is supplied', () => {
    const newProps = { ...defaultProps, columns: [] };
    renderTestComponents(newProps);

    expect(MockUnifiedTimelineComponent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        columns: [],
      }),
      {}
    );
  });

  it('should pass custom columns when supplied', () => {
    const newProps = { ...defaultProps, columns: defaultHeaders };
    renderTestComponents(newProps);

    expect(MockUnifiedTimelineComponent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        columns: defaultHeaders,
      }),
      {}
    );
  });
});
