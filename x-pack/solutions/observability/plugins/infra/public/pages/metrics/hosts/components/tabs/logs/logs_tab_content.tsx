/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import { buildEsQuery, fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import React, { useMemo } from 'react';
import { useKibanaContextForPlugin } from '../../../../../../hooks/use_kibana';
import { buildCombinedAssetFilter } from '../../../../../../utils/filters/build';
import { useHostsViewContext } from '../../../hooks/use_hosts_view';
import { useLogsSearchUrlState } from '../../../hooks/use_logs_search_url_state';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { LogsSearchBar } from './logs_search_bar';

export const LogsTabContent = () => {
  const {
    services: {
      logsShared: { LogsOverview },
      uiSettings,
    },
  } = useKibanaContextForPlugin();

  const { parsedDateRange, searchCriteria } = useUnifiedSearchContext();
  const timeRange = useMemo(
    () => ({ start: parsedDateRange.from, end: parsedDateRange.to }),
    [parsedDateRange.from, parsedDateRange.to]
  );

  const { hostNodes, loading, error } = useHostsViewContext();

  const [filterQuery] = useLogsSearchUrlState();

  // Top search bar filters - these should be highlighted
  // These would be passed to Elasticsearch as well to filter by the logs component,
  // but I don't care because the data is already filtered at that point
  const topSearchFilters = useMemo(() => {
    const hasQuery = searchCriteria?.query?.query;
    const hasFilters = searchCriteria?.filters?.length > 0;
    const hasPanelFilters = searchCriteria?.panelFilters?.length > 0;

    if (!hasQuery && !hasFilters && !hasPanelFilters) {
      return [];
    }

    try {
      return [
        buildEsQuery(
          undefined,
          searchCriteria.query,
          [...(searchCriteria.filters ?? []), ...(searchCriteria.panelFilters ?? [])],
          getEsQueryConfig(uiSettings)
        ),
      ];
    } catch (err) {
      // Invalid/incomplete query, return empty array to avoid breaking the component
      return [];
    }
  }, [searchCriteria.query, searchCriteria.filters, searchCriteria.panelFilters, uiSettings]);

  // Logs search bar filters - these should be highlighted
  const logsSearchFilters = useMemo(() => {
    if (!filterQuery || !filterQuery.query) {
      return [];
    }

    try {
      return [toElasticsearchQuery(fromKueryExpression(filterQuery.query))];
    } catch (err) {
      // Invalid/incomplete query, return empty array to avoid breaking the component
      return [];
    }
  }, [filterQuery]);

  // Combine all user search filters (from both search bars)
  const documentLogFilters = useMemo(
    () => [...topSearchFilters, ...logsSearchFilters],
    [topSearchFilters, logsSearchFilters]
  );

  // Host name context filters - these should NOT be highlighted
  const nonHighlightingLogFilters = useMemo(
    () => [
      buildEsQuery(
        undefined,
        [],
        buildCombinedAssetFilter({
          field: 'host.name',
          values: hostNodes.map((p) => p.name),
        }),
        getEsQueryConfig(uiSettings)
      ),
    ],
    [hostNodes, uiSettings]
  );

  if (loading) {
    return <LogsOverview.LoadingContent />;
  } else if (error != null) {
    return <LogsOverview.ErrorContent error={error} />;
  } else {
    return (
      <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="hostsView-logs">
        <EuiFlexItem>
          <LogsSearchBar />
        </EuiFlexItem>
        <EuiFlexItem>
          <LogsOverview
            documentFilters={documentLogFilters}
            nonHighlightingFilters={nonHighlightingLogFilters}
            timeRange={timeRange}
            height="60vh"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
};
