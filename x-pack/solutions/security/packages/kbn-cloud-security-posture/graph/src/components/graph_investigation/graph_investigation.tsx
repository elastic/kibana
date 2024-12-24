/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  BooleanRelation,
  buildEsQuery,
  isCombinedFilter,
  buildCombinedFilter,
  isFilter,
  FilterStateStore,
} from '@kbn/es-query';
import type { Filter, Query, TimeRange, PhraseFilter } from '@kbn/es-query';
import { css } from '@emotion/react';
import { getEsQueryConfig } from '@kbn/data-service';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Graph, isEntityNode } from '../../..';
import { useGraphNodeExpandPopover } from './use_graph_node_expand_popover';
import { useGraphLabelExpandPopover } from './use_graph_label_expand_popover';
import { useFetchGraphData } from '../../hooks/use_fetch_graph_data';
import { GRAPH_INVESTIGATION_TEST_ID } from '../test_ids';
import {
  ACTOR_ENTITY_ID,
  EVENT_ACTION,
  RELATED_ENTITY,
  TARGET_ENTITY_ID,
} from '../../common/constants';

const CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER = 'graph-investigation';

const buildPhraseFilter = (field: string, value: string, dataViewId?: string): PhraseFilter => ({
  meta: {
    key: field,
    index: dataViewId,
    negate: false,
    disabled: false,
    type: 'phrase',
    field,
    controlledBy: CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER,
    params: {
      query: value,
    },
  },
  query: {
    match_phrase: {
      [field]: value,
    },
  },
});

/**
 * Adds a filter to the existing list of filters based on the provided key and value.
 * It will always use the first filter in the list to build a combined filter with the new filter.
 *
 * @param dataViewId - The ID of the data view to which the filter belongs.
 * @param prev - The previous list of filters.
 * @param key - The key for the filter.
 * @param value - The value for the filter.
 * @returns A new list of filters with the added filter.
 */
const addFilter = (dataViewId: string, prev: Filter[], key: string, value: string) => {
  const [firstFilter, ...otherFilters] = prev;

  if (isCombinedFilter(firstFilter) && firstFilter?.meta?.relation === BooleanRelation.OR) {
    return [
      {
        ...firstFilter,
        meta: {
          ...firstFilter.meta,
          params: [
            ...(Array.isArray(firstFilter.meta.params) ? firstFilter.meta.params : []),
            buildPhraseFilter(key, value),
          ],
        },
      },
      ...otherFilters,
    ];
  } else if (isFilter(firstFilter) && firstFilter.meta?.type !== 'custom') {
    return [
      buildCombinedFilter(BooleanRelation.OR, [firstFilter, buildPhraseFilter(key, value)], {
        id: dataViewId,
      }),
      ...otherFilters,
    ];
  } else {
    return [
      {
        $state: {
          store: FilterStateStore.APP_STATE,
        },
        ...buildPhraseFilter(key, value, dataViewId),
      },
      ...prev,
    ];
  }
};

const useGraphPopovers = (
  dataViewId: string,
  setSearchFilters: React.Dispatch<React.SetStateAction<Filter[]>>
) => {
  const nodeExpandPopover = useGraphNodeExpandPopover({
    onExploreRelatedEntitiesClick: (node) => {
      setSearchFilters((prev) => addFilter(dataViewId, prev, RELATED_ENTITY, node.id));
    },
    onShowActionsByEntityClick: (node) => {
      setSearchFilters((prev) => addFilter(dataViewId, prev, ACTOR_ENTITY_ID, node.id));
    },
    onShowActionsOnEntityClick: (node) => {
      setSearchFilters((prev) => addFilter(dataViewId, prev, TARGET_ENTITY_ID, node.id));
    },
  });

  const labelExpandPopover = useGraphLabelExpandPopover({
    onShowEventsWithThisActionClick: (node) => {
      setSearchFilters((prev) => addFilter(dataViewId, prev, EVENT_ACTION, node.data.label ?? ''));
    },
  });

  const openPopoverCallback = useCallback(
    (cb: Function, ...args: unknown[]) => {
      [nodeExpandPopover, labelExpandPopover].forEach(({ actions: { closePopover } }) => {
        closePopover();
      });
      cb(...args);
    },
    [nodeExpandPopover, labelExpandPopover]
  );

  return { nodeExpandPopover, labelExpandPopover, openPopoverCallback };
};

