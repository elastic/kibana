/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement, ReactNode } from 'react';
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';

export interface AlertHeaderBlockProps {
  /**
   * React component to render as the title
   */
  title: ReactElement;
  /**
   * React component to render as the value
   */
  children: ReactNode;
  /**
   * If true, adds a slight 1px border on all edges.
   * False by default.
   * This is passed to the EuiPanel's hasBorder property.
   */
  hasBorder?: boolean;
  /**
   * data-test-subj to use for the title
   */
  ['data-test-subj']?: string;
}

/**
 * Reusable component for rendering a block with rounded edges, show a title and value below one another
 */
export const AlertHeaderBlock = memo(
  ({
    title,
    children,
    hasBorder = false,
    'data-test-subj': dataTestSubj,
  }: AlertHeaderBlockProps) => (
    <EuiPanel hasShadow={false} hasBorder={hasBorder} paddingSize="s">
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false} alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs" data-test-subj={dataTestSubj}>
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{children}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  )
);

AlertHeaderBlock.displayName = 'AlertHeaderBlock';
