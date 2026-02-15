/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import { DataPreviewChart } from '../common/data_preview_chart';
import { DashboardsField } from './dashboards_field';
import { DescriptionField } from './description_field';
import { SloNameField } from './slo_name_field';
import { TagsField } from './tags_field';

export function FlyoutDescriptionSection() {
  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      data-test-subj="sloEditFormDescriptionSection"
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <SloNameField />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DescriptionField />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <TagsField />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DashboardsField />
        </EuiFlexItem>
        <EuiSpacer size="m" />
        <DataPreviewChart />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
