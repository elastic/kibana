/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_EVENT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { SecurityEventAttachmentPayloadSchema } from './event';

describe('SecurityEventAttachmentPayloadSchema', () => {
  const validPayload = {
    type: SECURITY_EVENT_ATTACHMENT_TYPE,
    owner: 'securitySolution',
    attachmentId: 'event-1',
    metadata: { index: 'logs-endpoint-*' },
  };

  it('accepts a single-id payload, a multi-event array, and array metadata.index', () => {
    expect(SecurityEventAttachmentPayloadSchema.safeParse(validPayload).success).toBe(true);
    expect(
      SecurityEventAttachmentPayloadSchema.safeParse({
        ...validPayload,
        attachmentId: ['event-1', 'event-2'],
        metadata: { index: ['logs-endpoint-*', 'logs-system-*'] },
      }).success
    ).toBe(true);
  });

  it('accepts a missing metadata field and rejects null metadata', () => {
    const { metadata, ...withoutMetadata } = validPayload;
    expect(SecurityEventAttachmentPayloadSchema.safeParse(withoutMetadata).success).toBe(true);
    expect(
      SecurityEventAttachmentPayloadSchema.safeParse({ ...validPayload, metadata: null }).success
    ).toBe(false);
  });

  it('rejects a wrong type literal', () => {
    expect(
      SecurityEventAttachmentPayloadSchema.safeParse({ ...validPayload, type: 'security.alert' })
        .success
    ).toBe(false);
  });

  it('rejects unknown top-level and metadata keys (strict)', () => {
    expect(
      SecurityEventAttachmentPayloadSchema.safeParse({ ...validPayload, extra: 'nope' }).success
    ).toBe(false);
    expect(
      SecurityEventAttachmentPayloadSchema.safeParse({
        ...validPayload,
        metadata: { index: 'logs-*', extra: 'nope' },
      }).success
    ).toBe(false);
  });

  it('rejects a wrong metadata.index type', () => {
    expect(
      SecurityEventAttachmentPayloadSchema.safeParse({ ...validPayload, metadata: { index: 123 } })
        .success
    ).toBe(false);
  });

  it('rejects a missing attachmentId or owner', () => {
    const { attachmentId, ...withoutAttachmentId } = validPayload;
    const { owner, ...withoutOwner } = validPayload;
    expect(SecurityEventAttachmentPayloadSchema.safeParse(withoutAttachmentId).success).toBe(false);
    expect(SecurityEventAttachmentPayloadSchema.safeParse(withoutOwner).success).toBe(false);
  });
});
