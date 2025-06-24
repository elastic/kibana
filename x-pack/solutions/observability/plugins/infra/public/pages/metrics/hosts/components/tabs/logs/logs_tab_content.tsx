/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { LazySavedSearchComponent } from '@kbn/saved-search-component';
import useAsync from 'react-use/lib/useAsync';
import { getLogsLocatorFromUrlService } from '@kbn/logs-shared-plugin/common';
import { OpenInLogsExplorerButton } from '@kbn/logs-shared-plugin/public';
import { useKibanaContextForPlugin } from '../../../../../../hooks/use_kibana';
import { buildCombinedAssetFilter } from '../../../../../../utils/filters/build';
import { useHostsViewContext } from '../../../hooks/use_hosts_view';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { useLogsSearchUrlState } from '../../../hooks/use_logs_search_url_state';
import { LogsSearchBar } from './logs_search_bar';

export const LogsTabContent = () => {
  const {
    services: {
      logsShared: { LogsOverview },
    },
  } = useKibanaContextForPlugin();
  const isLogsOverviewEnabled = LogsOverview.useIsEnabled();
  return isLogsOverviewEnabled ? <LogsTabLogsOverviewContent /> : <LogsSavedSearchComponent />;
};

export const LogsSavedSearchComponent = () => {
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

  const logSources = useAsync(logSourcesService.getFlattenedLogSources);

  const logsLocator = getLogsLocatorFromUrlService(url);

  const {
    parsedDateRange: { from, to },
  } = useUnifiedSearchContext();

  const { hostNodes, loading } = useHostsViewContext();

  const [filterQuery] = useLogsSearchUrlState();

  const hostsFilterQuery = useMemo(() => {
    const hostsQueryPart = hostNodes.length
      ? hostNodes.map((node) => `host.name: "${node.name}"`).join(' or ')
      : '';

    const urlQueryPart = filterQuery?.query ? String(filterQuery.query) : '';

    const parts = [] as string[];
    if (hostsQueryPart) parts.push(hostsQueryPart);
    if (urlQueryPart) parts.push(`(${urlQueryPart})`);

    return {
      language: 'kuery',
      query: parts.join(' and '),
    };
  }, [hostNodes, filterQuery]);

  const memoizedTimeRange = useMemo(() => ({ from, to }), [from, to]);

  const discoverLink = logsLocator?.getRedirectUrl({
    timeRange: memoizedTimeRange,
    query: hostsFilterQuery,
  });

  if (!hostNodes.length && !loading) {
    return <LogsTabNoResults />;
  }

  return logSources.value ? (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="hostsView-logs">
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <LogsSearchBar />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <OpenInLogsExplorerButton
            href={discoverLink}
            testSubject="hostsView-logs-link-to-stream-button"
            flush="both"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexItem>
        <LazySavedSearchComponent
          dependencies={{ embeddable, searchSource, dataViews }}
          index={logSources.value}
          timeRange={memoizedTimeRange}
          query={hostsFilterQuery}
          height="60vh"
          displayOptions={{
            solutionNavIdOverride: 'oblt',
            enableDocumentViewer: true,
            enableFilters: false,
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : null;
};

const LogsTabNoResults = () => (
  <EuiFlexGroup css={{ height: '60vh' }} direction="column" alignItems="stretch">
    <EuiFlexItem grow>
      <EuiText size="xs" color="subdued">
        <EuiIcon type="discoverApp" size="m" color="subdued" />
        <EuiSpacer size="s" />
        <FormattedMessage id="xpack.infra.logs.noResultsFound" defaultMessage="No results found" />
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const LogsTabLogsOverviewContent = () => {
  const {
    services: {
      logsShared: { LogsOverview },
    },
  } = useKibanaContextForPlugin();

  const { parsedDateRange } = useUnifiedSearchContext();
  const timeRange = useMemo(
    () => ({ start: parsedDateRange.from, end: parsedDateRange.to }),
    [parsedDateRange.from, parsedDateRange.to]
  );

  const { hostNodes, loading, error } = useHostsViewContext();
  const logFilters = useMemo(
    () => [
      buildCombinedAssetFilter({
        field: 'host.name',
        values: hostNodes.map((p) => p.name),
      }).query as QueryDslQueryContainer,
    ],
    [hostNodes]
  );

  if (loading) {
    return <LogsOverview.LoadingContent />;
  } else if (error != null) {
    return <LogsOverview.ErrorContent error={error} />;
  } else {
    return <LogsOverview documentFilters={logFilters} timeRange={timeRange} />;
  }
};
