/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useMemo } from 'react';
import { ReportTypes } from '@kbn/exploratory-view-plugin/public';
import { useMonitorFilters } from '../../../hooks/use_monitor_filters';
import { ERRORS_LABEL } from '../../../../monitor_details/monitor_summary/monitor_errors_count';
import { ClientPluginsStart } from '../../../../../../../plugin';
import { useMonitorQueryFilters } from '../../../hooks/use_monitor_query_filters';

interface MonitorErrorsCountProps {
  from: string;
  to: string;
}

export const OverviewErrorsCount = ({ from, to }: MonitorErrorsCountProps) => {
  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;

  const filters = useMonitorFilters({});

  const time = useMemo(() => ({ from, to }), [from, to]);

  return (
    <ExploratoryViewEmbeddable
      id="overviewErrorsCount"
      align="left"
      customHeight="70px"
      dslFilters={useMonitorQueryFilters()}
      reportType={ReportTypes.SINGLE_METRIC}
      attributes={[
        {
          time,
          reportDefinitions: {
            'monitor.type': ['http', 'tcp', 'browser', 'icmp'],
          },
          dataType: 'synthetics',
          selectedMetricField: 'monitor_errors',
          name: ERRORS_LABEL,
          filters,
        },
      ]}
    />
  );
};
