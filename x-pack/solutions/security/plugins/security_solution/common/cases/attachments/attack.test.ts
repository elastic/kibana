/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_ATTACK_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { AttackAttachmentPayloadSchema } from './attack';

describe('AttackAttachmentPayloadSchema', () => {
  const minimalPayload = {
    type: SECURITY_ATTACK_ATTACHMENT_TYPE,
    owner: 'securitySolution',
    attachmentId: 'attack-1',
    metadata: {
      title: 'Coordinated credential access',
      alertCount: 3,
      index: '.alerts-security.attack.discovery.alerts-default',
    },
  };

  it('accepts a payload with only the required fields', () => {
    expect(AttackAttachmentPayloadSchema.safeParse(minimalPayload).success).toBe(true);
  });

  it('accepts a payload with every optional metadata field populated', () => {
    expect(
      AttackAttachmentPayloadSchema.safeParse({
        ...minimalPayload,
        metadata: {
          ...minimalPayload.metadata,
          summaryMarkdown: 'An attacker **escalated** privileges on `host-1`.',
          riskScore: 73,
          entityCount: 2,
        },
      }).success
    ).toBe(true);
  });

  it('accepts an adhoc attack index', () => {
    expect(
      AttackAttachmentPayloadSchema.safeParse({
        ...minimalPayload,
        metadata: {
          ...minimalPayload.metadata,
          index: '.adhoc.alerts-security.attack.discovery.alerts-default',
        },
      }).success
    ).toBe(true);
  });

  it('rejects an unknown metadata key (strict)', () => {
    expect(
      AttackAttachmentPayloadSchema.safeParse({
        ...minimalPayload,
        metadata: { ...minimalPayload.metadata, severity: 'high' },
      }).success
    ).toBe(false);
  });

  it('rejects an unknown top-level key (strict)', () => {
    expect(
      AttackAttachmentPayloadSchema.safeParse({ ...minimalPayload, extra: 'nope' }).success
    ).toBe(false);
  });

  it('rejects a missing index', () => {
    const { index, ...metadataWithoutIndex } = minimalPayload.metadata;
    expect(
      AttackAttachmentPayloadSchema.safeParse({
        ...minimalPayload,
        metadata: metadataWithoutIndex,
      }).success
    ).toBe(false);
  });

  it('rejects missing metadata (metadata is required)', () => {
    const { metadata, ...payloadWithoutMetadata } = minimalPayload;
    expect(AttackAttachmentPayloadSchema.safeParse(payloadWithoutMetadata).success).toBe(false);
  });

  it('rejects a wrong type literal', () => {
    expect(
      AttackAttachmentPayloadSchema.safeParse({ ...minimalPayload, type: 'security.alert' }).success
    ).toBe(false);
  });

  it('rejects a summaryMarkdown longer than 2048 characters', () => {
    expect(
      AttackAttachmentPayloadSchema.safeParse({
        ...minimalPayload,
        metadata: { ...minimalPayload.metadata, summaryMarkdown: 'a'.repeat(2049) },
      }).success
    ).toBe(false);
  });
});
