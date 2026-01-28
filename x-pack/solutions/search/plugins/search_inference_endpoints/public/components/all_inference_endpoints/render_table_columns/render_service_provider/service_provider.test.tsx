/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { ServiceProvider } from './service_provider';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';

describe('ServiceProvider component', () => {
  const renderComponent = (
    service: ServiceProviderKeys,
    endpointInfo: InferenceInferenceEndpointInfo
  ) => {
    render(<ServiceProvider service={service} endpointInfo={endpointInfo} />);
  };
  describe('with HuggingFace service', () => {
    const mockEndpoint: InferenceInferenceEndpointInfo = {
      inference_id: 'my-hugging-face',
      service: 'hugging_face',
      service_settings: {
        api_key: 'aaaa',
        url: 'https://dummy.huggingface.com',
      },
      task_settings: {},
      task_type: 'sparse_embedding',
    };
    it('renders the component with service and model details', () => {
      renderComponent(ServiceProviderKeys.hugging_face, mockEndpoint);

      expect(screen.getByText('Hugging Face')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-hugging_face');
      expect(icon).toBeInTheDocument();
      expect(screen.getByText('https://dummy.huggingface.com')).toBeInTheDocument();
    });
  });

  describe('with openai service', () => {
    const mockEndpoint: InferenceInferenceEndpointInfo = {
      inference_id: 'my-openai-endpoint',
      service: 'openai',
      service_settings: {
        api_key: 'aaaa',
        model_id: 'text-embedding-3-small',
      },
      task_settings: {},
      task_type: 'text_embedding',
    };
    it('renders the component with service details (model shown in Model column)', () => {
      renderComponent(ServiceProviderKeys.openai, mockEndpoint);

      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-openai');
      expect(icon).toBeInTheDocument();
      // Model name is now shown in the dedicated Model column, not in Service column
      expect(screen.queryByText('text-embedding-3-small')).not.toBeInTheDocument();
    });
  });

  describe('with cohere service', () => {
    const mockEndpoint: InferenceInferenceEndpointInfo = {
      inference_id: 'cohere-2',
      service: 'cohere',
      service_settings: {
        similarity: 'cosine',
        dimensions: 384,
        model_id: 'embed-english-light-v3.0',
        rate_limit: {
          requests_per_minute: 10000,
        },
        embedding_type: 'byte',
      },
      task_settings: {},
      task_type: 'sparse_embedding',
    };

    it('renders the component with service details (model shown in Model column)', () => {
      renderComponent(ServiceProviderKeys.cohere, mockEndpoint);

      expect(screen.getByText('Cohere')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-cohere');
      expect(icon).toBeInTheDocument();
      // Model name is now shown in the dedicated Model column, not in Service column
      expect(screen.queryByText('embed-english-light-v3.0')).not.toBeInTheDocument();
    });
  });

  describe('with azureaistudio service', () => {
    const mockEndpoint: InferenceInferenceEndpointInfo = {
      inference_id: 'azure-ai-1',
      service: 'azureaistudio',
      service_settings: {
        target: 'westus',
        provider: 'microsoft_phi',
        endpoint_type: 'realtime',
      },
      task_type: 'sparse_embedding',
    };

    it('renders the component with endpoint details', () => {
      renderComponent(ServiceProviderKeys.azureaistudio, mockEndpoint);

      expect(screen.getByText('Azure AI Studio')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-azureaistudio');
      expect(icon).toBeInTheDocument();
      expect(screen.getByText('microsoft_phi')).toBeInTheDocument();
    });

    it('renders nothing related to service settings when all are missing', () => {
      const modifiedEndpoint = {
        ...mockEndpoint,
        service_settings: {},
      };
      renderComponent(ServiceProviderKeys.azureaistudio, modifiedEndpoint);

      expect(screen.getByText('Azure AI Studio')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-azureaistudio');
      expect(icon).toBeInTheDocument();
      expect(screen.queryByText('microsoft_phi')).not.toBeInTheDocument();
    });
  });

  describe('with azureopenai service', () => {
    const mockEndpoint: InferenceInferenceEndpointInfo = {
      inference_id: 'azure-openai-1',
      service: 'azureopenai',
      service_settings: {
        resource_name: 'resource-xyz',
        deployment_id: 'deployment-123',
        api_version: 'v1',
      },
      task_type: 'sparse_embedding',
    };

    it('renders the component with all required endpoint details', () => {
      renderComponent(ServiceProviderKeys.azureopenai, mockEndpoint);

      expect(screen.getByText('Azure OpenAI')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-azureopenai');
      expect(icon).toBeInTheDocument();
      expect(screen.getByText('resource-xyz')).toBeInTheDocument();
    });
  });

  describe('with mistral service', () => {
    const mockEndpoint: InferenceInferenceEndpointInfo = {
      inference_id: 'mistral-ai-1',
      service: 'mistral',
      service_settings: {
        model: 'model-xyz',
        max_input_tokens: 512,
        rate_limit: {
          requests_per_minute: 1000,
        },
      },
      task_type: 'sparse_embedding',
    };

    it('renders the component with service details (model shown in Model column)', () => {
      renderComponent(ServiceProviderKeys.mistral, mockEndpoint);

      expect(screen.getByText('Mistral')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-mistral');
      expect(icon).toBeInTheDocument();
      // Model name is now shown in the dedicated Model column, not in Service column
      expect(screen.queryByText('model-xyz')).not.toBeInTheDocument();
    });
  });

  describe('with elasticsearch service preconfigured endpoint', () => {
    const mockEndpoint: InferenceInferenceEndpointInfo = {
      inference_id: '.model-123',
      service: 'elasticsearch',
      service_settings: {
        num_allocations: 5,
        num_threads: 10,
        model_id: 'settings-model-123',
      },
      task_type: 'sparse_embedding',
    };

    it('renders the component without model for non-preconfigured endpoints (model shown in Model column)', () => {
      renderComponent(ServiceProviderKeys.elasticsearch, {
        ...mockEndpoint,
        inference_id: 'model-123',
      });

      expect(screen.getByText('Elasticsearch')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-elasticsearch');
      expect(icon).toBeInTheDocument();
      // Model name is now shown in the dedicated Model column, not in Service column
      expect(screen.queryByText('settings-model-123')).not.toBeInTheDocument();
    });

    it('renders the component with description', () => {
      renderComponent(ServiceProviderKeys.elasticsearch, mockEndpoint);

      expect(screen.getByText('Elasticsearch')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-elasticsearch');
      expect(icon).toBeInTheDocument();
      expect(screen.queryByText('settings-model-123')).toBeNull();
      expect(screen.getByText('Runs on ML Nodes (resource-based billing)')).toBeInTheDocument();
    });
  });

  describe('with googleaistudio service', () => {
    const mockEndpoint: InferenceInferenceEndpointInfo = {
      inference_id: 'google-ai-1',
      service: 'googleaistudio',
      service_settings: {
        model_id: 'model-abc',
        rate_limit: {
          requests_per_minute: 500,
        },
      },
      task_type: 'sparse_embedding',
    };

    it('renders the component with service details (model shown in Model column)', () => {
      renderComponent(ServiceProviderKeys.googleaistudio, mockEndpoint);

      expect(screen.getByText('Google AI Studio')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-googleaistudio');
      expect(icon).toBeInTheDocument();
      // Model name is now shown in the dedicated Model column, not in Service column
      expect(screen.queryByText('model-abc')).not.toBeInTheDocument();
    });
  });

  describe('with amazonbedrock service', () => {
    const mockEndpoint: InferenceInferenceEndpointInfo = {
      inference_id: 'amazon-bedrock-1',
      service: 'amazonbedrock',
      service_settings: {
        region: 'us-west-1',
        provider: 'AMAZONTITAN',
        model: 'model-bedrock-xyz',
      },
      task_type: 'sparse_embedding',
    };

    it('renders the component with service details (model shown in Model column)', () => {
      renderComponent(ServiceProviderKeys.amazonbedrock, mockEndpoint);

      expect(screen.getByText('Amazon Bedrock')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-amazonbedrock');
      expect(icon).toBeInTheDocument();
      // Model name is now shown in the dedicated Model column, not in Service column
      expect(screen.queryByText('model-bedrock-xyz')).not.toBeInTheDocument();
    });
  });

  describe('with alibabacloud-ai-search service', () => {
    const mockEndpoint: InferenceInferenceEndpointInfo = {
      inference_id: 'alibabacloud-ai-search-1',
      service: 'alibabacloud-ai-search',
      service_settings: {
        service_id: 'service-123',
        host: 'host-123',
        workspace: 'default-123',
      },
      task_type: 'sparse_embedding',
    };

    it('renders the component with endpoint details', () => {
      renderComponent(ServiceProviderKeys['alibabacloud-ai-search'], mockEndpoint);

      expect(screen.getByText('AlibabaCloud AI Search')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-alibabacloud-ai-search');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('with custom service', () => {
    const mockEndpoint: InferenceInferenceEndpointInfo = {
      inference_id: 'custom-endpoint-1',
      service: 'custom',
      service_settings: {
        api_key: 'test-key',
      },
      task_type: 'text_embedding',
    };

    it('renders the component with custom service name', () => {
      renderComponent('custom' as ServiceProviderKeys, mockEndpoint);

      expect(screen.getByText('custom')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-custom');
      expect(icon).toBeInTheDocument();
    });

    it('renders the component with unknown service name', () => {
      renderComponent('unknown_service' as ServiceProviderKeys, mockEndpoint);

      expect(screen.getByText('unknown_service')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-unknown_service');
      expect(icon).toBeInTheDocument();
    });
  });
});
