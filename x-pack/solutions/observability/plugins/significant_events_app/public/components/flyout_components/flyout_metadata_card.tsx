/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import React from 'react';

/**
 * Compact metadata label used in flyout second-headers to display
 * a labelled piece of metadata (confidence, severity, type, stream, …).
 */
export function FlyoutMetadataCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <EuiPanel hasShadow={false} paddingSize="s" color="transparent">
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false} alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <span>{title}</span>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{children}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
