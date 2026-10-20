/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { OsTypeArray } from '@kbn/securitysolution-io-ts-list-types';
import type { OperatingSystem } from '@kbn/securitysolution-utils';
import { CUSTOM_YARA_SIGNATURES_VALIDATE_ROUTE } from '../../../../../common/endpoint/constants';
import { useHttp } from '../../../../common/lib/kibana';
import type {
  ValidateCustomYaraSignatureDiagnostic,
  ValidateCustomYaraSignatureResponse,
} from '../../../../../common/api/endpoint/custom_yara_signatures';

export const VALIDATE_CUSTOM_YARA_SIGNATURE_DEBOUNCE_MS = 500;

export const CUSTOM_YARA_SIGNATURE_VALIDATE_QUERY_KEY = [
  'customYaraSignatures',
  'validate',
] as const;

const EMPTY_OS_TYPES: OsTypeArray = [];
const EMPTY_DIAGNOSTICS: ValidateCustomYaraSignatureDiagnostic[] = [];

const toOsTypesKey = (osTypes: OsTypeArray | undefined): string =>
  (osTypes ?? EMPTY_OS_TYPES).join(',');

export interface UseValidateCustomYaraSignatureProps {
  yaraRule: string;
  osTypes: OsTypeArray | undefined;
  enabled?: boolean;
}

export interface UseValidateCustomYaraSignatureResult {
  errors: ValidateCustomYaraSignatureDiagnostic[];
  warnings: ValidateCustomYaraSignatureDiagnostic[];
  isValidating: boolean;
  requestError: unknown;
  isDirty: boolean;
  isYaraSyntaxValid: boolean;
}

export const useValidateCustomYaraSignature = ({
  yaraRule,
  osTypes,
  enabled = true,
}: UseValidateCustomYaraSignatureProps): UseValidateCustomYaraSignatureResult => {
  const http = useHttp();
  const osTypesKey = toOsTypesKey(osTypes);

  const [debouncedYaraRule, setDebouncedYaraRule] = useState(yaraRule);
  const [debouncedOsTypes, setDebouncedOsTypes] = useState<OsTypeArray>(osTypes ?? EMPTY_OS_TYPES);

  useDebounce(
    () => {
      setDebouncedYaraRule(yaraRule);
      setDebouncedOsTypes(osTypes ?? EMPTY_OS_TYPES);
    },
    VALIDATE_CUSTOM_YARA_SIGNATURE_DEBOUNCE_MS,
    [osTypesKey, yaraRule]
  );

  const isDirty = yaraRule !== debouncedYaraRule || osTypesKey !== toOsTypesKey(debouncedOsTypes);
  const canValidate =
    enabled && debouncedYaraRule.trim().length > 0 && (debouncedOsTypes?.length ?? 0) > 0;

  const query = useQuery<ValidateCustomYaraSignatureResponse, IHttpFetchError>({
    queryKey: [
      ...CUSTOM_YARA_SIGNATURE_VALIDATE_QUERY_KEY,
      debouncedYaraRule,
      [...debouncedOsTypes],
    ],
    queryFn: async ({ signal }) =>
      http.post<ValidateCustomYaraSignatureResponse>(CUSTOM_YARA_SIGNATURES_VALIDATE_ROUTE, {
        version: '1',
        body: JSON.stringify({
          yara_rule: debouncedYaraRule,
          os_types: [...debouncedOsTypes] as OperatingSystem[],
        }),
        signal,
      }),
    enabled: canValidate,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const settledData = canValidate && !isDirty && query.isSuccess ? query.data : undefined;

  return {
    errors: settledData?.errors ?? EMPTY_DIAGNOSTICS,
    warnings: settledData?.warnings ?? EMPTY_DIAGNOSTICS,
    isValidating: query.isFetching,
    requestError: isDirty ? undefined : query.error,
    isDirty,
    isYaraSyntaxValid: settledData !== undefined && settledData.errors.length === 0,
  };
};
