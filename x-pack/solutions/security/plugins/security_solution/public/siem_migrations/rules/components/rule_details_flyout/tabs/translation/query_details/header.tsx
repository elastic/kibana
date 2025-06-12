/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle, EuiToolTip } from '@elastic/eui';

interface QueryHeaderProps {
  title: string;
  tooltip: string;
}

export const QueryHeader: React.FC<QueryHeaderProps> = React.memo(({ title, tooltip }) => {
  return (
    <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <h3>{title}</h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={tooltip}>
          <EuiIcon size="s" type="questionInCircle" color="subdued" />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
QueryHeader.displayName = 'QueryHeader';
