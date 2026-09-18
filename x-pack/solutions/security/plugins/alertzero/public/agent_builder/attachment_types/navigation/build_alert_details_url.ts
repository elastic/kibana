/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_ALERT_DETAILS_REDIRECT_PATH } from './constants';
import { getAlertsIndex } from './esql_queries';

export const buildAlertDetailsPath = ({
  alertId,
  index,
  timestamp,
}: {
  alertId: string;
  index: string;
  timestamp?: string;
}): string => {
  const params = new URLSearchParams({ index });
  if (timestamp) {
    params.set('timestamp', timestamp);
  }
  return `${SECURITY_ALERT_DETAILS_REDIRECT_PATH}/${encodeURIComponent(alertId)}?${params.toString()}`;
};

export const buildAlertDetailsUrl = ({
  prependPath,
  spaceId,
  alertId,
  index,
  timestamp,
}: {
  prependPath: (path: string) => string;
  spaceId: string;
  alertId: string;
  index?: string;
  timestamp?: string;
}): string => {
  const path = buildAlertDetailsPath({
    alertId,
    index: index ?? getAlertsIndex(spaceId),
    timestamp,
  });
  return prependPath(path);
};
