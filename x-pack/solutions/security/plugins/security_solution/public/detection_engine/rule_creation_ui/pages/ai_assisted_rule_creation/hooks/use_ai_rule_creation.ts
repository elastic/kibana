/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';

import type {
  AIAssistedCreateRuleResponse,
  AIAssistedCreateRuleRequestBody,
} from '../../../../../../common/api/detection_engine/ai_assisted/index.gen';

const AI_ASSISTED_RULE_CREATION = 'aiAssistedRuleCreation';

import { KibanaServices } from '../../../../../common/lib/kibana/services';

const INTERNAL_AI_ASSISTED_RULE_CREATE_API_PATH = '/internal/detection_engine/ai_assisted/_create';

const createAiAssistedRuleAPI = async ({
  message,
  connectorId,
  signal,
}: {
  message: string;
  connectorId: string;
  signal?: AbortSignal;
}) => {
  const body: AIAssistedCreateRuleRequestBody = { user_query: message, connector_id: connectorId };

  return KibanaServices.get().http.fetch<AIAssistedCreateRuleResponse>(
    INTERNAL_AI_ASSISTED_RULE_CREATE_API_PATH,
    {
      method: 'POST',
      body: JSON.stringify(body),
      version: '1',
      signal,
    }
  );
};

export const useAiRuleCreation = () => {
  const { data, mutateAsync, isLoading } = useMutation(
    [AI_ASSISTED_RULE_CREATION],
    async ({ message, connectorId }: { message: string; connectorId: string }) => {
      const result: AIAssistedCreateRuleResponse = await createAiAssistedRuleAPI({
        message,
        connectorId,
      });

      return result;
    }
  );

  return {
    rule: data?.rule,
    isLoading,
    executeAiAssistedRuleCreation: mutateAsync,
  };
};
