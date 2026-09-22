/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { ALERTZERO_ATTACHMENT_TYPES } from '../../../common/constants';
import {
  threatAttachmentDataSchema,
  type ThreatAttachmentData,
} from '../../../common/threat_attachment_schema';
import { createReadonlyAttachmentType } from './create_readonly_attachment_type';

export const THREAT_ATTACHMENT_ID = ALERTZERO_ATTACHMENT_TYPES.threat;

const formatThreatForAgent = (data: ThreatAttachmentData): string => {
  const lines = ['Threat report reference', `Report id: ${data.report_id}`];
  if (data.title) {
    lines.push(`Title: ${data.title}`);
  }
  if (data.severity) {
    lines.push(`Severity: ${data.severity}`);
  }
  if (data.source) {
    lines.push(`Source: ${data.source}`);
  }
  lines.push(
    'The captured fields above are a fallback snapshot; the live report document is resolved ' +
      'space-projected by the viewer when rendered.'
  );
  return lines.join('\n');
};

const describePayload = `This attachment names a threat intelligence report by reference (by-reference semantics).
The payload contains:
- report_id: the id of the threat report this attachment points to
- title, severity, source (optional): a captured fallback snapshot taken at write time

The live report document is fetched space-projected at render time; the captured fields above
are only a fallback used when the live document cannot be resolved. Quote the captured fields
verbatim when discussing this attachment rather than restating the full report from memory.`;

export const createThreatAttachmentType = (): AttachmentTypeDefinition =>
  createReadonlyAttachmentType({
    id: THREAT_ATTACHMENT_ID,
    schema: threatAttachmentDataSchema,
    formatForAgent: formatThreatForAgent,
    describePayload,
    renderNoun: 'threat pill',
  });
