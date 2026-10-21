/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, useEuiTheme } from '@elastic/eui';

export const Sentence = ({ children }: { children: React.ReactNode }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" wrap responsive={false}>
    {React.Children.map(
      children,
      (child) => child && <EuiFlexItem grow={false}>{child}</EuiFlexItem>
    )}
  </EuiFlexGroup>
);

export const SentenceIcon = ({ type }: { type: string }) => {
  const { euiTheme } = useEuiTheme();
  return <EuiIcon type={type} aria-hidden={true} css={{ marginInlineEnd: euiTheme.size.xs }} />;
};
