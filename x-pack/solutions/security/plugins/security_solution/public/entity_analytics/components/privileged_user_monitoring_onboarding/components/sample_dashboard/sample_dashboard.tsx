/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPanel, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HeaderSection } from '../../../../../common/components/header_section';
import { getLensAttributes } from './get_lens_attributes';
import { useColumns } from './use_columns';
import { GRANTED_RIGHTS_STACK_BY_OPTIONS, PAGE_SIZE } from './constants';
import {
  generateESQLSource,
  generateListESQLQuery,
  generateVisualizationESQLQuery,
  getBucketTimeRange,
} from './esql_data_generation';
import type { VisualizationStackByOption } from '../esql_dashboard_panel/esql_dashboard_panel';
import { EsqlDashboardPanel } from '../esql_dashboard_panel/esql_dashboard_panel';
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

  const stackByOptions = GRANTED_RIGHTS_STACK_BY_OPTIONS;

  const setSelectedChartOptionCallback = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedStackByOption(
        stackByOptions.find((co) => co.value === event.target.value) ?? stackByOptions[0]
      );
    },
    [stackByOptions]
  );

  const defaultStackByOption = stackByOptions[0];
  const [selectedStackByOption, setSelectedStackByOption] =
    useState<VisualizationStackByOption>(defaultStackByOption);

  const title = (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.sampleDashboard.grantedRights.title"
      defaultMessage="Granted rights"
    />
  );

  return (
    <EuiPanel hasBorder hasShadow={false} data-test-subj="privMonSampleDashboard">
      <HeaderSection title={title} titleSize="s" outerDirection={'column'}>
        <EuiSelect
          onChange={setSelectedChartOptionCallback}
          options={GRANTED_RIGHTS_STACK_BY_OPTIONS}
          prepend={i18n.translate('xpack.securitySolution.genericDashboard.stackBy.label', {
            defaultMessage: 'Stack by',
          })}
          value={selectedStackByOption?.value}
        />
      </HeaderSection>

      <EsqlDashboardPanel<TableItemType>
        title={title}
        timerange={bucketTimerange}
        stackByField={selectedStackByOption.value}
        getLensAttributes={getLensAttributes}
        generateVisualizationQuery={generateVisualizationQuery}
        generateTableQuery={generateTableQuery}
        columns={columns}
        pageSize={PAGE_SIZE}
      />
    </EuiPanel>
  );
};

export const PrivilegedUserMonitoringSampleDashboard = React.memo(
  PrivilegedUserMonitoringSampleDashboardComponent
);
