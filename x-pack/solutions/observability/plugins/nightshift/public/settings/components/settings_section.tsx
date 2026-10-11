/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import {
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSplitPanel,
  EuiTitle,
} from '@elastic/eui';

export const SettingsSection = ({
  title,
  titleAdornment,
  children,
  'data-test-subj': dataTestSubject,
}: {
  title: ReactNode;
  titleAdornment?: ReactNode;
  children: ReactNode;
  'data-test-subj'?: string;
}) => (
  <EuiSplitPanel.Outer hasBorder hasShadow={false} data-test-subj={dataTestSubject}>
    <EuiSplitPanel.Inner color="subdued">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {titleAdornment && <EuiFlexItem grow={false}>{titleAdornment}</EuiFlexItem>}
      </EuiFlexGroup>
    </EuiSplitPanel.Inner>
    <EuiSplitPanel.Inner>{children}</EuiSplitPanel.Inner>
  </EuiSplitPanel.Outer>
);

export const SettingsSectionRow = ({
  title,
  titleAdornment,
  description,
  children,
  'data-test-subj': dataTestSubject,
}: {
  title: ReactNode;
  titleAdornment?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  'data-test-subj'?: string;
}) => (
  <EuiDescribedFormGroup
    fullWidth
    ratio="half"
    title={
      titleAdornment ? (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <h4>{title}</h4>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{titleAdornment}</EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <h4>{title}</h4>
      )
    }
    titleSize="xxs"
    description={description}
    data-test-subj={dataTestSubject}
  >
    {children}
  </EuiDescribedFormGroup>
);
