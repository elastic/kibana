/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMutation } from '@kbn/react-query';
import {
  EXECUTIVE_BRIEF_API_VERSION,
  EXECUTIVE_BRIEF_POC_GENERATE_URL,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import type {
  BriefNarrationMode,
  BriefTimeRange,
  GenerateBriefRequestBody,
  GenerateBriefResponse,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { useKibana } from '../../../../common/lib/kibana';

export interface GenerateExecutiveBriefVariables {
  timeRange: BriefTimeRange;
  mode?: BriefNarrationMode;
}

/** POSTs a new brief generation job (PoC: template generator only) and returns the job id. */
export const useGenerateExecutiveBrief = () => {
  const { http } = useKibana().services;

  return useMutation<GenerateBriefResponse, Error, GenerateExecutiveBriefVariables>({
    mutationFn: ({ timeRange, mode = 'names' }) => {
      const body: GenerateBriefRequestBody = { timeRange, generator: 'template', mode };
      return http.fetch<GenerateBriefResponse>(EXECUTIVE_BRIEF_POC_GENERATE_URL, {
        method: 'POST',
        version: EXECUTIVE_BRIEF_API_VERSION,
        body: JSON.stringify(body),
      });
    },
  });
};
