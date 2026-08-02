/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common';
import { PndConversationAttachment } from '@kbn/pnd-common';

import {
  ATTACHMENT_CONTENT_MAX_LENGTH,
  ATTACHMENT_DESCRIPTION_MAX_LENGTH,
  PND_MAX_PROJECTED_ATTACHMENTS,
  projectAgentBuilderAttachments,
} from '.';

const textAttachment = (overrides: Partial<VersionedAttachment> = {}): VersionedAttachment =>
  ({
    current_version: 1,
    description: 'Attack Discovery',
    id: 'pnd-attack-discovery',
    type: 'text',
    versions: [
      {
        content_hash: 'abc',
        created_at: '2026-08-06T00:00:00.000Z',
        data: { content: '## Coordinated credential theft' },
        version: 1,
      },
    ],
    ...overrides,
  } as VersionedAttachment);

describe('projectAgentBuilderAttachments', () => {
  it('projects a text attachment onto the PND contract', () => {
    expect(projectAgentBuilderAttachments([textAttachment()])).toEqual([
      {
        content: '## Coordinated credential theft',
        createdAt: '2026-08-06T00:00:00.000Z',
        description: 'Attack Discovery',
        id: 'pnd-attack-discovery',
        type: 'text',
        version: 1,
      },
    ]);
  });

  it('produces attachments the response contract accepts', () => {
    const projected = projectAgentBuilderAttachments([textAttachment()]);

    expect(PndConversationAttachment.safeParse(projected[0]).success).toBe(true);
  });

  it('reads the current version rather than the newest entry in the array', () => {
    const attachment = textAttachment({
      current_version: 1,
      versions: [
        {
          content_hash: 'b',
          created_at: '2026-08-06T02:00:00.000Z',
          data: { content: 'superseded draft' },
          version: 2,
        },
        {
          content_hash: 'a',
          created_at: '2026-08-06T00:00:00.000Z',
          data: { content: 'the current one' },
          version: 1,
        },
      ],
    });

    expect(projectAgentBuilderAttachments([attachment])[0].content).toEqual('the current one');
  });

  it("keeps Agent Builder's own order", () => {
    const ids = projectAgentBuilderAttachments([
      textAttachment({ id: 'pnd-attack-discovery' }),
      textAttachment({ id: 'pnd-proposed-change' }),
      textAttachment({ id: 'pnd-backtest-comparison' }),
    ]).map(({ id }) => id);

    expect(ids).toEqual(['pnd-attack-discovery', 'pnd-proposed-change', 'pnd-backtest-comparison']);
  });

  it('forwards an open type verbatim, because PND does not own the type vocabulary', () => {
    const attachment = textAttachment({ type: 'visualization' });

    expect(projectAgentBuilderAttachments([attachment])[0].type).toEqual('visualization');
  });

  it('lists an attachment whose data is not text, so it is never dropped', () => {
    const attachment = textAttachment({
      type: 'esql',
      versions: [
        {
          content_hash: 'a',
          created_at: '2026-08-06T00:00:00.000Z',
          data: { query: 'FROM logs' },
          version: 1,
        },
      ],
    });

    expect(projectAgentBuilderAttachments([attachment])[0].id).toEqual('pnd-attack-discovery');
  });

  it('omits content entirely for data that is not text, rather than blanking it', () => {
    const attachment = textAttachment({
      type: 'esql',
      versions: [
        {
          content_hash: 'a',
          created_at: '2026-08-06T00:00:00.000Z',
          data: { query: 'FROM logs' },
          version: 1,
        },
      ],
    });

    expect(projectAgentBuilderAttachments([attachment])[0]).not.toHaveProperty('content');
  });

  it('omits description entirely when Agent Builder has none', () => {
    const attachment = textAttachment({ description: undefined });

    expect(projectAgentBuilderAttachments([attachment])[0]).not.toHaveProperty('description');
  });

  // The self-client fetch is unvalidated, so a missing `versions` array is reachable at runtime
  // even though it is not reachable at compile time. A throw here would 500 the Attachments tab.
  it('projects an attachment with no versions array rather than throwing', () => {
    const attachment = textAttachment({ versions: undefined as unknown as [] });

    expect(projectAgentBuilderAttachments([attachment])[0]).toEqual({
      description: 'Attack Discovery',
      id: 'pnd-attack-discovery',
      type: 'text',
      version: 1,
    });
  });

  it('omits the version when Agent Builder did not report one', () => {
    const attachment = textAttachment({ current_version: undefined as unknown as number });

    expect(projectAgentBuilderAttachments([attachment])[0]).not.toHaveProperty('version');
  });

  it('clips content to the bound the response contract imposes', () => {
    const attachment = textAttachment({
      versions: [
        {
          content_hash: 'a',
          created_at: '2026-08-06T00:00:00.000Z',
          data: { content: 'x'.repeat(ATTACHMENT_CONTENT_MAX_LENGTH + 1) },
          version: 1,
        },
      ],
    });

    expect(projectAgentBuilderAttachments([attachment])[0].content).toHaveLength(
      ATTACHMENT_CONTENT_MAX_LENGTH
    );
  });

  it('clips description to the bound the response contract imposes', () => {
    const attachment = textAttachment({
      description: 'd'.repeat(ATTACHMENT_DESCRIPTION_MAX_LENGTH + 1),
    });

    expect(projectAgentBuilderAttachments([attachment])[0].description).toHaveLength(
      ATTACHMENT_DESCRIPTION_MAX_LENGTH
    );
  });

  it('caps the list at the bound the response contract imposes', () => {
    const attachments = Array.from({ length: PND_MAX_PROJECTED_ATTACHMENTS + 5 }, (_, index) =>
      textAttachment({ id: `attachment-${index}` })
    );

    expect(projectAgentBuilderAttachments(attachments)).toHaveLength(PND_MAX_PROJECTED_ATTACHMENTS);
  });

  it('projects an empty list as an empty list', () => {
    expect(projectAgentBuilderAttachments([])).toEqual([]);
  });
});
