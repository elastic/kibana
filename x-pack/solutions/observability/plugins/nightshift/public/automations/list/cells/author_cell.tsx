/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

export const AutomationAuthorCell = ({ name }: { name: string }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiAvatar size="s" name={name} />
    </EuiFlexItem>
    <EuiFlexItem className="eui-textTruncate">{name}</EuiFlexItem>
  </EuiFlexGroup>
);
