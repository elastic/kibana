/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import styled from '@emotion/styled';
import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import * as i18n from './translations';
import type { SecurityJob } from '../../../common/components/ml_popover/types';
import { isJobStarted } from '../../../../common/machine_learning/helpers';

import { TotalAnomalies } from './components/total_anomalies';
import type { AnomaliesCount } from '../../../common/components/ml/anomaly/use_anomalies_search';

type AnomaliesColumns = Array<EuiTableFieldDataColumnType<AnomaliesCount>>;

const DarkShadeText = styled.span`
  color: ${({ theme: { euiTheme } }) => euiTheme.colors.darkShade};
`;

export const useAnomaliesColumns = (
  loading: boolean,
  onJobEnabled: (job: SecurityJob) => void,
  recentlyEnabledJobIds: string[]
): AnomaliesColumns => {
  const columns: AnomaliesColumns = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.ANOMALY_NAME,
        truncateText: true,
        mobileOptions: { show: true },
        'data-test-subj': 'anomalies-table-column-name',
        render: (jobName: AnomaliesCount['name'], { count, job }) => {
          if (
            count > 0 ||
            (job &&
              (isJobStarted(job.jobState, job.datafeedState) ||
                recentlyEnabledJobIds.includes(job.id)))
          ) {
            return jobName;
          } else {
            return <DarkShadeText>{jobName}</DarkShadeText>;
          }
        },
      },
      {
        field: 'count',
        sortable: ({ count, job }) => {
          if (count > 0) {
            return count;
          }

          if (job && isJobStarted(job.jobState, job.datafeedState)) {
            return 0;
          }

          return -1;
        },
        truncateText: true,
        align: 'right',
        name: i18n.ANOMALY_COUNT,
        mobileOptions: { show: true },
        width: '15%',
        'data-test-subj': 'anomalies-table-column-count',
        render: (count: AnomaliesCount['count'], { entity, job }) => {
          if (!job) return '';
          return (
            <TotalAnomalies
              count={count}
              job={job}
              entity={entity}
              loading={loading}
              onJobEnabled={onJobEnabled}
              recentlyEnabledJobIds={recentlyEnabledJobIds}
            />
          );
        },
      },
    ],
    [loading, onJobEnabled, recentlyEnabledJobIds]
  );
  return columns;
};
