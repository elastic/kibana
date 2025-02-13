/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SOC_TRENDS = i18n.translate('xpack.securitySolution.detectionResponse.socTrends', {
  defaultMessage: 'SOC Trends',
});

export const CASES_MTTR_STAT = i18n.translate('xpack.securitySolution.detectionResponse.mttr', {
  defaultMessage: 'Average case response time',
});

export const CASES_MTTR_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionResponse.mttrDescription',
  {
    defaultMessage: 'The average duration (from creation to closure) for your current cases',
  }
);

export const CRITICAL_ALERTS_STAT = i18n.translate(
  'xpack.securitySolution.detectionResponse.criticalAlerts',
  {
    defaultMessage: 'Open critical alerts',
  }
);

export const CRITICAL_ALERTS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionResponse.criticalAlertsDescription',
  {
    defaultMessage: 'The count of open critical alerts for the current time range',
  }
);

export const NO_CHANGE = (dataType: string) =>
  i18n.translate('xpack.securitySolution.detectionResponse.noChange', {
    defaultMessage: 'Your {dataType} is unchanged',
    values: { dataType },
  });

export const NO_DATA = (dataType: 'case' | 'alerts') =>
  i18n.translate('xpack.securitySolution.detectionResponse.noData', {
    defaultMessage: 'There is no {dataType} data to compare',
    values: { dataType },
  });

export const NO_DATA_COMPARE = (dataType: 'case' | 'alerts') =>
  i18n.translate('xpack.securitySolution.detectionResponse.noDataCompare', {
    defaultMessage: 'There is no {dataType} data to compare from the compare time range',
    values: { dataType },
  });

export const NO_DATA_CURRENT = (dataType: 'case' | 'alerts') =>
  i18n.translate('xpack.securitySolution.detectionResponse.noDataCurrent', {
    defaultMessage: 'There is no {dataType} data to compare from the current time range',
    values: { dataType },
  });

export const STAT_DIFFERENCE = ({
  upOrDown,
  percentageChange,
  stat,
  statType,
}: {
  upOrDown: string;
  percentageChange: string;
  stat: string;
  statType: string;
}) =>
  i18n.translate('xpack.securitySolution.detectionResponse.timeDifference', {
    defaultMessage: `Your {statType} is {upOrDown} by {percentageChange} from {stat}`,
    values: { upOrDown, percentageChange, stat, statType },
  });
