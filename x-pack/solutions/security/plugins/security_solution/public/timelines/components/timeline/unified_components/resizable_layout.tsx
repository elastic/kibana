/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useIsWithinBreakpoints, EuiFlexItem, EuiHideFor, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  ResizableLayout,
  ResizableLayoutDirection,
  ResizableLayoutMode,
} from '@kbn/resizable-layout';

import type {
  UnifiedFieldListSidebarContainerApi,
  UnifiedFieldListSidebarContainerProps,
} from '@kbn/unified-field-list';
import { UnifiedFieldListSidebarContainer } from '@kbn/unified-field-list';
import { DropOverlayWrapper, Droppable } from '@kbn/dom-drag-drop';
import type { DropType } from '@kbn/dom-drag-drop';
import React, { useState } from 'react';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import type { UnifiedDataTableProps, DataLoadingState } from '@kbn/unified-data-table';
import type { DataView, DataViewField } from '@kbn/data-plugin/common';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import type { EuiDataGridProps } from '@elastic/eui';
import { EventDetailsWidthProvider } from '../../../../common/components/events_viewer/event_details_width_context';
import { StyledMainEuiPanel, StyledPageContentWrapper } from './styles';
import { getFieldsListCreationOptions } from './get_fields_list_creation_options';
import { DRAG_DROP_FIELD } from './data_table/translations';
import TimelineDataTable from './data_table';
import type {
  ColumnHeaderOptions,
  TimelineTabs,
  RowRenderer,
  OnFetchMoreRecords,
} from '../../../../../common/types/timeline';
import type { TimelineItem } from '../../../../../common/search_strategy';
import type { inputsModel } from '../../../../common/store';
import { SidebarPanelFlexGroup } from '.';

const DataGridMemoized = React.memo(TimelineDataTable);

const DROP_PROPS = {
  value: {
    id: 'dscDropZoneTable',
    humanData: {
      label: DRAG_DROP_FIELD,
    },
  },
  order: [1, 0, 0, 0],
  types: ['field_add'] as DropType[],
};
export const HIDE_FOR_SIZES = ['xs', 's'];

interface SideBarPanelProps {
  dataView: DataView;
  hasTimelineBeenOpenedOnce: boolean;
  unifiedFieldListContainerRef: React.RefObject<UnifiedFieldListSidebarContainerApi>;
  fieldListSidebarServices: UnifiedFieldListSidebarContainerProps['services'];
  columnIds: string[];
  onAddFieldToWorkspace: (field: DataViewField) => void;
  onRemoveFieldFromWorkspace: (field: DataViewField) => void;
  onAddFilter: DocViewFilterFn;
  wrappedOnFieldEdited: () => Promise<void>;
}

interface MainPanelProps {
  columns: ColumnHeaderOptions[];
  currentColumnIds: string[];
  rowRenderers: RowRenderer[];
  isDropAllowed: boolean;
  onDropFieldToTable: () => void;
  onSort: (nextSort: string[][]) => void;
  onSetColumnsTimeline: (nextColumns: string[]) => void;
  events: TimelineItem[];
  refetch: inputsModel.Refetch;
  onFieldEdited: () => void;
  dataLoadingState: DataLoadingState;
  totalCount: number;
  onFetchMoreRecords: OnFetchMoreRecords;
  activeTab: TimelineTabs;
  updatedAt: number;
  isTextBasedQuery?: boolean;
  onAddFilter: DocViewFilterFn;
  trailingControlColumns?: EuiDataGridProps['trailingControlColumns'];
  leadingControlColumns?: EuiDataGridProps['leadingControlColumns'];
  onUpdatePageIndex?: UnifiedDataTableProps['onUpdatePageIndex'];
  timelineId: string;
  isSortEnabled?: boolean;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  sortingColumns: SortOrder[];
}

const SideBarPanel = React.memo(
  ({
    dataView,
    hasTimelineBeenOpenedOnce,
    unifiedFieldListContainerRef,
    fieldListSidebarServices,
    columnIds,
    onAddFieldToWorkspace,
    onRemoveFieldFromWorkspace,
    onAddFilter,
    wrappedOnFieldEdited,
  }: SideBarPanelProps) => {
    const { euiTheme } = useEuiTheme();
    return (
      <SidebarPanelFlexGroup gutterSize="none">
        <EuiFlexItem className="sidebarContainer">
          {dataView && hasTimelineBeenOpenedOnce ? (
            <UnifiedFieldListSidebarContainer
              ref={unifiedFieldListContainerRef}
              showFieldList
              variant="responsive"
              getCreationOptions={getFieldsListCreationOptions}
              services={fieldListSidebarServices}
              dataView={dataView}
              fullWidth
              allFields={dataView.fields}
              workspaceSelectedFieldNames={columnIds}
              onAddFieldToWorkspace={onAddFieldToWorkspace}
              onRemoveFieldFromWorkspace={onRemoveFieldFromWorkspace}
              onAddFilter={onAddFilter}
              onFieldEdited={wrappedOnFieldEdited}
            />
          ) : null}
        </EuiFlexItem>
        <EuiHideFor sizes={HIDE_FOR_SIZES}>
          <EuiFlexItem
            grow={false}
            css={css`
              border-right: ${euiTheme.border.thin};
            `}
          />
        </EuiHideFor>
      </SidebarPanelFlexGroup>
    );
  }
);

