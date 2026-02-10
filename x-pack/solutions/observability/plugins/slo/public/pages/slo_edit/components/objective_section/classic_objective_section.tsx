/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { AdvancedSettings } from '../indicator_section/advanced_settings/advanced_settings';
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

export function ClassicObjectiveSection() {
  const {
    isServerless,
    budgetingSelect,
    timeWindowTypeSelect,
    timeWindowSelect,
    timeWindowType,
    indicator,
    budgetingMethod,
  } = useObjectiveSectionFormData();

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      style={{ maxWidth: MAX_WIDTH }}
      data-test-subj="sloEditFormObjectiveSection"
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        {isServerless && <ServerlessWarningCallout />}

        <EuiFlexGrid columns={3} gutterSize="m">
          <EuiFlexItem grow={false}>
            <TimeWindowTypeField selectId={timeWindowTypeSelect} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <DurationField selectId={timeWindowSelect} timeWindowType={timeWindowType} />
          </EuiFlexItem>
        </EuiFlexGrid>

        {indicator === 'sli.metric.timeslice' && <TimesliceMetricCallout />}
        {indicator === 'sli.synthetics.availability' && <SyntheticsAvailabilityCallout />}

        <EuiFlexGrid columns={3} gutterSize="m">
          <EuiFlexItem grow={false}>
            <BudgetingMethodField selectId={budgetingSelect} indicator={indicator} />
          </EuiFlexItem>
          {budgetingMethod === 'timeslices' && <SloEditFormObjectiveSectionTimeslices />}
        </EuiFlexGrid>

        <EuiFlexGrid columns={3} gutterSize="m">
          <EuiFlexItem grow={false}>
            <TargetField />
          </EuiFlexItem>
        </EuiFlexGrid>

        <AdvancedSettings />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
