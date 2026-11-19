/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INDICATOR_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { IndicatorAttachmentPayloadSchema } from './indicator';

describe('IndicatorAttachmentPayloadSchema', () => {
  const validPayload = {
    type: INDICATOR_ATTACHMENT_TYPE,
    owner: 'securitySolution',
    attachmentId: 'indicator-1',
    metadata: {
      indicatorName: 'malware.exe',
      indicatorType: 'file',
      indicatorFeedName: '[Filebeat] AbuseCH Malware',
    },
  };

  it('accepts a minimal valid payload', () => {
    expect(IndicatorAttachmentPayloadSchema.safeParse(validPayload).success).toBe(true);
  });

  it('rejects when the top-level type is wrong', () => {
    const result = IndicatorAttachmentPayloadSchema.safeParse({
      ...validPayload,
      type: 'comment',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when `attachmentId` is missing', () => {
    const { attachmentId, ...rest } = validPayload;
    expect(IndicatorAttachmentPayloadSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects unknown top-level keys', () => {
    const result = IndicatorAttachmentPayloadSchema.safeParse({
      ...validPayload,
      extra: 'nope',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown metadata keys', () => {
    const result = IndicatorAttachmentPayloadSchema.safeParse({
      ...validPayload,
      metadata: { ...validPayload.metadata, unknown: 'nope' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects when a required metadata field is missing', () => {
    const result = IndicatorAttachmentPayloadSchema.safeParse({
      ...validPayload,
      metadata: { indicatorName: 'n', indicatorType: 't' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects when a metadata field has the wrong type', () => {
    const result = IndicatorAttachmentPayloadSchema.safeParse({
      ...validPayload,
      metadata: { ...validPayload.metadata, indicatorName: 123 },
    });
    expect(result.success).toBe(false);
  });
});
