/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { ReportTypes } from '@kbn/exploratory-view-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import type { ClientPluginsStart } from '../../../../../../plugin';
import { useRefreshedRange } from '../../../../hooks';
import { useMonitorFilters } from '../../hooks/use_monitor_filters';
import { useMonitorQueryFilters } from '../../hooks/use_monitor_query_filters';
import { useOverviewDataViewIndexPatterns } from '../../hooks/use_overview_data_view_index_patterns';
import * as labels from '../labels';

export const MonitorTestRunsCount = () => {
  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;
  const { euiTheme } = useEuiTheme();

  const { from, to } = useRefreshedRange(30, 'days');
  const filters = useMonitorFilters({});
  const queryFilter = useMonitorQueryFilters();
  const { dataTypesIndexPatterns, loading } = useOverviewDataViewIndexPatterns();

  // Wait for the CCS index pattern to resolve before mounting the embeddable;
  // it latches its first data view title (see useOverviewDataViewIndexPatterns).
  if (loading) {
    return null;
  }

  return (
    <ExploratoryViewEmbeddable
      dslFilters={queryFilter}
      dataTypesIndexPatterns={dataTypesIndexPatterns}
      align="left"
      reportType={ReportTypes.SINGLE_METRIC}
      attributes={[
        {
          filters,
          time: { from, to },
          reportDefinitions: {
            'monitor.type': ['http', 'tcp', 'browser', 'icmp'],
          },
          dataType: 'synthetics',
          selectedMetricField: 'monitor_total_runs',
          name: labels.TEST_RUNS_LABEL,
          color: euiTheme.colors.vis.euiColorVis0,
        },
      ]}
    />
  );
};
