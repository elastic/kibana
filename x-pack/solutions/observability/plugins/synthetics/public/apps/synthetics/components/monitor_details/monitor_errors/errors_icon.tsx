/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { useMonitorErrors } from '../hooks/use_monitor_errors';

export const MonitorErrorsIcon = () => {
  const { hasActiveError } = useMonitorErrors();

  return hasActiveError ? <EuiIcon type="warning" color="danger" /> : null;
};
