/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createConversationAlreadyExistsError,
  createConversationNotFoundError,
} from '@kbn/agent-builder-common';
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

/** The Investigation as the Worker that minted it reads it back: its own, on the template. */
const ownInvestigation = (metadata?: Record<string, MetadataFieldValue>) => ({
  id: conversationId,
  template_id: TEMPLATE_ID_INVESTIGATION,
  permissions: { update_access_control: true },
  metadata,
});

const buildClient = (
  overrides: Partial<FindOrCreateWorkerInvestigationConversationClient> = {}
): FindOrCreateWorkerInvestigationConversationClient => ({
  create: jest.fn().mockResolvedValue({ id: conversationId }),
  get: jest.fn().mockResolvedValue(ownInvestigation()),
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
    get: jest.fn().mockResolvedValue(ownInvestigation(metadata)),
    ...overrides,
  });

const fallbackId = 'c0ffee00-0000-4000-8000-000000000001';

/** A 409 at the derived id, then a create Agent Builder gives a random id. */
const buildPlantedClient = (
  get: FindOrCreateWorkerInvestigationConversationClient['get']
): FindOrCreateWorkerInvestigationConversationClient =>
  buildClient({
    create: jest
      .fn()
      .mockRejectedValueOnce(createConversationAlreadyExistsError({ conversationId }))
      .mockResolvedValueOnce({ id: fallbackId }),
    get,
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

    it('rethrows when the verify-read fails after a 409 for a reason other than not found', async () => {
      const conversationClient = buildRerunClient(undefined, {
        get: jest.fn().mockRejectedValue(new Error('cluster unavailable')),
      });

      await expect(
        runFindOrCreateWorkerInvestigation(input, { conversationClient })
      ).rejects.toThrow('cluster unavailable');
      expect(conversationClient.create).toHaveBeenCalledTimes(1);
    });
  });

  // Every input to the derived id is public, so anyone with Agent Builder access can create
  // a conversation at it first. Such a conversation is not reviewed on: the review runs on a
  // fresh Investigation with a random id instead, as every review did before the id was
  // derived, rather than failing on every sweep.
  describe('a conversation at the derived id the Worker did not mint', () => {
    it.each([
      [
        'is private to whoever planted it',
        jest.fn().mockRejectedValue(createConversationNotFoundError({ conversationId })),
        'cannot read it',
      ],
      [
        'is on another template',
        jest.fn().mockResolvedValue({ ...ownInvestigation(), template_id: 'some-chat-template' }),
        'not an Investigation (template: some-chat-template)',
      ],
      [
        'has no template',
        jest.fn().mockResolvedValue({ ...ownInvestigation(), template_id: undefined }),
        'not an Investigation (template: none)',
      ],
      [
        'is an Investigation someone else owns',
        jest.fn().mockResolvedValue({
          ...ownInvestigation(),
          permissions: { update_access_control: false },
        }),
        'does not own it',
      ],
      [
        'carries no permissions',
        jest.fn().mockResolvedValue({ ...ownInvestigation(), permissions: undefined }),
        'does not own it',
      ],
    ])('reviews on a fresh Investigation when the conversation %s', async (_scenario, get, why) => {
      const logger = loggingSystemMock.createLogger();
      const conversationClient = buildPlantedClient(get);

      const output = await runFindOrCreateWorkerInvestigation(input, {
        conversationClient,
        logger,
      });

      expect(output).toEqual({
        investigationConversationId: fallbackId,
        created: true,
        reopened: false,
      });
      // The planted conversation is neither written to nor read beyond the one check.
      expect(conversationClient.patchMetadata).not.toHaveBeenCalled();
      expect(conversationClient.create).toHaveBeenCalledTimes(2);
      const [, [fallbackRequest]] = (conversationClient.create as jest.Mock).mock.calls;
      expect(fallbackRequest).not.toHaveProperty('id');
      expect(fallbackRequest).toEqual(
        expect.objectContaining({
          title: input.title,
          templateId: TEMPLATE_ID_INVESTIGATION,
          accessControl: { access_mode: 'public', entries: [] },
          metadata: expect.objectContaining({ status: 'open' }),
        })
      );
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(why));
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(conversationId));
    });

    it('rethrows when the fallback create fails too', async () => {
      const conversationClient = buildClient({
        create: jest
          .fn()
          .mockRejectedValueOnce(createConversationAlreadyExistsError({ conversationId }))
          .mockRejectedValueOnce(new Error('quota')),
        get: jest.fn().mockRejectedValue(createConversationNotFoundError({ conversationId })),
      });

      await expect(
        runFindOrCreateWorkerInvestigation(input, { conversationClient })
      ).rejects.toThrow('quota');
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

    it.each([
      [
        'throws',
        () => {
          throw new Error('telemetry down');
        },
      ],
      ['rejects', () => Promise.reject(new Error('telemetry down'))],
    ])(
      'still succeeds, with a debug log, when the reopen callback %s',
      async (_how, onReopened) => {
        const logger = loggingSystemMock.createLogger();

        const output = await runFindOrCreateWorkerInvestigation(input, {
          conversationClient: buildRerunClient({ status: 'closed' }),
          logger,
          onReopened,
        });
        await new Promise(setImmediate);

        expect(output.reopened).toBe(true);
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('telemetry down'));
      }
    );

    // The Investigation is already open when the report runs, and the route's report looks
    // the run up in workflows management, so a slow lookup must not hold the review's step.
    it('returns without waiting for the reopen callback', async () => {
      let release!: () => void;
      const onReopened = jest.fn(() => new Promise<void>((resolve) => (release = resolve)));

      const output = await runFindOrCreateWorkerInvestigation(input, {
        conversationClient: buildRerunClient({ status: 'closed' }),
        onReopened,
      });

      expect(output.reopened).toBe(true);
      expect(onReopened).toHaveBeenCalledWith(conversationId);
      release();
    });
  });
});
