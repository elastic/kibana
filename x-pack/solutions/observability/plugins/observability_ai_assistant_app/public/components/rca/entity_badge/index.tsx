/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

export function EntityBadge({
  entity,
  color,
}: {
  entity: Record<string, string>;
  color?: React.ComponentProps<typeof EuiBadge>['color'];
}) {
  return (
    <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
      {Object.entries(entity).map(([field, value]) => (
        <EuiFlexItem grow>
          <EuiBadge key={field} color={color ?? 'ghost'}>{`${field}:${value}`}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
