/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIEM_WORKFLOW_MIGRATIONS_TRANSLATE_PATH } from '../../../../common/siem_migrations/workflows/constants';
import type {
  TranslateWorkflowRequestBody,
  TranslateWorkflowResponse,
} from '../../../../common/siem_migrations/workflows/types';
import { KibanaServices } from '../../../common/lib/kibana';

export const translateTinesStory = async ({
  story,
  signal,
}: {
  story: TranslateWorkflowRequestBody['story'];
  signal?: AbortSignal;
}): Promise<TranslateWorkflowResponse> => {
  return KibanaServices.get().http.post<TranslateWorkflowResponse>(
    SIEM_WORKFLOW_MIGRATIONS_TRANSLATE_PATH,
    {
      version: '1',
      body: JSON.stringify({ story }),
      signal,
    }
  );
};
