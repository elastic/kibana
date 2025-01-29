/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertBucket } from '../../../types';

export const getAlertIdToCountMap = (alerts: AlertBucket[]): Map<string, number> => {
  const alertsCache = new Map<string, number>();
  alerts.map((bucket) => alertsCache.set(bucket.key.detectionAlerts, bucket.doc_count));
  return alertsCache;
};
