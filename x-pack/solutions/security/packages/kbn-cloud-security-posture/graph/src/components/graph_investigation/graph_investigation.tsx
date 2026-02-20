/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import { buildEsQuery, isCombinedFilter } from '@kbn/es-query';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { css } from '@emotion/react';
import { Panel } from '@xyflow/react';
import { getEsQueryConfig } from '@kbn/data-service';
import { EuiFlexGroup, EuiFlexItem, EuiProgress } from '@elastic/eui';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import {
  GRAPH_ACTOR_ENTITY_FIELDS,
  GRAPH_TARGET_ENTITY_FIELDS,
} from '@kbn/cloud-security-posture-common/constants';
import { Graph, isEntityNode, type NodeProps } from '../../..';
import { Callout } from '../callout/callout';
import { type UseFetchGraphDataParams, useFetchGraphData } from '../../hooks/use_fetch_graph_data';
import { useGraphCallout } from '../../hooks/use_graph_callout';
import { GRAPH_INVESTIGATION_TEST_ID } from '../test_ids';
import { useIpPopover } from '../node/ips/ips';
import { useCountryFlagsPopover } from '../node/country_flags/country_flags';
import { useEventDetailsPopover } from '../popovers/details/use_event_details_popover';
import type { DocumentAnalysisOutput } from '../node/label_node/analyze_documents';
import { analyzeDocuments } from '../node/label_node/analyze_documents';
import { EVENT_ID, GRAPH_NODES_LIMIT, TOGGLE_SEARCH_BAR_STORAGE_KEY } from '../../common/constants';
import { Actions } from '../controls/actions';
import { AnimatedSearchBarContainer, useBorder } from './styles';
import {
  CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER,
  addFilter,
  getFilterValues,
} from './search_filters';
import { useEntityNodeExpandPopover } from '../popovers/node_expand/use_entity_node_expand_popover';
import { useLabelNodeExpandPopover } from '../popovers/node_expand/use_label_node_expand_popover';
import type { NodeViewModel } from '../types';
import { isLabelNode, isRelationshipNode, showErrorToast } from '../utils';
import { GRAPH_SCOPE_ID } from '../constants';

const useGraphPopovers = ({
  dataViewId,
  searchFilters,
  setSearchFilters,
  nodeDetailsClickHandler,
  onOpenNetworkPreview,
  expandedEntityIds,
  onToggleEntityRelationships,
}: {
  dataViewId: string;
  searchFilters: Filter[];
  setSearchFilters: React.Dispatch<React.SetStateAction<Filter[]>>;
  nodeDetailsClickHandler?: (node: NodeProps) => void;
  onOpenNetworkPreview?: (ip: string, scopeId: string) => void;
  expandedEntityIds: Set<string>;
  onToggleEntityRelationships: (node: NodeProps, action: 'show' | 'hide') => void;
}) => {
  const [currentIps, setCurrentIps] = useState<string[]>([]);
  const [currentCountryCodes, setCurrentCountryCodes] = useState<string[]>([]);
  const [currentEventAnalysis, setCurrentEventAnalysis] = useState<DocumentAnalysisOutput | null>(
    null
  );
  const [currentEventText, setCurrentEventText] = useState<string>('');
  const nodeExpandPopover = useEntityNodeExpandPopover(
    setSearchFilters,
    dataViewId,
    searchFilters,
    nodeDetailsClickHandler,
    expandedEntityIds,
    onToggleEntityRelationships
  );
  const labelExpandPopover = useLabelNodeExpandPopover(
    setSearchFilters,
    dataViewId,
    searchFilters,
    nodeDetailsClickHandler
  );
  const ipPopover = useIpPopover(currentIps, GRAPH_SCOPE_ID);
  const countryFlagsPopover = useCountryFlagsPopover(currentCountryCodes);
  const eventPopover = useEventDetailsPopover(currentEventAnalysis, currentEventText);

  const openPopoverCallback = useCallback(
    (cb: Function, ...args: unknown[]) => {
      [nodeExpandPopover, labelExpandPopover, ipPopover, countryFlagsPopover, eventPopover].forEach(
        ({ actions: { closePopover } }) => {
          closePopover();
        }
      );
      cb(...args);
    },
    [nodeExpandPopover, labelExpandPopover, ipPopover, countryFlagsPopover, eventPopover]
  );

  const createIpClickHandler = useCallback(
    (ips: string[]) => (e: React.MouseEvent<HTMLElement>) => {
      if (!onOpenNetworkPreview) return;

      // For single IP, open preview panel directly
      if (ips.length === 1) {
        onOpenNetworkPreview(ips[0], GRAPH_SCOPE_ID);
      } else {
        // For multiple IPs, show popover
        setCurrentIps(ips);
        openPopoverCallback(ipPopover.onIpClick, e);
      }
    },
    [setCurrentIps, openPopoverCallback, ipPopover.onIpClick, onOpenNetworkPreview]
  );

  const createCountryClickHandler = useCallback(
    (countryCodes: string[]) => (e: React.MouseEvent<HTMLElement>) => {
      setCurrentCountryCodes(countryCodes);
      openPopoverCallback(countryFlagsPopover.onCountryClick, e);
    },
    [setCurrentCountryCodes, openPopoverCallback, countryFlagsPopover.onCountryClick]
  );

  const createEventClickHandler = useCallback(
    (analysis: DocumentAnalysisOutput, text: string) =>
      (e: React.MouseEvent<HTMLButtonElement>) => {
        setCurrentEventAnalysis(analysis);
        setCurrentEventText(text);
        openPopoverCallback(eventPopover.onEventClick, e);
      },
    [setCurrentEventAnalysis, setCurrentEventText, openPopoverCallback, eventPopover.onEventClick]
  );

  return {
    nodeExpandPopover,
    labelExpandPopover,
    ipPopover,
    countryFlagsPopover,
    eventPopover,
    openPopoverCallback,
    createIpClickHandler,
    createCountryClickHandler,
    createEventClickHandler,
  };
};

