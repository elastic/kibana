/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { VisitorBreakdown } from '../visitor_breakdown';
import { VisitorBreakdownMap } from '../visitor_breakdown_map';

export function VisitorBreakdownsPanel() {
  return (
    <EuiFlexGroup gutterSize="s" wrap>
      <EuiFlexItem style={{ flexBasis: 650 }}>
        <EuiPanel hasBorder={true}>
          <VisitorBreakdownMap />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem style={{ flexBasis: 650 }}>
        <EuiPanel hasBorder={true}>
          <VisitorBreakdown />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
