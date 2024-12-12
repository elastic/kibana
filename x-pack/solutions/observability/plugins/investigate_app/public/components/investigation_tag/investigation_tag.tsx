/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiBadge } from '@elastic/eui';
import React from 'react';

interface Props {
  tag: string;
}

export function InvestigationTag({ tag }: Props) {
  return (
    <EuiFlexItem grow={false}>
      <EuiBadge color="hollow">{tag}</EuiBadge>
    </EuiFlexItem>
  );
}
