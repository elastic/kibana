/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isTypedAttachmentEntityString } from './attachment_entity_string';

describe('isTypedAttachmentEntityString', () => {
  it('accepts ECS-prefixed, EUID-wrapped, and AWS IAM ARN forms', () => {
    expect(isTypedAttachmentEntityString('user.name: jdoe')).toBe(true);
    expect(isTypedAttachmentEntityString('host.name:srv-01')).toBe(true);
    expect(isTypedAttachmentEntityString('entity:generic:host:ci-deploy-runner-07')).toBe(true);
    expect(isTypedAttachmentEntityString('entity:user:jdoe')).toBe(true);
    expect(isTypedAttachmentEntityString('host:ci-deploy-runner-07')).toBe(true);
    expect(isTypedAttachmentEntityString('arn:aws:iam::123456789012:user/dev-user')).toBe(true);
  });

  it('rejects bare identifiers and empty strings', () => {
    expect(isTypedAttachmentEntityString('dev-user')).toBe(false);
    expect(isTypedAttachmentEntityString('host-1')).toBe(false);
    expect(isTypedAttachmentEntityString('dev-user@corp.example')).toBe(false);
    expect(isTypedAttachmentEntityString('')).toBe(false);
    expect(isTypedAttachmentEntityString('   ')).toBe(false);
  });
});
