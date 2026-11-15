/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createAttachmentAlreadyExistsError,
  createAttachmentNotFoundError,
  createConversationWriteConflictError,
} from '@kbn/agent-builder-common';
import {
  HUNT_SESSION_ATTACHMENT_ID,
  HUNT_SESSION_MAX_FINGERPRINTS,
  type HuntSessionAttachment,
} from '../../common/hunt_session_attachment_schema';
import {
  readHuntSessionAttachment,
  upsertHuntSessionAttachment,
  type HuntSessionDraft,
} from './session_attachment_store';

const CONVERSATION = 'investigation-1';

const sessionState = {
  query: 'FROM logs-* | LIMIT 10',
  filters: [],
  timeRange: { from: 'now-7d', to: 'now' },
  columns: ['@timestamp'],
  dataViewId: 'dv-1',
};

const preservation = (id: string, fingerprints: string[] = [id]) => ({
  preservation_id: id,
  actor: 'analyst',
  timestamp: '2026-11-04T12:00:00.000Z',
  ...sessionState,
  evidenceFingerprints: fingerprints,
  selectedEvidence: fingerprints.map((fingerprint) => ({ fingerprint })),
});

const draft = (preservations: ReturnType<typeof preservation>[]): HuntSessionDraft => ({
  version: 1,
  definition: { id: 'hunt', version: 1, name: 'Hunt', hypothesis: 'A hypothesis' },
  trigger: 'manual',
  has_manual_append: false,
  creation_operation_id: 'op-1',
  preservations,
  resumeSnapshot: sessionState,
});

/** Merges by preservation id, as the real mutation must, so a repeat never duplicates. */
const addPreservation =
  (entry: ReturnType<typeof preservation>) =>
  (current: HuntSessionAttachment | undefined): HuntSessionDraft => {
    const existing = current?.preservations ?? [];
    const { revision: _revision, ...rest } = current ?? ({} as HuntSessionAttachment);
    const base = current ? (rest as HuntSessionDraft) : draft([]);
    return {
      ...base,
      preservations: existing.some(({ preservation_id: id }) => id === entry.preservation_id)
        ? existing
        : [...existing, entry],
    };
  };

/** An in-memory attachment client with Agent Builder's versioning, plus hooks to race a write. */
const createFakeAttachments = () => {
  const versions: Array<{ version: number; data: unknown }> = [];
  const hooks: { beforeUpdate?: () => void; createError?: Error; updateError?: Error } = {};

  const toAttachment = () => ({
    id: HUNT_SESSION_ATTACHMENT_ID,
    type: 'security.hunt_session',
    versions,
    current_version: versions.length,
  });

  const client = {
    get: jest.fn(async () => {
      if (versions.length === 0) {
        throw createAttachmentNotFoundError({ attachmentId: HUNT_SESSION_ATTACHMENT_ID });
      }
      return toAttachment();
    }),
    create: jest.fn(async ({ data }: { data: unknown }) => {
      if (hooks.createError) throw hooks.createError;
      if (versions.length > 0) {
        throw createAttachmentAlreadyExistsError({ attachmentId: HUNT_SESSION_ATTACHMENT_ID });
      }
      versions.push({ version: 1, data });
      return toAttachment();
    }),
    update: jest.fn(async ({ data }: { data: unknown }) => {
      if (hooks.updateError) throw hooks.updateError;
      hooks.beforeUpdate?.();
      hooks.beforeUpdate = undefined;
      versions.push({ version: versions.length + 1, data });
      return toAttachment();
    }),
  };

  return { client: client as never, mocks: client, versions, hooks };
};

const run = (
  fake: ReturnType<typeof createFakeAttachments>,
  entry: ReturnType<typeof preservation>,
  options: { maxAttempts?: number } = {}
) =>
  upsertHuntSessionAttachment({
    attachments: fake.client,
    conversationId: CONVERSATION,
    mutate: addPreservation(entry),
    ...options,
  });

