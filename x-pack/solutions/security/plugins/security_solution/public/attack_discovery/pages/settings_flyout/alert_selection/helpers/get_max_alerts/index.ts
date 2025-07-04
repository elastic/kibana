/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS } from '@kbn/elastic-assistant';

/**
 * ensures maxAlerts is a positive number, otherwise returns the default value
 */
export const getMaxAlerts = (maxAlerts: string): number => {
  const numericMaxAlerts = Number(maxAlerts);

  const isMaxAlertsValid = Number.isInteger(numericMaxAlerts) && numericMaxAlerts > 0;

  return isMaxAlertsValid ? numericMaxAlerts : DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS;
};
