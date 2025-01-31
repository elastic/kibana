/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';
import { SLOHealthStatus } from '@kbn/slo-schema';
import { toSloHealthStatus } from '../../constants';

interface Props {
  status: SLOHealthStatus;
}

export function SloHealthStatusBadge({ status }: Props) {
  return (
    <EuiBadge
      color={status === 'healthy' ? 'success' : status === 'degraded' ? 'warning' : 'danger'}
    >
      {toSloHealthStatus(status)}
    </EuiBadge>
  );
}
