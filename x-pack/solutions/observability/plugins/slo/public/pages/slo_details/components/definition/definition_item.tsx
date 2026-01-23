/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { ReactNode } from 'react';
import React from 'react';

export interface Props {
  title: ReactNode;
  subtitle: ReactNode;
}

export function DefinitionItem({ title, subtitle }: Props) {
  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem grow={false}>{title}</EuiFlexItem>
      <EuiFlexItem grow={false}>{subtitle}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
