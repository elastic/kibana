/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { getLogsLocatorFromUrlService, getNodeQuery } from '@kbn/logs-shared-plugin/common';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import { OpenInLogsExplorerButton } from '@kbn/logs-shared-plugin/public';
import moment from 'moment';
import { LazySavedSearchComponent } from '@kbn/saved-search-component';
import useAsync from 'react-use/lib/useAsync';
import { Global, css } from '@emotion/react';
import {
  buildCustomFilter,
  FilterStateStore,
  fromKueryExpression,
  toElasticsearchQuery,
} from '@kbn/es-query';
import type { Filter } from '@kbn/es-query';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useAssetDetailsUrlState } from '../../hooks/use_asset_details_url_state';
import { useIntersectingState } from '../../hooks/use_intersecting_state';

const TEXT_QUERY_THROTTLE_INTERVAL_MS = 500;

export const Logs = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { getDateRangeInTimestamp, dateRange, autoRefresh } = useDatePickerContext();
  const [urlState, setUrlState] = useAssetDetailsUrlState();
  const { entity } = useAssetDetailsRenderPropsContext();

  const {
    services: {
      logsDataAccess: {
        services: { logSourcesService },
      },
      embeddable,
      dataViews,
      data: {
        search: { searchSource },
      },
      share: { url },
    },
  } = useKibanaContextForPlugin();
  const logsLocator = getLogsLocatorFromUrlService(url)!;
  const [textQuery, setTextQuery] = useState(urlState?.logsSearch ?? '');
  const [textQueryDebounced, setTextQueryDebounced] = useState(urlState?.logsSearch ?? '');

  const logSources = useAsync(logSourcesService.getFlattenedLogSources);

  const currentTimestamp = getDateRangeInTimestamp().to;
  const state = useIntersectingState(ref, {
    currentTimestamp,
    startTimestamp: currentTimestamp - 60 * 60 * 1000,
    dateRange,
    autoRefresh,
  });

  useDebounce(
    () => {
      setUrlState({ logsSearch: textQuery });
      setTextQueryDebounced(textQuery);
    },
    TEXT_QUERY_THROTTLE_INTERVAL_MS,
    [textQuery]
  );

  // Entity context filter - should NOT be highlighted
  const entityContextFilter = useMemo(
    () => [
      toElasticsearchQuery(
        fromKueryExpression(`${findInventoryFields(entity.type).id}: "${entity.id}"`)
      ),
    ],
    [entity.type, entity.id]
  );

  // User search filter - should be highlighted
  const userSearchFilter = useMemo(() => {
    if (!textQueryDebounced || textQueryDebounced.trim() === '') {
      return [];
    }

    try {
      return [toElasticsearchQuery(fromKueryExpression(textQueryDebounced))];
    } catch (err) {
      // Invalid/incomplete query, return empty array to avoid breaking the component
      return [];
    }
  }, [textQueryDebounced]);

  // User search filters - WILL be highlighted
  const documentFilters = useMemo<Filter[]>(() => {
    // Exit early if no log sources
    if (!logSources.value) {
      return [];
    }

    // Add user search filter (enable highlighting)
    if (userSearchFilter.length > 0) {
      return [
        buildCustomFilter(
          logSources.value,
          userSearchFilter[0],
          false,
          false,
          'User Search',
          FilterStateStore.APP_STATE
        ),
      ];
    }

    return [];
  }, [userSearchFilter, logSources.value]);

  // Entity context filters - WON'T be highlighted
  const nonHighlightingFilters = useMemo<Filter[]>(() => {
    // Exit early if no log sources
    if (!logSources.value) {
      return [];
    }

    // Add entity context filter (skip highlighting)
    if (entityContextFilter.length > 0) {
      return [
        buildCustomFilter(
          logSources.value,
          entityContextFilter[0],
          false,
          false,
          'Entity Context',
          FilterStateStore.APP_STATE
        ),
      ];
    }

    return [];
  }, [entityContextFilter, logSources.value]);

  const onQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTextQuery(e.target.value);
  }, []);

  const logsUrl = useMemo(() => {
    return logsLocator.getRedirectUrl({
      query: getNodeQuery({
        nodeField: findInventoryFields(entity.type).id,
        nodeId: entity.id,
        filter: textQueryDebounced,
      }),
      timeRange: {
        from: moment(state.startTimestamp).toISOString(),
        to: moment(state.currentTimestamp).toISOString(),
      },
    });
  }, [
    logsLocator,
    entity.type,
    entity.id,
    textQueryDebounced,
    state.startTimestamp,
    state.currentTimestamp,
  ]);

  return (
    <>
      {/* z-index override so DocViewer flyout is being visible */}
      <Global
        styles={css`
          .DiscoverFlyout {
            z-index: 6000 !important;
          }
        `}
      />
      <EuiFlexGroup direction="column" ref={ref}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
            <EuiFlexItem>
              <EuiFieldSearch
                data-test-subj="infraAssetDetailsLogsTabFieldSearch"
                fullWidth
                placeholder={i18n.translate('xpack.infra.nodeDetails.logs.textFieldPlaceholder', {
                  defaultMessage: 'Search for log entries...',
                })}
                value={textQuery}
                isClearable
                onChange={onQueryChange}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <OpenInLogsExplorerButton
                href={logsUrl}
                testSubject={'infraAssetDetailsLogsTabOpenInLogsButton'}
                size="xs"
                flush="both"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          {logSources.value ? (
            <LazySavedSearchComponent
              dependencies={{ embeddable, searchSource, dataViews }}
              index={logSources.value}
              timeRange={dateRange}
              filters={documentFilters}
              nonHighlightingFilters={nonHighlightingFilters}
              height="68vh"
              displayOptions={{
                solutionNavIdOverride: 'oblt',
                enableFilters: false,
              }}
            />
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
