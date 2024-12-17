/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { ClientPluginsStart } from '../../../../../../../plugin';
import { ERRORS_LABEL } from '../../../../monitor_details/monitor_summary/monitor_errors_count';

interface Props {
  from: string;
  to: string;
  monitorIds: string[];
  locations?: string[];
}
export const OverviewErrorsSparklines = ({ from, to, monitorIds, locations }: Props) => {
  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;

  const { euiTheme } = useEuiTheme();

  const time = useMemo(() => ({ from, to }), [from, to]);

  return (
    <ExploratoryViewEmbeddable
      id="overviewErrorsSparklines"
      reportType="kpi-over-time"
      axisTitlesVisibility={{ x: false, yRight: false, yLeft: false }}
      legendIsVisible={false}
      hideTicks={true}
      attributes={[
        {
          time,
          seriesType: 'area',
          reportDefinitions: {
            'monitor.id': monitorIds.length > 0 ? monitorIds : ['false-monitor-id'],
            ...(locations?.length ? { 'observer.geo.name': locations } : {}),
          },
          dataType: 'synthetics',
          selectedMetricField: 'monitor_errors',
          name: ERRORS_LABEL,
          color: euiTheme.colors.danger,
          operationType: 'unique_count',
        },
      ]}
    />
  );
};
