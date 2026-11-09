/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import {
  createAttachmentNotFoundError,
  createConversationAlreadyExistsError,
} from '@kbn/agent-builder-common';
import type { HuntSessionClaims } from '../../common/hunt_library_profile_state';
import { HUNT_SESSION_ATTACHMENT_ID } from '../../common/hunt_session_attachment_schema';
import type { PreservationContext } from './evidence';
import { deriveManualInvestigationId } from './investigation';
import { deriveManualSessionExecutionId } from './manual_session';
import { preserveHuntEvidence } from './preserve';
import { getHuntDefinition } from './seed';

const definition = getHuntDefinition('okta_failed_oauth_public_client_scope')!;
const SESSION = '0b7c1a3e-5d2f-4c8a-9e61-3f4b8a7d2c10';
const EXECUTION = deriveManualSessionExecutionId({
  spaceId: 'default',
  definitionId: definition.id,
  definitionVersion: definition.version,
  sessionId: SESSION,
});
const INVESTIGATION = deriveManualInvestigationId({
  spaceId: 'default',
  definitionId: definition.id,
  sessionId: SESSION,
});
const claims: HuntSessionClaims = {
  spaceId: 'default',
  definitionId: definition.id,
  definitionVersion: definition.version,
  sessionId: SESSION,
  sessionExecutionId: EXECUTION,
};
const context: PreservationContext = {
  query: 'FROM logs-okta',
  filters: [],
  timeRange: { from: 'now-7d', to: 'now' },
  dataViewId: 'dv-1',
};
const P1 = '11111111-1111-4111-8111-111111111111';
const P2 = '22222222-2222-4222-8222-222222222222';

const ref = (id: string) => ({ kind: 'raw_event' as const, index: 'logs-okta', id });

const createFakeAttachments = () => {
  const versions: Array<{ version: number; data: unknown }> = [];
  const failure: { error?: Error } = {};
  const toAttachment = () => ({
    id: HUNT_SESSION_ATTACHMENT_ID,
    type: 'security.hunt_session',
    versions,
    current_version: versions.length,
  });
  return {
    versions,
    failure,
    client: {
      get: jest.fn(async () => {
        if (versions.length === 0) {
          throw createAttachmentNotFoundError({ attachmentId: HUNT_SESSION_ATTACHMENT_ID });
        }
        return toAttachment();
      }),
      create: jest.fn(async ({ data }: { data: unknown }) => {
        if (failure.error) throw failure.error;
        versions.push({ version: 1, data });
        return toAttachment();
      }),
      update: jest.fn(async ({ data }: { data: unknown }) => {
        if (failure.error) throw failure.error;
        versions.push({ version: versions.length + 1, data });
        return toAttachment();
      }),
    },
  };
};

const setup = ({
  executionLabels,
  executionExists = true,
  existingInvestigation = false,
  mgetDocs,
}: {
  executionLabels?: Record<string, string>;
  executionExists?: boolean;
  existingInvestigation?: boolean;
  mgetDocs?: unknown[];
} = {}) => {
  const attachments = createFakeAttachments();
  const labelWrites: Array<Record<string, string>> = [];
  const management = {
    findExecutionsByLabel: jest
      .fn()
      .mockResolvedValue(executionExists ? [{ id: EXECUTION, labels: executionLabels ?? {} }] : []),
    executeLabeledWorkflow: jest
      .fn()
      .mockResolvedValue({ workflowExecutionId: EXECUTION, reusedExisting: false }),
    updateExecutionLabels: jest.fn(async ({ labels }: { labels: Record<string, string> }) => {
      labelWrites.push(labels);
      return labels;
    }),
  };
  const conversations = {
    create: jest.fn(async () => {
      if (existingInvestigation) {
        throw createConversationAlreadyExistsError({ conversationId: INVESTIGATION } as never);
      }
      return {};
    }),
    get: jest.fn().mockResolvedValue({ rounds: [], attachments: [] }),
    delete: jest.fn().mockResolvedValue(true),
  };
  const esClient = {
    mget: jest.fn(async ({ docs }: { docs: Array<{ _index: string; _id: string }> }) => ({
      docs:
        mgetDocs ??
        docs.map(({ _index, _id }) => ({
          _index,
          _id,
          found: true,
          _source: { 'event.action': `action-${_id}` },
        })),
    })),
  };
  const logger = loggingSystemMock.createLogger();

  const run = (
    overrides: Partial<Parameters<typeof preserveHuntEvidence>[0]> = {}
  ): ReturnType<typeof preserveHuntEvidence> =>
    preserveHuntEvidence({
      management: management as never,
      request: httpServerMock.createKibanaRequest(),
      conversations: conversations as never,
      attachments: attachments.client as never,
      esClient: esClient as never,
      logger,
      definition,
      claims,
      actor: 'analyst',
      preservationId: P1,
      context,
      columns: ['@timestamp'],
      selection: [ref('e1')],
      ...overrides,
    });

  return { run, attachments, management, conversations, esClient, labelWrites, logger };
};

