/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isTypedAttachmentEntityString } from './attachment_entity_string';

describe('attachment_entity_string', () => {
  it('accepts allowlisted ECS field: value forms', () => {
    expect(isTypedAttachmentEntityString('user.name: jdoe')).toBe(true);
    expect(isTypedAttachmentEntityString('host.name:srv-01')).toBe(true);
    expect(isTypedAttachmentEntityString('user.email: dev-user@corp.example')).toBe(true);
    expect(isTypedAttachmentEntityString('service.id: svc-1')).toBe(true);
  });

  it('rejects EUID, ARN, bare identifiers, and empty values', () => {
    expect(isTypedAttachmentEntityString('dev-user')).toBe(false);
    expect(
      isTypedAttachmentEntityString('entity:generic:arn:aws:iam::123456789012:user/dev-user')
    ).toBe(false);
    expect(isTypedAttachmentEntityString('arn:aws:iam::123456789012:user/dev-user')).toBe(false);
    expect(isTypedAttachmentEntityString('user.name:')).toBe(false);
    expect(isTypedAttachmentEntityString('user.name:   ')).toBe(false);
    expect(isTypedAttachmentEntityString('')).toBe(false);
  });
});