SideBarPanel.displayName = 'SideBarPanel';

const MainPanel = React.memo(
  ({
    columns,
    currentColumnIds,
    rowRenderers,
    isDropAllowed,
    onDropFieldToTable,
    onSort,
    onSetColumnsTimeline,
    events,
    refetch,
    onFieldEdited,
    dataLoadingState,
    totalCount,
    onFetchMoreRecords,
    activeTab,
    updatedAt,
    isTextBasedQuery,
    onAddFilter,
    trailingControlColumns,
    leadingControlColumns,
    onUpdatePageIndex,
    timelineId,
    isSortEnabled,
    itemsPerPage,
    itemsPerPageOptions,
    sortingColumns,
  }: MainPanelProps) => {
    const [, setMainContainer] = useState<HTMLDivElement | null>(null);

    return (
      <StyledPageContentWrapper>
        <StyledMainEuiPanel
          role="main"
          panelRef={setMainContainer}
          paddingSize="none"
          borderRadius="none"
          hasShadow={false}
          hasBorder={false}
          color="transparent"
        >
          <Droppable
            dropTypes={isDropAllowed ? DROP_PROPS.types : undefined}
            value={DROP_PROPS.value}
            order={DROP_PROPS.order}
            onDrop={onDropFieldToTable}
          >
            <DropOverlayWrapper isVisible={isDropAllowed}>
              <EventDetailsWidthProvider>
                <DataGridMemoized
                  columns={columns}
                  columnIds={currentColumnIds}
                  rowRenderers={rowRenderers}
                  timelineId={timelineId}
                  isSortEnabled={isSortEnabled}
                  itemsPerPage={itemsPerPage}
                  itemsPerPageOptions={itemsPerPageOptions}
                  sort={sortingColumns}
                  onSort={onSort}
                  onSetColumns={onSetColumnsTimeline}
                  events={events}
                  refetch={refetch}
                  onFieldEdited={onFieldEdited}
                  dataLoadingState={dataLoadingState}
                  totalCount={totalCount}
                  onFetchMoreRecords={onFetchMoreRecords}
                  activeTab={activeTab}
                  updatedAt={updatedAt}
                  isTextBasedQuery={isTextBasedQuery}
                  onFilter={onAddFilter as DocViewFilterFn}
                  trailingControlColumns={trailingControlColumns}
                  leadingControlColumns={leadingControlColumns}
                  onUpdatePageIndex={onUpdatePageIndex}
                />
              </EventDetailsWidthProvider>
            </DropOverlayWrapper>
          </Droppable>
        </StyledMainEuiPanel>
      </StyledPageContentWrapper>
    );
  }
);

MainPanel.displayName = 'MainPanel';

export const SIDEBAR_WIDTH_KEY = 'timeline:sidebarWidth';

// TODO: This is almost a duplicate of the logic here: src/plugins/discover/public/application/main/components/layout/discover_resizable_layout.tsx
// Should this layout be a shared package or just an accepted dupe since the <ResizeableLayout /> is already shared?

