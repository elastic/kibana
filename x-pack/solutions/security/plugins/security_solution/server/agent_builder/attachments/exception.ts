/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { exceptionItemBaseSchema } from '@kbn/securitysolution-exceptions-common/workflows';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { securityAttachmentDataSchema } from './security_attachment_data_schema';

export const exceptionAttachmentDataSchema = securityAttachmentDataSchema.extend(
  exceptionItemBaseSchema.shape
);

export type ExceptionAttachmentData = z.infer<typeof exceptionAttachmentDataSchema>;

const isExceptionAttachmentData = (data: unknown): data is ExceptionAttachmentData =>
  exceptionAttachmentDataSchema.safeParse(data).success;

export const createExceptionAttachmentType = (): AttachmentTypeDefinition => ({
  id: SecurityAgentBuilderAttachments.exception,
  validate: (input) => {
    const parseResult = exceptionAttachmentDataSchema.safeParse(input);
    if (parseResult.success) {
      return { valid: true, data: parseResult.data };
    }
    return { valid: false, error: parseResult.error.message };
  },
  format: (attachment: Attachment<string, unknown>) => {
    const data = attachment.data;
    // AttachmentType enum is not yet registered for security attachments, so we validate manually.
    if (!isExceptionAttachmentData(data)) {
      throw new Error(`Invalid exception attachment data for attachment ${attachment.id}`);
    }
    return {
      getRepresentation: () => ({ type: 'text' as const, value: formatExceptionData(data) }),
    };
  },
  getTools: () => [],
  getAgentDescription: () =>
    `A ${SecurityAgentBuilderAttachments.exception} attachment holds a proposed detection rule exception that has not been created yet: a name, a description, and the conditions (\`entries\`) that must ALL match for the rule to stop alerting on an event.

Rendered inline, it shows the proposal's description followed by its conditions, laid out the way the Detection Rules UI lays out an exception item. Render it inline whenever the user asks to see, review, or check the proposed exception, instead of restating the conditions as prose.

The exception does not exist on the cluster: nothing is excluded from the rule until an analyst accepts the proposal. It cannot be edited or applied from chat, so treat it as read-only context and do not offer to change it.`,
  isReadonly: true,
});

const formatEntry = ({
  field,
  operator,
  value,
  values,
  list,
}: ExceptionAttachmentData['entries'][number]): string => {
  const operand = values?.join(', ') ?? value ?? (list ? `${list.type} list ${list.id}` : '');
  return `- ${field} ${operator}${operand ? ` ${operand}` : ''}`;
};

const formatExceptionData = (data: ExceptionAttachmentData): string => {
  const { name, description, entries, os_types: osTypes, tags, expire_time: expireTime } = data;

  return [
    `Proposed security rule exception: ${name}`,
    ...(description ? ['', description] : []),
    '',
    '## Conditions (all must match)',
    '',
    ...entries.map(formatEntry),
    ...(osTypes?.length ? ['', `Operating systems: ${osTypes.join(', ')}`] : []),
    ...(tags?.length ? [`Tags: ${tags.join(', ')}`] : []),
    ...(expireTime ? [`Expires: ${expireTime}`] : []),
  ].join('\n');
};
