/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type {
  ContinuityPayload,
  CoveragePayload,
  QualityPayload,
  RetentionInfo,
  RetentionPayload,
} from '@kbn/siem-readiness';
import { securityAttachmentDataSchema } from './security_attachment_data_schema';

export const SIEM_READINESS_ATTACHMENT_ID = 'security.siem_readiness';

// ---- Shared sub-schemas ----

const actionableFindingSchema = z.object({
  category: z.string(),
  severity: z.enum(['critical', 'warning']),
  message: z.string(),
  resource: z.string(),
});

// ---- Coverage ----

export const siemReadinessCoverageDataSchema = securityAttachmentDataSchema.extend({
  dimension: z.literal('coverage'),
  status: z.enum(['healthy', 'actionsRequired', 'noData']),
  summary: z.string(),
  items: z.array(
    z.object({
      category: z.string(),
      indices: z.array(z.object({ indexName: z.string(), docs: z.number() })),
    })
  ),
  actionableFindings: z.array(actionableFindingSchema).optional(),
});

// ---- Quality ----

export const siemReadinessQualityDataSchema = securityAttachmentDataSchema.extend({
  dimension: z.literal('quality'),
  status: z.enum(['healthy', 'actionsRequired', 'noData']),
  summary: z.string(),
  items: z.array(
    z.object({
      indexName: z.string(),
      incompatibleFieldCount: z.number(),
      totalFieldCount: z.number(),
      ecsFieldCount: z.number(),
      checkedAt: z.number(),
    })
  ),
  actionableFindings: z.array(actionableFindingSchema).optional(),
});

// ---- Continuity ----

export const siemReadinessContinuityDataSchema = securityAttachmentDataSchema.extend({
  dimension: z.literal('continuity'),
  status: z.enum(['healthy', 'actionsRequired', 'noData']),
  summary: z.string(),
  items: z.array(
    z.object({
      name: z.string(),
      indices: z.array(z.string()),
      docsCount: z.number(),
      failedDocsCount: z.number(),
      statsAvailable: z.boolean(),
    })
  ),
  actionableFindings: z.array(actionableFindingSchema).optional(),
});

// ---- Retention ----

export const siemReadinessRetentionDataSchema = securityAttachmentDataSchema.extend({
  dimension: z.literal('retention'),
  status: z.enum(['healthy', 'actionsRequired', 'noData']),
  summary: z.string(),
  items: z.array(
    z.object({
      indexName: z.string(),
      isDataStream: z.boolean(),
      retentionType: z.enum(['ilm', 'dsl']).nullable(),
      retentionPeriod: z.string().nullable(),
      retentionDays: z.number().nullable(),
      policyName: z.string().nullable(),
      status: z.enum(['healthy', 'non-compliant']),
      categories: z.array(z.string()).optional(),
    })
  ),
  actionableFindings: z.array(actionableFindingSchema).optional(),
});

// ---- Union schema ----

export const siemReadinessAttachmentDataSchema = z.discriminatedUnion('dimension', [
  siemReadinessCoverageDataSchema,
  siemReadinessQualityDataSchema,
  siemReadinessContinuityDataSchema,
  siemReadinessRetentionDataSchema,
]);

export type SiemReadinessAttachmentData = z.infer<typeof siemReadinessAttachmentDataSchema>;

// ---- Text format helpers ----

const formatCoverageForAgent = (data: CoveragePayload & { dimension: 'coverage' }): string => {
  const lines = [`SIEM Coverage — ${data.status}`, data.summary];
  data.items.forEach((cat) => {
    const totalDocs = cat.indices.reduce((sum, idx) => sum + idx.docs, 0);
    lines.push(
      `  ${cat.category}: ${totalDocs.toLocaleString()} docs across ${cat.indices.length} indices`
    );
  });
  if (data.actionableFindings?.length) {
    lines.push('Findings:');
    data.actionableFindings.forEach((f) => lines.push(`  [${f.severity}] ${f.message}`));
  }
  return lines.join('\n');
};

const formatQualityForAgent = (data: QualityPayload & { dimension: 'quality' }): string => {
  const lines = [`SIEM Quality — ${data.status}`, data.summary];
  if (data.actionableFindings?.length) {
    lines.push('Findings:');
    data.actionableFindings.forEach((f) => lines.push(`  [${f.severity}] ${f.message}`));
  }
  return lines.join('\n');
};

