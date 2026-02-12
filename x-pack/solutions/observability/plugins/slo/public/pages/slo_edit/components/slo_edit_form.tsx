/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiStepStatus } from '@elastic/eui';
import { EuiFlexGroup, EuiSpacer, EuiSteps, EuiStepsHorizontal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GetSLOResponse } from '@kbn/slo-schema';
import React, { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { SLO_EDIT_FORM_DEFAULT_VALUES } from '../constants';
import { useSectionFormValidation } from '../hooks/use_section_form_validation';
import { useShowSections } from '../hooks/use_show_sections';
import type { CreateSLOForm, FormSettings } from '../types';
import { SloEditFormDescriptionSection } from './slo_edit_form_description_section';
import { SloEditFormFooter } from './slo_edit_form_footer';
import { SloEditFormIndicatorSection } from './slo_edit_form_indicator_section';
import { SloEditFormObjectiveSection } from './slo_edit_form_objective_section';

export interface Props {
  initialValues?: CreateSLOForm;
  slo?: GetSLOResponse;
  onFlyoutClose?: () => void;
  formSettings?: FormSettings;
}

const DEFAULT_FORM_SETTINGS: FormSettings = {
  isEditMode: false,
  allowedIndicatorTypes: [],
  formLayout: 'vertical',
};

const STEP_DEFINITION = 1;
const STEP_OBJECTIVES = 2;
const STEP_DESCRIPTION = 3;

export function SloEditForm({
  slo,
  initialValues,
  onFlyoutClose,
  formSettings = DEFAULT_FORM_SETTINGS,
}: Props) {
  const { isEditMode = false, formLayout = 'vertical' } = formSettings;
  assertValidProps({ isEditMode, slo, onFlyoutClose });
  const isHorizontalLayout = formLayout === 'horizontal';

  const form = useForm<CreateSLOForm>({
    defaultValues: initialValues ?? SLO_EDIT_FORM_DEFAULT_VALUES,
    values: initialValues,
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
  const [activeStep, setActiveStep] = useState<number>(STEP_DEFINITION);

  const canAccessObjectiveStep = isIndicatorSectionValid;
  const canAccessDescriptionStep = isIndicatorSectionValid && isObjectiveSectionValid;

  useEffect(() => {
    if (!isHorizontalLayout) {
      return;
    }
    if (activeStep === STEP_OBJECTIVES && !canAccessObjectiveStep) {
      setActiveStep(STEP_DEFINITION);
      return;
    }
    if (activeStep === STEP_DESCRIPTION && !canAccessDescriptionStep) {
      setActiveStep(canAccessObjectiveStep ? STEP_OBJECTIVES : STEP_DEFINITION);
    }
  }, [activeStep, canAccessDescriptionStep, canAccessObjectiveStep, isHorizontalLayout]);

  const stepDefinitions = useMemo(
    () => [
      {
        title: i18n.translate('xpack.slo.sloEdit.definition.title', {
          defaultMessage: 'Define SLI',
        }),
        status: (activeStep === STEP_DEFINITION
          ? 'current'
          : isIndicatorSectionValid
          ? 'complete'
          : 'incomplete') as EuiStepStatus,
        onClick: () => setActiveStep(STEP_DEFINITION),
      },
      {
        title: i18n.translate('xpack.slo.sloEdit.objectives.title', {
          defaultMessage: 'Set objectives',
        }),
        disabled: !canAccessObjectiveStep,
        status: (activeStep === STEP_OBJECTIVES
          ? 'current'
          : isObjectiveSectionValid
          ? 'complete'
          : 'incomplete') as EuiStepStatus,
        onClick: () => {
          if (canAccessObjectiveStep) {
            setActiveStep(STEP_OBJECTIVES);
          }
        },
      },
      {
        title: i18n.translate('xpack.slo.sloEdit.description.title', {
          defaultMessage: 'Describe SLO',
        }),
        disabled: !canAccessDescriptionStep,
        status: (activeStep === STEP_DESCRIPTION
          ? 'current'
          : isDescriptionSectionValid
          ? 'complete'
          : 'incomplete') as EuiStepStatus,
        onClick: () => {
          if (canAccessDescriptionStep) {
            setActiveStep(STEP_DESCRIPTION);
          }
        },
      },
    ],
    [
      activeStep,
      canAccessDescriptionStep,
      canAccessObjectiveStep,
      isDescriptionSectionValid,
      isIndicatorSectionValid,
      isObjectiveSectionValid,
    ]
  );

  return (
    <FormProvider {...form}>
      <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="sloForm">
        {isHorizontalLayout ? (
          <>
            <div data-test-subj="sloFormHorizontalStepper">
              <EuiStepsHorizontal steps={stepDefinitions} />
            </div>
            <EuiSpacer size="l" />
            <div data-test-subj="sloFormHorizontalStepPanel">
              {activeStep === STEP_DEFINITION && (
                <SloEditFormIndicatorSection formSettings={formSettings} />
              )}
              {activeStep === STEP_OBJECTIVES && canAccessObjectiveStep && (
                <SloEditFormObjectiveSection isHorizontalLayout />
              )}
              {activeStep === STEP_DESCRIPTION && canAccessDescriptionStep && (
                <SloEditFormDescriptionSection />
              )}
            </div>
          </>
        ) : (
          <EuiSteps
            steps={[
              {
                title: i18n.translate('xpack.slo.sloEdit.definition.title', {
                  defaultMessage: 'Define SLI',
                }),
                children: <SloEditFormIndicatorSection formSettings={formSettings} />,
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
        )}

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
