/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { LearningStore } from '../../decision_trees/learning_store';
import {
  createRecordRemediationTool,
  createRecordSystemLearningTool,
  createRecordToolLearningTool,
} from './learning_tools';

const createStore = (): jest.Mocked<LearningStore> =>
  ({
    record: jest.fn(async (input) => ({ ...input, connector_name: undefined, updated_at: 'now' })),
    list: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<LearningStore>);

const context = { esClient: { asCurrentUser: {} } } as never;

describe('learning tools', () => {
  it('records a system learning under its category', async () => {
    const store = createStore();
    const tool = createRecordSystemLearningTool({
      getStore: () => store,
      logger: loggerMock.create(),
    });
    const result = await tool.handler(
      {
        tree_id: 'symptom:checkout-high-latency',
        category: 'architecture',
        content: 'Checkout writes through a shared connection pool.',
      },
      context
    );
    expect(store.record).toHaveBeenCalledWith({
      kind: 'system',
      treeId: 'symptom:checkout-high-latency',
      category: 'architecture',
      content: 'Checkout writes through a shared connection pool.',
    });
    expect('results' in result && result.results[0].type).toBe(ToolResultType.other);
  });

  it('records a tool learning against its connector', async () => {
    const store = createStore();
    const tool = createRecordToolLearningTool({
      getStore: () => store,
      logger: loggerMock.create(),
      connectorNames: ['elasticsearch', 'github'],
    });
    await tool.handler(
      {
        tree_id: 'symptom:checkout-high-latency',
        connector_name: 'elasticsearch',
        category: 'query_pattern',
        content: 'Filter by data_stream.dataset before aggregating.',
      },
      context
    );
    expect(store.record).toHaveBeenCalledWith({
      kind: 'tool',
      treeId: 'symptom:checkout-high-latency',
      category: 'query_pattern',
      connectorName: 'elasticsearch',
      content: 'Filter by data_stream.dataset before aggregating.',
    });
  });

  it('constrains connector_name to the configured connectors', () => {
    const deps = { getStore: () => createStore(), logger: loggerMock.create() };
    expect(
      createRecordToolLearningTool({ ...deps, connectorNames: ['elasticsearch'] }).schema.shape
        .connector_name.def.type
    ).toBe('enum');
    // With no configured connectors an enum would have no members, so the schema stays open.
    expect(
      createRecordToolLearningTool({ ...deps, connectorNames: [] }).schema.shape.connector_name.def
        .type
    ).toBe('string');
  });

  it('reports a rejected learning back to the agent instead of throwing', async () => {
    const store = createStore();
    store.record.mockRejectedValue(new Error('Learning must be 1-4 lines'));
    const tool = createRecordRemediationTool({
      getStore: () => store,
      logger: loggerMock.create(),
    });
    const result = await tool.handler(
      { tree_id: 'symptom:checkout-high-latency', content: 'a\nb\nc\nd\ne' },
      context
    );
    expect('results' in result && result.results[0]).toEqual({
      type: ToolResultType.error,
      data: { message: 'Learning must be 1-4 lines' },
    });
  });
});
