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

    expect(rows[3]).toHaveTextContent('.sparkles');
    expect(rows[3]).toHaveTextContent('Elastic');
    expect(rows[3]).toHaveTextContent(elasticDescription);

    expect(rows[4]).toHaveTextContent('elastic-rerank');
    expect(rows[4]).toHaveTextContent('Elasticsearch');

    expect(rows[5]).toHaveTextContent('my-elser-model-05');
    expect(rows[5]).toHaveTextContent('Elasticsearch');
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
      actionButtons[4].click();
    });

    expect(screen.getByTestId('inferenceUIDeleteAction-user-defined')).toBeEnabled();
  });

  it('should show preconfigured badge only for preconfigured endpoints', () => {
    render(<TabularPage inferenceEndpoints={inferenceEndpoints} />);

    const preconfiguredBadges = screen.getAllByText('PRECONFIGURED');
    expect(preconfiguredBadges.length).toBe(3);
  });

  it('should show tech preview badge only for reranker-v1 model, rainbow-sprinkles, multilingual-embed-v1, rerank-v1, and preconfigured elser_model_2', () => {
    render(<TabularPage inferenceEndpoints={inferenceEndpoints} />);
    const techPreviewBadges = screen.getAllByText('TECH PREVIEW');
    expect(techPreviewBadges.length).toBe(2);

    const endpointsWithTechPreview = ['.sparkles', 'elastic-rerank'];

    endpointsWithTechPreview.forEach((id) => {
      expect(screen.getByText(id)).toBeInTheDocument();
    });
  });
});
