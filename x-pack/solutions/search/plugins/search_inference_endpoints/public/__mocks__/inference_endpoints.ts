/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

export const InferenceEndpoints: InferenceAPIConfigResponse[] = [
  {
    inference_id: 'my-elser-model-04',
    task_type: 'sparse_embedding',
    service: 'elasticsearch',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
      model_id: '.elser_model_2',
    },
    task_settings: {},
  },
  {
    inference_id: 'my-elser-model-01',
    task_type: 'sparse_embedding',
    service: 'elasticsearch',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
      model_id: '.elser_model_2',
    },
    task_settings: {},
  },
  {
    inference_id: 'my-openai-model-05',
    task_type: 'text_embedding',
    service: 'openai',
    service_settings: {
      api_key: 'test-api-key',
      organization_id: 'test-org',
      url: 'https://api.openai.com/v1',
      model_id: 'text-embedding-ada-002',
    },
    task_settings: {},
  },
  {
    inference_id: 'endpoint-06',
    task_type: 'rerank',
    service: 'openai',
    service_settings: {
      api_key: 'test-api-key',
      organization_id: 'test-org',
      url: 'https://api.openai.com/v1',
      model_id: 'gpt-4',
    },
    task_settings: {},
  },
  {
    inference_id: 'my-mistral-model',
    task_type: 'text_embedding',
    service: 'mistral',
    service_settings: {
      api_key: 'test-api-key',
      model: 'mistral-embed',
      max_input_tokens: '512',
      rate_limit: {
        requests_per_minute: 100,
      },
    },
    task_settings: {},
  },
  {
    inference_id: 'my-cohere-model',
    task_type: 'text_embedding',
    service: 'cohere',
    service_settings: {
      similarity: 'cosine',
      dimensions: '1024',
      model_id: 'embed-english-v3.0',
      embedding_type: 'float',
    },
    task_settings: {},
  },
  {
    inference_id: 'my-azureaistudio-model',
    task_type: 'text_embedding',
    service: 'azureaistudio',
    service_settings: {
      target: 'https://test.azureaistudio.com',
      provider: 'openai',
      embedding_type: 'float',
    },
    task_settings: {},
  },
  {
    inference_id: 'my-azureopenai-model',
    task_type: 'text_embedding',
    service: 'azureopenai',
    service_settings: {
      resource_name: 'test-resource',
      deployment_id: 'test-deployment',
      api_version: '2023-05-15',
    },
    task_settings: {},
  },
  {
    inference_id: 'my-googleaistudio-model',
    task_type: 'text_embedding',
    service: 'googleaistudio',
    service_settings: {
      model_id: 'text-embedding-004',
      rate_limit: {
        requests_per_minute: 100,
      },
    },
    task_settings: {},
  },
  {
    inference_id: 'my-huggingface-model',
    task_type: 'text_embedding',
    service: 'hugging_face',
    service_settings: {
      api_key: 'test-api-key',
      url: 'https://api-inference.huggingface.co',
    },
    task_settings: {},
  },
  {
    inference_id: 'my-alibabacloud-model',
    task_type: 'text_embedding',
    service: 'alibabacloud-ai-search',
    service_settings: {
      api_key: 'test-api-key',
      service_id: 'test-service',
      host: 'test-host.aliyuncs.com',
      workspace: 'default',
      http_schema: 'https',
      rate_limit: {
        requests_per_minute: 100,
      },
    },
    task_settings: {},
  },
  {
    inference_id: 'my-watsonx-model',
    task_type: 'text_embedding',
    service: 'watsonxai',
    service_settings: {
      api_key: 'test-api-key',
      url: 'https://us-south.ml.cloud.ibm.com',
      model_id: 'ibm/slate-125m-english-rtrvr',
      project_id: 'test-project',
      api_version: '2024-01-01',
    },
    task_settings: {},
  },
  {
    inference_id: 'my-amazonbedrock-model',
    task_type: 'text_embedding',
    service: 'amazonbedrock',
    service_settings: {
      access_key: 'test-access-key',
      secret_key: 'test-secret-key',
      region: 'us-east-1',
      provider: 'amazontitan',
      model: 'amazon.titan-embed-text-v1',
    },
    task_settings: {},
  },
];
