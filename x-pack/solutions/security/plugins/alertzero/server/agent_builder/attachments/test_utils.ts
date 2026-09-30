/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type {
  AttachmentFormatContext,
  AttachmentTypeDefinition,
  TextAttachmentRepresentation,
} from '@kbn/agent-builder-server/attachments';

/**
 * Formats `data` through `attachmentType` and returns the plain text
 * representation. Shared by the server-side attachment tests that only
 * assert on the rendered text.
 */
export const formatToText = async (
  attachmentType: AttachmentTypeDefinition,
  formatContext: AttachmentFormatContext,
  data: unknown,
  id = 'test-id'
): Promise<string> => {
  const attachment: Attachment<string, unknown> = { id, type: attachmentType.id, data };
  const formatted = await attachmentType.format(attachment, formatContext);
  const representation = formatted.getRepresentation
    ? await formatted.getRepresentation()
    : { type: 'text', value: '' };

  return (representation as TextAttachmentRepresentation).value;
};
