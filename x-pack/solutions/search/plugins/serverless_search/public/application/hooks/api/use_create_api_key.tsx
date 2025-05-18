/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { CREATE_API_KEY_PATH } from '../../../../common/routes';
import { CreateAPIKeyArgs } from '../../../../common/types';
import { useKibanaServices } from '../use_kibana';

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  expiration?: number;
  api_key: string;
  encoded?: string;
  beats_logstash_format: string;
}

export const useCreateApiKey = () => {
  const { http } = useKibanaServices();
  return useMutation({
    mutationFn: async (input: CreateAPIKeyArgs) => {
      const result = await http.post<CreateApiKeyResponse>(CREATE_API_KEY_PATH, {
        body: JSON.stringify(input),
      });
      return result;
    },
  });
};
