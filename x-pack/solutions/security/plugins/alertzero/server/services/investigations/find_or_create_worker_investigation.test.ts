/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createConversationAlreadyExistsError } from '@kbn/agent-builder-common';
import type { MetadataFieldValue } from '@kbn/agent-builder-common';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  TEMPLATE_ID_INVESTIGATION,
} from '@kbn/alertzero-common';
import { buildWorkerInvestigationConversationId } from './worker_investigation_id';
import { runFindOrCreateWorkerInvestigation } from './find_or_create_worker_investigation';
import type { FindOrCreateWorkerInvestigationConversationClient } from './find_or_create_worker_investigation';

const spaceId = 'default';
const workerId = SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID;
const subjectId = 'ki-cov-s2-1-expiry-t1564-013';
const conversationId = buildWorkerInvestigationConversationId({ spaceId, workerId, subjectId });

const input = {
  spaceId,
  workerId,
  subjectId,
  title: 'Detection coverage: T1564.013 Hidden windows',
  description: 'Processes launched with hidden windows.',
  workflowExecutionId: 'run-2',
};

const buildClient = (
  overrides: Partial<FindOrCreateWorkerInvestigationConversationClient> = {}
): FindOrCreateWorkerInvestigationConversationClient => ({
  create: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue({ id: conversationId }),
  // Agent Builder reports the fields the write changed.
  patchMetadata: jest.fn().mockResolvedValue({ changedFields: ['status'] }),
  ...overrides,
});

/** A 409 from `create` plus whatever metadata the existing conversation carries. */
const buildRerunClient = (
  metadata: Record<string, MetadataFieldValue> | undefined,
  overrides: Partial<FindOrCreateWorkerInvestigationConversationClient> = {}
): FindOrCreateWorkerInvestigationConversationClient =>
  buildClient({
    create: jest.fn().mockRejectedValue(createConversationAlreadyExistsError({ conversationId })),
    get: jest.fn().mockResolvedValue({ id: conversationId, metadata }),
    ...overrides,
  });

describe('buildWorkerInvestigationConversationId', () => {
  it('is deterministic for the same space, Worker and subject', () => {
    expect(buildWorkerInvestigationConversationId({ spaceId, workerId, subjectId })).toBe(
      conversationId
    );
  });

  it.each([
    ['space', { spaceId: 'other', workerId, subjectId }],
    ['Worker', { spaceId, workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID, subjectId }],
    ['subject', { spaceId, workerId, subjectId: 'ki-other' }],
  ])('differs by %s', (_label, subject) => {
    expect(buildWorkerInvestigationConversationId(subject)).not.toBe(conversationId);
  });
});

