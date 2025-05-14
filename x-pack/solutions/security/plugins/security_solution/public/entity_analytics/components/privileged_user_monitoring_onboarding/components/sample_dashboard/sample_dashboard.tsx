/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { getLensAttributes } from './get_lens_attributes';
import { useColumns } from './use_columns';
import { GRANTED_RIGHTS_STACK_BY_OPTIONS, PAGE_SIZE } from './constants';
import {
  generateESQLSource,
  generateListESQLQuery,
  generateVisualizationESQLQuery,
  getBucketTimeRange,
} from './esql_data_generation';
import { EsqlDashboardPanel } from '../esql_dashboard_panel';
import type { TableItemType } from './types';

const PrivilegedUserMonitoringSampleDashboardComponent = () => {
  const columns = useColumns();
  const esqlSource = useMemo(() => generateESQLSource(), []); // It needs to be memoized to avoid re-generating source data on every render
  const bucketTimerange = useMemo(() => getBucketTimeRange(), []);
  const generateTableQuery = useMemo(() => generateListESQLQuery(esqlSource), [esqlSource]);
  const generateVisualizationQuery = useMemo(
    () => generateVisualizationESQLQuery(esqlSource),
    [esqlSource]
  );

  return (
    <EsqlDashboardPanel<TableItemType>
      title={
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.sampleDashboard.grantedRights.title"
          defaultMessage="Granted rights"
        />
      }
      timerange={bucketTimerange}
      stackByOptions={GRANTED_RIGHTS_STACK_BY_OPTIONS}
      getLensAttributes={getLensAttributes}
      generateVisualizationQuery={generateVisualizationQuery}
      generateTableQuery={generateTableQuery}
      columns={columns}
      pageSize={PAGE_SIZE}
    />
  );
};

export const PrivilegedUserMonitoringSampleDashboard = React.memo(
  PrivilegedUserMonitoringSampleDashboardComponent
);
