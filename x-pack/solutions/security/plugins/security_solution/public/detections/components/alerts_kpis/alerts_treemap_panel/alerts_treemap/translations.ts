/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NO_DATA_LABEL = i18n.translate(
  'xpack.securitySolution.components.alertsTreemap.noDataLabel',
  {
    defaultMessage: 'No data to display',
  }
);

export const NO_DATA_REASON_LABEL = (stackByField1: string) =>
  i18n.translate('xpack.securitySolution.components.alertsTreemap.noDataReasonLabel', {
    values: {
      stackByField1,
    },
    defaultMessage: 'The {stackByField1} field was not present in any groups',
  });

export const RISK_LABEL = (riskScore: number) =>
  i18n.translate('xpack.securitySolution.components.alertsTreemap.riskLabel', {
    values: {
      riskScore,
    },
    defaultMessage: '(Risk {riskScore})',
  });
