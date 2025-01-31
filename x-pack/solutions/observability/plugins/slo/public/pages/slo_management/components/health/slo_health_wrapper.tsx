/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHealth } from '@elastic/eui';
import React from 'react';
import { SLOHealthStatus } from '@kbn/slo-schema';

interface Props {
  children: React.ReactNode;
  status: SLOHealthStatus;
}

export function HealthWrapper({ children, status }: Props) {
  return (
    <EuiHealth
      color={status === 'healthy' ? 'success' : status === 'degraded' ? 'warning' : 'danger'}
    >
      {children}
    </EuiHealth>
  );
}
