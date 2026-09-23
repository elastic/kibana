/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { SecurityAgentBuilderAttachments } from '../../../../common/constants';

export interface InvestigationIoc {
  value: string;
  comment?: string;
}

export const INVESTIGATION_IOC_CATEGORIES = [
  'shas',
  'ips',
  'file_paths',
  'malicious_commands',
  'ransom_note',
  'encryption_marker',
  'compromised_identities',
  'affected_hosts',
] as const;

export type InvestigationIocCategory = (typeof INVESTIGATION_IOC_CATEGORIES)[number];

export type InvestigationIocsAttachmentData = {
  attachmentLabel?: string;
} & Partial<Record<InvestigationIocCategory, InvestigationIoc[]>>;

export type InvestigationIocsAttachment = Attachment<
  typeof SecurityAgentBuilderAttachments.investigationIocs,
  InvestigationIocsAttachmentData
>;
