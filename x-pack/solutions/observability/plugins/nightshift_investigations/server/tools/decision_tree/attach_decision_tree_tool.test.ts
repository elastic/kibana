/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolHandlerContext, ToolHandlerStandardReturn } from '@kbn/agent-builder-server';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { DECISION_TREE_ATTACHMENT_TYPE } from '../../../common/decision_trees';
import type { DecisionTreeDetail, DecisionTreeStore } from '../../decision_trees/store';
import { decisionTreeAttachmentType } from '../../attachments/decision_tree_attachment_type';
import {
  ATTACH_DECISION_TREE_TOOL_ID,
  createAttachDecisionTreeTool,
  decisionTreeAttachmentId,
  REMOVED_DECISION_TREE_NOTE,
  toTreeId,
} from './attach_decision_tree_tool';

const tree: DecisionTreeDetail = {
  tree_id: 'symptom:checkout-latency',
  symptom: 'checkout-latency',
  title: 'Checkout Latency',
  status: 'established',
  version: 3,
  node_count: 4,
  edge_count: 3,
  learning_count: 0,
  updated_at: '2026-07-28T14:00:00.000Z',
  markdown: '# Checkout Latency\n\n```mermaid\nflowchart TD\n  S1([Slow]) --> X1((Done))\n```',
  mermaid: '```mermaid\nflowchart TD\n  S1([Slow]) --> X1((Done))\n```',
  evidence_gatherer_metadata: [],
  learnings: [],
};

const setup = (stored: DecisionTreeDetail | null = tree) => {
  const get = jest.fn().mockResolvedValue(stored ?? undefined);
  const tool = createAttachDecisionTreeTool({
    getStore: () => ({ get } as unknown as DecisionTreeStore),
    logger: loggerMock.create(),
  });
  const attachments = createAttachmentStateManager([], {
    getTypeDefinition: (type) =>
      type === DECISION_TREE_ATTACHMENT_TYPE
        ? (decisionTreeAttachmentType as unknown as ReturnType<
            Parameters<typeof createAttachmentStateManager>[1]['getTypeDefinition']
          >)
        : undefined,
  });
  const context = {
    request: httpServerMock.createKibanaRequest(),
    esClient: { asCurrentUser: {} },
    attachments,
  } as unknown as ToolHandlerContext;
  const call = async (input: string) => {
    const { results } = (await tool.handler({ tree: input }, context)) as ToolHandlerStandardReturn;
    return results[0];
  };
  return { tool, get, attachments, call };
};

describe('nightshift_attach_decision_tree', () => {
  it('is the allow-listed builtin tool id', () => {
    expect(setup().tool.id).toBe(ATTACH_DECISION_TREE_TOOL_ID);
  });

  it.each([
    ['/workspace/decision-trees/decision_tree_checkout-latency.md'],
    ['checkout-latency'],
    ['symptom:checkout-latency'],
  ])('reads the tree for %s', (input) => {
    expect(toTreeId(input)).toBe('symptom:checkout-latency');
  });

  it('attaches the raw tree of the version it read, visible in the chat', async () => {
    const { attachments, call, get } = setup();

    const result = await call('/workspace/decision-trees/decision_tree_checkout-latency.md');

    expect(get).toHaveBeenCalledWith('symptom:checkout-latency');
    const id = decisionTreeAttachmentId(tree.tree_id);
    expect(result.data).toMatchObject({ acknowledged: true, attachment_id: id, version: 3 });
    const record = attachments.getAttachmentRecord(id);
    expect(record).toMatchObject({ type: DECISION_TREE_ATTACHMENT_TYPE, active: true });
    expect(record?.hidden).toBeFalsy();
    expect(attachments.get(id)?.data.data).toEqual({
      tree_id: 'symptom:checkout-latency',
      symptom: 'checkout-latency',
      title: 'Checkout Latency',
      version: 3,
      markdown: tree.markdown,
    });
  });

  it('updates the attachment when the same tree is attached again', async () => {
    const { attachments, call } = setup();
    await call('checkout-latency');

    await call('checkout-latency');

    expect(attachments.getActive()).toHaveLength(1);
  });

  it('does not re-add a tree the user removed', async () => {
    const { attachments, call } = setup();
    await call('checkout-latency');
    attachments.delete(decisionTreeAttachmentId(tree.tree_id));

    const result = await call('checkout-latency');

    expect(result.data).toMatchObject({ warning: REMOVED_DECISION_TREE_NOTE });
    expect(attachments.getActive()).toHaveLength(0);
  });

  it('fails for a tree that is not stored', async () => {
    const { attachments, call } = setup(null);

    const result = await call('checkout-latency');

    expect(result.type).toBe(ToolResultType.error);
    expect(attachments.getAll()).toHaveLength(0);
  });
});
