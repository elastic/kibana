/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiStepStatus } from '@elastic/eui';
import { EuiFlexGroup, EuiSteps, EuiStepsHorizontal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GetSLOResponse } from '@kbn/slo-schema';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { SLO_EDIT_FORM_DEFAULT_VALUES } from '../constants';
import { useSectionFormValidation } from '../hooks/use_section_form_validation';
import { useShowSections } from '../hooks/use_show_sections';
import type { CreateSLOForm, FormSettings } from '../types';
import { DEFAULT_FORM_SETTINGS, SloFormContextProvider } from './slo_form_context';
import { DescriptionSection } from './description_section';
import { SloEditFormFooter, SloEditFormHorizontalFooter } from './slo_edit_form_footer';
import { IndicatorSection } from './indicator_section';
import { ObjectiveSection } from './objective_section';

export interface Props {
  initialValues?: CreateSLOForm;
  slo?: GetSLOResponse;
  onFlyoutClose?: () => void;
  formSettings?: FormSettings;
}

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
  const isHorizontalLayout = formLayout === 'horizontal';
  assertValidProps({ isEditMode, slo, onFlyoutClose });

  const form = useForm<CreateSLOForm>({
    defaultValues: initialValues ?? SLO_EDIT_FORM_DEFAULT_VALUES,
    values: initialValues,
    mode: 'all',
  });
  const { watch, getFieldState, getValues, formState, trigger } = form;

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
          : activeStep > STEP_DEFINITION
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
          : activeStep > STEP_OBJECTIVES
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
          : activeStep > STEP_DESCRIPTION
          ? 'complete'
          : 'incomplete') as EuiStepStatus,
        onClick: () => {
          if (canAccessDescriptionStep) {
            setActiveStep(STEP_DESCRIPTION);
          }
        },
      },
    ],
    [activeStep, canAccessDescriptionStep, canAccessObjectiveStep]
  );

  const handleNext = useCallback(async () => {
    if (activeStep === STEP_DEFINITION) {
      const isValid = await trigger([
        'indicator.type',
        'indicator.params.service',
        'indicator.params.environment',
        'indicator.params.transactionType',
        'indicator.params.transactionName',
        'indicator.params.index',
        'indicator.params.timestampField',
        'indicator.params.filter',
        'indicator.params.good',
        'indicator.params.total',
      ]);
      if (isValid || isIndicatorSectionValid) {
        setActiveStep(STEP_OBJECTIVES);
      }
    } else if (activeStep === STEP_OBJECTIVES) {
      const isValid = await trigger([
        'budgetingMethod',
        'timeWindow.duration',
        'timeWindow.type',
        'objective.target',
      ]);
      if (isValid || isObjectiveSectionValid) {
        setActiveStep(STEP_DESCRIPTION);
      }
    }
  }, [activeStep, isIndicatorSectionValid, isObjectiveSectionValid, trigger]);

  const handleBack = useCallback(() => {
    if (activeStep === STEP_OBJECTIVES) {
      setActiveStep(STEP_DEFINITION);
    } else if (activeStep === STEP_DESCRIPTION) {
      setActiveStep(STEP_OBJECTIVES);
    }
  }, [activeStep]);

  const isFirstStep = activeStep === STEP_DEFINITION;
  const isLastStep = activeStep === STEP_DESCRIPTION;

  const formSections = isHorizontalLayout ? (
    <>
      <div data-test-subj="sloFormHorizontalStepper">
        <EuiStepsHorizontal steps={stepDefinitions} size="xs" />
      </div>
      <div data-test-subj="sloFormHorizontalStepPanel">
        {activeStep === STEP_DEFINITION && <IndicatorSection />}
        {activeStep === STEP_OBJECTIVES && canAccessObjectiveStep && <ObjectiveSection />}
        {activeStep === STEP_DESCRIPTION && canAccessDescriptionStep && <DescriptionSection />}
      </div>
    </>
  ) : (
    <EuiSteps
      steps={[
        {
          title: i18n.translate('xpack.slo.sloEdit.definition.title', {
            defaultMessage: 'Define SLI',
          }),
          children: <IndicatorSection />,
          status: isIndicatorSectionValid ? 'complete' : 'incomplete',
        },
        {
          title: i18n.translate('xpack.slo.sloEdit.objectives.title', {
            defaultMessage: 'Set objectives',
          }),
          children: showObjectiveSection ? <ObjectiveSection /> : null,
          status: showObjectiveSection && isObjectiveSectionValid ? 'complete' : 'incomplete',
        },
        {
          title: i18n.translate('xpack.slo.sloEdit.description.title', {
            defaultMessage: 'Describe SLO',
          }),
          children: showDescriptionSection ? <DescriptionSection /> : null,
          status: showDescriptionSection && isDescriptionSectionValid ? 'complete' : 'incomplete',
        },
      ]}
    />
  );

  return (
    <FormProvider {...form}>
      <SloFormContextProvider value={formSettings}>
        <EuiFlexGroup
          direction="column"
          gutterSize={isHorizontalLayout ? 'none' : 'm'}
          data-test-subj="sloForm"
        >
          {formSections}

          {isHorizontalLayout ? (
            <SloEditFormHorizontalFooter
              slo={slo}
              onFlyoutClose={onFlyoutClose}
              isEditMode={isEditMode}
              isFirstStep={isFirstStep}
              isLastStep={isLastStep}
              onBack={handleBack}
              onNext={handleNext}
              nextDisabled={
                (activeStep === STEP_DEFINITION && !isIndicatorSectionValid) ||
                (activeStep === STEP_OBJECTIVES && !isObjectiveSectionValid)
              }
            />
          ) : (
            <SloEditFormFooter slo={slo} onFlyoutClose={onFlyoutClose} isEditMode={isEditMode} />
          )}
        </EuiFlexGroup>
      </SloFormContextProvider>
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
