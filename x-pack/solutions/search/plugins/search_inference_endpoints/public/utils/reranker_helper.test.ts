/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isProviderTechPreview } from './reranker_helper';

describe('Reranker Tech preview badge', () => {
  const mockProvider = {
    inference_id: 'elastic-rerank',
    task_type: 'rerank',
    service: 'elasticsearch',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
      model_id: '.rerank-v1',
    },
    task_settings: {
      return_documents: true,
    },
  } as any;

  it('return true for reranker', () => {
    expect(isProviderTechPreview(mockProvider)).toEqual(true);
  });

  it('return false for other provider', () => {
    const otherProviderServiceSettings = {
      ...mockProvider.service_settings,
      model_id: '.elser_model_2',
    };
    const otherProvider = {
      ...mockProvider,
      task_type: 'sparse_embedding',
      service_settings: otherProviderServiceSettings,
    } as any;
    expect(isProviderTechPreview(otherProvider)).toEqual(false);
  });

  it('return false for other provider without model_id', () => {
    const mockThirdPartyProvider = {
      inference_id: 'azure-openai-1',
      service: 'azureopenai',
      service_settings: {
        resource_name: 'resource-xyz',
        deployment_id: 'deployment-123',
        api_version: 'v1',
      },
    } as any;
    expect(isProviderTechPreview(mockThirdPartyProvider)).toEqual(false);
  });
});
