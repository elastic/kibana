/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isEmpty } from 'lodash';
import { useForm, type FormConfig, type FormData, type FormHook } from '../../../shared_imports';
import type { FormHookWithWarnings } from './form_hook_with_warnings';
import { extractValidationResults } from './extract_validation_results';
import type { ValidationResults } from './validation_results';

export type FormWithWarningsSubmitHandler<T extends FormData = FormData> = (
  formData: T,
  isValid: boolean,
  validationResults: ValidationResults
) => Promise<void>;

interface FormWithWarningsConfig<T extends FormData = FormData, I extends FormData = T>
  extends Omit<FormConfig<T, I>, 'onSubmit'> {
  onSubmit?: FormWithWarningsSubmitHandler<T>;
  options: FormConfig['options'] & {
    warningValidationCodes: Readonly<string[]>;
  };
}

interface UseFormWithWarningsReturn<T extends FormData = FormData, I extends FormData = T> {
  form: FormHookWithWarnings<T, I>;
}

/**
 * Form lib implements warning functionality via non blocking validators. `validations` allows to
 * specify validation configuration with validator functions and extra parameters including
 * `isBlocking`. Validators marked as `isBlocking` will produce non blocking validation errors
 * a.k.a. warnings.
 *
 * The problem with the supported approach is lack of flexibility and necessary API like one for getting
 * only blocking or non blocking errors. Flexibility requirement comes from complex async validators
 * producing blocking and non blocking validation errors. There is no way to use `isBlocking` configuration
 * option to separate errors. Separating such validating functions in two would lead to sending two
 * HTTP requests and performing another async operations twice.
 *
 * On top of just having an ability to mark validation errors as non blocking via `isBlocking: false`
 * configuration we require a way to return blocking and non blocking errors from a single validation
 * function. It'd be possible by returning an error with `isBlocking` (or `isWarning`) flag along with
 * `message` and `code` fields from a validator function. Attempts to reuse `__isBlocking__` internal
 * field lead to inconsistent behavior.
 *
 * `useFormWithWarnings` implements warnings (non blocking errors) on top of `FormHook` using validation
 * error codes as a flexible way to determine whether an error is a blocking error or it's a warning.
 * It provides little interface extension to simplify errors and warnings consumption
 *
 * In some cases business logic requires implementing functionality to allow users perform an action
 * despite non-critical validation errors a.k.a. warnings. Usually it's also required to inform users
 * about warnings they got before proceeding for example via a modal.
 *
 * Since `FormHook` returned by `useForm` lacks of such functionality `useFormWithWarnings` is here to
 * provide warnings functionality. It could be used and passed as `FormHook` when warnings functionality
 * isn't required making absolutely transparent.
 *
 * **Important:** Validators use short circuiting by default. It means that any failed validation in
 * `validations` configuration array will prevent the rest validators from running. When used with warnings
 * it may lead to bugs when validator checks first for warnings. You have to make sure a value is validated
 * for errors first and then for warnings.
 *
 * There is a ticket to move this functionality to Form lib https://github.com/elastic/kibana/issues/203097.
 */
export function useFormWithWarnings<T extends FormData = FormData, I extends FormData = T>(
  formConfig: FormWithWarningsConfig<T, I>
): UseFormWithWarningsReturn<T, I> {
  const {
    onSubmit,
    options: { warningValidationCodes },
  } = formConfig;
  const { form } = useForm(formConfig as FormConfig<T, I>);
  const { validate: originalValidate, getFormData, getFields } = form;

  const validationResultsRef = useRef<ValidationResults>({
    errors: [],
    warnings: [],
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isValid, setIsValid] = useState<boolean>();
  const isMounted = useRef(false);

  const validate: FormHook<T, I>['validate'] = useCallback(async () => {
    await originalValidate();

    validationResultsRef.current = extractValidationResults(
      Object.values(getFields()),
      warningValidationCodes
    );

    const isFormValid = isEmpty(validationResultsRef.current.errors);

    setIsValid(isFormValid);

    return isFormValid;
  }, [originalValidate, getFields, warningValidationCodes, validationResultsRef]);

  const submit: FormHook<T, I>['submit'] = useCallback(
    async (e) => {
      if (e) {
        e.preventDefault();
      }

      setIsSubmitted(true);
      setSubmitting(true);

      const isFormValid = await validate();
      const formData = isFormValid ? getFormData() : ({} as T);

      if (onSubmit) {
        await onSubmit(formData, isFormValid, validationResultsRef.current);
      }

      if (isMounted.current) {
        setSubmitting(false);
      }

      return { data: formData, isValid: isFormValid };
    },
    [validate, getFormData, onSubmit, validationResultsRef]
  );

  // Track form's mounted state
  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  return useMemo(
    () => ({
      form: {
        ...form,
        isValid,
        isSubmitted,
        isSubmitting,
        validate,
        submit,
        getErrors: () => validationResultsRef.current.errors.map((x) => x.message),
        getValidationWarnings: () => validationResultsRef.current.warnings,
      },
    }),
    [form, validate, submit, isSubmitted, isSubmitting, isValid, validationResultsRef]
  );
}
