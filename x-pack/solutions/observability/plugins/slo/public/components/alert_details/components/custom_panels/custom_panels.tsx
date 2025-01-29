/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { GetSLOResponse } from '@kbn/slo-schema';
import { APMLatencyAlertDetails, APMAvailabilityAlertDetails } from './apm/apm_alert_details';
import { CustomKqlPanels } from './custom_kql/custom_kql_panels';
import { getDataTimeRange } from '../../utils/time_range';
import type { BurnRateAlert, BurnRateRule } from '../../types';
import type {
  APMTransactionDurationSLOResponse,
  APMErrorRateSLOResponse,
} from './apm/embeddable_root';

interface Props {
  alert: BurnRateAlert;
  rule: BurnRateRule;
  slo?: GetSLOResponse;
}

export function CustomAlertDetailsPanel({ slo, alert, rule }: Props) {
  const dataTimeRange = getDataTimeRange(alert);
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
