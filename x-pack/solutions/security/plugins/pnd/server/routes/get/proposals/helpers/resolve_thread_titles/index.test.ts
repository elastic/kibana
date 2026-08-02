/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationWithoutRounds } from '@kbn/agent-builder-common';
import type { PndProposalRow } from '@kbn/pnd-common';

import { PND_THREAD_TITLE_MAX_LENGTH, resolveThreadTitles } from '.';

const row = (overrides: Partial<PndProposalRow> = {}): PndProposalRow =>
  ({
    alwaysGate: false,
    correlationId: 'ad-1',
    createdAt: '2026-08-02T00:00:00.000Z',
    gateId: 'open_investigation',
    inputSchema: {},
    message: '',
    reasoning: '',
    recommendedAction: 'investigate',
    reversible: true,
    sourceId: 'wf:run:step',
    stepExecutionId: 'step',
    stepId: 'await_open_investigation',
    threadConversationId: 'thread-1',
    title: 'Open an investigation?',
    workflowId: 'wf',
    workflowRunId: 'run',
    ...overrides,
  } as PndProposalRow);

/**
 * An agent-written title, because that is the only kind a thread has: Agent Builder titles it from
 * the seed message and PND is forbidden to rename it (D9). A fixture with a `[Thread] …` prefix
 * would imply a convention PND does not have.
 */
const conversation = (
  overrides: Partial<ConversationWithoutRounds> = {}
): ConversationWithoutRounds =>
  ({
    created_at: '2026-08-02T00:00:00.000Z',
    id: 'thread-1',
    title: 'Is credential access on host-1 worth investigating?',
    updated_at: '2026-08-02T00:00:00.000Z',
    ...overrides,
  } as ConversationWithoutRounds);

describe('resolveThreadTitles', () => {
  it("resolves the thread conversation's title onto the row (D9)", () => {
    const [resolved] = resolveThreadTitles({
      conversations: [conversation()],
      rows: [row()],
    });

    expect(resolved.threadTitle).toEqual('Is credential access on host-1 worth investigating?');
  });

  it('leaves the rest of the row untouched', () => {
    const [resolved] = resolveThreadTitles({
      conversations: [conversation()],
      rows: [row()],
    });

    expect(resolved).toEqual({
      ...row(),
      threadTitle: 'Is credential access on host-1 worth investigating?',
    });
  });

  it('omits threadTitle when the thread conversation has not materialised', () => {
    const [resolved] = resolveThreadTitles({
      conversations: [],
      rows: [row()],
    });

    expect(resolved).not.toHaveProperty('threadTitle');
  });

  it('omits threadTitle for an uncorrelated row, which carries no thread id', () => {
    const [resolved] = resolveThreadTitles({
      conversations: [conversation()],
      rows: [row({ threadConversationId: undefined })],
    });

    expect(resolved).not.toHaveProperty('threadTitle');
  });

  it('omits threadTitle rather than surfacing a blank title', () => {
    const [resolved] = resolveThreadTitles({
      conversations: [conversation({ title: '' })],
      rows: [row()],
    });

    expect(resolved).not.toHaveProperty('threadTitle');
  });

  it('omits threadTitle rather than surfacing a whitespace-only title', () => {
    const [resolved] = resolveThreadTitles({
      conversations: [conversation({ title: '   ' })],
      rows: [row()],
    });

    expect(resolved).not.toHaveProperty('threadTitle');
  });

  it('ignores a conversation that is not paired with any row', () => {
    const [resolved] = resolveThreadTitles({
      conversations: [conversation({ id: 'some-other-conversation', title: 'Unrelated' })],
      rows: [row()],
    });

    expect(resolved).not.toHaveProperty('threadTitle');
  });

  it('truncates a title longer than the contract bound rather than failing the response', () => {
    const [resolved] = resolveThreadTitles({
      conversations: [conversation({ title: 'a'.repeat(PND_THREAD_TITLE_MAX_LENGTH + 1) })],
      rows: [row()],
    });

    expect(resolved.threadTitle).toHaveLength(PND_THREAD_TITLE_MAX_LENGTH);
  });

  it('keeps a title that is exactly the contract bound intact', () => {
    const title = 'a'.repeat(PND_THREAD_TITLE_MAX_LENGTH);

    const [resolved] = resolveThreadTitles({
      conversations: [conversation({ title })],
      rows: [row()],
    });

    expect(resolved.threadTitle).toEqual(title);
  });

  it('resolves every row from a single pass over the conversations', () => {
    const resolved = resolveThreadTitles({
      conversations: [
        conversation({ id: 'thread-1', title: 'First thread' }),
        conversation({ id: 'thread-2', title: 'Second thread' }),
      ],
      rows: [row(), row({ threadConversationId: 'thread-2' })],
    });

    expect(resolved.map(({ threadTitle }) => threadTitle)).toEqual([
      'First thread',
      'Second thread',
    ]);
  });

  it('returns the rows in their original order', () => {
    const resolved = resolveThreadTitles({
      conversations: [conversation()],
      rows: [row({ stepExecutionId: 'step-1' }), row({ stepExecutionId: 'step-2' })],
    });

    expect(resolved.map(({ stepExecutionId }) => stepExecutionId)).toEqual(['step-1', 'step-2']);
  });

  it('returns an empty array when there are no rows', () => {
    expect(resolveThreadTitles({ conversations: [conversation()], rows: [] })).toEqual([]);
  });
});
