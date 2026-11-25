/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

export const AutomationAuthorCell = ({ name }: { name: string }) => (
  <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} css={{ minWidth: 0 }}>
    <EuiFlexItem grow={false}>
      <EuiAvatar size="s" name={name} />
    </EuiFlexItem>
    <EuiFlexItem css={{ minWidth: 0 }}>
      <span className="eui-textTruncate" title={name}>
        {name}
      </span>
    </EuiFlexItem>
  </EuiFlexGroup>
);
