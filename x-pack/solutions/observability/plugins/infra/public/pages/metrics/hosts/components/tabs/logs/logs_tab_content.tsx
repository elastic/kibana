/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { LazySavedSearchComponent } from '@kbn/saved-search-component';
import useAsync from 'react-use/lib/useAsync';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { getLogsLocatorFromUrlService } from '@kbn/logs-shared-plugin/common';
import { useKibanaContextForPlugin } from '../../../../../../hooks/use_kibana';
import { buildCombinedAssetFilter } from '../../../../../../utils/filters/build';
import { useHostsViewContext } from '../../../hooks/use_hosts_view';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';

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

  const hostsFilterQuery = useMemo(
    () => ({
      query: hostNodes.map((node) => `host.name: "${node.name}"`).join(' or '),
      language: 'kuery',
    }),
    [hostNodes]
  );

  const memoizedTimeRange = useMemo(() => ({ from, to }), [from, to]);

  const discoverLink = logsLocator?.getRedirectUrl({
    timeRange: memoizedTimeRange,
    query: hostsFilterQuery,
  });

  if (!hostNodes.length && !loading) {
    return <LogsTabNoResults />;
  }

  return logSources.value ? (
    <>
      {!loading && (
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="none" style={{ marginBottom: 8 }}>
          <EuiFlexItem grow={false}>
            <EuiLink
              data-test-subj="infraHostLogsTabOpenInDiscoverLink"
              href={discoverLink}
              target="_blank"
              color="primary"
              css={css`
                display: flex;
                align-items: center;
              `}
              external={false}
            >
              <EuiIcon
                type="discoverApp"
                size="s"
                color="primary"
                css={css`
                  margin-right: 4px;
                `}
              />
              <EuiText size="xs">
                {i18n.translate('xpack.infra.hosts.logs.openInDiscoverLabel', {
                  defaultMessage: 'Open in Discover',
                })}
              </EuiText>
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
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
    </>
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