describe('upsertHuntSessionAttachment', () => {
  it('creates the attachment at revision 1, readonly, and writable by collaborators', async () => {
    const fake = createFakeAttachments();

    const result = await run(fake, preservation('p1'));

    expect(result.revision).toBe(1);
    expect(fake.mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: CONVERSATION,
        id: 'hunt-session',
        type: 'security.hunt_session',
        readonly: true,
        render_inline: true,
        access: 'converse',
      })
    );
  });

  it('updates an existing attachment and increments the revision', async () => {
    const fake = createFakeAttachments();
    await run(fake, preservation('p1'));

    const result = await run(fake, preservation('p2'));

    expect(result.revision).toBe(2);
    expect(result.preservations?.map(({ preservation_id: id }) => id)).toEqual(['p1', 'p2']);
    expect(fake.mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ access: 'converse', render_inline: true })
    );
  });

  it('does not duplicate a repeated preservation', async () => {
    const fake = createFakeAttachments();
    await run(fake, preservation('p1'));

    const result = await run(fake, preservation('p1'));

    expect(result.preservations).toHaveLength(1);
  });

  it('keeps both changes when another writer lands between the read and the write', async () => {
    const fake = createFakeAttachments();
    await run(fake, preservation('p1'));
    // A second analyst's write lands after our read and before our write.
    fake.hooks.beforeUpdate = () => {
      const [{ data }] = fake.versions.slice(-1);
      fake.versions.push({
        version: fake.versions.length + 1,
        data: {
          ...(data as HuntSessionAttachment),
          revision: 2,
          preservations: [
            ...((data as HuntSessionAttachment).preservations ?? []),
            preservation('theirs'),
          ],
        },
      });
    };

    const result = await run(fake, preservation('mine'));

    expect(result.preservations?.map(({ preservation_id: id }) => id).sort()).toEqual([
      'mine',
      'p1',
      'theirs',
    ]);
    const stored = await readHuntSessionAttachment({
      attachments: fake.client,
      conversationId: CONVERSATION,
    });
    expect(stored?.preservations).toHaveLength(3);
  });

  it('retries when two writers race to create the attachment', async () => {
    const fake = createFakeAttachments();
    fake.mocks.create.mockImplementationOnce(async () => {
      fake.versions.push({ version: 1, data: { ...draft([preservation('theirs')]), revision: 1 } });
      throw createAttachmentAlreadyExistsError({ attachmentId: HUNT_SESSION_ATTACHMENT_ID });
    });

    const result = await run(fake, preservation('mine'));

    expect(result.preservations?.map(({ preservation_id: id }) => id)).toEqual(['theirs', 'mine']);
  });

  it('retries on a conversation write conflict', async () => {
    const fake = createFakeAttachments();
    await run(fake, preservation('p1'));
    fake.mocks.update.mockRejectedValueOnce(
      createConversationWriteConflictError({ conversationId: CONVERSATION } as never)
    );

    const result = await run(fake, preservation('p2'));

    expect(result.preservations).toHaveLength(2);
  });

  it('fails, never reporting success, when every attempt conflicts', async () => {
    const fake = createFakeAttachments();
    await run(fake, preservation('p1'));
    fake.hooks.updateError = createConversationWriteConflictError({
      conversationId: CONVERSATION,
    } as never);

    await expect(run(fake, preservation('p2'), { maxAttempts: 3 })).rejects.toMatchObject({
      code: 'write_conflict',
    });
    expect(fake.mocks.update).toHaveBeenCalledTimes(3);
  });

  it('rejects an oversized document before writing', async () => {
    const fake = createFakeAttachments();
    const huge = {
      ...preservation('p1'),
      query: 'x'.repeat(20_000),
      selectedEvidence: Array.from({ length: 50 }, (_, index) => ({
        index: `row-${index}`,
        ...Object.fromEntries(Array.from({ length: 29 }, (__, k) => [`f${k}`, 'v'.repeat(1024)])),
      })),
    };
    // 20 such preservations are well over 1 MB.
    const mutate = (current: HuntSessionAttachment | undefined): HuntSessionDraft => ({
      ...draft([]),
      preservations: Array.from({ length: 20 }, (_, index) => ({
        ...huge,
        preservation_id: `p${index}`,
        evidenceFingerprints: [`fp${index}`],
      })),
      ...(current ? {} : {}),
    });

    await expect(
      upsertHuntSessionAttachment({
        attachments: fake.client,
        conversationId: CONVERSATION,
        mutate,
      })
    ).rejects.toMatchObject({ code: 'too_large' });
    expect(fake.mocks.create).not.toHaveBeenCalled();
  });

  it('rejects more than 500 unique evidence fingerprints', async () => {
    const fake = createFakeAttachments();
    const many = Array.from({ length: 11 }, (_, group) =>
      preservation(
        `p${group}`,
        Array.from({ length: 50 }, (__, index) => `fp-${group}-${index}`)
      )
    );

    await expect(
      upsertHuntSessionAttachment({
        attachments: fake.client,
        conversationId: CONVERSATION,
        mutate: () => draft(many),
      })
    ).rejects.toMatchObject({
      code: 'invalid',
      message: expect.stringContaining(`at most ${HUNT_SESSION_MAX_FINGERPRINTS}`),
    });
    expect(fake.mocks.create).not.toHaveBeenCalled();
  });

  it('refuses to extend a stored document that no longer validates', async () => {
    const fake = createFakeAttachments();
    fake.versions.push({ version: 1, data: { not: 'a hunt session' } });

    await expect(run(fake, preservation('p1'))).rejects.toThrow('cannot be extended');
    expect(fake.mocks.update).not.toHaveBeenCalled();
  });
});

describe('readHuntSessionAttachment', () => {
  it('returns undefined when the Investigation has no Hunt session', async () => {
    const fake = createFakeAttachments();

    await expect(
      readHuntSessionAttachment({ attachments: fake.client, conversationId: CONVERSATION })
    ).resolves.toBeUndefined();
  });
});
