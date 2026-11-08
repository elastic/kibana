/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createConversationAlreadyExistsError } from '@kbn/agent-builder-common';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { TEMPLATE_ID_INVESTIGATION } from '@kbn/alertzero-common';
import {
  buildHuntInvestigationConversationId,
  buildHuntTriggerAttachmentId,
} from './hunt_investigation_id';
import { runFindOrCreateInvestigation } from './find_or_create_investigation';
import type { FindOrCreateConversationClient } from './find_or_create_investigation';

const spaceId = 'default';
const reportId = 'rpt-find-or-create-1';
const conversationId = buildHuntInvestigationConversationId({ spaceId, reportId });
const triggerAttachmentId = buildHuntTriggerAttachmentId({ spaceId, reportId });

const buildClient = (
  overrides: Partial<FindOrCreateConversationClient> = {}
): FindOrCreateConversationClient => ({
  create: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue({ id: conversationId }),
  // Agent Builder reports the fields the write changed; a reopen changes `status`.
  patchMetadata: jest.fn().mockResolvedValue({ changedFields: ['status'] }),
  ...overrides,
});

/** A 409 from `create` plus whatever metadata the existing conversation carries. */
const buildRerunClient = (
  metadata: Record<string, string> | undefined,
  overrides: Partial<FindOrCreateConversationClient> = {}
): FindOrCreateConversationClient =>
  buildClient({
    create: jest.fn().mockRejectedValue(createConversationAlreadyExistsError({ conversationId })),
    get: jest.fn().mockResolvedValue({ id: conversationId, metadata }),
    ...overrides,
  });

const reportContext = {
  iocs: [
    { type: 'ip' as const, value: '192.0.2.30' },
    { type: 'ip' as const, value: '192.0.2.31' },
  ],
  techniques: ['T1078.004', 'T1562.008'],
  text: 'body',
  title: 'CloudTrail retrospective',
  source_name: 'AWS IAM privilege escalation feed',
  published_at: '2026-09-02T17:51:57.050Z',
  severity: 'medium',
};

