/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { PreferenceFormattedDate } from '../../../../../common/components/formatted_date';
import type { TableItemType } from './types';

export const useColumns = (): Array<EuiBasicTableColumn<TableItemType>> => {
  return useMemo(
    () => [
      {
        field: 'privileged_user',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.sampleDashboard.columns.privilegedUser"
            defaultMessage="Privileged user"
          />
        ),

        sortable: true,
      },
      {
        field: 'target_user',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.sampleDashboard.columns.targetUser"
            defaultMessage="Target user"
          />
        ),
        sortable: true,
      },
      {
        field: 'right',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.sampleDashboard.columns.grantedRight"
            defaultMessage="Granted right"
          />
        ),
        sortable: true,
      },
      {
        field: 'ip',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.sampleDashboard.columns.sourceIp"
            defaultMessage="Source IP"
          />
        ),
        sortable: true,
      },
      {
        field: '@timestamp',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.sampleDashboard.columns.timestamp"
            defaultMessage="Timestamp"
          />
        ),
        dataType: 'date',
        sortable: true,
        render: (timestamp: string) => {
          return <PreferenceFormattedDate value={new Date(timestamp)} />;
        },
      },
    ],
    []
  );
};
