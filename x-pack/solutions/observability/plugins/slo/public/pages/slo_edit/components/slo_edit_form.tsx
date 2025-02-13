/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiSteps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CreateSLOInput, GetSLOResponse } from '@kbn/slo-schema';
import { RecursivePartial } from '@kbn/utility-types';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { SLO_EDIT_FORM_DEFAULT_VALUES } from '../constants';
import {
  transformPartialSLOStateToFormState,
  transformSloResponseToCreateSloForm,
} from '../helpers/process_slo_form_values';
import { useParseUrlState } from '../hooks/use_parse_url_state';
import { useSectionFormValidation } from '../hooks/use_section_form_validation';
import { useShowSections } from '../hooks/use_show_sections';
import { CreateSLOForm } from '../types';
import { SloEditFormDescriptionSection } from './slo_edit_form_description_section';
import { SloEditFormFooter } from './slo_edit_form_footer';
import { SloEditFormIndicatorSection } from './slo_edit_form_indicator_section';
import { SloEditFormObjectiveSection } from './slo_edit_form_objective_section';

export interface Props {
  slo?: GetSLOResponse;
  initialValues?: RecursivePartial<CreateSLOInput>;
  onSave?: () => void;
}

export function SloEditForm({ slo, initialValues, onSave }: Props) {
  const isEditMode = slo !== undefined;
  const isFlyoutMode = initialValues !== undefined && onSave !== undefined;

  const sloFormValuesFromFlyoutState = isFlyoutMode
    ? transformPartialSLOStateToFormState(initialValues)
    : undefined;
  const sloFormValuesFromUrlState = useParseUrlState();
  const sloFormValuesFromSloResponse = transformSloResponseToCreateSloForm(slo);

  const form = useForm<CreateSLOForm>({
    defaultValues: isFlyoutMode
      ? sloFormValuesFromFlyoutState
      : sloFormValuesFromUrlState
      ? sloFormValuesFromUrlState
      : sloFormValuesFromSloResponse ?? SLO_EDIT_FORM_DEFAULT_VALUES,
    values: isFlyoutMode
      ? sloFormValuesFromFlyoutState
      : sloFormValuesFromUrlState
      ? sloFormValuesFromUrlState
      : sloFormValuesFromSloResponse,
    mode: 'all',
  });
  const { watch, getFieldState, getValues, formState } = form;

  const { isIndicatorSectionValid, isObjectiveSectionValid, isDescriptionSectionValid } =
    useSectionFormValidation({
      getFieldState,
      getValues,
      formState,
      watch,
    });

  const { showDescriptionSection, showObjectiveSection } = useShowSections(
    isEditMode,
    formState.isValidating,
    isIndicatorSectionValid,
    isObjectiveSectionValid
  );

  return (
    <FormProvider {...form}>
      <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="sloForm">
        <EuiSteps
          steps={[
            {
              title: i18n.translate('xpack.slo.sloEdit.definition.title', {
                defaultMessage: 'Define SLI',
              }),
              children: <SloEditFormIndicatorSection isEditMode={isEditMode} />,
              status: isIndicatorSectionValid ? 'complete' : 'incomplete',
            },
            {
              title: i18n.translate('xpack.slo.sloEdit.objectives.title', {
                defaultMessage: 'Set objectives',
              }),
              children: showObjectiveSection ? <SloEditFormObjectiveSection /> : null,
              status: showObjectiveSection && isObjectiveSectionValid ? 'complete' : 'incomplete',
            },
            {
              title: i18n.translate('xpack.slo.sloEdit.description.title', {
                defaultMessage: 'Describe SLO',
              }),
              children: showDescriptionSection ? <SloEditFormDescriptionSection /> : null,
              status:
                showDescriptionSection && isDescriptionSectionValid ? 'complete' : 'incomplete',
            },
          ]}
        />

        <SloEditFormFooter slo={slo} onSave={onSave} />
      </EuiFlexGroup>
    </FormProvider>
  );
}
