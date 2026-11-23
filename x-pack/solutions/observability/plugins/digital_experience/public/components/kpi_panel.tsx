/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiPanel, EuiStat } from '@elastic/eui';

/** A KPI panel of a KPI row; the value keeps its place while loading, so the row does not jump. */
export function KpiPanel({
  label,
  hint,
  value,
  isLoading,
  footer,
  'data-test-subj': dataTestSubj,
}: {
  label: string;
  /** How the value is calculated. */
  hint?: string;
  value: ReactNode;
  isLoading: boolean;
  /** Below the value, e.g. its change against the previous period. */
  footer?: ReactNode;
  'data-test-subj': string;
}) {
  return (
    <EuiFlexItem>
      <EuiPanel hasBorder paddingSize="m">
        <EuiFlexGroup alignItems="flexStart" gutterSize="xs" responsive={false}>
          <EuiFlexItem>
            <EuiStat
              data-test-subj={dataTestSubj}
              titleSize="m"
              isLoading={isLoading}
              title={value}
              description={label}
            >
              {footer}
            </EuiStat>
          </EuiFlexItem>
          {hint && (
            <EuiFlexItem grow={false}>
              <EuiIconTip
                content={hint}
                type="info"
                iconProps={{ 'data-test-subj': `${dataTestSubj}Hint` }}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  );
}
