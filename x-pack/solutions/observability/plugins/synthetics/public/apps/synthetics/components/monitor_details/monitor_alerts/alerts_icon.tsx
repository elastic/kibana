/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { useFetchActiveAlerts } from '../hooks/use_fetch_active_alerts';
import { useGetUrlParams } from '../../../hooks';

export const MonitorAlertsIcon = () => {
  const { remoteName } = useGetUrlParams();
  // Alerts cannot currently be fetched cross-cluster. Bail early so we
  // never issue a doomed `/internal/rac/alerts/find` request for remote
  // monitors, even if a caller forgets the surrounding conditional.
  if (remoteName) {
    return null;
  }

  return <MonitorAlertsIconContent />;
};

const MonitorAlertsIconContent = () => {
  const { numberOfActiveAlerts } = useFetchActiveAlerts();

  return numberOfActiveAlerts > 0 ? (
    <EuiBadge color="danger">{numberOfActiveAlerts}</EuiBadge>
  ) : null;
};
