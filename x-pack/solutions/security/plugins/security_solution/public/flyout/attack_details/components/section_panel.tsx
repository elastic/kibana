/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { memo, useMemo } from 'react';

interface SectionPanelProps {
  /** Content rendered below the header */
  children: React.ReactNode;
  /** Header title content */
  title: React.ReactNode;
  /** Highlights title in primary color */
  highlightTitle?: boolean;
  /** Optional leading icon in the header */
  icon?: React.ReactNode;
}

export const SectionPanel = memo(({ children, title, highlightTitle, icon }: SectionPanelProps) => {
  const { euiTheme } = useEuiTheme();

  const styles = useMemo(() => {
    return {
      panel: css`
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: thin;
      `,
      header: css`
        border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
        padding: ${euiTheme.size.m} ${euiTheme.size.base};
      `,
      title: css`
        font-weight: ${euiTheme.font.weight.bold};
      `,
    };
  }, [euiTheme]);

  return (
    <EuiPanel data-test-subj="sectionPanel" css={styles.panel} hasBorder paddingSize="none">
      <EuiFlexGroup css={styles.header}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            {icon && (
              <EuiFlexItem data-test-subj="section-panel-icon" grow={false}>
                {icon}
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiText
                color={highlightTitle ? euiTheme.colors.primary : 'default'}
                css={styles.title}
                size="s"
              >
                {title}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {children}
    </EuiPanel>
  );
});

SectionPanel.displayName = 'SectionPanel';
