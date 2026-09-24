/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FAILED_TESTS_LABEL } from './failed_tests';
import type { ClientPluginsStart } from '../../../../../plugin';
import { useMonitorQueryFilters } from '../hooks/use_monitor_query_filters';
import { useSyntheticsDataViewIndexPatterns } from '../hooks/use_synthetics_data_view_index_patterns';

export const FailedTestsCount = ({ from, to, id }: { to: string; from: string; id: string }) => {
  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;
  const { euiTheme } = useEuiTheme();

  const { queryIdFilter, locationFilter } = useMonitorQueryFilters();

  const dataTypesIndexPatterns = useSyntheticsDataViewIndexPatterns();

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
          reportType="single-metric"
          dataTypesIndexPatterns={dataTypesIndexPatterns}
          attributes={[
            {
              time: { from, to },
              reportDefinitions: queryIdFilter,
              filters: locationFilter,
              dataType: 'synthetics',
              selectedMetricField: 'monitor_failed_tests',
              name: FAILED_TESTS_LABEL,
            },
          ]}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={{ paddingBottom: euiTheme.size.s }}>
        <EuiIconTip type="question" content={FAILED_TESTS_TOOLTIP} position="top" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const FAILED_TESTS_TOOLTIP = i18n.translate(
  'xpack.synthetics.monitorDetails.summary.failedTestsTooltip',
  {
    defaultMessage: 'Each individual failed test run in the selected time range.',
  }
);
