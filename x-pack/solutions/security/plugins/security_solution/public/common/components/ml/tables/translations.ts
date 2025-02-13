/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SHOWING = i18n.translate(
  'xpack.securitySolution.anomaliesTable.table.showingDescription',
  {
    defaultMessage: 'Showing',
  }
);

export const ANOMALIES = i18n.translate(
  'xpack.securitySolution.anomaliesTable.table.anomaliesDescription',
  {
    defaultMessage: 'Anomalies',
  }
);

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.anomaliesTable.table.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {anomaly} other {anomalies}}`,
  });

export const TOOLTIP = i18n.translate(
  'xpack.securitySolution.anomaliesTable.table.anomaliesTooltip',
  {
    defaultMessage: 'The anomalies table is not filterable via the SIEM global KQL search.',
  }
);

export const SCORE = i18n.translate('xpack.securitySolution.ml.table.scoreTitle', {
  defaultMessage: 'Anomaly score',
});

export const HOST_NAME = i18n.translate('xpack.securitySolution.ml.table.hostNameTitle', {
  defaultMessage: 'Host name',
});

export const USER_NAME = i18n.translate('xpack.securitySolution.ml.table.userNameTitle', {
  defaultMessage: 'User name',
});

export const INFLUENCED_BY = i18n.translate('xpack.securitySolution.ml.table.influencedByTitle', {
  defaultMessage: 'Influenced by',
});

export const ENTITY = i18n.translate('xpack.securitySolution.ml.table.entityTitle', {
  defaultMessage: 'Entity',
});

export const DETECTOR = i18n.translate('xpack.securitySolution.ml.table.detectorTitle', {
  defaultMessage: 'Job',
});

export const NETWORK_NAME = i18n.translate('xpack.securitySolution.ml.table.networkNameTitle', {
  defaultMessage: 'Network IP',
});

export const TIME_STAMP = i18n.translate('xpack.securitySolution.ml.table.timestampTitle', {
  defaultMessage: 'Timestamp',
});

export const JOB_ID = i18n.translate('xpack.securitySolution.ml.table.jobIdFilter', {
  defaultMessage: 'Job',
});

export const INTERVAL_TOOLTIP = i18n.translate('xpack.securitySolution.ml.table.intervalTooltip', {
  defaultMessage:
    'Show only the highest severity anomaly for each interval (such as hour or day) or show all anomalies in the selected time period.',
});

export const INTERVAL = i18n.translate('xpack.securitySolution.ml.table.intervalLabel', {
  defaultMessage: 'Interval',
});

export const INTERVAL_AUTO = i18n.translate('xpack.securitySolution.ml.table.intervalAutoOption', {
  defaultMessage: 'Auto',
});

export const INTERVAL_HOUR = i18n.translate('xpack.securitySolution.ml.table.intervalHourOption', {
  defaultMessage: '1 hour',
});

export const INTERVAL_DAY = i18n.translate('xpack.securitySolution.ml.table.intervalDayOption', {
  defaultMessage: '1 day',
});

export const INTERVAL_SHOW_ALL = i18n.translate(
  'xpack.securitySolution.ml.table.intervalshowAllOption',
  {
    defaultMessage: 'Show all',
  }
);
