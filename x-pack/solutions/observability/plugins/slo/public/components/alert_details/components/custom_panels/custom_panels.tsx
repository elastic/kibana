/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetSLOResponse } from '@kbn/slo-schema';
import React from 'react';
import type { BurnRateAlert, BurnRateRule } from '../../types';
import { getChartTimeRange } from '../../utils/time_range';
import { APMAvailabilityAlertDetails, APMLatencyAlertDetails } from './apm/apm_alert_details';
import type {
  APMErrorRateSLOResponse,
  APMTransactionDurationSLOResponse,
} from './apm/embeddable_root';
import { CustomKqlPanels } from './custom_kql/custom_kql_panels';

interface Props {
  alert: BurnRateAlert;
  rule: BurnRateRule;
  slo?: GetSLOResponse;
}

export function CustomAlertDetailsPanel({ slo, alert, rule }: Props) {
  const dataTimeRange = getChartTimeRange(alert);
  switch (slo?.indicator.type) {
    case 'sli.kql.custom':
      return <CustomKqlPanels slo={slo} alert={alert} rule={rule} />;
    case 'sli.apm.transactionDuration':
      return (
        <APMLatencyAlertDetails
          slo={slo as APMTransactionDurationSLOResponse}
          dataTimeRange={dataTimeRange}
          alert={alert}
          rule={rule}
        />
      );
    case 'sli.apm.transactionErrorRate':
      return (
        <APMAvailabilityAlertDetails
          slo={slo as APMErrorRateSLOResponse}
          dataTimeRange={dataTimeRange}
          alert={alert}
          rule={rule}
        />
      );
    default:
      return null;
  }
}
