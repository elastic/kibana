/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAttachmentPayload } from '../../../../common/cases/attachments/entity';
import { matchesSearchTerm } from './utils';

type Attachment = Pick<EntityAttachmentPayload, 'attachmentId' | 'metadata'>;

const buildAttachment = (overrides: Partial<Attachment> = {}): Attachment => ({
  attachmentId: 'host:web01.acme.com',
  metadata: {
    entityName: 'web01.acme.com',
    entityType: 'host',
    riskLevel: 'Critical',
  },
  ...overrides,
});

describe('matchesSearchTerm', () => {
  it('matches on a bare entity name fragment', () => {
    expect(matchesSearchTerm(buildAttachment(), 'web01')).toBe(true);
  });

  it('matches colon-notation searches against the entity id (EUID)', () => {
    // The colon must be treated as a literal, not a field separator.
    expect(matchesSearchTerm(buildAttachment(), 'host:web01')).toBe(true);
  });

  it('matches the full entity id', () => {
    expect(matchesSearchTerm(buildAttachment(), 'host:web01.acme.com')).toBe(true);
  });

  it('matches on entity type', () => {
    expect(matchesSearchTerm(buildAttachment(), 'host')).toBe(true);
  });

  it('matches on risk level', () => {
    expect(matchesSearchTerm(buildAttachment(), 'critical')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(matchesSearchTerm(buildAttachment(), 'HOST:WEB01')).toBe(true);
  });

  it('returns false when nothing matches', () => {
    expect(matchesSearchTerm(buildAttachment(), 'nonexistent')).toBe(false);
  });

  it('handles a user EUID with @ segments', () => {
    const attachment = buildAttachment({
      attachmentId: 'user:alice@corp@default',
      metadata: { entityName: 'alice', entityType: 'user' },
    });
    expect(matchesSearchTerm(attachment, 'user:alice')).toBe(true);
  });

  it('does not throw when riskLevel is absent', () => {
    const attachment = buildAttachment({
      metadata: { entityName: 'web01.acme.com', entityType: 'host' },
    });
    expect(matchesSearchTerm(attachment, 'web01')).toBe(true);
    expect(matchesSearchTerm(attachment, 'critical')).toBe(false);
  });
});
