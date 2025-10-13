/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { encode } from '@kbn/rison';
import { PageScope } from '../../../data_view_manager/constants';
import { useSelectedPatterns } from '../../../data_view_manager/hooks/use_selected_patterns';
import {
  RULE_FROM_EQL_URL_PARAM,
  RULE_FROM_TIMELINE_URL_PARAM,
} from '../../../detections/hooks/use_rule_from_timeline';
import { useNavigation } from '../../../common/lib/kibana';
import { SecurityPageName } from '../../../../common/constants';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import type { SortFieldTimeline } from '../../../../common/api/timeline';
import { TimelineId } from '../../../../common/types/timeline';
import type { TimelineModel } from '../../store/model';
import { timelineSelectors } from '../../store';
import { createTimeline as dispatchCreateNewTimeline } from '../../store/actions';
import { useGetAllTimeline } from '../../containers/all';
import { OpenTimeline } from './open_timeline';
import { OPEN_TIMELINE_CLASS_NAME, useQueryTimelineById } from './helpers';
import { OpenTimelineModalBody } from './open_timeline_modal/open_timeline_modal_body';
import type {
  ActionTimelineToShow,
  DeleteTimelines,
  EuiSearchBarQuery,
  OnCreateRuleFromTimeline,
  OnDeleteOneTimeline,
  OnDeleteSelected,
  OnOpenTimeline,
  OnQueryChange,
  OnSelectionChange,
  OnTableChange,
  OnTableChangeParams,
  OnToggleOnlyFavorites,
  OnToggleShowNotes,
  OpenTimelineProps,
  OpenTimelineResult,
} from './types';
import { DEFAULT_SORT_DIRECTION, DEFAULT_SORT_FIELD } from './constants';
import { useTimelineTypes } from './use_timeline_types';
import { useTimelineStatus } from './use_timeline_status';
import { deleteTimelinesByIds } from '../../containers/api';
import type { Direction } from '../../../../common/search_strategy';
import { useStartTransaction } from '../../../common/lib/apm/use_start_transaction';
import { TIMELINE_ACTIONS } from '../../../common/lib/apm/user_actions';
import { defaultUdtHeaders } from '../timeline/body/column_headers/default_headers';
import { timelineDefaults } from '../../store/defaults';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';

interface OwnProps<TCache = object> {
  /** Displays open timeline in modal */
  isModal: boolean;
  closeModalTimeline?: () => void;
  hideActions?: ActionTimelineToShow[];
  onOpenTimeline?: (timeline: TimelineModel) => void;
}

export type OpenTimelineOwnProps = OwnProps &
  Pick<
    OpenTimelineProps,
    'defaultPageSize' | 'title' | 'importDataModalToggle' | 'setImportDataModalToggle'
  >;

/** Returns a collection of selected timeline ids */
export const getSelectedTimelineIdsAndSearchIds = (
  selectedItems: OpenTimelineResult[]
): Array<{ timelineId: string; searchId?: string | null }> => {
  return selectedItems.reduce<Array<{ timelineId: string; searchId?: string | null }>>(
    (validSelections, timelineResult) => {
      if (timelineResult.savedObjectId != null && timelineResult.savedSearchId != null) {
        return [
          ...validSelections,
          { timelineId: timelineResult.savedObjectId, searchId: timelineResult.savedSearchId },
        ];
      } else if (timelineResult.savedObjectId != null) {
        return [...validSelections, { timelineId: timelineResult.savedObjectId }];
      } else {
        return validSelections;
      }
    },
    [] as Array<{ timelineId: string; searchId?: string | null }>
  );
};

interface DeleteTimelinesValues {
  timelineIds: string[];
  searchIds: string[];
}

export const getRequestIds = (
  timelineIdsWithSearch: Array<{ timelineId: string; searchId?: string | null }>
) => {
  return timelineIdsWithSearch.reduce<DeleteTimelinesValues>(
    (acc, { timelineId, searchId }) => {
      let requestValues = acc;
      if (searchId != null) {
        requestValues = { ...requestValues, searchIds: [...requestValues.searchIds, searchId] };
      }
      if (timelineId != null) {
        requestValues = {
          ...requestValues,
          timelineIds: [...requestValues.timelineIds, timelineId],
        };
      }
      return requestValues;
    },
    { timelineIds: [], searchIds: [] }
  );
};

