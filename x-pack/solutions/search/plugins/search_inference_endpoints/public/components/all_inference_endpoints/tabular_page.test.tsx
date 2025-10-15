/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen } from '@testing-library/react';
import { render } from '@testing-library/react';
import { TabularPage } from './tabular_page';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

const inferenceEndpoints = [
  {
    inference_id: 'my-elser-model-05',
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
    inference_id: 'local-model',
    task_type: 'sparse_embedding',
    service: 'elasticsearch',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
      model_id: '.own_model',
    },
    task_settings: {},
  },
  {
    inference_id: 'third-party-model',
    task_type: 'sparse_embedding',
    service: 'openai',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
      model_id: '.own_model',
    },
    task_settings: {},
  },
  {
    inference_id: '.elser-2-elasticsearch',
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
    inference_id: '.multilingual-e5-small-elasticsearch',
    task_type: 'text_embedding',
    service: 'elasticsearch',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
      model_id: '.multilingual-e5-small',
    },
    task_settings: {},
  },
  {
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
  },
  {
    inference_id: '.sparkles',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: {
      model_id: 'rainbow-sprinkles',
    },
  },
  {
    inference_id: '.elser-2-elastic',
    task_type: 'sparse_embedding',
    service: 'elastic',
    service_settings: {
      model_id: 'elser_model_2',
    },
  },
  {
    inference_id: 'custom-inference-id',
    task_type: 'sparse_embedding',
    service: 'elastic',
    service_settings: {
      model_id: 'elser_model_2',
    },
  },
  {
    inference_id: '.multilingual-embed-v1-elastic',
    task_type: 'text_embedding',
    service: 'elastic',
    service_settings: {
      model_id: 'multilingual-embed-v1',
    },
  },
  {
    inference_id: '.rerank-v1-elastic',
    task_type: 'rerank',
    service: 'elastic',
    service_settings: {
      model_id: 'rerank-v1',
    },
  },
] as InferenceAPIConfigResponse[];

const elasticDescription = 'Runs on GPUs (token-based billing)';
const elasticsearchDescription = 'Runs on ML Nodes (resource-based billing)';

jest.mock('../../hooks/use_delete_endpoint', () => ({
  useDeleteEndpoint: () => ({
    mutate: jest.fn().mockImplementation(() => Promise.resolve()), // Mock implementation of the mutate function
  }),
}));

describe('When the tabular page is loaded', () => {
  it('should display all service and model ids or descriptions in the table', () => {
    render(<TabularPage inferenceEndpoints={inferenceEndpoints} />);

    const rows = screen.getAllByRole('row');

    expect(rows[1]).toHaveTextContent('.elser-2-elastic');
    expect(rows[1]).toHaveTextContent('Elastic');
    expect(rows[1]).toHaveTextContent(elasticDescription);
    expect(rows[1]).not.toHaveTextContent('elser_model_2');

    expect(rows[2]).toHaveTextContent('.elser-2-elasticsearch');
    expect(rows[2]).toHaveTextContent('Elasticsearch');
    expect(rows[2]).toHaveTextContent(elasticsearchDescription);
    expect(rows[2]).not.toHaveTextContent('.elser_model_2');

    expect(rows[3]).toHaveTextContent('.multilingual-e5-small-elasticsearch');
    expect(rows[3]).toHaveTextContent('Elasticsearch');
    expect(rows[3]).toHaveTextContent(elasticsearchDescription);

    expect(rows[4]).toHaveTextContent('.multilingual-embed-v1-elastic');
    expect(rows[4]).toHaveTextContent('Elastic');
    expect(rows[4]).toHaveTextContent(elasticDescription);

    expect(rows[5]).toHaveTextContent('.rerank-v1-elastic');
    expect(rows[5]).toHaveTextContent('Elastic');
    expect(rows[5]).toHaveTextContent(elasticDescription);

    expect(rows[6]).toHaveTextContent('.sparkles');
    expect(rows[6]).toHaveTextContent('Elastic');
    expect(rows[6]).toHaveTextContent(elasticDescription);

    expect(rows[7]).toHaveTextContent('custom-inference-id');
    expect(rows[7]).toHaveTextContent('Elastic');

    expect(rows[8]).toHaveTextContent('elastic-rerank');
    expect(rows[8]).toHaveTextContent('Elasticsearch');

    expect(rows[9]).toHaveTextContent('local-model');
    expect(rows[9]).toHaveTextContent('Elasticsearch');

    expect(rows[10]).toHaveTextContent('my-elser-model-05');
    expect(rows[10]).toHaveTextContent('Elasticsearch');

    expect(rows[11]).toHaveTextContent('third-party-model');
    expect(rows[11]).toHaveTextContent('OpenAI');
    expect(rows[11]).toHaveTextContent('.own_model');
  });

  it('should only disable delete action for preconfigured endpoints', () => {
    render(<TabularPage inferenceEndpoints={inferenceEndpoints} />);

    const actionButtons = screen.getAllByTestId('euiCollapsedItemActionsButton');
    act(() => {
      actionButtons[0].click();
    });

    expect(screen.getByTestId('inferenceUIDeleteAction-preconfigured')).toBeDisabled();
  });

  it('should not disable delete action for other endpoints', () => {
    render(<TabularPage inferenceEndpoints={inferenceEndpoints} />);

    const actionButtons = screen.getAllByTestId('euiCollapsedItemActionsButton');
    act(() => {
      actionButtons[6].click();
    });

    expect(screen.getByTestId('inferenceUIDeleteAction-user-defined')).toBeEnabled();
  });

  it('should show preconfigured badge only for preconfigured endpoints', () => {
    render(<TabularPage inferenceEndpoints={inferenceEndpoints} />);

    const preconfiguredBadges = screen.getAllByText('PRECONFIGURED');
    expect(preconfiguredBadges.length).toBe(6);
  });

  it('should show tech preview badge only for reranker-v1 model, rainbow-sprinkles, multilingual-embed-v1, rerank-v1, and preconfigured elser_model_2', () => {
    render(<TabularPage inferenceEndpoints={inferenceEndpoints} />);
    const techPreviewBadges = screen.getAllByText('TECH PREVIEW');
    expect(techPreviewBadges.length).toBe(4);

    const endpointsWithTechPreview = [
      '.multilingual-embed-v1-elastic',
      '.rerank-v1-elastic',
      '.sparkles',
      'elastic-rerank',
    ];

    endpointsWithTechPreview.forEach((id) => {
      expect(screen.getByText(id)).toBeInTheDocument();
    });
  });
});
