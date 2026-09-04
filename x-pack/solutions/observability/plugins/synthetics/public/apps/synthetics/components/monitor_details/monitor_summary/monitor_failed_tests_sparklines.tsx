/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { FAILED_TESTS_LABEL } from '../monitor_errors/failed_tests';
import type { ClientPluginsStart } from '../../../../../plugin';
import { useMonitorQueryFilters } from '../hooks/use_monitor_query_filters';
import { useSyntheticsDataViewIndexPatterns } from '../hooks/use_synthetics_data_view_index_patterns';

interface Props {
  from: string;
  to: string;
}

export const MonitorFailedTestsSparklines = (props: Props) => {
  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;

  const { queryIdFilter, locationFilter } = useMonitorQueryFilters();
  const dataTypesIndexPatterns = useSyntheticsDataViewIndexPatterns();

  const { euiTheme } = useEuiTheme();

  if (!queryIdFilter) {
    return null;
  }

  return (
    <ExploratoryViewEmbeddable
      id="monitorFailedTestsSparklines"
      reportType="kpi-over-time"
      axisTitlesVisibility={{ x: false, yRight: false, yLeft: false }}
      legendIsVisible={false}
      hideTicks={true}
      dataTypesIndexPatterns={dataTypesIndexPatterns}
      attributes={[
        {
          seriesType: 'area',
          time: props,
          reportDefinitions: queryIdFilter,
          filters: locationFilter,
          dataType: 'synthetics',
          selectedMetricField: 'monitor_failed_tests',
          name: FAILED_TESTS_LABEL,
          color: euiTheme.colors.danger,
          operationType: 'count',
        },
      ]}
    />
  );
};
