/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import styled from 'styled-components';
import React, { memo } from 'react';
import type {
  RuleStepProps,
  ScheduleStepRule,
} from '../../../../detections/pages/detection_engine/rules/types';
import { StepRuleDescription } from '../description_step';
import { ScheduleItem } from '../../../rule_creation/components/schedule_item_form';
import { Form, UseField } from '../../../../shared_imports';
import type { FormHook } from '../../../../shared_imports';
import { StepContentWrapper } from '../../../rule_creation/components/step_content_wrapper';
import { schema } from './schema';

const StyledForm = styled(Form)`
  max-width: 235px !important;
`;
interface StepScheduleRuleProps extends RuleStepProps {
  form: FormHook<ScheduleStepRule>;
}

interface StepScheduleRuleReadOnlyProps {
  addPadding: boolean;
  descriptionColumns: 'multi' | 'single' | 'singleSplit';
  defaultValues: ScheduleStepRule;
}

const StepScheduleRuleComponent: FC<StepScheduleRuleProps> = ({
  isLoading,
  isUpdateView = false,
  form,
}) => {
  return (
    <>
      <StepContentWrapper addPadding={!isUpdateView}>
        <StyledForm form={form} data-test-subj="stepScheduleRule">
          <UseField
            path="interval"
            component={ScheduleItem}
            componentProps={{
              idAria: 'detectionEngineStepScheduleRuleInterval',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepScheduleRuleInterval',
              minimumValue: 1,
            }}
          />
          <UseField
            path="from"
            component={ScheduleItem}
            componentProps={{
              idAria: 'detectionEngineStepScheduleRuleFrom',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepScheduleRuleFrom',
              minimumValue: 1,
            }}
          />
        </StyledForm>
      </StepContentWrapper>
    </>
  );
};
export const StepScheduleRule = memo(StepScheduleRuleComponent);

const StepScheduleRuleReadOnlyComponent: FC<StepScheduleRuleReadOnlyProps> = ({
  addPadding,
  defaultValues: data,
  descriptionColumns,
}) => {
  return (
    <StepContentWrapper addPadding={addPadding}>
      <StepRuleDescription columns={descriptionColumns} schema={schema} data={data} />
    </StepContentWrapper>
  );
};
export const StepScheduleRuleReadOnly = memo(StepScheduleRuleReadOnlyComponent);
