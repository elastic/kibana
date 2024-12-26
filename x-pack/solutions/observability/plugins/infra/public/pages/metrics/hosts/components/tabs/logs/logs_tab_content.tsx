/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { LogStream } from '@kbn/logs-shared-plugin/public';
import React, { useMemo } from 'react';
import { InfraLoadingPanel } from '../../../../../../components/loading';
import { useKibanaContextForPlugin } from '../../../../../../hooks/use_kibana';
import { useLogViewReference } from '../../../../../../hooks/use_log_view_reference';
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
  const { getDateRangeAsTimestamp } = useUnifiedSearchContext();
  const { from, to } = useMemo(() => getDateRangeAsTimestamp(), [getDateRangeAsTimestamp]);
  const { hostNodes, loading } = useHostsViewContext();

  const hostsFilterQuery = useMemo(
    () =>
      buildCombinedAssetFilter({
        field: 'host.name',
        values: hostNodes.map((p) => p.name),
      }),
    [hostNodes]
  );

  const { logViewReference: logView, loading: logViewLoading } = useLogViewReference({
    id: 'hosts-logs-view',
    name: i18n.translate('xpack.infra.hostsViewPage.tabs.logs.LogsByHostWidgetName', {
      defaultMessage: 'Logs by host',
    }),
    extraFields: ['host.name'],
  });

  const logsLinkToStreamQuery = useMemo(() => {
    const hostsFilterQueryParam = createHostsFilterQueryParam(hostNodes.map((p) => p.name));

    if (filterQuery.query && hostsFilterQueryParam) {
      return `${filterQuery.query} and ${hostsFilterQueryParam}`;
    }

    return filterQuery.query || hostsFilterQueryParam;
  }, [filterQuery.query, hostNodes]);

  if (loading || logViewLoading || !logView) {
    return <LogsTabLoadingContent />;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="hostsView-logs">
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <LogsSearchBar />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LogsLinkToStream
            startTime={from}
            endTime={to}
            query={logsLinkToStreamQuery}
            logView={logView}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexItem>
        <LogStream
          height={500}
          logView={logView}
          startTimestamp={from}
          endTimestamp={to}
          filters={[hostsFilterQuery]}
          query={filterQuery}
          showFlyoutAction
        />
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
