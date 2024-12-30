/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { InferenceProvider } from '../types';

export const fetchInferenceServices = async (
  client: ElasticsearchClient
): Promise<{
  services: InferenceProvider[];
}> => {
  const { services } = await client.transport.request<{
    services: InferenceProvider[];
  }>({
    method: 'GET',
    path: `/_inference/_services`,
  });

  return {
    services,
  };
};
