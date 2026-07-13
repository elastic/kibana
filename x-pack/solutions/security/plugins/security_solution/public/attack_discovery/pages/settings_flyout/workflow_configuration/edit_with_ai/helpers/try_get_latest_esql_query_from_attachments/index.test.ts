/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';

import { tryGetLatestEsqlQueryFromAttachments } from '.';

const createEsqlAttachment = (query: string): VersionedAttachment => ({
  active: true,
  current_version: 1,
  hidden: false,
  id: `esql-${Math.random()}`,
  type: AttachmentType.esql,
  versions: [
    {
      content_hash: 'hash',
      created_at: new Date().toISOString(),
      data: { description: 'ES|QL query', query },
      estimated_tokens: 10,
      version: 1,
    },
  ],
});

describe('tryGetLatestEsqlQueryFromAttachments', () => {
  it('returns undefined when attachments is undefined', () => {
    expect(tryGetLatestEsqlQueryFromAttachments(undefined)).toBeUndefined();
  });

  it('returns undefined when attachments is empty', () => {
    expect(tryGetLatestEsqlQueryFromAttachments([])).toBeUndefined();
  });

  it('returns undefined when no ES|QL attachment is present', () => {
    const attachments: VersionedAttachment[] = [
      {
        active: true,
        current_version: 1,
        hidden: false,
        id: 'other',
        type: AttachmentType.screenContext,
        versions: [
          {
            content_hash: 'hash',
            created_at: new Date().toISOString(),
            data: { url: 'http://example.com' },
            estimated_tokens: 5,
            version: 1,
          },
        ],
      },
    ];

    expect(tryGetLatestEsqlQueryFromAttachments(attachments)).toBeUndefined();
  });

  it('returns the query from an ES|QL attachment', () => {
    const attachments = [createEsqlAttachment('FROM .alerts | LIMIT 200')];

    expect(tryGetLatestEsqlQueryFromAttachments(attachments)).toBe('FROM .alerts | LIMIT 200');
  });

  it('returns the query from the last ES|QL attachment when multiple exist', () => {
    const attachments = [
      createEsqlAttachment('FROM .alerts | LIMIT 100'),
      createEsqlAttachment('FROM .alerts | LIMIT 200'),
    ];

    expect(tryGetLatestEsqlQueryFromAttachments(attachments)).toBe('FROM .alerts | LIMIT 200');
  });

  it('returns undefined when the ES|QL attachment has no versions', () => {
    const attachments: VersionedAttachment[] = [
      {
        active: true,
        current_version: 1,
        hidden: false,
        id: 'esql-empty',
        type: AttachmentType.esql,
        versions: [],
      },
    ];

    expect(tryGetLatestEsqlQueryFromAttachments(attachments)).toBeUndefined();
  });

  it('returns undefined when the version data is not a record', () => {
    const attachments: VersionedAttachment[] = [
      {
        active: true,
        current_version: 1,
        hidden: false,
        id: 'esql-bad-data',
        type: AttachmentType.esql,
        versions: [
          {
            content_hash: 'hash',
            created_at: new Date().toISOString(),
            data: 'not-a-record' as unknown as Record<string, unknown>,
            estimated_tokens: 5,
            version: 1,
          },
        ],
      },
    ];

    expect(tryGetLatestEsqlQueryFromAttachments(attachments)).toBeUndefined();
  });

  it('returns undefined when the query field is not a string', () => {
    const attachments: VersionedAttachment[] = [
      {
        active: true,
        current_version: 1,
        hidden: false,
        id: 'esql-bad-query',
        type: AttachmentType.esql,
        versions: [
          {
            content_hash: 'hash',
            created_at: new Date().toISOString(),
            data: { query: 123 },
            estimated_tokens: 5,
            version: 1,
          },
        ],
      },
    ];

    expect(tryGetLatestEsqlQueryFromAttachments(attachments)).toBeUndefined();
  });
});
