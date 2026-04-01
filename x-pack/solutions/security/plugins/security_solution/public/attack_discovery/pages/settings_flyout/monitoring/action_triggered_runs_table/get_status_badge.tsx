/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHealth } from '@elastic/eui';

import type { GenerationStatus } from '../types';
import * as i18n from './translations';

const STATUS_CONFIG: Record<GenerationStatus, { color: string; label: string }> = {
  failed: { color: 'danger', label: i18n.STATUS_FAILED },
  running: { color: 'primary', label: i18n.STATUS_RUNNING },
  succeeded: { color: 'success', label: i18n.STATUS_SUCCEEDED },
  unknown: { color: 'subdued', label: i18n.STATUS_UNKNOWN },
};

interface GetStatusBadgeProps {
  status: GenerationStatus;
}

const GetStatusBadgeComponent: React.FC<GetStatusBadgeProps> = ({ status }) => {
  const { color, label } = STATUS_CONFIG[status];

  return <EuiHealth color={color}>{label}</EuiHealth>;
};

GetStatusBadgeComponent.displayName = 'GetStatusBadge';

export const StatusBadge = React.memo(GetStatusBadgeComponent);
