/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiTitle, EuiSpacer } from '@elastic/eui';
import React, { memo } from 'react';

export interface SectionPanelProps {
  title: string;
  children: React.ReactNode;
}

export const SectionPanel = memo<SectionPanelProps>(({ title, children }) => (
  <EuiPanel hasShadow={false} hasBorder paddingSize="m">
    <EuiTitle size="xxs">
      <h4>{title}</h4>
    </EuiTitle>
    <EuiSpacer size="s" />
    {children}
  </EuiPanel>
));
SectionPanel.displayName = 'SectionPanel';
