/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import { useFormContext, useFormState, useWatch } from 'react-hook-form';
import type { CreateSLOForm } from '../types';
import type { IsInvalid } from '../helpers/section_validation';
import {
  isDescriptionSectionComplete,
  isIndicatorSectionComplete,
  isObjectiveSectionComplete,
} from '../helpers/section_validation';

const IndicatorSectionValidityContext = createContext<boolean>(false);

/**
 * Provides the indicator section validity computed by `SloEditFormSteps` to the indicator section children.
 */
export const IndicatorSectionValidityProvider = IndicatorSectionValidityContext.Provider;

/**
 * Validity of the indicator section, as computed once by `SloEditFormSteps`; `false` outside the provider.
 */
export const useIndicatorSectionValidity = (): boolean =>
  useContext(IndicatorSectionValidityContext);

export function useSectionFormValidation() {
  const { control, getFieldState, getValues } = useFormContext<CreateSLOForm>();
  const [indicatorType] = useWatch({
    control,
    name: ['indicator.type', 'indicator.params', 'name'],
  });
  const formState = useFormState({ control });
  const isInvalid: IsInvalid = (field) => getFieldState(field, formState).invalid;

  const isIndicatorSectionValid = isIndicatorSectionComplete(indicatorType, getValues, isInvalid);
  const isObjectiveSectionValid = isObjectiveSectionComplete(isInvalid);
  const isDescriptionSectionValid = isDescriptionSectionComplete(getValues, isInvalid);

  return {
    isValidating: formState.isValidating,
    isIndicatorSectionValid,
    isObjectiveSectionValid,
    isDescriptionSectionValid,
  };
}
