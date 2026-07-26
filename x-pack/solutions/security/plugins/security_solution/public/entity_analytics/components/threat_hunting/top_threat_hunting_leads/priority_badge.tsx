/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';

const getPriorityColor = (priority: number): string => {
  if (priority >= 8) return 'danger';
  if (priority >= 5) return 'warning';
  if (priority >= 3) return 'default';
  return 'hollow';
};

interface PriorityBadgeProps {
  priority: number;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => (
  <EuiBadge color={getPriorityColor(priority)} data-test-subj="leadPriorityBadge">
    {priority}
  </EuiBadge>
);
