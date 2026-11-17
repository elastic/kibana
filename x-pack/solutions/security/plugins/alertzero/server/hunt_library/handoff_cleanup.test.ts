/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  createAttachmentNotFoundError,
  createConversationNotFoundError,
} from '@kbn/agent-builder-common';
import {
  HANDOFF_CLEANUP_MAX_ATTEMPTS,
  HANDOFF_STALE_AFTER_MS,
  isStalePendingHandoff,
  readCleanupAttempts,
  runHandoffCleanup,
} from './handoff_cleanup';
import { deriveManualInvestigationId } from './investigation';

const NOW = new Date('2026-11-04T12:00:00.000Z');
const SESSION = '0b7c1a3e-5d2f-4c8a-9e61-3f4b8a7d2c10';
const PRESERVATION = '11111111-1111-4111-8111-111111111111';
const INVESTIGATION = deriveManualInvestigationId({
  spaceId: 'default',
  definitionId: 'hunt',
  sessionId: SESSION,
});
const longAgo = new Date(NOW.getTime() - HANDOFF_STALE_AFTER_MS - 1000).toISOString();

const labels = (overrides: Record<string, string> = {}): Record<string, string> => ({
  'hunt.kind': 'manual_session',
  'hunt.definition_id': 'hunt',
  'hunt.session_id': SESSION,
  'hunt.outcome': 'handoff_cleanup_required',
  'hunt.preservation_id': PRESERVATION,
  ...overrides,
});

const storedSession = (preservationIds: string[]) => ({
  version: 1,
  definition: { id: 'hunt', version: 1, name: 'Hunt', hypothesis: 'h' },
  trigger: 'manual',
  has_manual_append: false,
  revision: 1,
  preservations: preservationIds.map((id) => ({
    preservation_id: id,
    actor: 'analyst',
    timestamp: '2026-11-04T11:00:00.000Z',
    query: 'FROM x',
    filters: [],
    timeRange: { from: 'now-7d', to: 'now' },
    columns: [],
    dataViewId: '',
    evidenceFingerprints: ['a', 'b'],
    selectedEvidence: [{ a: 1 }, { b: 2 }],
  })),
  resumeSnapshot: {
    query: 'FROM x',
    filters: [],
    timeRange: { from: 'now-7d', to: 'now' },
    columns: [],
    dataViewId: '',
  },
});

type Stored = ReturnType<typeof storedSession> | 'no_attachment' | 'no_conversation' | Error;

const setup = ({
  stored = 'no_conversation',
  conversation = { rounds: [], attachments: [] } as unknown,
  deleteFails = false,
}: { stored?: Stored; conversation?: unknown; deleteFails?: boolean } = {}) => {
  const labelWrites: Array<Record<string, string>> = [];
  const management = {
    updateExecutionLabels: jest.fn(
      async ({ labels: written }: { labels: Record<string, string> }) => {
        labelWrites.push(written);
        return written;
      }
    ),
  };
  const attachments = {
    get: jest.fn(async () => {
      if (stored instanceof Error) throw stored;
      if (stored === 'no_conversation') {
        throw createConversationNotFoundError({ conversationId: INVESTIGATION } as never);
      }
      if (stored === 'no_attachment') {
        throw createAttachmentNotFoundError({ attachmentId: 'hunt-session' });
      }
      return { versions: [{ version: 1, data: stored }], current_version: 1 };
    }),
  };
  const conversations = {
    get: jest.fn(async () => {
      if (conversation === null) {
        throw createConversationNotFoundError({ conversationId: INVESTIGATION } as never);
      }
      return conversation;
    }),
    delete: jest.fn(async () => {
      if (deleteFails) throw new Error('delete failed');
      return true;
    }),
  };
  const logger = loggingSystemMock.createLogger();
  const run = (labelValues: Record<string, string> = labels()) =>
    runHandoffCleanup({
      management: management as never,
      conversations: conversations as never,
      attachments: attachments as never,
      logger,
      spaceId: 'default',
      executionId: 'execution-1',
      labels: labelValues,
      now: () => NOW,
    });
  return { run, labelWrites, conversations, attachments, management, logger };
};

describe('isStalePendingHandoff / readCleanupAttempts', () => {
  it('is stale only for a pending handoff past the window or with no timestamp', () => {
    const pending = (since?: string) => ({
      'hunt.outcome': 'pending_handoff',
      ...(since ? { 'hunt.last_handoff_at': since } : {}),
    });

    expect(isStalePendingHandoff(pending(NOW.toISOString()), NOW)).toBe(false);
    expect(isStalePendingHandoff(pending(longAgo), NOW)).toBe(true);
    expect(isStalePendingHandoff(pending(), NOW)).toBe(true);
    expect(isStalePendingHandoff({ 'hunt.outcome': 'investigation_created' }, NOW)).toBe(false);
    expect(isStalePendingHandoff(undefined, NOW)).toBe(false);
  });

  it('reads the attempt count from the reason code', () => {
    expect(readCleanupAttempts({ 'hunt.reason_code': 'cleanup_attempt_7' })).toBe(7);
    expect(readCleanupAttempts({ 'hunt.reason_code': '-' })).toBe(0);
    expect(readCleanupAttempts(undefined)).toBe(0);
  });
});