describe('preserveHuntEvidence', () => {
  it('creates the Investigation and attachment, then records the outcome', async () => {
    const { run, attachments, conversations, labelWrites } = setup();

    const result = await run();

    expect(result).toEqual({
      investigationId: INVESTIGATION,
      evidenceCount: 1,
      addedCount: 1,
      created: true,
      isRetry: false,
      hadPriorEvidence: false,
    });
    expect(conversations.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: INVESTIGATION, templateId: 'investigation' })
    );
    const stored = attachments.versions.at(-1)!.data as {
      revision: number;
      trigger: string;
      creation_operation_id: string;
      preservations: Array<{ preservation_id: string; actor: string; selectedEvidence: unknown[] }>;
      resumeSnapshot: { query: string; columns: string[] };
    };
    expect(stored).toMatchObject({
      revision: 1,
      investigation_id: INVESTIGATION,
      trigger: 'manual',
      creation_operation_id: P1,
      resumeSnapshot: { query: context.query, columns: ['@timestamp'] },
    });
    expect(stored.preservations[0]).toMatchObject({ preservation_id: P1, actor: 'analyst' });
    expect(labelWrites.map((labels) => labels['hunt.outcome'])).toEqual([
      'pending_handoff',
      'investigation_created',
    ]);
    expect(labelWrites[0]).toMatchObject({ 'hunt.preservation_id': P1 });
    expect(labelWrites[1]).toMatchObject({
      'hunt.investigation_id': INVESTIGATION,
      'hunt.evidence_count': '1',
    });
  });

  it('stores the analyst note with the preservation, and omits a blank one', async () => {
    const { run, attachments } = setup();

    await run({ note: '  Same rare port on both hosts  ' });
    expect(
      (attachments.versions.at(-1)!.data as { preservations: Array<{ note?: string }> })
        .preservations[0].note
    ).toBe('Same rare port on both hosts');

    const blank = setup();
    await blank.run({ note: '   ' });
    expect(
      (blank.attachments.versions.at(-1)!.data as { preservations: object[] }).preservations[0]
    ).not.toHaveProperty('note');
  });

  it('appends later evidence to the same Investigation and bumps the revision', async () => {
    const { run, attachments } = setup({ existingInvestigation: false });
    await run();

    const second = await run({ preservationId: P2, selection: [ref('e2')] });

    expect(second).toMatchObject({
      evidenceCount: 2,
      addedCount: 1,
      created: true,
      isRetry: false,
      hadPriorEvidence: true,
    });
    const stored = attachments.versions.at(-1)!.data as {
      revision: number;
      preservations: unknown[];
    };
    expect(stored.revision).toBe(2);
    expect(stored.preservations).toHaveLength(2);
  });

  it('keeps the creation operation id from the first write', async () => {
    const { run, attachments } = setup();
    await run();
    await run({ preservationId: P2, selection: [ref('e2')] });

    expect(
      (attachments.versions.at(-1)!.data as { creation_operation_id: string }).creation_operation_id
    ).toBe(P1);
  });

  it('does not add evidence twice for a retried preservation id or a repeated selection', async () => {
    const { run, attachments } = setup();
    await run();

    const retry = await run();
    const repeated = await run({ preservationId: P2 });

    expect(retry).toMatchObject({ evidenceCount: 1, addedCount: 1, isRetry: true });
    expect(repeated).toMatchObject({
      evidenceCount: 1,
      addedCount: 0,
      isRetry: false,
      hadPriorEvidence: true,
    });
    const stored = attachments.versions.at(-1)!.data as { preservations: unknown[] };
    expect(stored.preservations).toHaveLength(1);
  });

  it('refuses a second preservation while a different one is pending', async () => {
    const { run, attachments, conversations, labelWrites } = setup({
      executionLabels: {
        'hunt.outcome': 'pending_handoff',
        'hunt.preservation_id': P2,
        'hunt.last_handoff_at': new Date().toISOString(),
      },
    });

    await expect(run()).rejects.toMatchObject({ code: 'preservation_in_progress' });
    expect(conversations.create).not.toHaveBeenCalled();
    expect(attachments.client.create).not.toHaveBeenCalled();
    expect(labelWrites).toEqual([]);
  });

  describe('a stuck session', () => {
    const stuckLabels = {
      'hunt.kind': 'manual_session',
      'hunt.definition_id': definition.id,
      'hunt.session_id': SESSION,
    };

    it('finishes an abandoned handoff under the analyst request, then proceeds', async () => {
      const { run, labelWrites, conversations } = setup({
        existingInvestigation: true,
        executionLabels: {
          ...stuckLabels,
          'hunt.outcome': 'pending_handoff',
          'hunt.preservation_id': P2,
          'hunt.last_handoff_at': '2020-01-01T00:00:00.000Z',
        },
      });
      // The abandoned handoff left an empty Investigation and no attachment.
      conversations.get.mockResolvedValue({ rounds: [], attachments: [] });

      await expect(run()).resolves.toMatchObject({ evidenceCount: 1 });

      expect(labelWrites.map((labels) => labels['hunt.outcome'])).toEqual([
        'handoff_failed',
        'pending_handoff',
        'investigation_created',
      ]);
      expect(conversations.delete).toHaveBeenCalledWith(INVESTIGATION);
    });

    it('cleans up a session flagged for cleanup before writing new evidence', async () => {
      const { run, labelWrites } = setup({
        executionLabels: {
          ...stuckLabels,
          'hunt.outcome': 'handoff_cleanup_required',
          'hunt.preservation_id': P2,
        },
      });

      await expect(run()).resolves.toMatchObject({ evidenceCount: 1 });

      expect(labelWrites[0]).toMatchObject({ 'hunt.outcome': 'handoff_failed' });
      expect(labelWrites.at(-1)).toMatchObject({ 'hunt.outcome': 'investigation_created' });
    });
  });

  it('lets the same preservation retry through while it is pending', async () => {
    const { run } = setup({
      executionLabels: { 'hunt.outcome': 'pending_handoff', 'hunt.preservation_id': P1 },
    });

    await expect(run()).resolves.toMatchObject({ evidenceCount: 1 });
  });

  it('recreates the session execution when it has expired', async () => {
    const { run, management } = setup({ executionExists: false });

    await run();

    expect(management.executeLabeledWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ executionId: EXECUTION })
    );
  });

  it('writes nothing when a selected document cannot be read', async () => {
    const { run, conversations, attachments, labelWrites } = setup({
      mgetDocs: [{ _index: 'logs-okta', _id: 'e1', found: false }],
    });

    await expect(run()).rejects.toMatchObject({ reason: 'document_unavailable' });
    expect(conversations.create).not.toHaveBeenCalled();
    expect(attachments.client.create).not.toHaveBeenCalled();
    expect(labelWrites).toEqual([]);
  });

  describe('a linked Investigation', () => {
    const LINKED = 'linked-investigation';
    const linkedClaims = { ...claims, investigationId: LINKED };

    it('appends to it and never derives or creates another', async () => {
      const { run, conversations } = setup();

      const result = await run({ claims: linkedClaims });

      expect(result).toMatchObject({ investigationId: LINKED, created: false });
      expect(conversations.get).toHaveBeenCalledWith(LINKED);
      expect(conversations.create).not.toHaveBeenCalled();
    });

    it('refuses when the analyst cannot reach it', async () => {
      const { run, conversations, labelWrites } = setup();
      conversations.get.mockRejectedValue(new Error('forbidden'));

      await expect(run({ claims: linkedClaims })).rejects.toMatchObject({
        code: 'investigation_inaccessible',
      });
      expect(labelWrites).toEqual([]);
    });

    it('refuses when it belongs to a different hunt', async () => {
      const { run, attachments } = setup();
      attachments.versions.push({
        version: 1,
        data: {
          version: 1,
          definition: { id: 'other_hunt', version: 1, name: 'Other', hypothesis: 'h' },
          trigger: 'manual',
          has_manual_append: false,
          revision: 1,
          preservations: [],
          resumeSnapshot: { ...context, columns: [] },
        },
      });

      await expect(run({ claims: linkedClaims })).rejects.toMatchObject({
        code: 'definition_mismatch',
      });
    });

    it('marks an automated Investigation as extended by a human', async () => {
      const { run, attachments } = setup();
      attachments.versions.push({
        version: 1,
        data: {
          version: 1,
          definition: {
            id: definition.id,
            version: definition.version,
            name: definition.name,
            hypothesis: definition.hypothesis,
          },
          trigger: 'automated',
          has_manual_append: false,
          revision: 1,
          adjudication: {
            group_id: 'v1:abc',
            summary: 's',
            severity: 'high',
            hypotheses: ['h'],
            citations: [],
            executionWindow: { from: 'now-7d', to: 'now' },
            query: 'FROM x',
          },
        },
      });

      await run({ claims: linkedClaims });

      expect(attachments.versions.at(-1)!.data).toMatchObject({
        trigger: 'automated',
        has_manual_append: true,
        revision: 2,
      });
    });
  });

  describe('when the attachment cannot be written', () => {
    it('deletes the empty Investigation it created and records handoff_failed', async () => {
      const { run, attachments, conversations, labelWrites } = setup();
      attachments.failure.error = new Error('es down');

      await expect(run()).rejects.toMatchObject({ code: 'handoff_failed' });

      expect(conversations.delete).toHaveBeenCalledWith(INVESTIGATION);
      expect(labelWrites.at(-1)).toEqual({ 'hunt.outcome': 'handoff_failed' });
    });

    it('marks the session for cleanup when the delete fails too', async () => {
      const { run, attachments, conversations, labelWrites } = setup();
      attachments.failure.error = new Error('es down');
      conversations.delete.mockRejectedValue(new Error('delete failed'));

      await expect(run()).rejects.toMatchObject({ code: 'handoff_failed' });

      expect(labelWrites.at(-1)).toEqual({
        'hunt.outcome': 'handoff_cleanup_required',
        'hunt.investigation_id': INVESTIGATION,
        'hunt.cleanup_operation_id': P1,
      });
    });

    it('never deletes an Investigation it did not create', async () => {
      const { run, attachments, conversations, labelWrites } = setup({
        existingInvestigation: true,
      });
      attachments.failure.error = new Error('es down');

      await expect(run()).rejects.toMatchObject({ code: 'handoff_failed' });

      expect(conversations.delete).not.toHaveBeenCalled();
      expect(labelWrites.at(-1)).toEqual({ 'hunt.outcome': 'handoff_failed' });
    });
  });

  it('still succeeds when only the final label write fails, because the evidence is durable', async () => {
    const { run, management, attachments, logger } = setup();
    management.updateExecutionLabels
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('label write failed'));

    await expect(run()).resolves.toMatchObject({ investigationId: INVESTIGATION });

    expect(attachments.versions).toHaveLength(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('was not updated'));
  });
});
