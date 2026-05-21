/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { TimelineItem } from '@kbn/response-ops-alerts-table/types';

import { ESSENTIAL_ALERT_FIELDS } from '../../common';
import { SecurityAgentBuilderAttachments } from '../../common/constants';

export type BulkAlertsAttachmentInput = AttachmentInput<
  typeof SecurityAgentBuilderAttachments.alerts,
  { alertIds: string[]; attachmentLabel?: string }
>;

// 20 alerts per batch keeps each attachment well within maxContentLength: 50_000.
// With the framework's inline threshold of 5 active attachments, this means up to
// 100 alerts (5 batches × 20) are rendered inline in the LLM context without tool calls.
const DEFAULT_ALERTS_BATCH_SIZE = 20;

/**
 * Splits alert items into batches and returns one AttachmentInput per batch.
 * Only the first attachment is visible in the UI (chip); subsequent batches are hidden so the
 * user sees a single chip regardless of how many internal batches are created for the LLM.
 */
export const alertsToAttachmentInputs = (
  alertItems: TimelineItem[]
): BulkAlertsAttachmentInput[] => {
  const totalLabel = `${alertItems.length} Alert${alertItems.length !== 1 ? 's' : ''}`;
  const groupId = uuidv4();
  const batches: BulkAlertsAttachmentInput[] = [];
  for (let i = 0; i < alertItems.length; i += DEFAULT_ALERTS_BATCH_SIZE) {
    const batch = alertItems.slice(i, i + DEFAULT_ALERTS_BATCH_SIZE);
    batches.push({
      type: SecurityAgentBuilderAttachments.alerts,
      data: { alertIds: batch.map((a) => a._id), ...(i === 0 && { attachmentLabel: totalLabel }) },
      ...(i > 0 && { hidden: true }),
      groupId,
    });
  }
  return batches;
};

/**
 * Filters raw alert data to only include essential fields and stringifies the result.
 * This reduces context window usage by keeping only the most relevant information.
 */
export const stringifyEssentialAlertData = (rawData: Record<string, string[]>): string => {
  return JSON.stringify(pick(rawData, ESSENTIAL_ALERT_FIELDS));
};
