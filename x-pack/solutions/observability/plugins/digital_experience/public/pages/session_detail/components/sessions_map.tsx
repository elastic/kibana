/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { omit } from 'lodash';
import type { Subscription } from 'rxjs';
import { css } from '@emotion/react';
import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiPanel,
  EuiProgress,
  EuiText,
  useEuiTheme,
  useResizeObserver,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import { useAbortableAsync } from '@kbn/react-hooks';
import type { MapsStartApi, RenderTooltipContentParams } from '@kbn/maps-plugin/public';
import { formatGeoBounds, parseGeoBounds } from '../../../../common/geo_bounds';
import type { GeoLocation, SessionLocationCluster } from '../../../../common/sessions';
import { LoadErrorPrompt } from '../../../components/load_error_prompt';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, SESSIONS_EBT_ELEMENTS } from '../../../ebt_constants';
import { useApiClient, type DigitalExperienceApiClient } from '../../../hooks/use_api_client';
import { useEnvironment } from '../../../hooks/use_environment';
import { useFormatters } from '../../../hooks/use_formatters';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useUpdateUrlQuery } from '../../../hooks/use_update_url_query';
import { sessionsListRequestQuery } from '../../sessions/hooks/sessions_list_request';
import type { SessionsListState } from '../../sessions/hooks/use_sessions_list_query';
import {
  CLUSTERS_LAYER_ID,
  CLUSTER_KEY_PROPERTY,
  WORLD_VIEW,
  clusterZoom,
  fitView,
  sessionsMapLayers,
  viewBounds,
  type MapSize,
  type MapView,
} from '../utils/sessions_map';
import { CLUSTER_SESSIONS_SHOWN, SessionClusterTooltip } from './session_cluster_tooltip';

/** The map settles before it loads, so a drag or a scroll zoom loads once. */
const MOVE_DEBOUNCE_MS = 300;

const SEARCH_AS_MOVED_LABEL = i18n.translate('xpack.digitalExperience.sessionsMap.searchAsMoved', {
  defaultMessage: 'Search as I move the map',
});

/** The params that pick the sessions, without the list's own map area, sort and page. */
type FiltersQuery = ReturnType<typeof sessionsListRequestQuery>;
const filtersQueryOf = (query: FiltersQuery): FiltersQuery =>
  omit(query, ['bounds', 'sortField', 'sortDirection', 'page', 'perPage']) as FiltersQuery;

/** The latest sessions of a cluster, loaded when the user clicks it. */
function ClusterSessions({
  apiClient,
  serviceName,
  filtersQuery,
  cluster,
  isLocked,
  ...tooltipProps
}: {
  apiClient: DigitalExperienceApiClient;
  serviceName: string;
  filtersQuery: FiltersQuery;
  cluster: SessionLocationCluster;
} & Omit<
  React.ComponentProps<typeof SessionClusterTooltip>,
  'cluster' | 'sessions' | 'loading' | 'failed'
>) {
  const { value, loading, error } = useAbortableAsync(
    ({ signal }) =>
      isLocked
        ? apiClient.fetch('GET /internal/digital_experience/applications/{serviceName}/sessions', {
            signal,
            params: {
              path: { serviceName },
              query: {
                ...filtersQuery,
                bounds: formatGeoBounds(cluster.bounds),
                perPage: CLUSTER_SESSIONS_SHOWN,
              },
            },
          })
        : undefined,
    [apiClient, serviceName, filtersQuery, cluster.bounds, isLocked]
  );
  return (
    <SessionClusterTooltip
      {...tooltipProps}
      cluster={cluster}
      isLocked={isLocked}
      sessions={value?.sessions}
      loading={loading}
      failed={Boolean(error)}
    />
  );
}

/**
 * The sessions of the list, filtered like it, as bubbles on a map: each bubble holds the sessions
 * of a city, or of nearby ones until the user zooms in. Clicking one lists its latest sessions to
 * open. With "Search as I move the map", the list also narrows to the area the map shows.
 */
