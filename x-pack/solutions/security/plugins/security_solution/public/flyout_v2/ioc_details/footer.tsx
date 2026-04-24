/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { TakeAction } from './components/take_action';

/**
 * Footer content of the IOC details flyout containing the take action button.
 */
export const Footer = memo(() => (
  <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
    <EuiFlexItem grow={false}>
      <TakeAction />
    </EuiFlexItem>
  </EuiFlexGroup>
));

Footer.displayName = 'Footer';
