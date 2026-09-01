/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import type { EuiSkeletonTextProps } from '@elastic/eui';

interface AnomaliesTableLoadingSkeletonProps {
  lines?: EuiSkeletonTextProps['lines'];
  size?: EuiSkeletonTextProps['size'];
}

export const AnomaliesTableLoadingSkeleton: React.FC<AnomaliesTableLoadingSkeletonProps> = ({
  lines = 4,
  size = 'm',
}) => (
  <div>
    <EuiSkeletonText lines={lines} size={size} />
  </div>
);
