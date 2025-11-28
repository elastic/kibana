/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';
import { OBSERVABILITY_ALERT_ATTACHMENT_TYPE } from '../../common/constants';

export const alertAttachmentDataSchema = z.object({
  alertId: z.string(),
  screenDescription: z.string().optional(),
  alertFieldsContent: z.string().optional(),
});

export interface AlertAttachmentData {
  alertId: string;
  screenDescription?: string;
  alertFieldsContent?: string;
}

export const createAlertAttachmentType = (): AttachmentTypeDefinition<
  typeof OBSERVABILITY_ALERT_ATTACHMENT_TYPE,
  AlertAttachmentData
> => {
  return {
    id: OBSERVABILITY_ALERT_ATTACHMENT_TYPE,
    validate: async (input) => {
      // TODO add validation

      const parseResult = alertAttachmentDataSchema.safeParse(input);
      if (!parseResult.success) {
        return { valid: false, error: parseResult.error.message };
      }

      if (!parseResult.data.alertId) {
        return { valid: false, error: 'alertId must be a non-empty string' };
      }

      return { valid: true, data: parseResult.data };
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          const data = attachment.data || {};
          const alertId = data.alertId || 'unknown';
          const screenDescription = data.screenDescription || '';
          const alertFieldsContent = data.alertFieldsContent || '';

          let content = '';
          if (screenDescription) {
            content += `${screenDescription}\n\n`;
          }
          if (alertFieldsContent) {
            content += `${alertFieldsContent}`;
          }

          return { type: 'text', value: content || `Alert ID: ${alertId}` };
        },
      };
    },
    getTools: () => {
      return [];
    },
    getAgentDescription: () => {
      return `Observability alert attachments provide context about an active alert that can be used to understand why the alert was triggered.`;
    },
  };
};
