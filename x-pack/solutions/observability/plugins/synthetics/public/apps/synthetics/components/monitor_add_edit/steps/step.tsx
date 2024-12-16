/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

interface Props {
  description: React.ReactNode;
  children: React.ReactNode;
}

export const Step = ({ description, children }: Props) => {
  return (
    <EuiFlexGroup gutterSize="s" wrap>
      <EuiFlexItem style={{ minWidth: 208 }}>
        <EuiText>{description}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem style={{ minWidth: 208 }}>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
