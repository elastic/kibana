/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiDataGridProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiHideFor, useEuiTheme } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { generateFilters } from '@kbn/data-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-plugin/common';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import type { DataLoadingState, UnifiedDataTableProps } from '@kbn/unified-data-table';
import { useColumns } from '@kbn/unified-data-table';
import { popularizeField } from '@kbn/unified-data-table/src/utils/popularize_field';
import type { DropType } from '@kbn/dom-drag-drop';
import { DropOverlayWrapper, Droppable, useDragDropContext } from '@kbn/dom-drag-drop';
import styled from 'styled-components';
import { css } from '@emotion/react';
import type {
  UnifiedFieldListSidebarContainerApi,
  UnifiedFieldListSidebarContainerProps,
} from '@kbn/unified-field-list';
import { UnifiedFieldListSidebarContainer } from '@kbn/unified-field-list';
import type { EuiTheme } from '@kbn/react-kibana-context-styled';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { withDataView } from '../../../../common/components/with_data_view';
import { EventDetailsWidthProvider } from '../../../../common/components/events_viewer/event_details_width_context';
import type { TimelineItem } from '../../../../../common/search_strategy';
import { useKibana } from '../../../../common/lib/kibana';
import type {
  ColumnHeaderOptions,
  OnFetchMoreRecords,
  RowRenderer,
  SortColumnTimeline,
  TimelineTabs,
} from '../../../../../common/types/timeline';
import type { inputsModel } from '../../../../common/store';
import { getColumnHeader } from '../body/column_headers/helpers';
import { StyledMainEuiPanel, StyledPageContentWrapper } from './styles';
import { DRAG_DROP_FIELD } from './data_table/translations';
import { TimelineResizableLayout } from './resizable_layout';
import TimelineDataTable from './data_table';
import { timelineActions } from '../../../store';
import { getFieldsListCreationOptions } from './get_fields_list_creation_options';
import { defaultUdtHeaders } from '../body/column_headers/default_headers';
import { getTimelineShowStatusByIdSelector } from '../../../store/selectors';

const TimelineBodyContainer = styled.div.attrs(({ className = '' }) => ({
  className: `${className}`,
}))`
  width: 100%;
  height: 100%;
`;

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

const SidebarPanelFlexGroup = styled(EuiFlexGroup)`
  height: 100%;

  .unifiedFieldListSidebar {
    padding-bottom: ${(props) => (props.theme as EuiTheme).eui.euiSizeS};
    padding-left: 0px;
    border-top: 1px solid ${(props) => (props.theme as EuiTheme).eui.euiColorLightShade};

    .unifiedFieldListSidebar__group {
      .euiFlexItem:last-child {
        /* padding-right: ${(props) => (props.theme as EuiTheme).eui.euiSizeS}; */
      }

      .unifiedFieldListSidebar__list {
        padding-left: 0px;
      }

      .unifiedFieldListSidebar__addBtn {
        margin-right: ${(props) => (props.theme as EuiTheme).eui.euiSizeS};
      }
    }
  }
`;

export const SAMPLE_SIZE_SETTING = 500;
export const HIDE_FOR_SIZES = ['xs', 's'];

interface Props {
  columns: ColumnHeaderOptions[];
  isSortEnabled?: boolean;
  rowRenderers: RowRenderer[];
  timelineId: string;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  sort: SortColumnTimeline[];
  events: TimelineItem[];
  refetch: inputsModel.Refetch;
  totalCount: number;
  onFetchMoreRecords: OnFetchMoreRecords;
  activeTab: TimelineTabs;
  dataLoadingState: DataLoadingState;
  updatedAt: number;
  isTextBasedQuery?: boolean;
  dataView: DataView;
  trailingControlColumns?: EuiDataGridProps['trailingControlColumns'];
  leadingControlColumns?: EuiDataGridProps['leadingControlColumns'];
  onUpdatePageIndex?: UnifiedDataTableProps['onUpdatePageIndex'];
}

