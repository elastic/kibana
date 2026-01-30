/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiSplitPanel, EuiTitle } from '@elastic/eui';
import React from 'react';

interface Props {
  title: string;
  renderTooltip?: boolean;
  tooltipContent?: React.ReactNode;
  append?: React.ReactNode;
  children?: React.ReactNode;
  'data-test-subj'?: string;
}

export function SloFlyoutCard({
  title,
  renderTooltip,
  tooltipContent,
  append,
  children,
  'data-test-subj': dataTestSubj,
}: Props) {
  return (
    <EuiSplitPanel.Outer hasBorder hasShadow={false} data-test-subj={dataTestSubj}>
      <EuiSplitPanel.Inner color="subdued" paddingSize="s">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h4>{title}</h4>
              </EuiTitle>
            </EuiFlexItem>
            {renderTooltip && (
              <EuiFlexItem grow={false}>
                <EuiIconTip type="question" content={tooltipContent} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          {append && <EuiFlexItem grow={false}>{append}</EuiFlexItem>}
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner color="transparent">{children}</EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
}
