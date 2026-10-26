/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import { getAlerts } from './get_alerts';
import type { GetAlerts } from './get_alerts';

/**
 * returns only alerts with open status
 */
export const getOpenAlerts: GetAlerts = async (...args) => {
  const alerts = await getAlerts(...args);

  alerts.hits.hits = alerts.hits.hits.filter(
    (alert) => alert?._source?.[ALERT_WORKFLOW_STATUS] === 'open'
  );

  return alerts;
};