const UnifiedTimelineComponent: React.FC<Props> = ({
  columns,
  isSortEnabled,
  activeTab,
  timelineId,
  itemsPerPage,
  itemsPerPageOptions,
  rowRenderers,
  sort,
  events,
  refetch,
  dataLoadingState,
  totalCount,
  onFetchMoreRecords,
  updatedAt,
  isTextBasedQuery,
  dataView,
  trailingControlColumns,
  leadingControlColumns,
  onUpdatePageIndex,
}) => {
  const { euiTheme } = useEuiTheme();
  const dispatch = useDispatch();
  const unifiedFieldListContainerRef = useRef<UnifiedFieldListSidebarContainerApi>(null);

  const {
    services: {
      uiSettings,
      fieldFormats,
      dataViews,
      dataViewFieldEditor,
      application: { capabilities },
      uiActions,
      charts,
      docLinks,
      analytics,
      timelineDataService,
    },
  } = useKibana();
  const {
    query: { filterManager: timelineFilterManager },
  } = timelineDataService;

  const fieldListSidebarServices: UnifiedFieldListSidebarContainerProps['services'] = useMemo(
    () => ({
      fieldFormats,
      dataViews,
      dataViewFieldEditor,
      data: timelineDataService,
      uiActions,
      charts,
      core: {
        analytics,
        uiSettings,
        docLinks,
      } as CoreStart,
    }),
    [
      fieldFormats,
      dataViews,
      dataViewFieldEditor,
      timelineDataService,
      uiActions,
      charts,
      uiSettings,
      docLinks,
      analytics,
    ]
  );

  const [sidebarContainer, setSidebarContainer] = useState<HTMLDivElement | null>(null);
  const [, setMainContainer] = useState<HTMLDivElement | null>(null);

  const columnIds = useMemo(() => {
    return columns.map((c) => c.id);
  }, [columns]);

  const sortingColumns = useMemo(() => {
    return (
      (sort?.map((sortingCol) => [
        sortingCol.columnId,
        sortingCol.sortDirection as 'asc' | 'desc',
      ]) as SortOrder[]) || []
    );
  }, [sort]);

  const onSort = useCallback(
    (nextSort: string[][]) => {
      dispatch(
        timelineActions.updateSort({
          id: timelineId,
          sort: nextSort.map(([id, direction]) => {
            const currentColumn = columns.find((column) => column.id === id);
            const columnType = currentColumn ? currentColumn.type : 'keyword';
            return {
              columnId: id,
              columnType,
              sortDirection: direction,
              // esTypes is needed so that the sort object remains consistent with the
              // default sort value and does not creates an unnecessary search request
              esTypes: id === '@timestamp' ? ['date'] : [],
            } as SortColumnTimeline;
          }),
        })
      );
    },
    [dispatch, timelineId, columns]
  );

  const setAppState = useCallback(
    (newState: { columns: string[]; sort?: string[][] }) => {
      if (newState.sort) {
        onSort(newState.sort);
      } else {
        const columnsStates = newState.columns.map((columnId) =>
          getColumnHeader(columnId, defaultUdtHeaders)
        );
        dispatch(timelineActions.updateColumns({ id: timelineId, columns: columnsStates }));
      }
    },
    [dispatch, onSort, timelineId]
  );

  const {
    columns: currentColumnIds,
    onAddColumn,
    onRemoveColumn,
    onSetColumns,
  } = useColumns({
    capabilities,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    dataView: dataView!,
    dataViews,
    setAppState,
    columns: columnIds,
    sort: sortingColumns,
  });

  const onSetColumnsTimeline = useCallback(
    (nextColumns: string[]) => {
      const shouldUnifiedTableKeepColumnsUnchanged = true;
      // to support the legacy table, unified table has the ability to automatically
      // prepend timestamp field column to the table. We do not want that, otherwise
      // the list of columns returned does not have timestamp field because unifiedDataTable assumes that
      // it is automatically available in the table.
      onSetColumns(nextColumns, shouldUnifiedTableKeepColumnsUnchanged);
    },
    [onSetColumns]
  );

  const onAddFilter = useCallback(
    (field: DataViewField | string, values: unknown, operation: '+' | '-') => {
      if (dataView && timelineFilterManager) {
        const fieldName = typeof field === 'string' ? field : field.name;
        popularizeField(dataView, fieldName, dataViews, capabilities);
        const newFilters = generateFilters(
          timelineFilterManager,
          field,
          values,
          operation,
          dataView
        );
        return timelineFilterManager.addFilters(newFilters);
      }
    },
    [timelineFilterManager, dataView, dataViews, capabilities]
  );

  const [{ dragging }] = useDragDropContext();
  const draggingFieldName = dragging?.id;

  const onToggleColumn = useCallback(
    (columnId: string) => {
      dispatch(
        timelineActions.upsertColumn({
          column: getColumnHeader(columnId, defaultUdtHeaders),
          id: timelineId,
          index: 1,
        })
      );
    },
    [dispatch, timelineId]
  );

  const isDropAllowed = useMemo(() => {
    if (!draggingFieldName || columnIds.includes(draggingFieldName)) {
      return false;
    }
    return true;
  }, [draggingFieldName, columnIds]);

  const onDropFieldToTable = useCallback(() => {
    if (draggingFieldName) {
      onAddColumn(draggingFieldName);
      onToggleColumn(draggingFieldName);
    }
  }, [draggingFieldName, onAddColumn, onToggleColumn]);

  const onAddFieldToWorkspace = useCallback(
    (field: DataViewField) => {
      onAddColumn(field.name);
      onToggleColumn(field.name);
    },
    [onAddColumn, onToggleColumn]
  );

  const onRemoveFieldFromWorkspace = useCallback(
    (field: DataViewField) => {
      if (columns.some(({ id }) => id === field.name)) {
        dispatch(
          timelineActions.removeColumn({
            columnId: field.name,
            id: timelineId,
          })
        );
      }
      onRemoveColumn(field.name);
    },
    [columns, dispatch, onRemoveColumn, timelineId]
  );

  const onFieldEdited = useCallback(() => {
    refetch();
  }, [refetch]);

  const wrappedOnFieldEdited = useCallback(async () => {
    onFieldEdited();
  }, [onFieldEdited]);

  // PERFORMANCE ONLY CODE BLOCK
  /**
   * We check for the timeline open status to request the fields for the fields browser as the fields request
   * is often a much longer running request for customers with a significant number of indices and fields in those indices.
   * This request should only be made after the user has decided to interact with timeline to prevent any performance impacts
   * to the underlying security solution views, as this query will always run when the timeline exists on the page.
   *
   * `hasTimelineBeenOpenedOnce` - We want to keep timeline loading times as fast as possible after the user
   * has chosen to interact with timeline at least once, so we use this flag to prevent re-requesting of this fields data
   * every time timeline is closed and re-opened after the first interaction.
   */

  const getTimelineShowStatus = useMemo(() => getTimelineShowStatusByIdSelector(), []);
  const { show } = useDeepEqualSelector((state) => getTimelineShowStatus(state, timelineId));

  const [hasTimelineBeenOpenedOnce, setHasTimelineBeenOpenedOnce] = useState(false);

  useEffect(() => {
    if (!hasTimelineBeenOpenedOnce && show) {
      setHasTimelineBeenOpenedOnce(true);
    }
  }, [hasTimelineBeenOpenedOnce, show]);

  // END PERFORMANCE ONLY CODE BLOCK

  return (
    <TimelineBodyContainer className="timelineBodyContainer" ref={setSidebarContainer}>
      <TimelineResizableLayout
        container={sidebarContainer}
        unifiedFieldListSidebarContainerApi={unifiedFieldListContainerRef.current}
        sidebarPanel={
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
        }
        mainPanel={
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
        }
      />
    </TimelineBodyContainer>
  );
};

export const UnifiedTimeline = React.memo(withDataView<Props>(UnifiedTimelineComponent));
// eslint-disable-next-line import/no-default-export
export { UnifiedTimeline as default };
