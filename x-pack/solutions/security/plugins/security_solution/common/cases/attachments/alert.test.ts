/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_ALERT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { SecurityAlertAttachmentPayloadSchema } from './alert';

/**
 * Subtype-specific sanity check. `buildAlertAttachmentPayloadSchema` is
 * comprehensively tested in `@kbn/cases-plugin` (v2.test.ts); these tests
 * only verify that the `security.alert` literal is wired correctly.
 */
describe('SecurityAlertAttachmentPayloadSchema', () => {
  const validPayload = {
    type: SECURITY_ALERT_ATTACHMENT_TYPE,
    owner: 'securitySolution',
    attachmentId: 'alert-1',
    metadata: {
      index: '.internal.alerts-security.alerts-default-000001',
      rule: { id: 'rule-1', name: 'Suspicious activity' },
    },
  };

  it('accepts a valid single-id and multi-id payload', () => {
    expect(SecurityAlertAttachmentPayloadSchema.safeParse(validPayload).success).toBe(true);
    expect(
      SecurityAlertAttachmentPayloadSchema.safeParse({
        ...validPayload,
        attachmentId: ['alert-1', 'alert-2'],
      }).success
    ).toBe(true);
  });

  it('rejects a wrong type literal (`security.alert` is the only accepted type)', () => {
    expect(
      SecurityAlertAttachmentPayloadSchema.safeParse({ ...validPayload, type: 'stack.alert' })
        .success
    ).toBe(false);
  });

  it('rejects unknown top-level keys (strict)', () => {
    expect(
      SecurityAlertAttachmentPayloadSchema.safeParse({ ...validPayload, extra: 'nope' }).success
    ).toBe(false);
  });
});
