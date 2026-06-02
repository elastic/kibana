/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_ENDPOINT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { EndpointAttachmentPayloadSchema } from './endpoint';

const validTarget = {
  endpointId: 'endpoint-1',
  hostname: 'host-1',
  agentType: 'endpoint' as const,
};

const validMetadata = {
  command: 'isolate',
  comment: 'Isolated host because of suspicious activity',
  targets: [validTarget],
};

const validPayload = {
  type: SECURITY_ENDPOINT_ATTACHMENT_TYPE,
  owner: 'securitySolution',
  attachmentId: 'action-1',
  metadata: validMetadata,
};

describe('EndpointAttachmentPayloadSchema', () => {
  it('accepts a valid payload', () => {
    expect(EndpointAttachmentPayloadSchema.safeParse(validPayload).success).toBe(true);
  });

  it('accepts each supported agent type', () => {
    for (const agentType of [
      'endpoint',
      'sentinel_one',
      'crowdstrike',
      'microsoft_defender_endpoint',
    ] as const) {
      expect(
        EndpointAttachmentPayloadSchema.safeParse({
          ...validPayload,
          metadata: { ...validMetadata, targets: [{ ...validTarget, agentType }] },
        }).success
      ).toBe(true);
    }
  });

  it('accepts multiple targets', () => {
    expect(
      EndpointAttachmentPayloadSchema.safeParse({
        ...validPayload,
        metadata: {
          ...validMetadata,
          targets: [
            { endpointId: '1', hostname: 'host-1', agentType: 'endpoint' },
            { endpointId: '2', hostname: 'host-2', agentType: 'sentinel_one' },
          ],
        },
      }).success
    ).toBe(true);
  });

  it('rejects when type literal is wrong', () => {
    expect(
      EndpointAttachmentPayloadSchema.safeParse({ ...validPayload, type: 'wrong' }).success
    ).toBe(false);
  });

  it('rejects missing attachmentId', () => {
    const { attachmentId, ...rest } = validPayload;
    expect(EndpointAttachmentPayloadSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects missing owner', () => {
    const { owner, ...rest } = validPayload;
    expect(EndpointAttachmentPayloadSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects empty targets array', () => {
    const result = EndpointAttachmentPayloadSchema.safeParse({
      ...validPayload,
      metadata: { ...validMetadata, targets: [] },
    });
    expect(result.success).toBe(false);
    expect(result.success ? '' : result.error.issues[0].message).toContain('at least one entry');
  });

  it('rejects missing command', () => {
    expect(
      EndpointAttachmentPayloadSchema.safeParse({
        ...validPayload,
        metadata: { comment: 'c', targets: validMetadata.targets },
      }).success
    ).toBe(false);
  });

  it('rejects missing comment', () => {
    expect(
      EndpointAttachmentPayloadSchema.safeParse({
        ...validPayload,
        metadata: { command: 'isolate', targets: validMetadata.targets },
      }).success
    ).toBe(false);
  });

  it('rejects unknown top-level metadata keys (strict)', () => {
    expect(
      EndpointAttachmentPayloadSchema.safeParse({
        ...validPayload,
        metadata: { ...validMetadata, extra: 'nope' },
      }).success
    ).toBe(false);
  });

  it('rejects unknown top-level payload keys (strict)', () => {
    expect(
      EndpointAttachmentPayloadSchema.safeParse({ ...validPayload, extra: 'nope' }).success
    ).toBe(false);
  });

  it('rejects unknown target keys (strict)', () => {
    expect(
      EndpointAttachmentPayloadSchema.safeParse({
        ...validPayload,
        metadata: {
          ...validMetadata,
          targets: [{ ...validTarget, extra: 'nope' }],
        },
      }).success
    ).toBe(false);
  });

  it('rejects an unknown agentType', () => {
    expect(
      EndpointAttachmentPayloadSchema.safeParse({
        ...validPayload,
        metadata: {
          ...validMetadata,
          targets: [{ endpointId: '1', hostname: 'host-1', agentType: 'not-a-real-agent' }],
        },
      }).success
    ).toBe(false);
  });
});
