/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { LazySavedSearchComponent } from '@kbn/saved-search-component';
import useAsync from 'react-use/lib/useAsync';
import { InfraLoadingPanel } from '../../../../../../components/loading';
import { useKibanaContextForPlugin } from '../../../../../../hooks/use_kibana';
import { buildCombinedAssetFilter } from '../../../../../../utils/filters/build';
import { useHostsViewContext } from '../../../hooks/use_hosts_view';
import { useLogsSearchUrlState } from '../../../hooks/use_logs_search_url_state';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { LogsLinkToStream } from './logs_link_to_stream';
import { LogsSearchBar } from './logs_search_bar';

export const LogsTabContent = () => {
  const {
    services: {
      logsShared: { LogsOverview },
    },
  } = useKibanaContextForPlugin();
  const isLogsOverviewEnabled = LogsOverview.useIsEnabled();
  if (isLogsOverviewEnabled) {
    return <LogsTabLogsOverviewContent />;
  } else {
    return <LogsTabLogStreamContent />;
  }
};

export const LogsTabLogStreamContent = () => {
  const [filterQuery] = useLogsSearchUrlState();
  const {
    getDateRangeAsTimestamp,
    searchCriteria: { dateRange },
  } = useUnifiedSearchContext();

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
    },
  } = useKibanaContextForPlugin();

  const { from, to } = useMemo(() => getDateRangeAsTimestamp(), [getDateRangeAsTimestamp]);
  const { hostNodes, loading } = useHostsViewContext();
  const timeRange = useMemo(() => ({ from: dateRange.from, to: dateRange.to }), [dateRange]);
  const logSources = useAsync(logSourcesService.getFlattenedLogSources);

  const hostsFilterQuery = useMemo(
    () =>
      buildCombinedAssetFilter({
        field: 'host.name',
        values: hostNodes.map((p) => p.name),
      }),
    [hostNodes]
  );

  const logsLinkToStreamQuery = useMemo(() => {
    const hostsFilterQueryParam = createHostsFilterQueryParam(hostNodes.map((p) => p.name));

    if (filterQuery.query && hostsFilterQueryParam) {
      return `${filterQuery.query} and ${hostsFilterQueryParam}`;
    }

    return filterQuery.query || hostsFilterQueryParam;
  }, [filterQuery.query, hostNodes]);

  if (loading) {
    return <LogsTabLoadingContent />;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="hostsView-logs">
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <LogsSearchBar />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LogsLinkToStream startTime={from} endTime={to} query={logsLinkToStreamQuery} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexItem>
        {logSources.value && embeddable ? (
          <LazySavedSearchComponent
            dependencies={{ embeddable, searchSource, dataViews }}
            index={logSources.value}
            timeRange={timeRange}
            query={filterQuery}
            filters={[hostsFilterQuery]}
            height={'60vh'}
            displayOptions={{
              enableDocumentViewer: true,
              enableFilters: true,
            }}
          />
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const createHostsFilterQueryParam = (hostNodes: string[]): string => {
  if (!hostNodes.length) {
    return '';
  }

  const joinedHosts = hostNodes.join(' or ');
  const hostsQueryParam = `host.name:(${joinedHosts})`;

  return hostsQueryParam;
};

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

const LogsTabLoadingContent = () => (
  <EuiFlexGroup style={{ height: 300 }} direction="column" alignItems="stretch">
    <EuiFlexItem grow>
      <InfraLoadingPanel
        width="100%"
        height="100%"
        text={
          <FormattedMessage
            id="xpack.infra.hostsViewPage.tabs.logs.loadingEntriesLabel"
            defaultMessage="Loading entries"
          />
        }
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
