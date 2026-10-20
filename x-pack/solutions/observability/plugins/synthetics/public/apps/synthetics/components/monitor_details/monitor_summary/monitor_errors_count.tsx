/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, useEuiTheme } from '@elastic/eui';
import { ReportTypes } from '@kbn/exploratory-view-plugin/public';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useMemo } from 'react';
import type { ClientPluginsStart } from '../../../../../plugin';
import { useMonitorQueryFilters } from '../hooks/use_monitor_query_filters';
import { useSyntheticsDataViewIndexPatterns } from '../hooks/use_synthetics_data_view_index_patterns';

interface MonitorErrorsCountProps {
  from: string;
  to: string;
  id: string;
}

export const MonitorErrorsCount = ({ from, to, id }: MonitorErrorsCountProps) => {
  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;
  const { euiTheme } = useEuiTheme();
  const { queryIdFilter, locationFilter } = useMonitorQueryFilters();
  const dataTypesIndexPatterns = useSyntheticsDataViewIndexPatterns();

  const time = useMemo(() => ({ from, to }), [from, to]);

  if (!queryIdFilter) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="flexEnd" responsive={false} wrap={false}>
      <EuiFlexItem grow={false}>
        <ExploratoryViewEmbeddable
          id={id}
          align="left"
          customHeight="70px"
          reportType={ReportTypes.SINGLE_METRIC}
          dataTypesIndexPatterns={dataTypesIndexPatterns}
          attributes={[
            {
              time,
              reportDefinitions: queryIdFilter,
              dataType: 'synthetics',
              selectedMetricField: 'monitor_errors',
              name: ERRORS_LABEL,
              filters: locationFilter,
              color: euiTheme.colors.vis.euiColorVis6,
            },
          ]}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={{ paddingBottom: euiTheme.size.s }}>
        <ErrorStatesIconTip />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const ERRORS_LABEL = i18n.translate(
  'xpack.synthetics.monitorDetails.summary.errorStatesLabel',
  {
    defaultMessage: 'Error states',
  }
);

export const ERROR_STATES_TOOLTIP = i18n.translate(
  'xpack.synthetics.monitorDetails.summary.errorStatesTooltip',
  {
    defaultMessage:
      'A streak of consecutive failed tests, counted until the monitor recovers. One error state can include many failed tests. Manual run-once tests are not counted.',
  }
);

export const ErrorStatesIconTip = () => (
  <EuiIconTip type="question" content={ERROR_STATES_TOOLTIP} position="top" />
);