describe('runFindOrCreateWorkerInvestigation', () => {
  it('creates a new open Investigation and returns its deterministic id', async () => {
    const conversationClient = buildClient();

    const output = await runFindOrCreateWorkerInvestigation(input, { conversationClient });

    expect(output).toEqual({
      investigationConversationId: conversationId,
      created: true,
      reopened: false,
    });
    expect(conversationClient.create).toHaveBeenCalledWith({
      id: conversationId,
      agentId: expect.any(String),
      title: input.title,
      templateId: TEMPLATE_ID_INVESTIGATION,
      accessControl: { access_mode: 'public', entries: [] },
      metadata: {
        status: 'open',
        description: input.description,
        workflow_execution_ids: ['run-2'],
      },
    });
    expect(conversationClient.get).not.toHaveBeenCalled();
    expect(conversationClient.patchMetadata).not.toHaveBeenCalled();
  });

  it('leaves optional metadata out rather than writing empty values', async () => {
    const conversationClient = buildClient();

    await runFindOrCreateWorkerInvestigation(
      { spaceId, workerId, subjectId, title: 'Rule tuning: Suspicious cron' },
      { conversationClient }
    );

    expect(conversationClient.create).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { status: 'open' } })
    );
  });

  it('rethrows an unrelated create failure without verifying', async () => {
    const conversationClient = buildClient({
      create: jest.fn().mockRejectedValue(new Error('boom')),
    });

    await expect(runFindOrCreateWorkerInvestigation(input, { conversationClient })).rejects.toThrow(
      'boom'
    );
    expect(conversationClient.get).not.toHaveBeenCalled();
  });

  // The bug this guards: a review whose proposal expired runs again for the same subject.
  // It must land on the Investigation the earlier review opened, not open a second one.
  describe('resuming the Investigation an earlier review opened', () => {
    it('reports the Investigation as pre-existing and records this run on it', async () => {
      const conversationClient = buildRerunClient({
        status: 'open',
        description: input.description,
        workflow_execution_ids: ['run-1'],
      });

      const output = await runFindOrCreateWorkerInvestigation(input, { conversationClient });

      expect(output).toEqual({
        investigationConversationId: conversationId,
        created: false,
        reopened: false,
      });
      expect(conversationClient.get).toHaveBeenCalledWith(conversationId);
      expect(conversationClient.patchMetadata).toHaveBeenCalledWith(
        conversationId,
        { workflow_execution_ids: ['run-1', 'run-2'] },
        { access: 'converse' }
      );
    });

    it('refreshes the description so it describes the latest review', async () => {
      const conversationClient = buildRerunClient({
        status: 'open',
        description: 'stale',
        workflow_execution_ids: ['run-2'],
      });

      await runFindOrCreateWorkerInvestigation(input, { conversationClient });

      expect(conversationClient.patchMetadata).toHaveBeenCalledWith(
        conversationId,
        { description: input.description },
        { access: 'converse' }
      );
    });

    it('writes nothing when the Investigation is already up to date', async () => {
      const conversationClient = buildRerunClient({
        status: 'open',
        description: input.description,
        workflow_execution_ids: ['run-1', 'run-2'],
      });

      await runFindOrCreateWorkerInvestigation(input, { conversationClient });

      expect(conversationClient.patchMetadata).not.toHaveBeenCalled();
    });

    it('tolerates malformed workflow_execution_ids metadata', async () => {
      const conversationClient = buildRerunClient({
        status: 'open',
        workflow_execution_ids: 'run-1' as unknown as string[],
      });

      await runFindOrCreateWorkerInvestigation(
        { spaceId, workerId, subjectId, title: 't', workflowExecutionId: 'run-2' },
        { conversationClient }
      );

      expect(conversationClient.patchMetadata).toHaveBeenCalledWith(
        conversationId,
        { workflow_execution_ids: ['run-2'] },
        { access: 'converse' }
      );
    });

    it('rethrows when the verify-read fails after a 409', async () => {
      const conversationClient = buildRerunClient(undefined, {
        get: jest.fn().mockRejectedValue(new Error('not found')),
      });

      await expect(
        runFindOrCreateWorkerInvestigation(input, { conversationClient })
      ).rejects.toThrow('not found');
    });
  });

  // A re-review can land on an Investigation the earlier review closed (an approved action
  // that did not apply, a rule tuned again months later). It is reopened in the same write.
  describe('reopening a closed Investigation', () => {
    it('reopens one an earlier review had closed, in one write with the run and description', async () => {
      const conversationClient = buildRerunClient({
        status: 'closed',
        close_reason: 'resolved',
        workflow_execution_ids: ['run-1'],
      });

      const output = await runFindOrCreateWorkerInvestigation(input, { conversationClient });

      expect(conversationClient.patchMetadata).toHaveBeenCalledTimes(1);
      expect(conversationClient.patchMetadata).toHaveBeenCalledWith(
        conversationId,
        {
          status: 'open',
          description: input.description,
          workflow_execution_ids: ['run-1', 'run-2'],
        },
        { access: 'converse' }
      );
      expect(output).toEqual({
        investigationConversationId: conversationId,
        created: false,
        reopened: true,
      });
    });

    it('tells the caller about the reopen, once', async () => {
      const onReopened = jest.fn();

      await runFindOrCreateWorkerInvestigation(input, {
        conversationClient: buildRerunClient({ status: 'closed' }),
        onReopened,
      });

      expect(onReopened.mock.calls).toEqual([[conversationId]]);
    });

    it.each([
      ['an already-open Investigation', buildRerunClient({ status: 'open' })],
      ['an Investigation with no status metadata', buildRerunClient(undefined)],
      ['a new Investigation', buildClient()],
    ])('does not tell the caller about a reopen for %s', async (_label, conversationClient) => {
      const onReopened = jest.fn();

      const output = await runFindOrCreateWorkerInvestigation(input, {
        conversationClient,
        onReopened,
      });

      expect(onReopened).not.toHaveBeenCalled();
      expect(output.reopened).toBe(false);
    });

    // Two re-reviews that both read `closed`: the loser's write re-reads `open` and changes
    // nothing on `status`.
    it('does not report a reopen another writer already made', async () => {
      const onReopened = jest.fn();
      const conversationClient = buildRerunClient(
        { status: 'closed' },
        { patchMetadata: jest.fn().mockResolvedValue({ changedFields: ['description'] }) }
      );

      const output = await runFindOrCreateWorkerInvestigation(input, {
        conversationClient,
        onReopened,
      });

      expect(onReopened).not.toHaveBeenCalled();
      expect(output.reopened).toBe(false);
    });

    // Failing beats proposing on an Investigation nobody is looking at: with no id the
    // review fails and the subject stays for the next sweep.
    it('fails the call when a closed Investigation cannot be reopened', async () => {
      const onReopened = jest.fn();
      const conversationClient = buildRerunClient(
        { status: 'closed' },
        { patchMetadata: jest.fn().mockRejectedValue(new Error('conflict')) }
      );

      await expect(
        runFindOrCreateWorkerInvestigation(input, { conversationClient, onReopened })
      ).rejects.toThrow('conflict');
      expect(onReopened).not.toHaveBeenCalled();
    });

    it('still succeeds, with a debug log, when the reopen callback throws', async () => {
      const logger = loggingSystemMock.createLogger();

      const output = await runFindOrCreateWorkerInvestigation(input, {
        conversationClient: buildRerunClient({ status: 'closed' }),
        logger,
        onReopened: () => {
          throw new Error('telemetry down');
        },
      });

      expect(output.reopened).toBe(true);
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('telemetry down'));
    });
  });
});
