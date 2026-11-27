/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { securityAttachmentDataSchema } from './security_attachment_data_schema';

export const detonationAttachmentDataSchema = lazySchema(() =>
  securityAttachmentDataSchema.extend({
    /** Text summary of the detonation report. */
    report: z.string(),
  })
);

export type DetonationAttachmentData = z.infer<typeof detonationAttachmentDataSchema>;

/**
 * Creates the definition for the `security.detonation` attachment type: a detonation (sandbox)
 * report of a file.
 */
export const createDetonationAttachmentType = (): AttachmentTypeDefinition => ({
  id: SecurityAgentBuilderAttachments.detonation,
  validate: (input) => {
    const parseResult = detonationAttachmentDataSchema.safeParse(input);
    return parseResult.success
      ? { valid: true, data: parseResult.data }
      : { valid: false, error: parseResult.error.message };
  },
  format: (attachment: Attachment<string, unknown>) => {
    const parseResult = detonationAttachmentDataSchema.safeParse(attachment.data);
    if (!parseResult.success) {
      throw new Error(`Invalid detonation attachment data for attachment ${attachment.id}`);
    }
    return {
      getRepresentation: () => ({ type: 'text', value: parseResult.data.report }),
    };
  },
  getTools: () => [platformCoreTools.cases, platformCoreTools.productDocumentation],
  getAgentDescription: () =>
    'You have access to a detonation report: the behavior and verdict of a file that was run in an isolated sandbox. Use it to answer the user and to draft follow-up communication.',
});
