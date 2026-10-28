/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiLink } from '@elastic/eui';
import type { Row } from '../../common';

export const AnomalyCountCell = memo(
  ({
    value,
    row,
    onAnomalyCountClick,
  }: {
    value: unknown;
    row: Row;
    onAnomalyCountClick?: (row: Row) => void;
  }) => {
    if (typeof value !== 'number' || value === 0) return <>{'—'}</>;
    return onAnomalyCountClick ? (
      <EuiLink
        onClick={() => onAnomalyCountClick(row)}
        onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {value}
      </EuiLink>
    ) : (
      <>{String(value)}</>
    );
  }
);
AnomalyCountCell.displayName = 'AnomalyCountCell';
