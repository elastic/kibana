/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import type { GetSLOResponse } from '@kbn/slo-schema';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { SLO_EDIT_FORM_DEFAULT_VALUES } from '../constants';
import type { CreateSLOForm, FormSettings } from '../types';
import { SloEditFormDescriptionSection } from './slo_edit_form_description_section';
import { SloEditFormFooter } from './slo_edit_form_footer';
import { SloEditFormIndicatorSection } from './slo_edit_form_indicator_section';
import { SloEditFormObjectiveSection } from './slo_edit_form_objective_section';
import { SloEditFormSteps } from './slo_edit_form_steps';

export interface Props {
  initialValues?: CreateSLOForm;
  slo?: GetSLOResponse;
  onFlyoutClose?: () => void;
  formSettings?: FormSettings;
}

const DEFAULT_FORM_SETTINGS: FormSettings = {
  isEditMode: false,
  allowedIndicatorTypes: [],
};

/**
 * Form root. It must not read `formState` or call `watch` so that field changes never re-render the
 * whole form; per-field subscriptions live in the children via `useWatch` / `useFormState`.
 */
export function SloEditForm({
  slo,
  initialValues,
  onFlyoutClose,
  formSettings = DEFAULT_FORM_SETTINGS,
}: Props) {
  const { isEditMode = false } = formSettings;
  assertValidProps({ isEditMode, slo, onFlyoutClose });

  const form = useForm<CreateSLOForm>({
    defaultValues: initialValues ?? SLO_EDIT_FORM_DEFAULT_VALUES,
    values: initialValues,
    mode: 'all',
  });

  return (
    <FormProvider {...form}>
      <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="sloForm">
        <SloEditFormSteps
          isEditMode={isEditMode}
          indicatorSection={<SloEditFormIndicatorSection formSettings={formSettings} />}
          objectiveSection={<SloEditFormObjectiveSection />}
          descriptionSection={<SloEditFormDescriptionSection />}
        />

        <SloEditFormFooter slo={slo} onFlyoutClose={onFlyoutClose} isEditMode={isEditMode} />
      </EuiFlexGroup>
    </FormProvider>
  );
}

function assertValidProps({
  slo,
  onFlyoutClose,
  isEditMode,
}: {
  slo: Props['slo'];
  onFlyoutClose: Props['onFlyoutClose'];
  isEditMode: boolean;
}) {
  const isFlyout = Boolean(onFlyoutClose);
  if ((isEditMode || !!slo) && isFlyout) {
    throw new Error('SLO Form cannot be in edit mode within a flyout');
  }

  if (isEditMode && !slo) {
    throw new Error('SLO must be provided when in edit mode');
  }
}
