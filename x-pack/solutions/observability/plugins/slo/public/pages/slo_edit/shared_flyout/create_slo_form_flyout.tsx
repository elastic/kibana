/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiStepsHorizontal,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CreateSLOInput } from '@kbn/slo-schema';
import type { RecursivePartial } from '@kbn/utility-types';
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { createHtmlPortalNode } from 'react-reverse-portal';
import { SLO_EDIT_FORM_DEFAULT_VALUES } from '../constants';
import { useSectionFormValidation } from '../hooks/use_section_form_validation';
import { transformPartialSLODataToFormState } from '../helpers/process_slo_form_values';
import type { CreateSLOForm, FormSettings } from '../types';
import { SloEditFormIndicatorSection } from '../components/slo_edit_form_indicator_section';
import { SloEditFormObjectiveSection } from '../components/slo_edit_form_objective_section';
import { SloEditFormDescriptionSection } from '../components/slo_edit_form_description_section';
import { useCreateSlo } from '../../../hooks/use_create_slo';
import { useCreateRule } from '../../../hooks/use_create_burn_rate_rule';
import type { BurnRateRuleParams } from '../../../typings';
import { createBurnRateRuleRequestBody } from '../helpers/create_burn_rate_rule_request_body';
import { transformCreateSLOFormToCreateSLOInput } from '../helpers/process_slo_form_values';
import { EquivalentApiRequest } from '../components/common/equivalent_api_request';
import { SLOInspect } from '../components/common/slo_inspect/slo_inspect';

const STEP_DEFINE_SLI = 0;
const STEP_SET_OBJECTIVES = 1;
const STEP_DESCRIBE_SLO = 2;

// Keep the portal node export for backward compatibility with SloEditForm used in other contexts
export const sloEditFormFooterPortal = createHtmlPortalNode();

