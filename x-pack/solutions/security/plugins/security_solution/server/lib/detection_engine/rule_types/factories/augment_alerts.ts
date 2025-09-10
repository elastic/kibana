/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_LAST_DETECTED } from '@kbn/rule-data-utils';
import type { GenericAlert } from './alert_with_persistence';

interface AugmentAlertsOpts<T> {
  alerts: Array<GenericAlert<T>>;
  currentTimeOverride: Date | undefined;
}

export const augmentAlerts = async <T>({ alerts, currentTimeOverride }: AugmentAlertsOpts<T>) => {
  // this should all be handled by buildNewAlert in the alertsClient
  // const commonRuleFields = getCommonAlertFields(options, dangerouslyCreateAlertsInAllSpaces);

  // maintenance window IDs should be handled by the alerting framework
  // const maintenanceWindowIds: string[] =
  //   alerts.length > 0 ? await options.services.getMaintenanceWindowIds() : [];

  const currentDate = new Date();
  const timestampOverrideOrCurrent = currentTimeOverride ?? currentDate;
  return alerts.map((alert) => {
    return {
      ...alert,
      _source: {
        // the following should all be handled by the framework
        // [ALERT_RULE_EXECUTION_TIMESTAMP]: currentDate,
        // [ALERT_START]: timestampOverrideOrCurrent,
        // [VERSION]: kibanaVersion,
        // ...(maintenanceWindowIds.length
        //   ? { [ALERT_MAINTENANCE_WINDOW_IDS]: maintenanceWindowIds }
        //   : {}),
        // ...commonRuleFields,
        [ALERT_LAST_DETECTED]: timestampOverrideOrCurrent,
        ...alert._source,
      },
    };
  });
};
