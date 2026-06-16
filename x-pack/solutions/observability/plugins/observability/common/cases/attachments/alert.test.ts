/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_ALERT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { ObservabilityAlertAttachmentPayloadSchema } from './alert';

/**
 * Subtype-specific sanity check. `buildAlertAttachmentPayloadSchema` is
 * comprehensively tested in `@kbn/cases-plugin` (v2.test.ts); these tests
 * only verify that the `observability.alert` literal is wired correctly.
 */
describe('ObservabilityAlertAttachmentPayloadSchema', () => {
  const validPayload = {
    type: OBSERVABILITY_ALERT_ATTACHMENT_TYPE,
    owner: 'observability',
    attachmentId: 'alert-1',
    metadata: {
      index: '.internal.alerts-observability.metrics.alerts-default-000001',
      rule: { id: 'rule-1', name: 'High CPU' },
    },
  };

  it('accepts a valid single-id and multi-id payload', () => {
    expect(ObservabilityAlertAttachmentPayloadSchema.safeParse(validPayload).success).toBe(true);
    expect(
      ObservabilityAlertAttachmentPayloadSchema.safeParse({
        ...validPayload,
        attachmentId: ['alert-1', 'alert-2'],
      }).success
    ).toBe(true);
  });

  it('rejects a wrong type literal (`observability.alert` is the only accepted type)', () => {
    expect(
      ObservabilityAlertAttachmentPayloadSchema.safeParse({ ...validPayload, type: 'stack.alert' })
        .success
    ).toBe(false);
  });

  it('rejects unknown top-level keys (strict)', () => {
    expect(
      ObservabilityAlertAttachmentPayloadSchema.safeParse({ ...validPayload, extra: 'nope' })
        .success
    ).toBe(false);
  });
});
