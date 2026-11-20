/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import {
  getOrCreateInvestigationConversation,
  toAutomationMetadata,
} from './investigation_conversation';

describe('toAutomationMetadata', () => {
  it('records the automation with its trimmed instructions', () => {
    expect(
      toAutomationMetadata({ id: 'a1', name: 'Payments alerts', instructions: '  Look at it.\n' })
    ).toEqual({
      automation_id: 'a1',
      automation_name: 'Payments alerts',
      automation_instructions: 'Look at it.',
    });
  });

  it.each([undefined, '', '  \n '])('leaves out instructions that are %p', (instructions) => {
    expect(toAutomationMetadata({ id: 'a1', name: 'Payments alerts', instructions })).toEqual({
      automation_id: 'a1',
      automation_name: 'Payments alerts',
    });
  });

  it('keeps the values within the investigation template limits', () => {
    const metadata = toAutomationMetadata({
      id: 'a'.repeat(600),
      name: 'n'.repeat(600),
      instructions: 'i'.repeat(6000),
    });

    expect(metadata.automation_id).toHaveLength(500);
    expect(metadata.automation_name).toHaveLength(500);
    expect(metadata.automation_instructions).toHaveLength(5000);
  });
});

describe('getOrCreateInvestigationConversation', () => {
  const createConversations = () => {
    const get = jest.fn().mockResolvedValue(new Map());
    const create = jest.fn().mockImplementation(async ({ id, metadata }) => ({
      id,
      title: '',
      metadata,
      template_id: 'investigation',
      permissions: {},
    }));
    return {
      conversations: { bulkGet: get, create } as unknown as ConversationPublicClient,
      create,
    };
  };

  it('records the given metadata in the creating write, next to the severity and the run', async () => {
    const { conversations, create } = createConversations();

    await getOrCreateInvestigationConversation({
      conversations,
      id: 'inv-1',
      workflowExecutionId: 'exec-1',
      metadata: { automation_id: 'a1', automation_name: 'Payments alerts' },
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          automation_id: 'a1',
          automation_name: 'Payments alerts',
          severity: 'medium',
          workflow_execution_ids: ['exec-1'],
        },
      })
    );
  });

  it('does not let the given metadata replace the severity or the run', async () => {
    const { conversations, create } = createConversations();

    await getOrCreateInvestigationConversation({
      conversations,
      id: 'inv-1',
      workflowExecutionId: 'exec-1',
      metadata: { severity: 'critical', workflow_execution_ids: 'other' },
    });

    expect(create.mock.calls[0][0].metadata).toEqual({
      severity: 'medium',
      workflow_execution_ids: ['exec-1'],
    });
  });

  it('writes nothing to a conversation that already exists', async () => {
    const { conversations, create } = createConversations();
    (conversations.bulkGet as jest.Mock).mockResolvedValue(
      new Map([['inv-1', { id: 'inv-1', title: 'T', metadata: {}, template_id: 'investigation' }]])
    );

    const result = await getOrCreateInvestigationConversation({
      conversations,
      id: 'inv-1',
      metadata: { automation_id: 'a1', automation_name: 'Payments alerts' },
    });

    expect(result.created).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });
});
