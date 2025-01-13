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
import { buildEsQuery, isCombinedFilter } from '@kbn/es-query';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { css } from '@emotion/react';
import { Panel } from '@xyflow/react';
import { getEsQueryConfig } from '@kbn/data-service';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Graph, NodeProps, isEntityNode } from '../../..';
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
import { Actions } from '../controls/actions';
import { AnimatedSearchBarContainer, useBorder } from './styles';
import { addFilter, containsFilter, removeFilter } from './search_filters';
import { NodeToggleAction } from './graph_node_expand_popover';

const useGraphPopovers = (
  dataViewId: string,
  setSearchFilters: React.Dispatch<React.SetStateAction<Filter[]>>,
  searchFilters: Filter[]
) => {
  const getRelatedEntitiesAction = useCallback(
    (node: NodeProps) => {
      return containsFilter(searchFilters, RELATED_ENTITY, node.id) ? 'hide' : 'show';
    },
    [searchFilters]
  );
  const getActionsByEntityAction = useCallback(
    (node: NodeProps) => {
      return containsFilter(searchFilters, ACTOR_ENTITY_ID, node.id) ? 'hide' : 'show';
    },
    [searchFilters]
  );
  const getActionsOnEntityAction = useCallback(
    (node: NodeProps) => {
      return containsFilter(searchFilters, TARGET_ENTITY_ID, node.id) ? 'hide' : 'show';
    },
    [searchFilters]
  );

  const onToggleExploreRelatedEntitiesClick = useCallback(
    (node: NodeProps, action: NodeToggleAction) => {
      if (action === 'show') {
        setSearchFilters((prev) => addFilter(dataViewId, prev, RELATED_ENTITY, node.id));
      } else if (action === 'hide') {
        setSearchFilters((prev) => removeFilter(prev, RELATED_ENTITY, node.id));
      }
    },
    [dataViewId, setSearchFilters]
  );

  const onToggleActionsByEntityClick = useCallback(
    (node: NodeProps, action: NodeToggleAction) => {
      if (action === 'show') {
        setSearchFilters((prev) => addFilter(dataViewId, prev, ACTOR_ENTITY_ID, node.id));
      } else if (action === 'hide') {
        setSearchFilters((prev) => removeFilter(prev, ACTOR_ENTITY_ID, node.id));
      }
    },
    [dataViewId, setSearchFilters]
  );

  const onToggleActionsOnEntityClick = useCallback(
    (node: NodeProps, action: NodeToggleAction) => {
      if (action === 'show') {
        setSearchFilters((prev) => addFilter(dataViewId, prev, TARGET_ENTITY_ID, node.id));
      } else if (action === 'hide') {
        setSearchFilters((prev) => removeFilter(prev, TARGET_ENTITY_ID, node.id));
      }
    },
    [dataViewId, setSearchFilters]
  );

  const nodeExpandPopover = useGraphNodeExpandPopover({
    getRelatedEntitiesAction,
    getActionsByEntityAction,
    getActionsOnEntityAction,
    onToggleExploreRelatedEntitiesClick,
    onToggleActionsByEntityClick,
    onToggleActionsOnEntityClick,
  });

  const getEventsWithThisActionToggleAction = useCallback(
    (node: NodeProps) => {
      return containsFilter(searchFilters, EVENT_ACTION, node.data.label ?? '') ? 'hide' : 'show';
    },
    [searchFilters]
  );

  const onShowEventsWithThisActionClick = useCallback(
    (node: NodeProps, action: NodeToggleAction) => {
      if (action === 'show') {
        setSearchFilters((prev) =>
          addFilter(dataViewId, prev, EVENT_ACTION, node.data.label ?? '')
        );
      } else if (action === 'hide') {
        setSearchFilters((prev) => removeFilter(prev, EVENT_ACTION, node.data.label ?? ''));
      }
    },
    [dataViewId, setSearchFilters]
  );

  const labelExpandPopover = useGraphLabelExpandPopover({
    getEventsWithThisActionToggleAction,
    onShowEventsWithThisActionClick,
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
    const [searchToggled, setSearchToggled] = useState(!showToggleSearch);
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
      setSearchFilters,
      searchFilters
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

    const searchFilterCounter = useMemo(() => {
      const filtersCount = searchFilters.reduce((sum, filter) => {
        if (isCombinedFilter(filter)) {
          return sum + filter.meta.params.length;
        }

        return sum + 1;
      }, 0);

      const queryCounter = kquery.query.trim().length > 0 ? 1 : 0;
      return filtersCount + queryCounter;
    }, [kquery.query, searchFilters]);

    return (
      <>
        <EuiFlexGroup
          data-test-subj={GRAPH_INVESTIGATION_TEST_ID}
          direction="column"
          gutterSize="none"
          css={css`
            height: 100%;

            .react-flow__panel {
              margin-right: 8px;
            }
          `}
        >
          {dataView && (
            <EuiFlexItem grow={false}>
              <AnimatedSearchBarContainer className={!searchToggled ? 'toggled-off' : undefined}>
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
              </AnimatedSearchBarContainer>
            </EuiFlexItem>
          )}
          <EuiFlexItem
            css={css`
              border-top: ${useBorder()};
            `}
          >
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
                <Actions
                  showInvestigateInTimeline={showInvestigateInTimeline}
                  showToggleSearch={showToggleSearch}
                  onInvestigateInTimeline={onInvestigateInTimelineCallback}
                  onSearchToggle={(isSearchToggle) => setSearchToggled(isSearchToggle)}
                  searchFilterCounter={searchFilterCounter}
                />
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
