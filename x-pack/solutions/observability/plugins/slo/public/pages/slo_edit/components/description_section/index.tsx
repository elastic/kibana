/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import { DataPreviewChart } from '../common/data_preview_chart';
import { MAX_WIDTH } from '../../constants';
import { DashboardsField } from './dashboards_field';
import { DescriptionField } from './description_field';
import { SloNameField } from './slo_name_field';
import { TagsField } from './tags_field';
import { useIsHorizontalLayout } from '../slo_form_context';

export function DescriptionSection() {
  const isHorizontalLayout = useIsHorizontalLayout();

  return (
    <EuiPanel
      hasBorder={isHorizontalLayout}
      hasShadow={false}
      paddingSize={isHorizontalLayout ? 'm' : 'none'}
      style={isHorizontalLayout ? undefined : { maxWidth: MAX_WIDTH }}
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
        {isHorizontalLayout && (
          <>
            <EuiSpacer size="m" />
            <DataPreviewChart />
          </>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
