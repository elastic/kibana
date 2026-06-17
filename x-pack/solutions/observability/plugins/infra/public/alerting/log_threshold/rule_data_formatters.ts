/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_REASON, ALERT_START } from '@kbn/rule-data-utils';
import type { ObservabilityRuleTypeFormatter } from '@kbn/observability-plugin/public';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { LogsLocatorParams } from '@kbn/logs-shared-plugin/common';

export const createRuleFormatter: (
  logsLocator: LocatorPublic<LogsLocatorParams>
) => ObservabilityRuleTypeFormatter =
  (logsLocator) =>
  ({ fields }) => {
    const reason = fields[ALERT_REASON] ?? '';
    const alertStartDate = fields[ALERT_START];
    const time = alertStartDate != null ? new Date(alertStartDate).valueOf() : undefined;
    const url = logsLocator.getRedirectUrl({ time });

    // the alerts UI already prepends the url to the baseUrl so we need to remove it here
    const link = removeBaseUrl(url);

    return {
      reason,
      link,
    };
  };

const removeBaseUrl = (url: string): string => {
  const substring = '/app/';
  const substringIndex = url.indexOf(substring);

  return url.substring(substringIndex);
};
