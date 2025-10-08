/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Translation for Total Execution Time in any provided format */
export const TOTAL_EXECUTION_TIME = (time: string) =>
  i18n.translate('xpack.securitySolution.siemMigrations.common.totalExecutionTime', {
    defaultMessage: 'Total execution time: {time}',
    values: {
      time,
    },
  });

export const TOTAL_EXECUTION_TIME_TOOLTIP = (itemTypes: string) =>
  i18n.translate('xpack.securitySolution.siemMigrations.common.totalExecutionTimeTooltip', {
    defaultMessage:
      'The total amount of processing and re-processing time for translating the {itemTypes} in this migration',
    values: {
      itemTypes,
    },
  });
