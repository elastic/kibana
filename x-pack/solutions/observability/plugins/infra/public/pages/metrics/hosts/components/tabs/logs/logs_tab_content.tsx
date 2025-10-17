/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import { buildEsQuery } from '@kbn/es-query';
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

  const { parsedDateRange } = useUnifiedSearchContext();
  const timeRange = useMemo(
    () => ({ start: parsedDateRange.from, end: parsedDateRange.to }),
    [parsedDateRange.from, parsedDateRange.to]
  );

  const { hostNodes, loading, error } = useHostsViewContext();

  const [filterQuery] = useLogsSearchUrlState();

  // User search filters - these should be highlighted
  const documentLogFilters = useMemo(
    () =>
      filterQuery && filterQuery.query
        ? [buildEsQuery(undefined, filterQuery, [], getEsQueryConfig(uiSettings))]
        : [],
    [filterQuery, uiSettings]
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
