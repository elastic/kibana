/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentFormatContext } from '@kbn/agent-builder-server/attachments';
import {
  createSiemReadinessAttachmentType,
  SIEM_READINESS_ATTACHMENT_ID,
  siemReadinessAttachmentDataSchema,
} from './siem_readiness';

const mockFormatContext = {} as AttachmentFormatContext;

// ---- test fixtures ----

const coverageData = {
  dimension: 'coverage' as const,
  status: 'healthy' as const,
  summary: 'Coverage healthy.',
  items: [{ category: 'Endpoint', indices: [{ indexName: 'logs-endpoint-default', docs: 500 }] }],
  actionableFindings: [],
};

const qualityData = {
  dimension: 'quality' as const,
  status: 'actionsRequired' as const,
  summary: '1 of 2 indices incompatible.',
  items: [
    {
      indexName: 'logs-endpoint-default',
      incompatibleFieldCount: 3,
      totalFieldCount: 50,
      ecsFieldCount: 47,
      checkedAt: Date.now(),
    },
  ],
  actionableFindings: [
    {
      category: 'Endpoint',
      severity: 'warning' as const,
      message: '3 incompatible fields',
      resource: 'logs-endpoint-default',
    },
  ],
};

const continuityData = {
  dimension: 'continuity' as const,
  status: 'actionsRequired' as const,
  summary: 'One pipeline has failures.',
  items: [
    {
      name: 'endpoint-pipeline',
      indices: ['logs-endpoint-000001'],
      docsCount: 100,
      failedDocsCount: 5,
      statsAvailable: true,
    },
  ],
  actionableFindings: [
    {
      category: 'Endpoint',
      severity: 'critical' as const,
      message: '5 failed docs',
      resource: 'endpoint-pipeline',
    },
  ],
};

const retentionData = {
  dimension: 'retention' as const,
  status: 'actionsRequired' as const,
  summary: 'One data stream below threshold.',
  items: [
    {
      indexName: 'logs-cloud-default',
      isDataStream: true,
      retentionType: 'ilm' as const,
      retentionPeriod: '30d',
      retentionDays: 30,
      policyName: 'my-policy',
      status: 'non-compliant' as const,
    },
  ],
  actionableFindings: [
    {
      category: 'Cloud',
      severity: 'warning' as const,
      message: 'Retention below 365d',
      resource: 'logs-cloud-default',
    },
  ],
};

// ---- tests ----

describe('siemReadinessAttachmentDataSchema', () => {
  it('validates coverage data', () => {
    expect(siemReadinessAttachmentDataSchema.safeParse(coverageData).success).toBe(true);
  });

  it('validates quality data', () => {
    expect(siemReadinessAttachmentDataSchema.safeParse(qualityData).success).toBe(true);
  });

  it('validates continuity data', () => {
    expect(siemReadinessAttachmentDataSchema.safeParse(continuityData).success).toBe(true);
  });

  it('validates retention data', () => {
    expect(siemReadinessAttachmentDataSchema.safeParse(retentionData).success).toBe(true);
  });

  it('rejects data with an unknown dimension', () => {
    const bad = { ...coverageData, dimension: 'unknown' };
    expect(siemReadinessAttachmentDataSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects data missing required fields', () => {
    const { summary: _s, ...missing } = coverageData;
    expect(siemReadinessAttachmentDataSchema.safeParse(missing).success).toBe(false);
  });
});

describe('createSiemReadinessAttachmentType', () => {
  const attachmentType = createSiemReadinessAttachmentType();

  it('has the correct id', () => {
    expect(attachmentType.id).toBe(SIEM_READINESS_ATTACHMENT_ID);
  });

  describe('validate', () => {
    it('returns valid: true for valid coverage data', async () => {
      const result = await Promise.resolve(attachmentType.validate(coverageData));
      expect(result).toEqual({
        valid: true,
        data: expect.objectContaining({ dimension: 'coverage' }),
      });
    });

    it('returns valid: false for invalid data', async () => {
      const result = await Promise.resolve(attachmentType.validate({ dimension: 'unknown' }));
      expect(result.valid).toBe(false);
    });
  });

  describe('format — getRepresentation', () => {
    const makeAttachment = (data: unknown) => ({
      id: 'att-1',
      type: SIEM_READINESS_ATTACHMENT_ID,
      data,
    });

    it('formats coverage as text containing human-readable status and category', async () => {
      const formatted = await Promise.resolve(
        attachmentType.format(makeAttachment(coverageData), mockFormatContext)
      );
      const rep = await Promise.resolve(formatted.getRepresentation?.());
      expect(rep?.type).toBe('text');
      expect(rep?.value).toContain('Healthy'); // not 'healthy'
      expect(rep?.value).toContain('Endpoint');
    });

    it('formats quality as text containing human-readable status and findings', async () => {
      const formatted = await Promise.resolve(
        attachmentType.format(makeAttachment(qualityData), mockFormatContext)
      );
      const rep = await Promise.resolve(formatted.getRepresentation?.());
      expect(rep?.type).toBe('text');
      expect(rep?.value).toContain('Actions Required'); // not 'actionsRequired'
      expect(rep?.value).toContain('3 incompatible fields');
    });

    it('formats continuity as text containing human-readable status and pipeline info', async () => {
      const formatted = await Promise.resolve(
        attachmentType.format(makeAttachment(continuityData), mockFormatContext)
      );
      const rep = await Promise.resolve(formatted.getRepresentation?.());
      expect(rep?.type).toBe('text');
      expect(rep?.value).toContain('Actions Required'); // not 'actionsRequired'
      expect(rep?.value).toContain('endpoint-pipeline');
    });

    it('formats retention as text containing human-readable status and retention info', async () => {
      const formatted = await Promise.resolve(
        attachmentType.format(makeAttachment(retentionData), mockFormatContext)
      );
      const rep = await Promise.resolve(formatted.getRepresentation?.());
      expect(rep?.type).toBe('text');
      expect(rep?.value).toContain('Actions Required'); // not 'actionsRequired'
      expect(rep?.value).toContain('logs-cloud-default');
    });

    it('throws when data does not match any dimension schema', () => {
      expect(() =>
        attachmentType.format(makeAttachment({ dimension: 'bad' }), mockFormatContext)
      ).toThrow();
    });
  });
});
