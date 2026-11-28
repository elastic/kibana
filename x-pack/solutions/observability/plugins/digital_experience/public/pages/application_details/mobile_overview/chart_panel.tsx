/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { ChartArea } from '../../../components/chart_area';

export const CHART_HEIGHT = 240;

/**
 * A chart of the mobile Overview in a bordered panel, with a one-line header (an `h3` and an info
 * tip), so charts side by side line up.
 */
export function ChartPanel({
  title,
  tooltip,
  hasData,
  emptyMessage,
  'data-test-subj': dataTestSubj,
  children,
}: {
  title: string;
  tooltip: string;
  hasData: boolean;
  emptyMessage: string;
  'data-test-subj': string;
  children: ReactNode;
}) {
  return (
    <EuiPanel hasBorder data-test-subj={dataTestSubj}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip content={tooltip} type="info" />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <ChartArea
        height={CHART_HEIGHT}
        isLoading={false}
        hasData={hasData}
        emptyMessage={emptyMessage}
      >
        {children}
      </ChartArea>
    </EuiPanel>
  );
}
