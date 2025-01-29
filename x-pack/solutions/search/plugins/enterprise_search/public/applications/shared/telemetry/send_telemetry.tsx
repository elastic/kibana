/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions } from 'kea';

import { TelemetryLogic, SendTelemetryHelper } from './telemetry_logic';

/**
 * React component helpers - useful for on-page-load/views
 */

export const SendEnterpriseSearchTelemetry: React.FC<SendTelemetryHelper> = ({
  action,
  metric,
}) => {
  const { sendTelemetry } = useActions(TelemetryLogic);

  useEffect(() => {
    sendTelemetry({ action, metric, product: 'enterprise_search' });
  }, [action, metric]);

  return null;
};
