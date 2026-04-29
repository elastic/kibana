/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';

import { HostMetricsDocsLink } from '../../../../../components/lens';
import { KpiCharts } from './kpi_charts';
import { HostCountKpi } from './host_count_kpi';

export const KPIGrid = () => {
  return (
    <>
      <HostMetricsDocsLink type="metrics" />
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="row" gutterSize="s" data-test-subj="hostsViewKPIGrid">
        <EuiFlexItem>
          <HostCountKpi />
        </EuiFlexItem>
        <KpiCharts />
      </EuiFlexGroup>
    </>
  );
};