export const TimelineResizableLayoutComponent = ({
  container,
  // sidebarPanel,
  // mainPanel,
  unifiedFieldListSidebarContainerApi,
  dataView,
  hasTimelineBeenOpenedOnce,
  onAddFieldToWorkspace,
  onRemoveFieldFromWorkspace,
  wrappedOnFieldEdited,
  onAddFilter,
  trailingControlColumns,
  leadingControlColumns,
  onUpdatePageIndex,
  timelineId,
  isSortEnabled,
  itemsPerPage,
  itemsPerPageOptions,
  sortingColumns,
  unifiedFieldListContainerRef,
  fieldListSidebarServices,
  columnIds,
  columns,
  currentColumnIds,
  rowRenderers,
  isDropAllowed,
  onDropFieldToTable,
  onSort,
  onSetColumnsTimeline,
  events,
  refetch,
  onFieldEdited,
  dataLoadingState,
  totalCount,
  onFetchMoreRecords,
  activeTab,
  updatedAt,
  isTextBasedQuery,
}: {
  container: HTMLElement | null;
  // sidebarPanel: ReactNode;
  // mainPanel: ReactNode;
  columns: ColumnHeaderOptions[];
  currentColumnIds: string[];
  rowRenderers: RowRenderer[];
  isDropAllowed: boolean;
  onDropFieldToTable: () => void;
  onSort: (nextSort: string[][]) => void;
  onSetColumnsTimeline: (nextColumns: string[]) => void;
  events: TimelineItem[];
  refetch: inputsModel.Refetch;
  onFieldEdited: () => void;
  dataLoadingState: DataLoadingState;
  totalCount: number;
  onFetchMoreRecords: OnFetchMoreRecords;
  activeTab: TimelineTabs;
  updatedAt: number;
  isTextBasedQuery?: boolean;
  onAddFilter: DocViewFilterFn;
  trailingControlColumns?: EuiDataGridProps['trailingControlColumns'];
  leadingControlColumns?: EuiDataGridProps['leadingControlColumns'];
  onUpdatePageIndex?: UnifiedDataTableProps['onUpdatePageIndex'];
  timelineId: string;
  isSortEnabled?: boolean;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  sortingColumns: SortOrder[];
  unifiedFieldListSidebarContainerApi: UnifiedFieldListSidebarContainerApi | null;
  columnIds: string[];
  dataView: DataView;
  hasTimelineBeenOpenedOnce: boolean;
  onAddFieldToWorkspace: (field: DataViewField) => void;
  onRemoveFieldFromWorkspace: (field: DataViewField) => void;
  wrappedOnFieldEdited: () => Promise<void>;
  unifiedFieldListContainerRef: React.RefObject<UnifiedFieldListSidebarContainerApi>;
  fieldListSidebarServices: UnifiedFieldListSidebarContainerProps['services'];
}) => {
  const [sidebarPanelNode] = useState(() =>
    createHtmlPortalNode({ attributes: { class: 'eui-fullHeight sidebarPanel' } })
  );
  const [mainPanelNode] = useState(() =>
    createHtmlPortalNode({ attributes: { class: 'eui-fullHeight mainPanel' } })
  );

  const { euiTheme } = useEuiTheme();
  const minSidebarWidth = euiTheme.base * 13;
  const defaultSidebarWidth = euiTheme.base * 19;
  const minMainPanelWidth = euiTheme.base * 30;

  const [sidebarWidth, setSidebarWidth] = useLocalStorage(SIDEBAR_WIDTH_KEY, defaultSidebarWidth);

  const isMobile = useIsWithinBreakpoints(['xs', 's']);

  const isSidebarCollapsed = useObservable(
    unifiedFieldListSidebarContainerApi?.sidebarVisibility.isCollapsed$ ?? of(true),
    true
  );
  const layoutMode =
    isMobile || isSidebarCollapsed ? ResizableLayoutMode.Static : ResizableLayoutMode.Resizable;
  const layoutDirection = isMobile
    ? ResizableLayoutDirection.Vertical
    : ResizableLayoutDirection.Horizontal;

  return (
    <>
      <InPortal node={sidebarPanelNode}>
        <SideBarPanel
          dataView={dataView}
          hasTimelineBeenOpenedOnce={hasTimelineBeenOpenedOnce}
          unifiedFieldListContainerRef={unifiedFieldListContainerRef}
          fieldListSidebarServices={fieldListSidebarServices}
          columnIds={columnIds}
          onAddFieldToWorkspace={onAddFieldToWorkspace}
          onRemoveFieldFromWorkspace={onRemoveFieldFromWorkspace}
          onAddFilter={onAddFilter}
          wrappedOnFieldEdited={wrappedOnFieldEdited}
        />
      </InPortal>
      <InPortal node={mainPanelNode}>
        <MainPanel
          columns={columns}
          currentColumnIds={currentColumnIds}
          rowRenderers={rowRenderers}
          isDropAllowed={isDropAllowed}
          onDropFieldToTable={onDropFieldToTable}
          onSort={onSort}
          onSetColumnsTimeline={onSetColumnsTimeline}
          sortingColumns={sortingColumns}
          events={events}
          refetch={refetch}
          onFieldEdited={onFieldEdited}
          dataLoadingState={dataLoadingState}
          totalCount={totalCount}
          onFetchMoreRecords={onFetchMoreRecords}
          activeTab={activeTab}
          updatedAt={updatedAt}
          isTextBasedQuery={isTextBasedQuery}
          onAddFilter={onAddFilter}
          trailingControlColumns={trailingControlColumns}
          leadingControlColumns={leadingControlColumns}
          onUpdatePageIndex={onUpdatePageIndex}
          timelineId={timelineId}
          isSortEnabled={isSortEnabled}
          itemsPerPage={itemsPerPage}
          itemsPerPageOptions={itemsPerPageOptions}
        />
      </InPortal>
      <ResizableLayout
        className="timelineUnifiedComponentsBody__contents"
        mode={layoutMode}
        direction={layoutDirection}
        container={container}
        fixedPanelSize={sidebarWidth ?? defaultSidebarWidth}
        minFixedPanelSize={minSidebarWidth}
        minFlexPanelSize={minMainPanelWidth}
        fixedPanel={<OutPortal node={sidebarPanelNode} />}
        flexPanel={<OutPortal node={mainPanelNode} />}
        resizeButtonClassName="timelineSidebarResizeButton"
        data-test-subj="timelineUnifiedComponentsLayout"
        onFixedPanelSizeChange={setSidebarWidth}
      />
    </>
  );
};

export const TimelineResizableLayout = React.memo(TimelineResizableLayoutComponent);
// eslint-disable-next-line import/no-default-export
export { TimelineResizableLayout as default };
