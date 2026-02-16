/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import { AdvancedSettings } from '../indicator_section/advanced_settings/advanced_settings';
import { DataPreviewChart } from '../common/data_preview_chart';
import { MAX_WIDTH } from '../../constants';
import { BudgetingMethodField } from './budgeting_method_field';
import { DurationField } from './duration_field';
import { SloEditFormObjectiveSectionTimeslices } from './objective_section_timeslices';
import {
  ServerlessWarningCallout,
  SyntheticsAvailabilityCallout,
  TimesliceMetricCallout,
} from './callouts';
import { TargetField } from './target_field';
import { TimeWindowTypeField } from './time_window_type_field';
import { useObjectiveSectionFormData } from './use_objective_section_form_data';
import { useIsHorizontalLayout } from '../slo_form_context';

export function ObjectiveSection() {
  const isHorizontalLayout = useIsHorizontalLayout();
  const {
    isServerless,
    budgetingSelect,
    timeWindowTypeSelect,
    timeWindowSelect,
    timeWindowType,
    indicator,
    budgetingMethod,
  } = useObjectiveSectionFormData();

  const FieldGroupWrapper = isHorizontalLayout ? ColumnGroup : GridGroup;

  return (
    <EuiPanel
      hasBorder={isHorizontalLayout}
      hasShadow={false}
      paddingSize={isHorizontalLayout ? 'm' : 'none'}
      style={isHorizontalLayout ? undefined : { maxWidth: MAX_WIDTH }}
      data-test-subj="sloEditFormObjectiveSection"
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        {isServerless && <ServerlessWarningCallout />}

        <FieldGroupWrapper>
          <EuiFlexItem grow={false}>
            <TimeWindowTypeField selectId={timeWindowTypeSelect} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <DurationField selectId={timeWindowSelect} timeWindowType={timeWindowType} />
          </EuiFlexItem>
        </FieldGroupWrapper>

        {indicator === 'sli.metric.timeslice' && <TimesliceMetricCallout />}
        {indicator === 'sli.synthetics.availability' && <SyntheticsAvailabilityCallout />}

        <FieldGroupWrapper>
          <EuiFlexItem grow={false}>
            <BudgetingMethodField selectId={budgetingSelect} indicator={indicator} />
          </EuiFlexItem>
          {budgetingMethod === 'timeslices' && <SloEditFormObjectiveSectionTimeslices />}
        </FieldGroupWrapper>

        <FieldGroupWrapper>
          <EuiFlexItem grow={false}>
            <TargetField />
          </EuiFlexItem>
        </FieldGroupWrapper>

        {isHorizontalLayout && <EuiSpacer size="xs" />}
        <AdvancedSettings />
        {isHorizontalLayout && <EuiSpacer size="xs" />}

        {isHorizontalLayout && <DataPreviewChart />}
      </EuiFlexGroup>
    </EuiPanel>
  );
}

function ColumnGroup({ children }: { children: React.ReactNode }) {
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {children}
    </EuiFlexGroup>
  );
}

function GridGroup({ children }: { children: React.ReactNode }) {
  return (
    <EuiFlexGrid columns={3} gutterSize="m">
      {children}
    </EuiFlexGrid>
  );
}