describe('runHandoffCleanup', () => {
  it('does nothing for a finished, fresh or unidentifiable session', async () => {
    const { run, labelWrites, attachments } = setup();

    for (const value of [
      labels({ 'hunt.outcome': 'investigation_created' }),
      labels({ 'hunt.outcome': 'pending_handoff', 'hunt.last_handoff_at': NOW.toISOString() }),
      labels({ 'hunt.session_id': '' }),
    ]) {
      await expect(run(value)).resolves.toBe('nothing_to_do');
    }
    expect(labelWrites).toEqual([]);
    expect(attachments.get).not.toHaveBeenCalled();
  });

  it('repairs the labels from the attachment when the pending preservation is durable', async () => {
    const { run, labelWrites } = setup({ stored: storedSession([PRESERVATION]) });

    await expect(run()).resolves.toBe('repaired');

    expect(labelWrites).toEqual([
      {
        'hunt.outcome': 'investigation_created',
        'hunt.investigation_id': INVESTIGATION,
        'hunt.evidence_count': '2',
        'hunt.last_preserved_at': '2026-11-04T11:00:00.000Z',
        'hunt.reason_code': '-',
      },
    ]);
  });

  it('uses the Investigation the labels name, not a derived one', async () => {
    const { run, attachments } = setup({ stored: storedSession([PRESERVATION]) });

    await run(labels({ 'hunt.investigation_id': 'linked-investigation' }));

    expect(attachments.get).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'linked-investigation' })
    );
  });

  it('repairs a stale pending handoff whose attachment is durable', async () => {
    const { run } = setup({ stored: storedSession([PRESERVATION]) });

    await expect(
      run(labels({ 'hunt.outcome': 'pending_handoff', 'hunt.last_handoff_at': longAgo }))
    ).resolves.toBe('repaired');
  });

  it('deletes the empty Investigation a failed handoff left, and records handoff_failed', async () => {
    const { run, labelWrites, conversations } = setup({ stored: 'no_attachment' });

    await expect(run()).resolves.toBe('finalized_failed');

    expect(conversations.delete).toHaveBeenCalledWith(INVESTIGATION);
    expect(labelWrites).toEqual([{ 'hunt.outcome': 'handoff_failed', 'hunt.reason_code': '-' }]);
  });

  it('records handoff_failed without deleting when the Investigation is already gone', async () => {
    const { run, labelWrites, conversations } = setup({
      stored: 'no_conversation',
      conversation: null,
    });

    await expect(run()).resolves.toBe('finalized_failed');

    expect(conversations.delete).not.toHaveBeenCalled();
    expect(labelWrites[0]).toMatchObject({ 'hunt.outcome': 'handoff_failed' });
  });

  it('never deletes an Investigation that has rounds or attachments', async () => {
    const { run, conversations } = setup({
      stored: 'no_attachment',
      conversation: { rounds: [{}], attachments: [] },
    });

    await expect(run()).resolves.toBe('finalized_failed');
    expect(conversations.delete).not.toHaveBeenCalled();
  });

  it('does not treat an attachment recording a different preservation as this one', async () => {
    const { run, labelWrites } = setup({ stored: storedSession(['someone-else']) });

    await expect(run()).resolves.toBe('finalized_failed');
    expect(labelWrites[0]).toMatchObject({ 'hunt.outcome': 'handoff_failed' });
  });

  it('counts a failed attempt and stays flagged for cleanup', async () => {
    const { run, labelWrites } = setup({ stored: 'no_attachment', deleteFails: true });

    await expect(run(labels({ 'hunt.reason_code': 'cleanup_attempt_2' }))).resolves.toBe(
      'retry_later'
    );

    expect(labelWrites).toEqual([
      {
        'hunt.outcome': 'handoff_cleanup_required',
        'hunt.investigation_id': INVESTIGATION,
        'hunt.cleanup_operation_id': PRESERVATION,
        'hunt.reason_code': 'cleanup_attempt_3',
      },
    ]);
  });

  it('counts a failed read as an attempt too', async () => {
    const { run, labelWrites } = setup({ stored: new Error('forbidden') });

    await expect(run()).resolves.toBe('retry_later');
    expect(labelWrites[0]).toMatchObject({ 'hunt.reason_code': 'cleanup_attempt_1' });
  });

  it(`marks the session exhausted on attempt ${HANDOFF_CLEANUP_MAX_ATTEMPTS}`, async () => {
    const { run, labelWrites } = setup({ stored: 'no_attachment', deleteFails: true });

    await expect(
      run(labels({ 'hunt.reason_code': `cleanup_attempt_${HANDOFF_CLEANUP_MAX_ATTEMPTS - 1}` }))
    ).resolves.toBe('exhausted');

    expect(labelWrites[0]).toMatchObject({
      'hunt.outcome': 'handoff_cleanup_exhausted',
      'hunt.reason_code': `cleanup_attempt_${HANDOFF_CLEANUP_MAX_ATTEMPTS}`,
    });
  });

  it('still reports the attempt when recording it also fails', async () => {
    const { run, management, logger } = setup({ stored: 'no_attachment', deleteFails: true });
    management.updateExecutionLabels.mockRejectedValue(new Error('label write failed'));

    await expect(run()).resolves.toBe('retry_later');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Could not record'));
  });
});
