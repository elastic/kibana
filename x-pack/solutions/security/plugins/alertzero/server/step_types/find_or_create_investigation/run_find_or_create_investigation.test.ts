/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createConversationAlreadyExistsError } from '@kbn/agent-builder-common';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  buildHuntInvestigationConversationId,
  buildHuntTriggerAttachmentId,
} from '../../services/watches/hunt/common/hunt_investigation_id';
import { HUNT_INVESTIGATION_TEMPLATE_ID } from '../../conversation_templates/hunt_investigation';
import { runFindOrCreateInvestigation } from './run_find_or_create_investigation';
import type { FindOrCreateConversationClient } from './run_find_or_create_investigation';

const spaceId = 'default';
const reportId = 'rpt-find-or-create-1';
const conversationId = buildHuntInvestigationConversationId(reportId);
const triggerAttachmentId = buildHuntTriggerAttachmentId({ spaceId, reportId });

const buildClient = (
  overrides: Partial<FindOrCreateConversationClient> = {}
): FindOrCreateConversationClient => ({
  create: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue({ id: conversationId }),
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
      expect.objectContaining({ id: conversationId, templateId: HUNT_INVESTIGATION_TEMPLATE_ID })
    );
    expect(conversationClient.get).not.toHaveBeenCalled();
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