interface GraphInvestigationProps {
  /**
   * The initial state to use for the graph investigation view.
   */
  initialState: {
    /**
     * The data view to use for the graph investigation view.
     */
    dataView: DataView;

    /**
     * The origin events for the graph investigation view.
     */
    originEventIds: Array<{
      /**
       * The ID of the origin event.
       */
      id: string;

      /**
       * A flag indicating whether the origin event is an alert or not.
       */
      isAlert: boolean;
    }>;

    /**
     * The initial timerange for the graph investigation view.
     */
    timeRange: TimeRange;
  };
}

/**
 * Graph investigation view allows the user to expand nodes and view related entities.
 */
export const GraphInvestigation = memo<GraphInvestigationProps>(
  ({
    initialState: { dataView, originEventIds, timeRange: initialTimeRange },
  }: GraphInvestigationProps) => {
    const [searchFilters, setSearchFilters] = useState<Filter[]>(() => []);
    const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);

    const {
      services: { uiSettings },
    } = useKibana();
    const query = useMemo(
      () =>
        buildEsQuery(
          dataView,
          [],
          [...searchFilters],
          getEsQueryConfig(uiSettings as Parameters<typeof getEsQueryConfig>[0])
        ),
      [dataView, searchFilters, uiSettings]
    );

    const { nodeExpandPopover, labelExpandPopover, openPopoverCallback } = useGraphPopovers(
      dataView?.id ?? '',
      setSearchFilters
    );
    const nodeExpandButtonClickHandler = (...args: unknown[]) =>
      openPopoverCallback(nodeExpandPopover.onNodeExpandButtonClick, ...args);
    const labelExpandButtonClickHandler = (...args: unknown[]) =>
      openPopoverCallback(labelExpandPopover.onLabelExpandButtonClick, ...args);
    const isPopoverOpen = [nodeExpandPopover, labelExpandPopover].some(
      ({ state: { isOpen } }) => isOpen
    );
    const { data, refresh, isFetching } = useFetchGraphData({
      req: {
        query: {
          originEventIds,
          esQuery: query,
          start: timeRange.from,
          end: timeRange.to,
        },
      },
      options: {
        refetchOnWindowFocus: false,
        keepPreviousData: true,
      },
    });

    const nodes = useMemo(() => {
      return (
        data?.nodes.map((node) => {
          if (isEntityNode(node)) {
            return {
              ...node,
              expandButtonClick: nodeExpandButtonClickHandler,
            };
          } else if (node.shape === 'label') {
            return {
              ...node,
              expandButtonClick: labelExpandButtonClickHandler,
            };
          }

          return { ...node };
        }) ?? []
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.nodes]);

    return (
      <>
        <EuiFlexGroup
          data-test-subj={GRAPH_INVESTIGATION_TEST_ID}
          direction="column"
          gutterSize="none"
          css={css`
            height: 100%;
          `}
        >
          {dataView && (
            <EuiFlexItem grow={false}>
              <SearchBar<Query>
                {...{
                  appName: 'graph-investigation',
                  intl: null,
                  showFilterBar: true,
                  showDatePicker: true,
                  showAutoRefreshOnly: false,
                  showSaveQuery: false,
                  showQueryInput: false,
                  isLoading: isFetching,
                  isAutoRefreshDisabled: true,
                  dateRangeFrom: timeRange.from,
                  dateRangeTo: timeRange.to,
                  query: { query: '', language: 'kuery' },
                  indexPatterns: [dataView],
                  filters: searchFilters,
                  submitButtonStyle: 'iconOnly',
                  onFiltersUpdated: (newFilters) => {
                    setSearchFilters(newFilters);
                  },
                  onQuerySubmit: (payload, isUpdate) => {
                    if (isUpdate) {
                      setTimeRange({ ...payload.dateRange });
                    } else {
                      refresh();
                    }
                  },
                }}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <Graph
              css={css`
                height: 100%;
                width: 100%;
              `}
              nodes={nodes}
              edges={data?.edges ?? []}
              interactive={true}
              isLocked={isPopoverOpen}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <nodeExpandPopover.PopoverComponent />
        <labelExpandPopover.PopoverComponent />
      </>
    );
  }
);

GraphInvestigation.displayName = 'GraphInvestigation';
