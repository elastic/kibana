/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';

interface SettingsSectionProps {
  title: string;
  /** Lower-case fragment shown beside the title, e.g. "applies to this watch only". */
  subtitle?: string;
  /**
   * Trailing control on the heading row, pushed to the right — the Workers and Skills sections' "View
   * all …" links (2026-08-17 simplification). A link rather than a button by intent: it navigates to a
   * catalog page that already exists in this section's subnav.
   */
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  'data-test-subj'?: string;
}

/**
 * Heading plus bordered panel, used by every section of the watch settings page.
 *
 * Spacing between sections is owned by the page's column `EuiFlexGroup`, so this deliberately emits
 * no trailing spacer.
 */
export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  subtitle,
  headerAction,
  children,
  'data-test-subj': dataTestSubj,
}) => (
  <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiFlexGroup alignItems="baseline" gutterSize="s" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {subtitle ? (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {subtitle}
            </EuiText>
          </EuiFlexItem>
        ) : null}
        {headerAction ? (
          <>
            {/*
              An empty growing item rather than `grow` on the subtitle: growing the text node would
              stretch the subtitle away from the title it belongs to, which is the pairing the heading
              row exists to show.
            */}
            <EuiFlexItem />
            <EuiFlexItem grow={false}>{headerAction}</EuiFlexItem>
          </>
        ) : null}
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiPanel hasBorder paddingSize="l" data-test-subj={dataTestSubj}>
        {children}
      </EuiPanel>
    </EuiFlexItem>
  </EuiFlexGroup>
);
