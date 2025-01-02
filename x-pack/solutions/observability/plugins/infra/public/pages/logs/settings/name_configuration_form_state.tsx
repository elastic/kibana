/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useFormElement } from './form_elements';
import { FormValidationError, validateStringNotEmpty } from './validation_errors';

export const useNameFormElement = (initialValue: string) => {
  const nameFormElement = useFormElement<string, FormValidationError>({
    initialValue,
    validate: useMemo(() => async (name) => validateStringNotEmpty('name', name), []),
  });

  return nameFormElement;
};
