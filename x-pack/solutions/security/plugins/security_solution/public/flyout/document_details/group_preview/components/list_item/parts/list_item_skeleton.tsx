/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonCircle,
  EuiSkeletonTitle,
  EuiSkeletonText,
  EuiSpacer,
} from '@elastic/eui';

export const GroupedListItemSkeleton: React.FC = () => {
  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiSkeletonCircle size="s" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSkeletonTitle size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiSkeletonText lines={2} />
    </>
  );
};
