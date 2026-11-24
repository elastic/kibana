/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateSLOInput } from '@kbn/slo-schema';
import { useFormContext } from 'react-hook-form';
import { transformCreateSLOFormToCreateSLOInput } from '../helpers/process_slo_form_values';
import type { CreateSLOForm } from '../types';

/**
 * Returns a handler that validates the whole form and resolves with the create input, or undefined when invalid.
 */
export const useValidatedSloInput = (): (() => Promise<CreateSLOInput | undefined>) => {
  const { trigger, getValues } = useFormContext<CreateSLOForm>();

  return async () => {
    const isValid = await trigger();
    return isValid ? transformCreateSLOFormToCreateSLOInput(getValues()) : undefined;
  };
};
