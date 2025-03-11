/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import React, { type RefObject } from 'react';
import TimelineResizableLayout from './resizable_layout';
import { DataLoadingState } from '@kbn/unified-data-table';
import { TimelineTabs } from '../../../../../common/types/timeline';
import type { DataView } from '@kbn/data-plugin/common';
import type {
  UnifiedFieldListSidebarContainerApi,
  UnifiedFieldListSidebarContainerProps,
} from '@kbn/unified-field-list';

const mockUnifiedFieldListContainerRef = {
  current: document.createElement('div'),
} as unknown as RefObject<UnifiedFieldListSidebarContainerApi>;
const container = document.createElement('div');
container.style.width = '1000px';
container.style.height = '1000px';
container.getBoundingClientRect = jest.fn(() => {
  return {
    width: 1000,
    height: 1000,
    x: 0,
    y: 0,
  } as DOMRect;
});
const mockDataView: DataView = {
  id: 'mock-data-view',
  fields: [],
} as unknown as DataView;

const TestComponent = () => {
  return (
    <TimelineResizableLayout
      unifiedFieldListSidebarContainerApi={null}
      container={container}
      columns={[]}
      currentColumnIds={[]}
      rowRenderers={[]}
      isDropAllowed={false}
      onDropFieldToTable={() => {}}
      onSort={() => {}}
      onSetColumnsTimeline={() => {}}
      events={[]}
      refetch={() => {}}
      onFieldEdited={() => {}}
      dataLoadingState={DataLoadingState.loaded}
      totalCount={0}
      onFetchMoreRecords={() => {}}
      activeTab={TimelineTabs.query}
      updatedAt={0}
      isTextBasedQuery={false}
      onAddFilter={() => {}}
      timelineId={''}
      itemsPerPage={0}
      itemsPerPageOptions={[]}
      sortingColumns={[]}
      unifiedFieldListContainerRef={mockUnifiedFieldListContainerRef}
      fieldListSidebarServices={
        {
          data: {
            dataViews: {
              get: jest.fn(),
            },
          },
        } as unknown as UnifiedFieldListSidebarContainerProps['services']
      }
      columnIds={[]}
      dataView={mockDataView}
      hasTimelineBeenOpenedOnce={false}
      onAddFieldToWorkspace={() => {}}
      onRemoveFieldFromWorkspace={() => {}}
      wrappedOnFieldEdited={() => Promise.resolve()}
    />
  );
};

describe('ResizableLayout', () => {
  it('should render without any issues', async () => {
    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('sidebar__panel')).toBeVisible();
    });
  });
});
