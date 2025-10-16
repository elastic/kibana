/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen, render } from '@testing-library/react';
import { TabularPage } from './tabular_page';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: { notifications: { toasts: { addSuccess: jest.fn() } } },
  }),
}));

jest.mock('../../hooks/use_delete_endpoint', () => ({
  useDeleteEndpoint: () => ({
    mutate: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Mock clipboard API (to avoid async write warnings)
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

const elasticDescription = 'Runs on GPUs (token-based billing)';
const elasticsearchDescription = 'Runs on ML Nodes (resource-based billing)';
const preconfiguredLabel = 'PRECONFIGURED';
const techPreviewLabel = 'TECH PREVIEW';

const inferenceEndpoints = [
  {
    inference_id: '.elser-2-elasticsearch',
    task_type: 'sparse_embedding',
    service: 'elasticsearch',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
      model_id: '.elser_model_2',
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
    inference_id: 'custom-endpoint',
    task_type: 'sparse_embedding',
    service: 'elastic',
    service_settings: {
      model_id: 'elser_model_2',
    },
  },
  {
    inference_id: 'third-party-openai',
    task_type: 'text_embedding',
    service: 'openai',
    service_settings: {
      model_id: 'text-embedding-3-large',
    },
  },
] as InferenceAPIConfigResponse[];

describe('TabularPage', () => {
  beforeEach(() => {
    render(<TabularPage inferenceEndpoints={inferenceEndpoints} />);
  });

  it('renders all inference endpoints in the table', () => {
    expect(screen.getByText('.elser-2-elasticsearch')).toBeInTheDocument();
    expect(screen.getByText('.multilingual-embed-v1-elastic')).toBeInTheDocument();
    expect(screen.getByText('custom-endpoint')).toBeInTheDocument();
    expect(screen.getByText('third-party-openai')).toBeInTheDocument();
  });

  it('renders correct service provider labels and descriptions', () => {
    expect(screen.getAllByText('Elastic Inference Service').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(elasticDescription).length).toBeGreaterThan(0);

    expect(screen.getByText('Elasticsearch')).toBeInTheDocument();
    expect(screen.getByText(elasticsearchDescription)).toBeInTheDocument();

    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('text-embedding-3-large')).toBeInTheDocument();
  });

  it('disables delete action for preconfigured endpoints', async () => {
    await act(async () => {
      screen.getAllByTestId('euiCollapsedItemActionsButton')[0].click();
    });
    const deleteAction = screen.getByTestId(/inferenceUIDeleteAction/);
    expect(deleteAction).toBeDisabled();
  });

  it('enables delete action for user-defined endpoints', async () => {
    await act(async () => {
      screen.getAllByTestId('euiCollapsedItemActionsButton')[2].click();
    });
    const deleteAction = screen.getByTestId(/inferenceUIDeleteAction/);
    expect(deleteAction).toBeEnabled();
  });

  it('shows "PRECONFIGURED" badge only for preconfigured endpoints', () => {
    const preconfiguredBadges = screen.getAllByText(preconfiguredLabel);
    expect(preconfiguredBadges).toHaveLength(2);
    expect(screen.getByText('.elser-2-elasticsearch')).toBeInTheDocument();
  });

  it('shows "TECH PREVIEW" badge only for tech preview endpoints', () => {
    const techPreviewBadges = screen.getAllByText(techPreviewLabel);
    expect(techPreviewBadges).toHaveLength(1);
    expect(screen.getByText('.multilingual-embed-v1-elastic')).toBeInTheDocument();
  });
});
