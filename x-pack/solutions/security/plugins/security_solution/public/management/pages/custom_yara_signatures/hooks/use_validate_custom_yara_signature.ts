/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import type { OsTypeArray } from '@kbn/securitysolution-io-ts-list-types';
import type { OperatingSystem } from '@kbn/securitysolution-utils';
import { useHttp } from '../../../../common/lib/kibana';
import type {
  ValidateCustomYaraSignatureDiagnostic,
  ValidateCustomYaraSignatureRequestBody,
} from '../../../../../common/api/endpoint/custom_yara_signatures';
import { validateCustomYaraSignature } from '../service/validate_custom_yara_signature';

export const VALIDATE_CUSTOM_YARA_SIGNATURE_DEBOUNCE_MS = 500;

const EMPTY_OS_TYPES: OsTypeArray = [];
const EMPTY_DIAGNOSTICS: ValidateCustomYaraSignatureDiagnostic[] = [];

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

export interface UseValidateCustomYaraSignatureResultPayload {
  errors: ValidateCustomYaraSignatureDiagnostic[];
  warnings: ValidateCustomYaraSignatureDiagnostic[];
  requestError: unknown;
}

export interface UseValidateCustomYaraSignatureProps {
  yaraRule: string;
  osTypes: OsTypeArray | undefined;
  enabled?: boolean;
  onValidationResult?: (result: UseValidateCustomYaraSignatureResultPayload) => void;
}

export interface UseValidateCustomYaraSignatureResult {
  errors: ValidateCustomYaraSignatureDiagnostic[];
  warnings: ValidateCustomYaraSignatureDiagnostic[];
  isValidating: boolean;
  requestError: unknown;
}

export const useValidateCustomYaraSignature = ({
  yaraRule,
  osTypes,
  enabled = true,
  onValidationResult,
}: UseValidateCustomYaraSignatureProps): UseValidateCustomYaraSignatureResult => {
  const http = useHttp();
  const onValidationResultRef = useRef(onValidationResult);
  onValidationResultRef.current = onValidationResult;

  const [debouncedYaraRule, setDebouncedYaraRule] = useState('');
  const [debouncedOsTypes, setDebouncedOsTypes] = useState<OsTypeArray>(EMPTY_OS_TYPES);
  const [errors, setErrors] = useState(EMPTY_DIAGNOSTICS);
  const [warnings, setWarnings] = useState(EMPTY_DIAGNOSTICS);
  const [isValidating, setIsValidating] = useState(false);
  const [requestError, setRequestError] = useState<unknown>(undefined);

  useDebounce(
    () => {
      setDebouncedYaraRule(yaraRule);
      setDebouncedOsTypes(osTypes ?? EMPTY_OS_TYPES);
    },
    VALIDATE_CUSTOM_YARA_SIGNATURE_DEBOUNCE_MS,
    [yaraRule, osTypes]
  );

  const canValidate =
    enabled && debouncedYaraRule.trim().length > 0 && (debouncedOsTypes?.length ?? 0) > 0;

  useEffect(() => {
    if (!canValidate) {
      setErrors(EMPTY_DIAGNOSTICS);
      setWarnings(EMPTY_DIAGNOSTICS);
      setRequestError(undefined);
      setIsValidating(false);
      return;
    }

    const abortController = new AbortController();
    const body: ValidateCustomYaraSignatureRequestBody = {
      yara_rule: debouncedYaraRule,
      os_types: [...debouncedOsTypes] as OperatingSystem[],
    };

    setIsValidating(true);
    setRequestError(undefined);

    validateCustomYaraSignature(http, body, { signal: abortController.signal })
      .then((response) => {
        if (abortController.signal.aborted) {
          return;
        }

        setErrors(response.errors);
        setWarnings(response.warnings);
        onValidationResultRef.current?.({
          errors: response.errors,
          warnings: response.warnings,
          requestError: undefined,
        });
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted || isAbortError(error)) {
          return;
        }

        setErrors(EMPTY_DIAGNOSTICS);
        setWarnings(EMPTY_DIAGNOSTICS);
        setRequestError(error);
        onValidationResultRef.current?.({
          errors: EMPTY_DIAGNOSTICS,
          warnings: EMPTY_DIAGNOSTICS,
          requestError: error,
        });
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsValidating(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [canValidate, debouncedOsTypes, debouncedYaraRule, http]);

  return {
    errors,
    warnings,
    isValidating,
    requestError,
  };
};
