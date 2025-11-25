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
});

export interface AlertAttachmentData {
  alertId: string;
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
      const alertId = parseResult.data.alertId;
      if (!alertId) {
        return { valid: false, error: 'Invalid alert ID' };
      }

      return {
        valid: true,
        attachment: { mode: 'inline', data: { alertId } },
      };
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          return { type: 'text', value: `Alert ID: ${attachment.data.alertId}` };
        },
      };
    },
    getAttachment: async (attachment) => {
      return {
        getLlmRepresentation: () => {
          return {
            type: 'text',
            value: `${attachment.data.alertId}`,
          };
        },
        getTools: () => {
          // exposes the alert tool to the agent
          return [];
        },
        getMetadata: () => {
          return {};
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
