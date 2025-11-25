/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiToolTipProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import type { ReactNode } from 'react';
import React from 'react';

export const ColumnNameWithTooltip = ({
  tooltipContent,
  columnName,
}: {
  tooltipContent: EuiToolTipProps['content'];
  columnName: ReactNode;
}) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center">
    <EuiFlexItem>
      <span>{columnName}</span>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiIconTip content={tooltipContent} type="info" size="m" color="subdued" />
    </EuiFlexItem>
  </EuiFlexGroup>
);