export function SessionsMap({
  maps,
  serviceName,
  sessionId,
  state,
  selectedLocation,
  sessionHref,
  onShowList,
}: {
  maps: MapsStartApi;
  serviceName: string;
  sessionId: string;
  state: SessionsListState;
  /** Where the open session is from, ringed on the map. */
  selectedLocation: GeoLocation | null;
  sessionHref: (sessionId: string) => string;
  /** Shows the list, narrowed to the map area the user picked. */
  onShowList: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const apiClient = useApiClient();
  const { timeZone, formatNumber } = useFormatters();
  const { timeRange } = useTimeRange();
  const { environment } = useEnvironment();
  const updateUrlQuery = useUpdateUrlQuery();

  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const { width, height } = useResizeObserver(container);
  const size = useMemo<MapSize | null>(
    () => (width > 0 && height > 0 ? { width, height } : null),
    [width, height]
  );

  const filtersQuery = useMemo(
    () => filtersQueryOf(sessionsListRequestQuery({ timeRange, environment, state })),
    [timeRange, environment, state]
  );

  // Where the map looks, as it reports it, and the part of it the clusters are loaded for.
  const [view, setView] = useState<MapView | null>(null);
  const [loadedView, setLoadedView] = useState<{ zoom: number; viewport?: string }>({ zoom: 0 });
  useDebounce(
    () => {
      if (view && size) {
        setLoadedView({
          zoom: clusterZoom(view.zoom),
          viewport: formatGeoBounds(viewBounds(view, size)),
        });
      }
    },
    MOVE_DEBOUNCE_MS,
    [view, width, height]
  );

  const {
    value: locations,
    loading,
    error,
    refresh,
  } = useAbortableAsync(
    ({ signal }) =>
      apiClient.fetch(
        'GET /internal/digital_experience/applications/{serviceName}/session_locations',
        {
          signal,
          params: { path: { serviceName }, query: { ...filtersQuery, ...loadedView } },
        }
      ),
    [apiClient, serviceName, filtersQuery, loadedView]
  );

  const { value: basemap, loading: basemapLoading } = useAbortableAsync(
    () => maps.createLayerDescriptors.createBasemapLayerDescriptor(),
    [maps]
  );

  // The map opens on the area the list is narrowed to, else on all the sessions. It then keeps its
  // own view: the Maps embeddable only reads it once.
  const [initialView, setInitialView] = useState<MapView | null>(null);
  const listBounds = useMemo(() => parseGeoBounds(state.bounds), [state.bounds]);
  useEffect(() => {
    if (initialView || !size) {
      return;
    }
    if (listBounds) {
      setInitialView(fitView(listBounds, size));
    } else if (locations) {
      setInitialView(
        locations.bounds ? fitView(locations.bounds, size, locations.center) : WORLD_VIEW
      );
    }
  }, [initialView, size, listBounds, locations]);

  // With "Search as I move the map", the list follows the map's area.
  const searchAsMoved = listBounds !== null;
  const [searchAsMovedPending, setSearchAsMovedPending] = useState(false);
  const applyViewBounds = useCallback(
    (nextView: MapView | null) => {
      if (!nextView || !size) {
        return;
      }
      const bounds = formatGeoBounds(viewBounds(nextView, size));
      if (bounds !== state.bounds) {
        // Replaced, so Back doesn't step through each move of the map.
        updateUrlQuery({ bounds }, { replace: true, remove: ['page'] });
      }
    },
    [size, state.bounds, updateUrlQuery]
  );
  useDebounce(
    () => {
      if (searchAsMoved || searchAsMovedPending) {
        setSearchAsMovedPending(false);
        applyViewBounds(view);
      }
    },
    MOVE_DEBOUNCE_MS,
    [view, width, height, searchAsMovedPending]
  );
  const toggleSearchAsMoved = () => {
    if (searchAsMoved) {
      updateUrlQuery({ bounds: undefined }, { replace: true, remove: ['page'] });
    } else {
      setSearchAsMovedPending(true);
    }
  };

  const clusters = locations?.clusters;
  const colors = useMemo(
    () => ({
      fill: euiTheme.colors.primary,
      border: euiTheme.colors.plainLight,
      label: euiTheme.colors.plainLight,
      selected: euiTheme.colors.accent,
    }),
    [euiTheme]
  );
  // The Maps embeddable sets its layers again whenever the list changes, so it only changes with them.
  const layerList = useMemo(
    () =>
      sessionsMapLayers({
        basemap: basemap ?? null,
        clusters: clusters ?? [],
        selectedLocation,
        colors,
      }),
    [basemap, clusters, selectedLocation, colors]
  );

  // The Maps embeddable takes its tooltip renderer once, so it reads the latest of what it needs.
  const latest = useRef({
    clusters,
    apiClient,
    serviceName,
    sessionId,
    filtersQuery,
    sessionHref,
    timeZone,
    formatNumber,
    updateUrlQuery,
    onShowList,
  });
  latest.current = {
    clusters,
    apiClient,
    serviceName,
    sessionId,
    filtersQuery,
    sessionHref,
    timeZone,
    formatNumber,
    updateUrlQuery,
    onShowList,
  };
  const getTooltipRenderer = useCallback(
    () =>
      ({ features, isLocked, closeTooltip }: RenderTooltipContentParams) => {
        const current = latest.current;
        const key = features
          .filter(({ layerId }) => layerId === CLUSTERS_LAYER_ID)
          .map(({ mbProperties }) => mbProperties?.[CLUSTER_KEY_PROPERTY])
          .find((value): value is string => typeof value === 'string');
        const cluster = current.clusters?.find((candidate) => candidate.key === key);
        if (!cluster) {
          return <></>;
        }
        return (
          <ClusterSessions
            apiClient={current.apiClient}
            serviceName={current.serviceName}
            filtersQuery={current.filtersQuery}
            cluster={cluster}
            isLocked={isLocked}
            sessionHref={current.sessionHref}
            selectedSessionId={current.sessionId}
            timeZone={current.timeZone}
            formatNumber={current.formatNumber}
            onClose={closeTooltip}
            onShowAll={() => {
              closeTooltip();
              current.updateUrlQuery(
                { bounds: formatGeoBounds(cluster.bounds) },
                { remove: ['page'] }
              );
              current.onShowList();
            }}
          />
        );
      },
    []
  );

  const viewSubscription = useRef<Subscription>();
  useEffect(() => () => viewSubscription.current?.unsubscribe(), []);
  const onApiAvailable = useCallback(
    (
      api: Parameters<NonNullable<React.ComponentProps<MapsStartApi['Map']>['onApiAvailable']>>[0]
    ) => {
      viewSubscription.current?.unsubscribe();
      viewSubscription.current = api.latestState$.subscribe(({ mapCenter }) => {
        if (mapCenter) {
          setView((current) =>
            current &&
            current.lat === mapCenter.lat &&
            current.lon === mapCenter.lon &&
            current.zoom === mapCenter.zoom
              ? current
              : { lat: mapCenter.lat, lon: mapCenter.lon, zoom: mapCenter.zoom }
          );
        }
      });
    },
    []
  );

  const located = locations?.located ?? 0;
  const total = locations?.total ?? 0;

  return (
    <div
      data-test-subj="digitalExperienceSessionsMap"
      css={css({ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 })}
    >
      <div css={css({ position: 'relative', height: 2 })}>
        {loading && locations && (
          <EuiProgress
            size="xs"
            color="accent"
            data-test-subj="digitalExperienceSessionsMapLoading"
          />
        )}
      </div>
      <div ref={setContainer} css={css({ position: 'relative', flex: 1, minHeight: 0 })}>
        {error && !locations ? (
          <LoadErrorPrompt
            data-test-subj="digitalExperienceSessionsMapError"
            retryDataTestSubj="digitalExperienceSessionsMapRetry"
            retryEbtElement={SESSIONS_EBT_ELEMENTS.RETRY}
            title={i18n.translate('xpack.digitalExperience.sessionsMap.loadError', {
              defaultMessage: 'Could not load the sessions map',
            })}
            error={error}
            onRetry={refresh}
          />
        ) : !initialView || basemapLoading ? (
          <EuiFlexGroup justifyContent="center" css={css({ padding: euiTheme.size.l })}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexGroup>
        ) : (
          <>
            <div css={css({ position: 'absolute', inset: 0 })}>
              <maps.Map
                layerList={layerList}
                mapCenter={initialView}
                isLayerTOCOpen={false}
                hideFilterActions={true}
                mapSettings={{
                  autoFitToDataBounds: false,
                  hideLayerControl: true,
                  hideToolbarOverlay: true,
                  showTimesliderToggleButton: false,
                }}
                getTooltipRenderer={getTooltipRenderer}
                onApiAvailable={onApiAvailable}
              />
            </div>
            <EuiPanel
              paddingSize="s"
              hasShadow
              css={css({
                position: 'absolute',
                // Above the map's canvas and controls, which stack on their own.
                zIndex: Number(euiTheme.levels.content) + 1,
                top: euiTheme.size.s,
                right: euiTheme.size.s,
                // Clear of the map's zoom buttons on the left.
                maxWidth: `calc(100% - ${euiTheme.size.xxxl})`,
              })}
            >
              <EuiCheckbox
                id="digitalExperienceSessionsMapSearchAsMoved"
                label={SEARCH_AS_MOVED_LABEL}
                checked={searchAsMoved || searchAsMovedPending}
                onChange={toggleSearchAsMoved}
                data-test-subj="digitalExperienceSessionsMapSearchAsMoved"
                {...getEbtProps({
                  action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SET_FILTER,
                  element: SESSIONS_EBT_ELEMENTS.MAP_SEARCH_AS_MOVED,
                })}
              />
            </EuiPanel>
          </>
        )}
      </div>
      {locations && (
        <EuiText
          size="xs"
          color="subdued"
          data-test-subj="digitalExperienceSessionsMapCounts"
          css={css({
            padding: `${euiTheme.size.xs} ${euiTheme.size.m}`,
            borderTop: euiTheme.border.thin,
          })}
        >
          {located === total
            ? i18n.translate('xpack.digitalExperience.sessionsMap.counts', {
                defaultMessage: '{total, plural, one {# session} other {# sessions}}',
                values: { total },
              })
            : i18n.translate('xpack.digitalExperience.sessionsMap.countsWithoutLocation', {
                defaultMessage:
                  '{located} of {total, plural, one {# session} other {# sessions}} have a location',
                values: { located: formatNumber(located), total },
              })}
        </EuiText>
      )}
    </div>
  );
}
