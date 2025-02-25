/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React, { ReactNode } from 'react';

export interface Props {
  title: string;
  content?: ReactNode;
}

export function OverviewItem({ title, content }: Props) {
  if (content == null) return null;

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <strong>{title}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{content}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
