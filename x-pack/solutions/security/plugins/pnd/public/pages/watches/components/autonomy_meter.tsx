/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';

interface AutonomyMeterProps {
  level?: unknown;
  color?: string;
}

export const AutonomyMeter: React.FC<AutonomyMeterProps> = ({ level, color }) => {
  const label = level == null ? '—' : String(level);
  return (
    <EuiBadge color={color || 'hollow'} data-test-subj="pndAutonomyMeter">
      {label}
    </EuiBadge>
  );
};
