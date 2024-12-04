/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useInstalledSecurityJobNameById } from '../hooks/use_installed_security_jobs';
import type { InfluencerInput, Anomalies, CriteriaFields } from '../types';
import { useAnomaliesTableData } from './use_anomalies_table_data';

export interface AnomalyTableProviderChildrenProps {
  isLoadingAnomaliesData: boolean;
  anomaliesData: Anomalies | null;
  jobNameById: Record<string, string | undefined>;
}

interface Props {
  influencers?: InfluencerInput[];
  startDate: string;
  endDate: string;
  criteriaFields?: CriteriaFields[];
  children: (args: AnomalyTableProviderChildrenProps) => React.ReactNode;
  skip: boolean;
}

export const AnomalyTableProvider = React.memo<Props>(
  ({ influencers, startDate, endDate, children, criteriaFields, skip }) => {
    const { jobNameById } = useInstalledSecurityJobNameById();
    const jobIds = useMemo(() => Object.keys(jobNameById), [jobNameById]);

    const [isLoadingAnomaliesData, anomaliesData] = useAnomaliesTableData({
      criteriaFields,
      influencers,
      startDate,
      endDate,
      skip,
      jobIds,
      aggregationInterval: 'auto',
    });
    return <>{children({ isLoadingAnomaliesData, anomaliesData, jobNameById })}</>;
  }
);

AnomalyTableProvider.displayName = 'AnomalyTableProvider';
