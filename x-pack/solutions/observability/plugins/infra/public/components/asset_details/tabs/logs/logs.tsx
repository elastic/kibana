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
import {
  DEFAULT_LOG_VIEW,
  getLogsLocatorFromUrlService,
  getNodeQuery,
  type LogViewReference,
} from '@kbn/logs-shared-plugin/common';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import { OpenInLogsExplorerButton } from '@kbn/logs-shared-plugin/public';
import moment from 'moment';
import { LazySavedSearchComponent } from '@kbn/saved-search-component';
import useAsync from 'react-use/lib/useAsync';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useDataViewsContext } from '../../hooks/use_data_views';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useAssetDetailsUrlState } from '../../hooks/use_asset_details_url_state';
import { useIntersectingState } from '../../hooks/use_intersecting_state';

const TEXT_QUERY_THROTTLE_INTERVAL_MS = 500;

export const Logs = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { getDateRangeInTimestamp, dateRange, autoRefresh } = useDatePickerContext();
  const [urlState, setUrlState] = useAssetDetailsUrlState();
  const { entity } = useAssetDetailsRenderPropsContext();
  const { logs } = useDataViewsContext();

  const { reference: logViewReference } = logs ?? {};

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

  const filter = useMemo(() => {
    const query = [
      `${findInventoryFields(entity.type).id}: "${entity.id}"`,
      ...(textQueryDebounced !== '' ? [textQueryDebounced] : []),
    ].join(' and ');

    return {
      language: 'kuery',
      query,
    };
  }, [entity.type, entity.id, textQueryDebounced]);

  const onQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTextQuery(e.target.value);
  }, []);

  const logView: LogViewReference = useMemo(
    () => (logViewReference ? logViewReference : DEFAULT_LOG_VIEW),
    [logViewReference]
  );

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
      logView,
    });
  }, [
    logsLocator,
    entity.id,
    entity.type,
    state.startTimestamp,
    state.currentTimestamp,
    textQueryDebounced,
    logView,
  ]);

  return (
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
            query={filter}
            height="68vh"
            displayOptions={{
              solutionNavIdOverride: 'oblt',
              enableDocumentViewer: false,
              enableFilters: false,
            }}
          />
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
