/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { DashboardsPanel } from './dashboards_panel';
import { IndicatorPanel } from './indicator_panel';
import { SettingsPanel } from './settings_panel';
import type { SloDetailsDefinitionProps } from '.';

export function SloDetailsPageDefinition({ slo }: SloDetailsDefinitionProps) {
  return (
    <EuiFlexGroup
      direction={'row'}
      gutterSize="l"
      alignItems="flexStart"
      data-test-subj="definition"
    >
      <EuiFlexItem grow={1}>
        <IndicatorPanel slo={slo} />
      </EuiFlexItem>

      <EuiFlexItem grow={1}>
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem grow={false}>
            <SettingsPanel slo={slo} />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <DashboardsPanel slo={slo} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
