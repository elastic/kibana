/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';

export const alertQualificationAttachmentDataSchema = z.object({
  alert: z.string(),
  alertId: z.string(),
  alertIndex: z.string(),
  ruleId: z.string(),
});

/**
 * Data for an alert qualification attachment.
 */
export type AlertQualificationAttachmentData = z.infer<typeof alertQualificationAttachmentDataSchema>;

/**
 * Type guard to narrow attachment data to AlertQualificationAttachmentData
 */
const isAlertQualificationAttachmentData = (data: unknown): data is AlertQualificationAttachmentData => {
  return alertQualificationAttachmentDataSchema.safeParse(data).success;
};

/**
 * Creates the definition for the `alert.qualification` attachment type.
 */
export const createAlertQualificationAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: SecurityAgentBuilderAttachments.alertQualification,
    validate: (input) => {
      const parseResult = alertQualificationAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment: Attachment<string, unknown>) => {
      // Extract data to allow proper type narrowing
      const data = attachment.data;
      // Necessary because we cannot currently use the AttachmentType type as agent is not
      // registered with enum AttachmentType in agentBuilder attachment_types.ts
      if (!isAlertQualificationAttachmentData(data)) {
        throw new Error(`Invalid alert qualification attachment data for attachment ${attachment.id}`);
      }
      return {
        getRepresentation: () => {
          return { type: 'text', value: formatQualificationData({
            data,
            attachment,
          }) };
        },
        getBoundedTools: () => [],
      };
    },
  };
};

/**
 * Formats qualification data for display.
 *
 * @param data - The alert qualification attachment data containing the qualification string
 * @returns Formatted string representation of the qualification data
 */
const formatQualificationData = ({ data, attachment }: { data: AlertQualificationAttachmentData, attachment: Attachment<string, unknown> }): string => {
  return `<attachment id="${attachment.id}">
  ${data.alert}
  </attachment>`;
};

