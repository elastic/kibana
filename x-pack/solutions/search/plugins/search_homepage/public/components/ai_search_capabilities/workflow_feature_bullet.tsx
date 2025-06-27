/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';

export const WorkflowFeatureBullet = ({ feature }: { feature: string }) => (
  <EuiFlexGroup gutterSize="m" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiIcon type="checkInCircleFilled" color="subdued" size="s" />
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiText size="s">
        <p>{feature}</p>
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);
