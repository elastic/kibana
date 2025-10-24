/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle, EuiIcon } from '@elastic/eui';

interface Props {
  title: string;
  icon: string;
}

export const SearchGettingStartedSectionHeading = ({ title, icon }: Props) => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiPanel color="subdued" paddingSize="s" grow={false}>
          <EuiIcon type={icon} size="m" />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h2>{title}</h2>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