// eslint-disable-next-line import/no-default-export
export default function CreateSLOFormFlyout({
  onClose,
  initialValues = {},
  formSettings = {},
}: {
  onClose: () => void;
  initialValues: RecursivePartial<CreateSLOInput>;
  formSettings?: Omit<FormSettings, 'isFlyout'>;
}) {
  const formInitialValues = transformPartialSLODataToFormState(initialValues);
  const [currentStep, setCurrentStep] = useState(STEP_DEFINE_SLI);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const scrollTargetRef = useRef<HTMLDivElement>(null);

  // Scroll to top when step changes
  useEffect(() => {
    if (scrollTargetRef.current) {
      scrollTargetRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [currentStep]);

  const form = useForm<CreateSLOForm>({
    defaultValues: formInitialValues ?? SLO_EDIT_FORM_DEFAULT_VALUES,
    mode: 'all',
  });

  const { watch, getFieldState, getValues, formState, trigger } = form;

  const { isIndicatorSectionValid, isObjectiveSectionValid } = useSectionFormValidation({
    getFieldState,
    getValues,
    formState,
    watch,
  });

  const { mutateAsync: createSlo, isLoading: isCreateSloLoading } = useCreateSlo();
  const { mutate: createBurnRateRule, isLoading: isCreateBurnRateRuleLoading } =
    useCreateRule<BurnRateRuleParams>();

  const isLoading = isCreateSloLoading || isCreateBurnRateRuleLoading;

  const getStepStatus = useCallback(
    (
      stepIndex: number
    ): 'incomplete' | 'complete' | 'current' | 'warning' | 'danger' | 'disabled' | 'loading' => {
      if (stepIndex === currentStep) {
        return 'current';
      }
      // Only show complete if the step is before current step and was completed
      if (stepIndex < currentStep && completedSteps.has(stepIndex)) {
        return 'complete';
      }
      return 'incomplete';
    },
    [currentStep, completedSteps]
  );

  const steps = useMemo(
    () => [
      {
        title: i18n.translate('xpack.slo.sloEdit.flyout.step1.title', {
          defaultMessage: 'Define SLI',
        }),
        status: getStepStatus(STEP_DEFINE_SLI),
        onClick: () => setCurrentStep(STEP_DEFINE_SLI),
      },
      {
        title: i18n.translate('xpack.slo.sloEdit.flyout.step2.title', {
          defaultMessage: 'Set objectives',
        }),
        status: getStepStatus(STEP_SET_OBJECTIVES),
        onClick: () => {
          if (isIndicatorSectionValid) {
            setCurrentStep(STEP_SET_OBJECTIVES);
          }
        },
        disabled: !isIndicatorSectionValid,
      },
      {
        title: i18n.translate('xpack.slo.sloEdit.flyout.step3.title', {
          defaultMessage: 'Describe SLO',
        }),
        status: getStepStatus(STEP_DESCRIBE_SLO),
        onClick: () => {
          if (isIndicatorSectionValid && isObjectiveSectionValid) {
            setCurrentStep(STEP_DESCRIBE_SLO);
          }
        },
        disabled: !isIndicatorSectionValid || !isObjectiveSectionValid,
      },
    ],
    [getStepStatus, isIndicatorSectionValid, isObjectiveSectionValid]
  );

  const handleNext = useCallback(async () => {
    if (currentStep === STEP_DEFINE_SLI) {
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
        setCompletedSteps((prev) => new Set(prev).add(STEP_DEFINE_SLI));
        setCurrentStep(STEP_SET_OBJECTIVES);
      }
    } else if (currentStep === STEP_SET_OBJECTIVES) {
      const isValid = await trigger([
        'budgetingMethod',
        'timeWindow.duration',
        'timeWindow.type',
        'objective.target',
      ]);
      if (isValid || isObjectiveSectionValid) {
        setCompletedSteps((prev) => new Set(prev).add(STEP_SET_OBJECTIVES));
        setCurrentStep(STEP_DESCRIBE_SLO);
      }
    }
  }, [currentStep, trigger, isIndicatorSectionValid, isObjectiveSectionValid]);

  const handleBack = useCallback(() => {
    if (currentStep === STEP_SET_OBJECTIVES) {
      setCurrentStep(STEP_DEFINE_SLI);
    } else if (currentStep === STEP_DESCRIBE_SLO) {
      setCurrentStep(STEP_SET_OBJECTIVES);
    }
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    const isValid = await trigger();
    if (!isValid) {
      return;
    }

    const values = getValues();
    const processedValues = transformCreateSLOFormToCreateSLOInput(values);
    const resp = await createSlo({ slo: processedValues });
    createBurnRateRule({
      rule: createBurnRateRuleRequestBody({ ...processedValues, id: resp.id }),
    });
    onClose();
  }, [trigger, getValues, createSlo, createBurnRateRule, onClose]);

  const flyoutFormSettings: FormSettings = {
    ...formSettings,
    isFlyout: true,
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case STEP_DEFINE_SLI:
        return <SloEditFormIndicatorSection formSettings={flyoutFormSettings} />;
      case STEP_SET_OBJECTIVES:
        return <SloEditFormObjectiveSection formSettings={flyoutFormSettings} />;
      case STEP_DESCRIBE_SLO:
        return <SloEditFormDescriptionSection formSettings={flyoutFormSettings} />;
      default:
        return null;
    }
  };

  const isLastStep = currentStep === STEP_DESCRIBE_SLO;
  const isFirstStep = currentStep === STEP_DEFINE_SLI;

  return (
    <FormProvider {...form}>
      <EuiFlyout
        onClose={onClose}
        aria-labelledby="flyoutTitle"
        size={620}
        resizable
        ownFocus
        session="start"
        flyoutMenuProps={{
          title: i18n.translate('xpack.slo.createSLOFormFlyout.title', {
            defaultMessage: 'Create SLO form',
          }),
        }}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s" data-test-subj="addSLOFlyoutTitle">
            <h3 id="flyoutTitle">
              <FormattedMessage defaultMessage="Create SLO" id="xpack.slo.add.flyoutTitle" />
            </h3>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          <div ref={scrollTargetRef} />
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiStepsHorizontal steps={steps} size="xs" />
            </EuiFlexItem>

            <EuiFlexItem>{renderStepContent()}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              {isFirstStep ? (
                <EuiButtonEmpty
                  onClick={onClose}
                  disabled={isLoading}
                  data-test-subj="sloFormCancelButton"
                >
                  {i18n.translate('xpack.slo.sloEdit.flyout.cancelButton', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              ) : (
                <EuiButtonEmpty
                  onClick={handleBack}
                  disabled={isLoading}
                  data-test-subj="sloFormBackButton"
                >
                  {i18n.translate('xpack.slo.sloEdit.flyout.backButton', {
                    defaultMessage: 'Back',
                  })}
                </EuiButtonEmpty>
              )}
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s">
                {isLastStep && (
                  <>
                    <EuiFlexItem grow={false}>
                      <EquivalentApiRequest disabled={isLoading} isEditMode={false} />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <SLOInspect disabled={isLoading} />
                    </EuiFlexItem>
                  </>
                )}
                <EuiFlexItem grow={false}>
                  {isLastStep ? (
                    <EuiButton
                      fill
                      onClick={handleSubmit}
                      isLoading={isLoading}
                      data-test-subj="sloFormSubmitButton"
                    >
                      {i18n.translate('xpack.slo.sloEdit.flyout.createButton', {
                        defaultMessage: 'Create SLO',
                      })}
                    </EuiButton>
                  ) : (
                    <EuiButton
                      fill
                      onClick={handleNext}
                      disabled={
                        (currentStep === STEP_DEFINE_SLI && !isIndicatorSectionValid) ||
                        (currentStep === STEP_SET_OBJECTIVES && !isObjectiveSectionValid)
                      }
                      data-test-subj="sloFormNextButton"
                    >
                      {i18n.translate('xpack.slo.sloEdit.flyout.nextButton', {
                        defaultMessage: 'Next',
                      })}
                    </EuiButton>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </FormProvider>
  );
}