/** Manages the state (e.g table selection) of the (pure) `OpenTimeline` component */
// eslint-disable-next-line react/display-name
export const StatefulOpenTimelineComponent = React.memo<OpenTimelineOwnProps>(
  ({
    closeModalTimeline,
    defaultPageSize,
    hideActions = [],
    isModal = false,
    importDataModalToggle,
    onOpenTimeline,
    setImportDataModalToggle,
    title,
  }) => {
    const dispatch = useDispatch();
    const { startTransaction } = useStartTransaction();
    /** Required by EuiTable for expandable rows: a map of `TimelineResult.savedObjectId` to rendered notes */
    const [itemIdToExpandedNotesRowMap, setItemIdToExpandedNotesRowMap] = useState<
      Record<string, JSX.Element>
    >({});
    /** Only query for favorite timelines when true */
    const [onlyFavorites, setOnlyFavorites] = useState(false);
    /** The requested page of results */
    const [pageIndex, setPageIndex] = useState(0);
    /** The requested size of each page of search results */
    const [pageSize, setPageSize] = useState(defaultPageSize);
    /** The current search criteria */
    const [search, setSearch] = useState('');
    /** The currently-selected timelines in the table */
    const [selectedItems, setSelectedItems] = useState<OpenTimelineResult[]>([]);
    /** The requested sort direction of the query results */
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(DEFAULT_SORT_DIRECTION);
    /** The requested field to sort on */
    const [sortField, setSortField] = useState<SortFieldTimeline>(DEFAULT_SORT_FIELD);

    const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
    const timelineSavedObjectId = useShallowEqualSelector(
      (state) => getTimeline(state, TimelineId.active)?.savedObjectId ?? ''
    );

    const { dataView } = useDataView(PageScope.timeline);
    const selectedPatterns = useSelectedPatterns(PageScope.timeline);
    const dataViewId = useMemo(() => dataView.id || '', [dataView.id]);

    const {
      customTemplateTimelineCount,
      defaultTimelineCount,
      elasticTemplateTimelineCount,
      favoriteCount,
      fetchAllTimeline,
      timelines,
      loading,
      totalCount,
      templateTimelineCount,
    } = useGetAllTimeline();
    const { timelineType, timelineTabs, timelineFilters } = useTimelineTypes({
      defaultTimelineCount,
      templateTimelineCount,
    });
    const { timelineStatus, templateTimelineFilter, installPrepackagedTimelines } =
      useTimelineStatus({
        timelineType,
        customTemplateTimelineCount,
        elasticTemplateTimelineCount,
      });
    const refetch = useCallback(() => {
      fetchAllTimeline({
        pageInfo: {
          pageIndex: pageIndex + 1,
          pageSize,
        },
        search,
        sort: {
          sortField,
          sortOrder: sortDirection as Direction,
        },
        onlyUserFavorite: onlyFavorites,
        timelineType,
        status: timelineStatus,
      });
    }, [
      fetchAllTimeline,
      pageIndex,
      pageSize,
      search,
      sortField,
      sortDirection,
      timelineType,
      timelineStatus,
      onlyFavorites,
    ]);

    /** Invoked when the user presses enters to submit the text in the search input */
    const onQueryChange: OnQueryChange = useCallback((query: EuiSearchBarQuery) => {
      setSearch(query.queryText.trim());
    }, []);

    /** Focuses the input that filters the field browser */
    const focusInput = () => {
      const elements = document.querySelector<HTMLElement>(`.${OPEN_TIMELINE_CLASS_NAME} input`);

      if (elements != null) {
        elements.focus();
      }
    };

    /* This feature will be implemented in the near future, so we are keeping it to know what to do */

    /** Invoked when the user clicks the action to add the selected timelines to favorites */
    // const onAddTimelinesToFavorites: OnAddTimelinesToFavorites = () => {
    // const { addTimelinesToFavorites } = this.props;
    // const { selectedItems } = this.state;
    // if (addTimelinesToFavorites != null) {
    //   addTimelinesToFavorites(getSelectedTimelineIds(selectedItems));
    // TODO: it's not possible to clear the selection state of the newly-favorited
    // items, because we can't pass the selection state as props to the table.
    // See: https://github.com/elastic/eui/issues/1077
    // TODO: the query must re-execute to show the results of the mutation
    // }
    // };

    const deleteTimelines: DeleteTimelines = useCallback(
      async (timelineIds: string[], searchIds?: string[]) => {
        startTransaction({
          name: timelineIds.length > 1 ? TIMELINE_ACTIONS.BULK_DELETE : TIMELINE_ACTIONS.DELETE,
        });

        if (timelineIds.includes(timelineSavedObjectId)) {
          dispatch(
            dispatchCreateNewTimeline({
              id: TimelineId.active,
              columns: defaultUdtHeaders,
              dataViewId: dataViewId ?? '',
              indexNames: selectedPatterns,
              show: false,
              excludedRowRendererIds: timelineDefaults.excludedRowRendererIds,
            })
          );
        }

        await deleteTimelinesByIds(timelineIds, searchIds);
        refetch();
      },
      [startTransaction, timelineSavedObjectId, refetch, dispatch, dataViewId, selectedPatterns]
    );

    const onDeleteOneTimeline: OnDeleteOneTimeline = useCallback(
      async (timelineIds: string[], searchIds?: string[]) => {
        // The type for `deleteTimelines` is incorrect, it returns a Promise
        await deleteTimelines(timelineIds, searchIds);
      },
      [deleteTimelines]
    );

    /** Invoked when the user clicks the action to delete the selected timelines */
    const onDeleteSelected: OnDeleteSelected = useCallback(async () => {
      // The type for `deleteTimelines` is incorrect, it returns a Promise
      const timelineIdsWithSearch = getSelectedTimelineIdsAndSearchIds(selectedItems);
      const { timelineIds, searchIds } = getRequestIds(timelineIdsWithSearch);
      await deleteTimelines(timelineIds, searchIds);

      // NOTE: we clear the selection state below, but if the server fails to
      // delete a timeline, it will remain selected in the table:
      resetSelectionState();

      // TODO: the query must re-execute to show the results of the deletion
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedItems, deleteTimelines]);

    /** Invoked when the user selects (or de-selects) timelines */
    const onSelectionChange: OnSelectionChange = useCallback(
      (newSelectedItems: OpenTimelineResult[]) => {
        setSelectedItems(newSelectedItems); // <-- this is NOT passed down as props to the table: https://github.com/elastic/eui/issues/1077
      },
      []
    );

    /** Invoked by the EUI table implementation when the user interacts with the table (i.e. to update sorting) */
    const onTableChange: OnTableChange = useCallback(({ page, sort }: OnTableChangeParams) => {
      if (page != null) {
        const { index, size } = page;
        setPageIndex(index);
        setPageSize(size);
      }
      if (sort != null) {
        const { field, direction } = sort;
        setSortDirection(direction);
        setSortField(field as SortFieldTimeline);
      }
    }, []);

    /** Invoked when the user toggles the option to only view favorite timelines */
    const onToggleOnlyFavorites: OnToggleOnlyFavorites = useCallback(() => {
      setOnlyFavorites(!onlyFavorites);
    }, [onlyFavorites]);

    /** Invoked when the user toggles the expansion or collapse of inline notes in a table row */
    const onToggleShowNotes: OnToggleShowNotes = useCallback(
      (newItemIdToExpandedNotesRowMap: Record<string, JSX.Element>) => {
        setItemIdToExpandedNotesRowMap(newItemIdToExpandedNotesRowMap);
      },
      []
    );
    const { navigateTo } = useNavigation();
    const onCreateRule: OnCreateRuleFromTimeline = useCallback(
      (savedObjectId) =>
        navigateTo({
          deepLinkId: SecurityPageName.rulesCreate,
          path: `?${RULE_FROM_TIMELINE_URL_PARAM}=${encode(savedObjectId)}`,
        }),
      [navigateTo]
    );

    const onCreateRuleFromEql: OnCreateRuleFromTimeline = useCallback(
      (savedObjectId) =>
        navigateTo({
          deepLinkId: SecurityPageName.rulesCreate,
          path: `?${RULE_FROM_EQL_URL_PARAM}=${encode(savedObjectId)}`,
        }),
      [navigateTo]
    );

    /** Resets the selection state such that all timelines are unselected */
    const resetSelectionState = useCallback(() => {
      setSelectedItems([]);
    }, []);

    const queryTimelineById = useQueryTimelineById();

    const openTimeline: OnOpenTimeline = useCallback(
      ({ duplicate, timelineId, timelineType: timelineTypeToOpen }) => {
        if (duplicate) {
          startTransaction({ name: TIMELINE_ACTIONS.DUPLICATE });
        }

        if (isModal && closeModalTimeline != null) {
          closeModalTimeline();
        }

        queryTimelineById({
          duplicate,
          onOpenTimeline,
          timelineId,
          timelineType: timelineTypeToOpen,
        });
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [queryTimelineById]
    );

    useEffect(() => {
      focusInput();
    }, []);

    const {
      timelinePrivileges: { crud: canWriteTimelines },
    } = useUserPrivileges();
    useEffect(() => {
      const fetchData = async () => {
        if (canWriteTimelines) {
          await installPrepackagedTimelines();
          refetch();
        } else {
          refetch();
        }
      };
      fetchData();
    }, [refetch, installPrepackagedTimelines, canWriteTimelines]);

    return !isModal ? (
      <OpenTimeline
        data-test-subj={'open-timeline'}
        deleteTimelines={onDeleteOneTimeline}
        defaultPageSize={defaultPageSize}
        favoriteCount={favoriteCount}
        isLoading={loading}
        itemIdToExpandedNotesRowMap={itemIdToExpandedNotesRowMap}
        importDataModalToggle={importDataModalToggle}
        onAddTimelinesToFavorites={undefined}
        onCreateRule={onCreateRule}
        onCreateRuleFromEql={onCreateRuleFromEql}
        onDeleteSelected={onDeleteSelected}
        onlyFavorites={onlyFavorites}
        onOpenTimeline={openTimeline}
        onQueryChange={onQueryChange}
        onSelectionChange={onSelectionChange}
        onTableChange={onTableChange}
        onToggleOnlyFavorites={onToggleOnlyFavorites}
        onToggleShowNotes={onToggleShowNotes}
        pageIndex={pageIndex}
        pageSize={pageSize}
        query={search}
        refetch={refetch}
        searchResults={timelines}
        setImportDataModalToggle={setImportDataModalToggle}
        selectedItems={selectedItems}
        sortDirection={sortDirection}
        sortField={sortField}
        templateTimelineFilter={templateTimelineFilter}
        timelineType={timelineType}
        timelineStatus={timelineStatus}
        timelineFilter={timelineTabs}
        title={title}
        totalSearchResultsCount={totalCount}
      />
    ) : (
      <OpenTimelineModalBody
        data-test-subj={'open-timeline-modal'}
        deleteTimelines={onDeleteOneTimeline}
        defaultPageSize={defaultPageSize}
        favoriteCount={favoriteCount}
        hideActions={hideActions}
        isLoading={loading}
        itemIdToExpandedNotesRowMap={itemIdToExpandedNotesRowMap}
        onlyFavorites={onlyFavorites}
        onOpenTimeline={openTimeline}
        onQueryChange={onQueryChange}
        onSelectionChange={onSelectionChange}
        onTableChange={onTableChange}
        onToggleOnlyFavorites={onToggleOnlyFavorites}
        onToggleShowNotes={onToggleShowNotes}
        pageIndex={pageIndex}
        pageSize={pageSize}
        query={search}
        searchResults={timelines}
        sortDirection={sortDirection}
        sortField={sortField}
        templateTimelineFilter={templateTimelineFilter}
        timelineType={timelineType}
        timelineStatus={timelineStatus}
        timelineFilter={timelineFilters}
        title={title}
        totalSearchResultsCount={totalCount}
      />
    );
  }
);

export const StatefulOpenTimeline = React.memo(StatefulOpenTimelineComponent);
