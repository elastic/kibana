/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';

import React from 'react';
import { act, render, screen, within, fireEvent } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
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

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const actual = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...actual,
    useKibana: jest.fn(() => ({
      services: {
        cloud: {
          isCloudEnabled: false,
        },
        application: {
          capabilities: {
            cloudConnect: {
              show: true,
              configure: true,
            },
          },
          navigateToApp: jest.fn(),
        },
        uiSettings: {
          get: jest.fn().mockReturnValue(true),
        },
      },
    })),
  };
});

const renderTabularPageWithProviders = () => {
  return render(
    <EuiThemeProvider>
      <I18nProvider>
        <TabularPage inferenceEndpoints={inferenceEndpoints} />
      </I18nProvider>
    </EuiThemeProvider>
  );
};

describe('When the tabular page is loaded', () => {
  describe('group by none', () => {
    beforeAll(() => {
      window.history.pushState({}, '', '?groupBy=none');
    });
    beforeEach(() => {
      renderTabularPageWithProviders();
    });
    afterAll(() => {
      window.history.pushState({}, '', '/');
    });

    it('should display all inference ids in the table', () => {
      const table = screen.getByTestId('inferenceEndpointTable');
      const rows = within(table).getAllByRole('row');
      expect(rows[1]).toHaveTextContent('.elser-2-elastic');
      expect(rows[2]).toHaveTextContent('.elser-2-elasticsearch');
      expect(rows[3]).toHaveTextContent('.multilingual-e5-small-elasticsearch');
      expect(rows[4]).toHaveTextContent('.multilingual-embed-v1-elastic');
      expect(rows[5]).toHaveTextContent('.rerank-v1-elastic');
      expect(rows[6]).toHaveTextContent('.sparkles');
      expect(rows[7]).toHaveTextContent('custom-inference-id');
      expect(rows[8]).toHaveTextContent('elastic-rerank');
      expect(rows[9]).toHaveTextContent('local-model');
      expect(rows[10]).toHaveTextContent('my-elser-model-05');
      expect(rows[11]).toHaveTextContent('third-party-model');
    });

    it('should display all service providers and model ids in the table', () => {
      const table = screen.getByTestId('inferenceEndpointTable');
      const rows = within(table).getAllByRole('row');
      // Row 1: .elser-2-elastic
      expect(rows[1]).toHaveTextContent('Elastic');
      expect(rows[1]).toHaveTextContent(elasticDescription);
      expect(rows[1]).toHaveTextContent('elser_model_2');

      // Row 2: .elser-2-elasticsearch
      expect(rows[2]).toHaveTextContent('Elasticsearch');
      expect(rows[2]).toHaveTextContent(elasticsearchDescription);
      expect(rows[2]).toHaveTextContent('.elser_model_2');

      // Row 3: .multilingual-e5-small-elasticsearch
      expect(rows[3]).toHaveTextContent('Elasticsearch');
      expect(rows[3]).toHaveTextContent(elasticsearchDescription);
      expect(rows[3]).toHaveTextContent('.multilingual-e5-small');

      // Row 4: .multilingual-embed-v1-elastic
      expect(rows[4]).toHaveTextContent('Elastic');
      expect(rows[4]).toHaveTextContent(elasticDescription);
      expect(rows[4]).toHaveTextContent('multilingual-embed-v1');

      // Row 5: .rerank-v1-elastic
      expect(rows[5]).toHaveTextContent('Elastic');
      expect(rows[5]).toHaveTextContent(elasticDescription);
      expect(rows[5]).toHaveTextContent('rerank-v1');

      // Row 6: .sparkles
      expect(rows[6]).toHaveTextContent('Elastic');
      expect(rows[6]).toHaveTextContent(elasticDescription);
      expect(rows[6]).toHaveTextContent('rainbow-sprinkles');

      // Row 7: custom-inference-id
      expect(rows[7]).toHaveTextContent('Elastic');
      expect(rows[7]).toHaveTextContent('elser_model_2');

      // Row 8: elastic-rerank
      expect(rows[8]).toHaveTextContent('Elasticsearch');
      expect(rows[8]).toHaveTextContent('.rerank-v1');

      // Row 9: local-model
      expect(rows[9]).toHaveTextContent('Elasticsearch');
      expect(rows[9]).toHaveTextContent('.own_model');

      // Row 10: my-elser-model-05
      expect(rows[10]).toHaveTextContent('Elasticsearch');
      expect(rows[10]).toHaveTextContent('.elser_model_2');

      // Row 11: third-party-model
      expect(rows[11]).toHaveTextContent('OpenAI');
      expect(rows[11]).toHaveTextContent('.own_model');
    });

    it('should only disable delete action for preconfigured endpoints', () => {
      const table = screen.getByTestId('inferenceEndpointTable');
      const preconfiguredRow = within(table).getByText('.elser-2-elastic').closest('tr');

      expect(preconfiguredRow).not.toBeNull();

      act(() => {
        within(preconfiguredRow!).getByTestId('euiCollapsedItemActionsButton').click();
      });

      const deleteAction = screen.getByTestId(/inferenceUIDeleteAction/);

      expect(deleteAction).toBeDisabled();
    });

    it('should not disable delete action for other endpoints', () => {
      const table = screen.getByTestId('inferenceEndpointTable');
      const userDefinedRow = within(table).getByText('custom-inference-id').closest('tr');

      expect(userDefinedRow).not.toBeNull();

      act(() => {
        within(userDefinedRow!).getByTestId('euiCollapsedItemActionsButton').click();
      });

      const deleteAction = screen.getByTestId(/inferenceUIDeleteAction/);

      expect(deleteAction).toBeEnabled();
    });

    it('should show preconfigured badge only for preconfigured endpoints', () => {
      const preconfigured = 'PRECONFIGURED';

      const table = screen.getByTestId('inferenceEndpointTable');
      const rows = within(table).getAllByRole('row');
      expect(rows[1]).toHaveTextContent(preconfigured);
      expect(rows[2]).toHaveTextContent(preconfigured);
      expect(rows[3]).toHaveTextContent(preconfigured);
      expect(rows[4]).toHaveTextContent(preconfigured);
      expect(rows[5]).toHaveTextContent(preconfigured);
      expect(rows[6]).toHaveTextContent(preconfigured);
      expect(rows[7]).not.toHaveTextContent(preconfigured);
      expect(rows[8]).not.toHaveTextContent(preconfigured);
      expect(rows[9]).not.toHaveTextContent(preconfigured);
      expect(rows[10]).not.toHaveTextContent(preconfigured);
      expect(rows[11]).not.toHaveTextContent(preconfigured);
    });

    it('should show tech preview badge only for reranker-v1 model, multilingual-embed-v1, rerank-v1, and preconfigured elser_model_2', () => {
      const techPreview = 'TECH PREVIEW';

      const table = screen.getByTestId('inferenceEndpointTable');
      const rows = within(table).getAllByRole('row');
      expect(rows[1]).not.toHaveTextContent(techPreview);
      expect(rows[2]).not.toHaveTextContent(techPreview);
      expect(rows[3]).not.toHaveTextContent(techPreview);
      expect(rows[4]).toHaveTextContent(techPreview);
      expect(rows[5]).toHaveTextContent(techPreview);
      expect(rows[6]).not.toHaveTextContent(techPreview);
      expect(rows[7]).not.toHaveTextContent(techPreview);
      expect(rows[8]).toHaveTextContent(techPreview);
      expect(rows[9]).not.toHaveTextContent(techPreview);
      expect(rows[10]).not.toHaveTextContent(techPreview);
      expect(rows[11]).not.toHaveTextContent(techPreview);
    });
  });
  describe('group by models', () => {
    beforeEach(() => {
      renderTabularPageWithProviders();
    });

    it('should display accordions with tables for model groups', () => {
      const groupAccordions = screen.getAllByTestId(/-accordion$/);
      expect(groupAccordions).toHaveLength(5);
      const groupTables = screen.getAllByTestId(/-table$/);
      expect(groupTables).toHaveLength(5);
    });

    it('should have expected endpoint table columns', () => {
      const endpointTables = screen.getAllByTestId(/-table$/);

      endpointTables.forEach((table) => {
        const columnHeaders = within(table).getAllByRole('columnheader');
        const headerLabels = columnHeaders.map((header) => header.textContent?.trim() ?? '');

        expect(headerLabels).toEqual(['Endpoint', 'Model', 'Service', '']);
      });
    });

    it('should show expected group labels and endpoint counts', () => {
      const expectedGroups = [
        {
          groupId: 'elastic',
          label: 'Elastic',
          countLabel: '6 endpoints',
        },
        {
          groupId: '.own_model',
          label: '.own_model',
          countLabel: '2 endpoints',
        },
        {
          groupId: 'multilingual-e5',
          label: 'Multilingual E5',
          countLabel: '1 endpoint',
        },
        {
          groupId: 'multilingual-embed-v1',
          label: 'multilingual-embed-v1',
          countLabel: '1 endpoint',
        },
        {
          groupId: 'rerank-v1',
          label: 'rerank-v1',
          countLabel: '1 endpoint',
        },
      ];

      expectedGroups.forEach(({ groupId, label, countLabel }) => {
        const accordionHeader = screen.getByTestId(`${groupId}-accordion-header`);
        expect(within(accordionHeader).getByText(label)).toBeInTheDocument();
        expect(within(accordionHeader).getByText(countLabel)).toBeInTheDocument();
      });
    });

    it('should show empty prompt when search removes all groups', async () => {
      fireEvent.change(screen.getByTestId('search-field-endpoints'), {
        target: { value: 'no-matching-endpoint' },
      });

      expect(await screen.findByText('No items found')).toBeInTheDocument();
    });

    it('should disable delete action for preconfigured endpoints in grouped tables', () => {
      const elserTable = screen.getByTestId('elastic-table');

      const preconfiguredRow = within(elserTable).getByText('.elser-2-elastic').closest('tr');

      expect(preconfiguredRow).not.toBeNull();

      act(() => {
        within(preconfiguredRow as HTMLElement)
          .getByTestId('euiCollapsedItemActionsButton')
          .click();
      });

      const deleteAction = screen.getByTestId(/inferenceUIDeleteAction/);

      expect(deleteAction).toBeDisabled();
    });

    it('should enable delete action for user-defined endpoints in grouped tables', () => {
      const elserTable = screen.getByTestId('elastic-table');

      const userDefinedRow = within(elserTable).getByText('custom-inference-id').closest('tr');

      expect(userDefinedRow).not.toBeNull();

      act(() => {
        within(userDefinedRow as HTMLElement)
          .getByTestId('euiCollapsedItemActionsButton')
          .click();
      });

      const deleteAction = screen.getByTestId(/inferenceUIDeleteAction/);

      expect(deleteAction).toBeEnabled();
    });
  });

  it('should show the correct task type badge for each endpoint', () => {
    renderTabularPageWithProviders();

    const expectedTaskTypes: Record<string, string> = {
      '.elser-2-elastic': 'sparse_embedding',
      '.elser-2-elasticsearch': 'sparse_embedding',
      '.multilingual-e5-small-elasticsearch': 'text_embedding',
      '.multilingual-embed-v1-elastic': 'text_embedding',
      '.rerank-v1-elastic': 'rerank',
      '.sparkles': 'chat_completion',
      'custom-inference-id': 'sparse_embedding',
      'elastic-rerank': 'rerank',
      'local-model': 'sparse_embedding',
      'my-elser-model-05': 'sparse_embedding',
      'third-party-model': 'sparse_embedding',
    };

    const endpointCells = screen.getAllByTestId('endpointCell');
    expect(endpointCells).toHaveLength(Object.keys(expectedTaskTypes).length);

    for (const [endpointId, taskType] of Object.entries(expectedTaskTypes)) {
      const cell = endpointCells.find((c) => c.textContent?.includes(endpointId));
      expect(cell).toBeDefined();
      expect(within(cell!).getByTestId(`table-column-task-type-${taskType}`)).toBeInTheDocument();
    }
  });

  it('should display endpoint stats with correct counts', () => {
    renderTabularPageWithProviders();

    const stats = screen.getByTestId('endpointStats');
    expect(stats).toBeInTheDocument();

    // 3 unique services: elasticsearch, openai, elastic
    expect(screen.getByTestId('endpointStatsServicesCount')).toHaveTextContent('3');

    // 8 unique models
    expect(screen.getByTestId('endpointStatsModelsCount')).toHaveTextContent('8');

    // 4 unique types: sparse_embedding, text_embedding, rerank, chat_completion
    expect(screen.getByTestId('endpointStatsTypesCount')).toHaveTextContent('4');

    // 11 endpoints total
    expect(screen.getByTestId('endpointStatsEndpointsCount')).toHaveTextContent('11');
  });
});
