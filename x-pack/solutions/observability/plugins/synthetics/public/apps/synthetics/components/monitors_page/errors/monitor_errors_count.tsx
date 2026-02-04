/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useMemo } from 'react';
import { ReportTypes } from '@kbn/exploratory-view-plugin/public';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';
import type { ClientPluginsStart } from '../../../../../plugin';

interface MonitorErrorsCountProps {
  from: string;
  to: string;
  monitorIds: string[];
}

export const MonitorErrorsCount = ({ from, to, monitorIds }: MonitorErrorsCountProps) => {
  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;
  const { euiTheme } = useEuiTheme();

  const isAmsterdam = euiTheme.flags.hasVisColorAdjustment;

  const time = useMemo(() => ({ from, to }), [from, to]);

  if (!monitorIds.length) {
    return null;
  }

  return (
    <ExploratoryViewEmbeddable
      id="allMonitorsErrorsCount"
      align="left"
      customHeight="70px"
      reportType={ReportTypes.SINGLE_METRIC}
      attributes={[
        {
          time,
          reportDefinitions: { 'monitor.id': monitorIds },
          dataType: 'synthetics',
          selectedMetricField: 'monitor_errors',
          name: ERRORS_LABEL,
          filters: [],
          color: isAmsterdam ? euiTheme.colors.vis.euiColorVis1 : euiTheme.colors.vis.euiColorVis6,
        },
      ]}
    />
  );
};

export const ERRORS_LABEL = i18n.translate('xpack.synthetics.monitorDetails.summary.errors', {
  defaultMessage: 'Errors',
});
