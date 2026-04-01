/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Placeholder — real implementation added in PR 4
import type { PostGenerateRequestBody as PostGenerateRequestBodyType } from '@kbn/discoveries-schemas';
import type { WorkflowConfig } from '../types';

interface ValidateRequestSuccess {
  ok: true;
  requestBody: PostGenerateRequestBodyType;
  workflowConfig: WorkflowConfig;
}

interface ValidateRequestFailure {
  body: { message: string };
  ok: false;
}

export type ValidateRequestResult = ValidateRequestSuccess | ValidateRequestFailure;

export const validateRequest = ({
  requestBody: _requestBody,
}: {
  requestBody: unknown;
}): ValidateRequestResult => {
  throw new Error('Not implemented — real implementation added in PR 4');
};
