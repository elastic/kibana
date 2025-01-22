/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
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
import { Panel } from '@xyflow/react';
import { getEsQueryConfig } from '@kbn/data-service';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Graph, isEntityNode } from '../../..';
import { useGraphNodeExpandPopover } from './use_graph_node_expand_popover';
import { useGraphLabelExpandPopover } from './use_graph_label_expand_popover';
import { type UseFetchGraphDataParams, useFetchGraphData } from '../../hooks/use_fetch_graph_data';
import { GRAPH_INVESTIGATION_TEST_ID } from '../test_ids';
import {
  ACTOR_ENTITY_ID,
  EVENT_ACTION,
  EVENT_ID,
  RELATED_ENTITY,
  TARGET_ENTITY_ID,
} from '../../common/constants';
import { Actions, type ActionsProps } from '../controls/actions';

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
      buildCombinedFilter(
        BooleanRelation.OR,
        [firstFilter, buildPhraseFilter(key, value, dataViewId)],
        {
          id: dataViewId,
        }
      ),
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

export interface GraphInvestigationProps {
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

  /**
   * Whether to show investigate in timeline action button. Defaults value is false.
   */
  showInvestigateInTimeline?: boolean;

  /**
   * Callback when investigate in timeline action button is clicked, ignored if showInvestigateInTimeline is false.
   */
  onInvestigateInTimeline?: (
    query: Query | undefined,
    filters: Filter[],
    timeRange: TimeRange
  ) => void;

  /**
   * Whether to show toggle search action button. Defaults value is false.
   */
  showToggleSearch?: boolean;
}

const EMPTY_QUERY: Query = { query: '', language: 'kuery' } as const;
type EsQuery = UseFetchGraphDataParams['req']['query']['esQuery'];

/**
 * Graph investigation view allows the user to expand nodes and view related entities.
 */
export const GraphInvestigation = memo<GraphInvestigationProps>(
  ({
    initialState: { dataView, originEventIds, timeRange: initialTimeRange },
    showInvestigateInTimeline = false,
    showToggleSearch = false,
    onInvestigateInTimeline,
  }: GraphInvestigationProps) => {
    const [searchFilters, setSearchFilters] = useState<Filter[]>(() => []);
    const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
    const lastValidEsQuery = useRef<EsQuery | undefined>();
    const [kquery, setKQuery] = useState<Query>(EMPTY_QUERY);

    const onInvestigateInTimelineCallback = useCallback(() => {
      const query = { ...kquery };
      const filters = originEventIds.reduce<Filter[]>((acc, { id }) => {
        return addFilter(dataView?.id ?? '', acc, EVENT_ID, id);
      }, searchFilters);

      if (query.query.trim() !== '' && originEventIds.length > 0) {
        query.query = `(${query.query})${originEventIds
          .map(({ id }) => ` OR ${EVENT_ID}: "${id}"`)
          .join('')}`;
      }

      onInvestigateInTimeline?.(query, filters, timeRange);
    }, [dataView?.id, onInvestigateInTimeline, originEventIds, kquery, searchFilters, timeRange]);

    const actionsProps: ActionsProps = useMemo(
      () => ({
        showInvestigateInTimeline,
        showToggleSearch,
        onInvestigateInTimeline: onInvestigateInTimelineCallback,
      }),
      [onInvestigateInTimelineCallback, showInvestigateInTimeline, showToggleSearch]
    );

    const {
      services: { uiSettings, notifications },
    } = useKibana();
    const esQuery = useMemo(() => {
      try {
        lastValidEsQuery.current = buildEsQuery(
          dataView,
          [kquery],
          [...searchFilters],
          getEsQueryConfig(uiSettings as Parameters<typeof getEsQueryConfig>[0])
        );
      } catch (err) {
        notifications?.toasts.addError(err, {
          title: i18n.translate(
            'securitySolutionPackages.csp.graph.investigation.errorBuildingQuery',
            {
              defaultMessage: 'Unable to retrieve search results',
            }
          ),
        });
      }
      return lastValidEsQuery.current;
    }, [dataView, kquery, notifications, searchFilters, uiSettings]);

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
          esQuery,
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
                showFilterBar={true}
                showDatePicker={true}
                showAutoRefreshOnly={false}
                showSaveQuery={false}
                showQueryInput={true}
                disableQueryLanguageSwitcher={true}
                isLoading={isFetching}
                isAutoRefreshDisabled={true}
                dateRangeFrom={timeRange.from}
                dateRangeTo={timeRange.to}
                query={kquery}
                indexPatterns={[dataView]}
                filters={searchFilters}
                submitButtonStyle={'iconOnly'}
                onFiltersUpdated={(newFilters) => {
                  setSearchFilters(newFilters);
                }}
                onQuerySubmit={(payload, isUpdate) => {
                  if (isUpdate) {
                    setTimeRange({ ...payload.dateRange });
                    setKQuery(payload.query || EMPTY_QUERY);
                  } else {
                    refresh();
                  }
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
            >
              <Panel position="top-right">
                <Actions {...actionsProps} />
              </Panel>
            </Graph>
          </EuiFlexItem>
        </EuiFlexGroup>
        <nodeExpandPopover.PopoverComponent />
        <labelExpandPopover.PopoverComponent />
      </>
    );
  }
);

GraphInvestigation.displayName = 'GraphInvestigation';
