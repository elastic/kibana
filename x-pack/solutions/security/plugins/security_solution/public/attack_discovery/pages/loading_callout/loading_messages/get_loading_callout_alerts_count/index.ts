/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getLoadingCalloutAlertsCount = ({
  alertsContextCount,
  defaultMaxAlerts,
  localStorageAttackDiscoveryMaxAlerts,
}: {
  alertsContextCount: number | null;
  defaultMaxAlerts: number;
  localStorageAttackDiscoveryMaxAlerts: string | undefined;
}): number => {
  if (alertsContextCount != null && !isNaN(alertsContextCount) && alertsContextCount > 0) {
    return alertsContextCount;
  }

  const size = Number(localStorageAttackDiscoveryMaxAlerts);

  return isNaN(size) || size <= 0 ? defaultMaxAlerts : size;
};
