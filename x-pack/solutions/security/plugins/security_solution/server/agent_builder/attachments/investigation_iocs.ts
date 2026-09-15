/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { platformCoreTools } from '@kbn/agent-builder-common';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { SECURITY_ALERTS_TOOL_ID } from '../tools';
import { securityAttachmentDataSchema } from './security_attachment_data_schema';

/** Caps one category so a noisy host cannot flood the investigation. */
export const MAX_IOCS_PER_CATEGORY = 50;

const investigationIocSchema = z.object({
  /** The indicator itself: a hash, an address, a path, a command line, an account, a host name. */
  value: z.string().min(1).max(2048),
  /**
   * What makes this indicator meaningful — the role it played in the attack, what it was
   * identified as, where it was seen. A bare hash or address is not actionable on its own.
   */
  comment: z.string().max(1000).optional(),
});

const iocCategory = z.array(investigationIocSchema).max(MAX_IOCS_PER_CATEGORY).optional();

/**
 * Indicator categories, keyed so each one can be presented as its own labelled group. Every
 * category is optional: a reconstruction that found no ransom note simply omits `ransom_note`.
 */
export const investigationIocsAttachmentDataSchema = securityAttachmentDataSchema.extend({
  shas: iocCategory,
  ips: iocCategory,
  file_paths: iocCategory,
  ransom_note: iocCategory,
  encryption_marker: iocCategory,
  malicious_commands: iocCategory,
  compromised_identities: iocCategory,
  affected_hosts: iocCategory,
});

export type InvestigationIocsAttachmentData = z.infer<typeof investigationIocsAttachmentDataSchema>;

export type InvestigationIocCategory = keyof Omit<
  InvestigationIocsAttachmentData,
  'attachmentLabel'
>;

/** Ordered so the rendered list reads as the attack does: payload, infrastructure, impact, identity. */
export const INVESTIGATION_IOC_CATEGORY_LABELS: Record<InvestigationIocCategory, string> = {
  shas: 'SHA256',
  ips: 'IP addresses',
  file_paths: 'File paths',
  malicious_commands: 'Malicious command lines',
  ransom_note: 'Ransom notes',
  encryption_marker: 'Encryption markers',
  compromised_identities: 'Compromised identities',
  affected_hosts: 'Affected hosts',
};

const INVESTIGATION_IOC_CATEGORIES = Object.keys(
  INVESTIGATION_IOC_CATEGORY_LABELS
) as InvestigationIocCategory[];

const formatIocsForAgent = (data: InvestigationIocsAttachmentData): string => {
  const groups = INVESTIGATION_IOC_CATEGORIES.flatMap((category) => {
    const items = data[category];
    if (!items?.length) {
      return [];
    }
    return [
      `${INVESTIGATION_IOC_CATEGORY_LABELS[category]}:`,
      ...items.map(({ value, comment }) => `  ${value}${comment ? ` — ${comment}` : ''}`),
    ];
  });

  if (groups.length === 0) {
    return 'Extracted indicators of compromise\nNo indicators were extracted from the available telemetry.';
  }

  return ['Extracted indicators of compromise', ...groups].join('\n');
};

/**
 * Creates the definition for the `security.investigation.iocs` attachment type, which carries the
 * indicators a forensic reconstruction produced, grouped by category, for downstream hunts.
 */
export const createInvestigationIocsAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: SecurityAgentBuilderAttachments.investigationIocs,
    validate: (input) => {
      const parseResult = investigationIocsAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },
    format: (attachment) => {
      const parseResult = investigationIocsAttachmentDataSchema.safeParse(attachment.data);
      if (!parseResult.success) {
        throw new Error(
          `Invalid investigation IoC attachment data for attachment ${attachment.id}`
        );
      }
      const data = parseResult.data;
      return {
        getRepresentation: () => ({ type: 'text', value: formatIocsForAgent(data) }),
      };
    },
    getTools: () => [
      SECURITY_ALERTS_TOOL_ID,
      platformCoreTools.generateEsql,
      platformCoreTools.executeEsql,
    ],
    getAgentDescription: () => {
      return `A ${
        SecurityAgentBuilderAttachments.investigationIocs
      } attachment holds the indicators of compromise extracted for an investigation, grouped by category.

Each category is an optional list of { value, comment? }:
${INVESTIGATION_IOC_CATEGORIES.map(
  (category) => `- ${category}: ${INVESTIGATION_IOC_CATEGORY_LABELS[category]}`
).join('\n')}

A category that is absent means the reconstruction found nothing in it — do not read that as the indicator not existing anywhere.

\`comment\` carries what makes each indicator meaningful: what a hash was dropped as and where, which hosts contacted an address, how an identity was compromised and what it was then used for, a host's role in the incident. Always present the comment alongside the value; a bare hash or address on its own is not actionable.

Present the indicators grouped by category, one row per indicator. Every value is already verified against telemetry — cite them verbatim and never widen, defang, or normalize them. These indicators are the starting point for cross-environment hunts: to check whether they appear on other hosts, query them with ES|QL instead of asserting spread that is not in the attachment.`;
    },
  };
};
