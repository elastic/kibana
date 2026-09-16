/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { CUSTOM_YARA_SIGNATURES_VALIDATE_ROUTE } from '../../../../../common/endpoint/constants';
import type {
  ValidateCustomYaraSignatureRequestBody,
  ValidateCustomYaraSignatureResponse,
} from '../../../../../common/api/endpoint/custom_yara_signatures';

export const validateCustomYaraSignature = (
  http: HttpStart,
  body: ValidateCustomYaraSignatureRequestBody,
  { signal }: { signal?: AbortSignal } = {}
): Promise<ValidateCustomYaraSignatureResponse> => {
  return http.post<ValidateCustomYaraSignatureResponse>(CUSTOM_YARA_SIGNATURES_VALIDATE_ROUTE, {
    version: '1',
    body: JSON.stringify(body),
    signal,
  });
};
