/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, useEuiTheme } from '@elastic/eui';

export const SectionHeader = ({
  title,
  titleAppend,
}: {
  title: string;
  titleAppend?: React.ReactNode;
}) => (
  <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} css={{ minBlockSize: 32 }}>
    <EuiFlexItem grow={false}>
      <EuiTitle size="xs">
        <h3>{title}</h3>
      </EuiTitle>
    </EuiFlexItem>
    {titleAppend && <EuiFlexItem grow={false}>{titleAppend}</EuiFlexItem>}
  </EuiFlexGroup>
);

export const FormSection = ({ children }: { children: React.ReactNode }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <section
      css={{
        paddingBlock: euiTheme.size.s,
        border: `${euiTheme.border.width.thin} solid transparent`,
      }}
    >
      {children}
    </section>
  );
};