const NEGATED_FILTER_SEARCH_WARNING_MESSAGE = {
  title: i18n.translate(
    'securitySolutionPackages.csp.graph.investigation.warningNegatedFilterTitle',
    {
      defaultMessage: 'Filters Negated',
    }
  ),
  content: i18n.translate(
    'securitySolutionPackages.csp.graph.investigation.warningNegatedFilterContent',
    {
      defaultMessage: 'One or more filters are negated and may not return expected results.',
    }
  ),
};

export interface GraphInvestigationProps {
  /**
   * The initial state to use for the graph investigation view.
   */
  initialState: {
    /**
     * The index patterns to use for the graph investigation view.
     */
    indexPatterns?: string[];

    /**
     * The data view to use for the graph investigation view.
     */
    dataView: DataView;

    /**
     * The origin events for the graph investigation view.
     * Optional - may be empty when opening from entity flyout.
     */
    originEventIds?: Array<{
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
     * Entity IDs for fetching relationships from entity store.
     * isOrigin indicates whether this entity is the center/origin of the graph.
     */
    entityIds?: Array<{
      /**
       * The ID of the entity.
       */
      id: string;

      /**
       * Whether this entity is the origin of the graph (for centering).
       */
      isOrigin: boolean;
    }>;

    /**
     * The initial timerange for the graph investigation view.
     */
    timeRange: TimeRange;
  };

  /**
   * Callback when "show entity/event preview" is clicked.
   */
  onOpenEventPreview?: (node: NodeViewModel) => void;

  /**
   * Callback when IP address is clicked to open network preview panel.
   * If not provided, multi-IP popover will be shown.
   */
  onOpenNetworkPreview?: (ip: string, scopeId: string) => void;

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
    initialState: {
      indexPatterns,
      dataView,
      originEventIds,
      entityIds,
      timeRange: initialTimeRange,
    },
    showInvestigateInTimeline = false,
    showToggleSearch = false,
    onInvestigateInTimeline,
    onOpenEventPreview,
    onOpenNetworkPreview,
  }: GraphInvestigationProps) => {
    const [searchFilters, setSearchFilters] = useState<Filter[]>(() => []);
    const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
    const [searchToggled, setSearchToggled] = useSessionStorage(
      TOGGLE_SEARCH_BAR_STORAGE_KEY,
      !showToggleSearch
    );
    const lastValidEsQuery = useRef<EsQuery | undefined>();
    const [kquery, setKQuery] = useState<Query>(EMPTY_QUERY);

    // Track which entities have their relationships expanded
    const [expandedEntityIds, setExpandedEntityIds] = useState<Set<string>>(() => new Set());

    // Convert expandedEntityIds Set to API format
    const entityIdsForApi = useMemo(() => {
      if (expandedEntityIds.size === 0) return undefined;

      return Array.from(expandedEntityIds).map((id) => ({
        id,
        isOrigin: false, // User-expanded entities are not the graph origin
      }));
    }, [expandedEntityIds]);

    // Toggle handler for entity relationships
    const onToggleEntityRelationships = useCallback((node: NodeProps, action: 'show' | 'hide') => {
      setExpandedEntityIds((prev) => {
        const next = new Set(prev);
        if (action === 'show') {
          next.add(node.id);
        } else {
          next.delete(node.id);
        }
        return next;
      });
    }, []);

    const onInvestigateInTimelineCallback = useCallback(() => {
      const query = { ...kquery };

      let filters = [...searchFilters];

      const hasKqlQuery = query.query.trim() !== '';

      if (originEventIds && originEventIds.length > 0) {
        if (!hasKqlQuery || searchFilters.length > 0) {
          filters = originEventIds.reduce<Filter[]>((acc, { id }) => {
            return addFilter(dataView?.id ?? '', acc, EVENT_ID, id);
          }, searchFilters);
        }

        if (hasKqlQuery) {
          query.query = `(${query.query})${originEventIds
            .map(({ id }) => ` OR ${EVENT_ID}: "${id}"`)
            .join('')}`;
        }
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

    const pinnedIds = useMemo(() => {
      return getFilterValues(searchFilters, [
        ...GRAPH_ACTOR_ENTITY_FIELDS,
        ...GRAPH_TARGET_ENTITY_FIELDS,
      ]).map(String);
    }, [searchFilters]);

    const { data, refresh, isFetching, isError, error } = useFetchGraphData({
      req: {
        query: {
          originEventIds,
          indexPatterns,
          esQuery,
          start: timeRange.from,
          end: timeRange.to,
          entityIds: entityIdsForApi,
          pinnedIds,
        },
        nodesLimit: GRAPH_NODES_LIMIT,
      },
      options: {
        refetchOnWindowFocus: false,
        keepPreviousData: true,
      },
    });

    useEffect(() => {
      const toasts = notifications?.toasts;
      if (isError && error && toasts) {
        showErrorToast(toasts, error);
      }
    }, [error, isError, notifications]);

    const nodeDetailsClickHandler = useCallback(
      (node: NodeProps) => {
        onOpenEventPreview?.(node.data);
      },
      [onOpenEventPreview]
    );

    const {
      nodeExpandPopover,
      labelExpandPopover,
      ipPopover,
      countryFlagsPopover,
      eventPopover,
      openPopoverCallback,
      createIpClickHandler,
      createCountryClickHandler,
      createEventClickHandler,
    } = useGraphPopovers({
      dataViewId: dataView?.id ?? '',
      searchFilters,
      setSearchFilters,
      nodeDetailsClickHandler: onOpenEventPreview ? nodeDetailsClickHandler : undefined,
      onOpenNetworkPreview,
      expandedEntityIds,
      onToggleEntityRelationships,
    });

    const nodeExpandButtonClickHandler = (...args: unknown[]) =>
      openPopoverCallback(nodeExpandPopover.onNodeExpandButtonClick, ...args);
    const labelExpandButtonClickHandler = (...args: unknown[]) =>
      openPopoverCallback(labelExpandPopover.onNodeExpandButtonClick, ...args);
    const isPopoverOpen = [
      nodeExpandPopover,
      labelExpandPopover,
      ipPopover,
      countryFlagsPopover,
      eventPopover,
    ].some(({ state: { isOpen } }) => isOpen);

    const { originEventIdsSet, originAlertIdsSet, originEntityIdsSet } = useMemo(() => {
      const eventIds = new Set<string>();
      const alertIds = new Set<string>();
      const entityIdsWithOrigin = new Set<string>();

      // Add origin event IDs (for centering when opening from events flyout)
      originEventIds?.forEach(({ id, isAlert }) => {
        if (isAlert) {
          alertIds.add(id);
        } else {
          eventIds.add(id);
        }
      });

      // Add entity IDs that are marked as origin (for centering when opening from entity flyout)
      entityIds?.forEach(({ id, isOrigin }) => {
        if (isOrigin) {
          entityIdsWithOrigin.add(id);
        }
      });

      return {
        originEventIdsSet: eventIds,
        originAlertIdsSet: alertIds,
        originEntityIdsSet: entityIdsWithOrigin,
      };
    }, [originEventIds, entityIds]);

    // Build a map of relationship node IDs to their source entities (from edges)
    // This allows us to determine if a relationship node is connected to an origin entity
    const relationshipNodeSources = useMemo(() => {
      const sourcesMap = new Map<string, string[]>();
      data?.edges?.forEach((edge) => {
        // Check if target is a relationship node by checking if it starts with 'rel('
        if (edge.target.startsWith('rel(')) {
          const sources = sourcesMap.get(edge.target) || [];
          sources.push(edge.source);
          sourcesMap.set(edge.target, sources);
        }
      });
      return sourcesMap;
    }, [data?.edges]);

    const nodes = useMemo(() => {
      return (
        data?.nodes.map((node) => {
          if (isEntityNode(node)) {
            const nodeIps = node.ips || [];
            const nodeCountryCodes = node.countryCodes || [];
            return {
              ...node,
              expandButtonClick: nodeExpandButtonClickHandler,
              ipClickHandler: createIpClickHandler(nodeIps),
              countryClickHandler: createCountryClickHandler(nodeCountryCodes),
            };
          } else if (isLabelNode(node)) {
            const nodeIps = node.ips || [];
            const nodeCountryCodes = node.countryCodes || [];
            const numEvents = node.uniqueEventsCount ?? 0;
            const numAlerts = node.uniqueAlertsCount ?? 0;
            const analysis = analyzeDocuments({
              uniqueEventsCount: numEvents,
              uniqueAlertsCount: numAlerts,
            });
            const text = node.label ? node.label : node.id;
            const docEventIds: string[] =
              'documentsData' in node && Array.isArray(node.documentsData)
                ? node.documentsData.flatMap((d) => (d.event ? d.event.id : []))
                : [];
            return {
              ...node,
              isOrigin: docEventIds.some((id) => originEventIdsSet.has(id)),
              isOriginAlert: docEventIds.some((id) => originAlertIdsSet.has(id)),
              expandButtonClick: labelExpandButtonClickHandler,
              ipClickHandler: createIpClickHandler(nodeIps),
              countryClickHandler: createCountryClickHandler(nodeCountryCodes),
              eventClickHandler: createEventClickHandler(analysis, text),
            };
          } else if (isRelationshipNode(node)) {
            // Check if any source entity connected to this relationship node is an origin
            const sources = relationshipNodeSources.get(node.id) || [];
            const isOrigin = sources.some((sourceId) => originEntityIdsSet.has(sourceId));
            return {
              ...node,
              ...(isOrigin && { isOrigin }),
            };
          }

          return { ...node };
        }) ?? []
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      data?.nodes,
      originEventIdsSet,
      originAlertIdsSet,
      originEntityIdsSet,
      relationshipNodeSources,
    ]);

    // Get callout state based on current graph state
    const calloutState = useGraphCallout(nodes);

    const searchFilterCounter = useMemo(() => {
      const filtersCount = searchFilters
        .filter((filter) => !filter.meta.disabled)
        .reduce((sum, filter) => {
          if (isCombinedFilter(filter)) {
            return sum + filter.meta.params.length;
          }

          return sum + 1;
        }, 0);

      const queryCounter = kquery.query.trim().length > 0 ? 1 : 0;
      return filtersCount + queryCounter;
    }, [kquery.query, searchFilters]);

    const searchWarningMessage =
      searchFilters.filter(
        (filter) =>
          !filter.meta.disabled &&
          filter.meta.negate &&
          filter.meta.controlledBy === CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER
      ).length > 0
        ? NEGATED_FILTER_SEARCH_WARNING_MESSAGE
        : undefined;

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
              <AnimatedSearchBarContainer
                className={!searchToggled && showToggleSearch ? 'toggled-off' : undefined}
              >
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
              position: relative;
            `}
          >
            {isFetching && <EuiProgress size="xs" color="accent" position="absolute" />}
            <Graph
              css={css`
                height: 100%;
                width: 100%;
              `}
              nodes={nodes}
              edges={data?.edges ?? []}
              interactive={true}
              isLocked={isPopoverOpen}
              showMinimap={true}
              interactiveBottomRightContent={
                calloutState.shouldShowCallout ? (
                  <EuiFlexItem grow={false}>
                    <Callout
                      title={calloutState.config.title}
                      message={calloutState.config.message}
                      links={calloutState.config.links}
                      onDismiss={calloutState.onDismiss}
                    />
                  </EuiFlexItem>
                ) : null
              }
            >
              <Panel position="top-right">
                <Actions
                  showInvestigateInTimeline={showInvestigateInTimeline}
                  showToggleSearch={showToggleSearch}
                  onInvestigateInTimeline={onInvestigateInTimelineCallback}
                  onSearchToggle={(isSearchToggle) => setSearchToggled(isSearchToggle)}
                  searchFilterCounter={searchFilterCounter}
                  searchToggled={searchToggled}
                  searchWarningMessage={searchWarningMessage}
                />
              </Panel>
            </Graph>
          </EuiFlexItem>
        </EuiFlexGroup>
        <nodeExpandPopover.PopoverComponent />
        <labelExpandPopover.PopoverComponent />
        <ipPopover.PopoverComponent />
        <countryFlagsPopover.PopoverComponent />
        <eventPopover.PopoverComponent />
      </>
    );
  }
);

GraphInvestigation.displayName = 'GraphInvestigation';