const formatContinuityForAgent = (
  data: ContinuityPayload & { dimension: 'continuity' }
): string => {
  const lines = [`SIEM Continuity — ${data.status}`, data.summary];
  if (data.actionableFindings?.length) {
    lines.push('Findings:');
    data.actionableFindings.forEach((f) => lines.push(`  [${f.severity}] ${f.message}`));
  }
  return lines.join('\n');
};

const formatRetentionForAgent = (data: RetentionPayload & { dimension: 'retention' }): string => {
  const lines = [`SIEM Retention — ${data.status}`, data.summary];

  // Group non-compliant items by their primary category for the agent.
  const nonCompliantByCategory = new Map<string, typeof data.items>();
  data.items.forEach((item) => {
    if (item.status === 'non-compliant') {
      const primaryCategory =
        (item as RetentionInfo & { categories?: string[] }).categories?.[0] ?? 'Uncategorized';
      const existing = nonCompliantByCategory.get(primaryCategory) ?? [];
      nonCompliantByCategory.set(primaryCategory, [...existing, item]);
    }
  });

  if (nonCompliantByCategory.size > 0) {
    lines.push('Non-compliant by category:');
    nonCompliantByCategory.forEach((items, category) => {
      lines.push(`  ${category}:`);
      items.forEach((item) => {
        const retention = item.retentionDays ? `${item.retentionDays}d` : 'no policy';
        lines.push(`    ${item.indexName} — ${retention} (threshold: 365d)`);
      });
    });
  }

  if (data.actionableFindings?.length) {
    lines.push('Findings:');
    data.actionableFindings.forEach((f) => lines.push(`  [${f.severity}] ${f.message}`));
  }
  return lines.join('\n');
};

const getAgentDescription = (): string => `
You have access to SIEM readiness data for one dimension (coverage, quality, continuity, or retention).
The attachment contains:
- dimension: which SIEM readiness dimension this data covers
- status: overall health verdict (healthy | actionsRequired | noData)
- summary: pre-computed narrative summary
- items: raw dimension data (pipelines, indices, data streams, or category groups)
- actionableFindings: pre-shaped findings with category, severity, message, and resource

Field mapping (tool output camelCase → attachment snake_case):
- pipeline name: name → pipeline_name
- failure rate: failedDocsCount / docsCount → failure_rate
- retention days: retentionDays → retention_days
- policy name: policyName → policy_name

Use these findings to answer dimension-specific questions. Always structure your response using the four-section format: Status → Summary → Findings by dimension then by category → Suggested Actions.
`;

// ---- Attachment type definition ----

export const createSiemReadinessAttachmentType = (): AttachmentTypeDefinition => ({
  id: SIEM_READINESS_ATTACHMENT_ID,
  validate: (input) => {
    const parseResult = siemReadinessAttachmentDataSchema.safeParse(input);
    if (parseResult.success) {
      return { valid: true, data: parseResult.data };
    }
    return { valid: false, error: parseResult.error.message };
  },
  format: (attachment: Attachment<string, unknown>) => {
    const parseResult = siemReadinessAttachmentDataSchema.safeParse(attachment.data);
    if (!parseResult.success) {
      throw new Error(`Invalid SIEM readiness attachment data for attachment ${attachment.id}`);
    }
    const data = parseResult.data;
    return {
      getRepresentation: () => {
        let text: string;
        switch (data.dimension) {
          case 'coverage':
            text = formatCoverageForAgent(data as CoveragePayload & { dimension: 'coverage' });
            break;
          case 'quality':
            text = formatQualityForAgent(data as QualityPayload & { dimension: 'quality' });
            break;
          case 'continuity':
            text = formatContinuityForAgent(
              data as ContinuityPayload & { dimension: 'continuity' }
            );
            break;
          case 'retention':
            text = formatRetentionForAgent(data as RetentionPayload & { dimension: 'retention' });
            break;
        }
        return { type: 'text', value: text };
      },
    };
  },
  getTools: () => [],
  getAgentDescription,
});
