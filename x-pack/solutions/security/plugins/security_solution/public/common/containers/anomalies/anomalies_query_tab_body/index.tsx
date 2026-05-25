/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { DEFAULT_ANOMALY_SCORE } from '../../../../../common/constants';
import type { AnomaliesQueryTabBodyProps } from './types';
import { getAnomaliesFilterQuery } from './utils';
import { useInstalledSecurityJobs } from '../../../components/ml/hooks/use_installed_security_jobs';
import { useUiSetting$ } from '../../../lib/kibana';
import { MatrixHistogram } from '../../../components/matrix_histogram';
import { EaMlJobCallout } from '../../../../entity_analytics/components/ea_ml_job_callout';
import { histogramConfigs } from './histogram_configs';

const ID = 'anomaliesHistogramQuery';

const AnomaliesQueryTabBodyComponent: React.FC<AnomaliesQueryTabBodyProps> = ({
  deleteQuery,
  endDate,
  skip,
  startDate,
  type,
  filterQuery,
  anomaliesFilterQuery,
  AnomaliesTableComponent,
  flowTarget,
  ip,
  hostName,
  userName,
  identityFields,
  entityRecord,
}) => {
  const { jobs } = useInstalledSecurityJobs();
  const [anomalyScore] = useUiSetting$<number>(DEFAULT_ANOMALY_SCORE);

  const mergedFilterQuery = getAnomaliesFilterQuery(
    filterQuery,
    anomaliesFilterQuery,
    jobs,
    anomalyScore,
    flowTarget,
    ip
  );

  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: ID });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <EaMlJobCallout />
      <MatrixHistogram
        endDate={endDate}
        filterQuery={mergedFilterQuery}
        id={ID}
        startDate={startDate}
        {...histogramConfigs}
      />
      <AnomaliesTableComponent
        startDate={startDate}
        endDate={endDate}
        skip={skip}
        type={type}
        flowTarget={flowTarget}
        ip={ip}
        hostName={hostName}
        userName={userName}
        entityRecord={entityRecord}
        identityFields={identityFields}
      />
    </>
  );
};

AnomaliesQueryTabBodyComponent.displayName = 'AnomaliesQueryTabBodyComponent';

export const AnomaliesQueryTabBody = React.memo(AnomaliesQueryTabBodyComponent);

AnomaliesQueryTabBody.displayName = 'AnomaliesQueryTabBody';