describe('runFindOrCreateInvestigation', () => {
  it('creates a new Investigation and returns its deterministic id', async () => {
    const conversationClient = buildClient();

    const output = await runFindOrCreateInvestigation(
      { spaceId, reportId },
      { conversationClient }
    );

    expect(output).toEqual({
      investigationConversationId: conversationId,
      triggerAttachmentId,
      created: true,
    });
    expect(conversationClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: conversationId,
        title: reportId,
        templateId: TEMPLATE_ID_INVESTIGATION,
      })
    );
    expect(conversationClient.get).not.toHaveBeenCalled();
  });

  it('mints a separate Investigation for the same report in another space', async () => {
    const otherSpaceId = 'hunt-b';
    const conversationClient = buildClient();

    const output = await runFindOrCreateInvestigation(
      { spaceId: otherSpaceId, reportId },
      { conversationClient }
    );

    expect(output.created).toBe(true);
    expect(output.investigationConversationId).not.toBe(conversationId);
    expect(output.investigationConversationId).toBe(
      buildHuntInvestigationConversationId({ spaceId: otherSpaceId, reportId })
    );
    expect(conversationClient.get).not.toHaveBeenCalled();
  });

  it('creates the Investigation public, not private to whichever identity ran the Worker', async () => {
    const conversationClient = buildClient();

    await runFindOrCreateInvestigation({ spaceId, reportId }, { conversationClient });

    expect(conversationClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        accessControl: { access_mode: 'public', entries: [] },
      })
    );
  });

  it('titles the Investigation with the report title when available', async () => {
    const conversationClient = buildClient();

    await runFindOrCreateInvestigation(
      { spaceId, reportId },
      { conversationClient, loadReport: jest.fn().mockResolvedValue(reportContext) }
    );

    expect(conversationClient.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'CloudTrail retrospective' })
    );
  });

  it('treats a verified 409 as success and reports the Investigation as pre-existing', async () => {
    const conversationClient = buildClient({
      create: jest.fn().mockRejectedValue(createConversationAlreadyExistsError({ conversationId })),
    });

    const output = await runFindOrCreateInvestigation(
      { spaceId, reportId },
      { conversationClient }
    );

    expect(output).toEqual({
      investigationConversationId: conversationId,
      triggerAttachmentId,
      created: false,
    });
    expect(conversationClient.get).toHaveBeenCalledWith(conversationId);
  });

  it('rethrows an unrelated create failure without verifying', async () => {
    const conversationClient = buildClient({
      create: jest.fn().mockRejectedValue(new Error('boom')),
    });

    await expect(
      runFindOrCreateInvestigation({ spaceId, reportId }, { conversationClient })
    ).rejects.toThrow('boom');
    expect(conversationClient.get).not.toHaveBeenCalled();
  });

  // A rerun resolves to the same derived id, so it can land on an Investigation a clean hunt
  // closed as `benign` or the proposal gate closed as `resolved`. Nothing else reopens it.
  describe('reopening a closed Investigation on a rerun', () => {
    it('reopens one a previous run had closed', async () => {
      const conversationClient = buildRerunClient({ status: 'closed', close_reason: 'benign' });

      const output = await runFindOrCreateInvestigation(
        { spaceId, reportId },
        { conversationClient }
      );

      expect(conversationClient.patchMetadata).toHaveBeenCalledWith(
        conversationId,
        { status: 'open' },
        { access: 'converse' }
      );
      expect(output.created).toBe(false);
    });

    it('tells the caller about the reopen, once', async () => {
      const onReopened = jest.fn();

      await runFindOrCreateInvestigation(
        { spaceId, reportId },
        { conversationClient: buildRerunClient({ status: 'closed' }), onReopened }
      );

      expect(onReopened.mock.calls).toEqual([[conversationId]]);
    });

    it.each([
      ['an already-open Investigation', buildRerunClient({ status: 'open' })],
      ['a new Investigation', buildClient()],
    ])('does not tell the caller about a reopen for %s', async (_label, conversationClient) => {
      const onReopened = jest.fn();

      await runFindOrCreateInvestigation({ spaceId, reportId }, { conversationClient, onReopened });

      expect(onReopened).not.toHaveBeenCalled();
    });

    // Two reruns that both read `closed`: the loser's write re-reads `open` and changes nothing.
    it('does not tell the caller about a reopen another writer already made', async () => {
      const onReopened = jest.fn();
      const conversationClient = buildRerunClient(
        { status: 'closed' },
        { patchMetadata: jest.fn().mockResolvedValue({ changedFields: [] }) }
      );

      await runFindOrCreateInvestigation({ spaceId, reportId }, { conversationClient, onReopened });

      expect(onReopened).not.toHaveBeenCalled();
    });

    it('does not tell the caller about a reopen that failed', async () => {
      const onReopened = jest.fn();
      const conversationClient = buildRerunClient(
        { status: 'closed' },
        { patchMetadata: jest.fn().mockRejectedValue(new Error('conflict')) }
      );

      await expect(
        runFindOrCreateInvestigation({ spaceId, reportId }, { conversationClient, onReopened })
      ).rejects.toThrow('conflict');
      expect(onReopened).not.toHaveBeenCalled();
    });

    it('still succeeds when the reopen callback throws', async () => {
      const output = await runFindOrCreateInvestigation(
        { spaceId, reportId },
        {
          conversationClient: buildRerunClient({ status: 'closed' }),
          onReopened: () => {
            throw new Error('telemetry down');
          },
        }
      );

      expect(output.investigationConversationId).toBe(conversationId);
    });

    it('leaves an already-open Investigation untouched', async () => {
      const conversationClient = buildRerunClient({ status: 'open' });

      await runFindOrCreateInvestigation({ spaceId, reportId }, { conversationClient });

      expect(conversationClient.patchMetadata).not.toHaveBeenCalled();
    });

    // Absent metadata reads as open in the investigation template, so there is nothing to reopen.
    it('leaves an Investigation with no status metadata untouched', async () => {
      const conversationClient = buildRerunClient(undefined);

      await runFindOrCreateInvestigation({ spaceId, reportId }, { conversationClient });

      expect(conversationClient.patchMetadata).not.toHaveBeenCalled();
    });

    // Failing beats hunting into a conversation nobody is looking at: with no Investigation id
    // the Worker skips the coordinator, so the report stays eligible for the next sweep.
    it('fails the call when a closed Investigation cannot be reopened', async () => {
      const conversationClient = buildRerunClient(
        { status: 'closed' },
        { patchMetadata: jest.fn().mockRejectedValue(new Error('conflict')) }
      );

      await expect(
        runFindOrCreateInvestigation({ spaceId, reportId }, { conversationClient })
      ).rejects.toThrow('conflict');
    });

    it('does not reopen anything on the create path', async () => {
      const conversationClient = buildClient();

      await runFindOrCreateInvestigation({ spaceId, reportId }, { conversationClient });

      expect(conversationClient.patchMetadata).not.toHaveBeenCalled();
    });
  });

  it('rethrows when the verify-read fails after a verified 409', async () => {
    const conversationClient = buildClient({
      create: jest.fn().mockRejectedValue(createConversationAlreadyExistsError({ conversationId })),
      get: jest.fn().mockRejectedValue(new Error('not found')),
    });

    await expect(
      runFindOrCreateInvestigation({ spaceId, reportId }, { conversationClient })
    ).rejects.toThrow('not found');
  });

  describe('report summary for the trigger message', () => {
    it('carries the report facts the trigger message cites', async () => {
      const output = await runFindOrCreateInvestigation(
        { spaceId, reportId },
        {
          conversationClient: buildClient(),
          loadReport: jest.fn().mockResolvedValue(reportContext),
        }
      );

      expect(output.report).toEqual({
        title: 'CloudTrail retrospective',
        sourceName: 'AWS IAM privilege escalation feed',
        publishedAt: '2026-09-02T17:51:57.050Z',
        severity: 'medium',
        iocCount: 2,
        techniques: ['T1078.004', 'T1562.008'],
      });
    });

    it('omits the summary when the report is not visible in the space', async () => {
      const output = await runFindOrCreateInvestigation(
        { spaceId, reportId },
        { conversationClient: buildClient(), loadReport: jest.fn().mockResolvedValue(null) }
      );

      expect(output).not.toHaveProperty('report');
      expect(output.created).toBe(true);
    });

    it('still succeeds, with a warning, when reading the report fails', async () => {
      const logger = loggingSystemMock.createLogger();
      const output = await runFindOrCreateInvestigation(
        { spaceId, reportId },
        {
          conversationClient: buildClient(),
          loadReport: jest.fn().mockRejectedValue(new Error('reports index unavailable')),
          logger,
        }
      );

      expect(output.investigationConversationId).toBe(conversationId);
      expect(output).not.toHaveProperty('report');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('reports index unavailable')
      );
    });

    it('leaves optional facts out rather than writing empty strings', async () => {
      const output = await runFindOrCreateInvestigation(
        { spaceId, reportId },
        {
          conversationClient: buildClient(),
          loadReport: jest.fn().mockResolvedValue({ iocs: [], techniques: [] }),
        }
      );

      expect(output.report).toEqual({ iocCount: 0, techniques: [] });
    });
  });
});
