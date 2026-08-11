/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement, ReactNode } from 'react';
import React, { memo } from 'react';
import type { EuiFlexGroupProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';

/**
 * minWidth for each block rendered in the flyout header.
 * Allows switching from a 1-row 4-block layout to 2 rows with 2 blocks each.
 */
export const flyoutHeaderBlockStyles = {
  minWidth: 280,
};

export interface FlyoutHeaderBlockProps {
  /**
   * React component to render as the value
   */
  children: ReactNode;
  /**
   * data-test-subj to use for the title
   */
  ['data-test-subj']?: string;
  /**
   * Gutter size (vertical) between title and content
   */
  gutterSize?: EuiFlexGroupProps['gutterSize'];
  /**
   * If true, adds a slight 1px border on all edges.
   * False by default.
   * This is passed to the EuiPanel's hasBorder property.
   */
  hasBorder?: boolean;
  /**
   * React component to render as the title
   */
  title: ReactElement;
}

/**
 * Reusable component for rendering a block with rounded edges, show a title and value below one another
 */
export const FlyoutHeaderBlock = memo(
  ({
    children,
    gutterSize = 's',
    hasBorder = false,
    title,
    'data-test-subj': dataTestSubj,
  }: FlyoutHeaderBlockProps) => (
    <EuiPanel hasShadow={false} hasBorder={hasBorder} paddingSize="s">
      <EuiFlexGroup
        direction="column"
        gutterSize={gutterSize}
        responsive={false}
        alignItems="flexStart"
      >
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

FlyoutHeaderBlock.displayName = 'FlyoutHeaderBlock';
