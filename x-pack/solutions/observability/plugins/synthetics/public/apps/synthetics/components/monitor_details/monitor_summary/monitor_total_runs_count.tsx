/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { ReportTypes } from '@kbn/exploratory-view-plugin/public';
import { i18n } from '@kbn/i18n';
import { ClientPluginsStart } from '../../../../../plugin';
import { useMonitorQueryFilters } from '../hooks/use_monitor_query_filters';

interface MonitorTotalRunsCountProps {
  from: string;
  to: string;
}

export const MonitorTotalRunsCount = (props: MonitorTotalRunsCountProps) => {
  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;

  const { queryIdFilter, locationFilter } = useMonitorQueryFilters();

  if (!queryIdFilter) {
    return null;
  }

  return (
    <ExploratoryViewEmbeddable
      id="monitorTotalRunsCount"
      align="left"
      reportType={ReportTypes.SINGLE_METRIC}
      attributes={[
        {
          time: props,
          reportDefinitions: queryIdFilter,
          filters: locationFilter,
          dataType: 'synthetics',
          selectedMetricField: 'monitor_total_runs',
          name: TOTAL_RUNS_LABEL,
        },
      ]}
    />
  );
};

const TOTAL_RUNS_LABEL = i18n.translate('xpack.synthetics.monitorDetails.summary.totalRuns', {
  defaultMessage: 'Total runs',
});
