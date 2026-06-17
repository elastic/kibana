/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import type { AttachmentInput, AttachmentGroup } from '@kbn/agent-builder-common/attachments';
import type { TimelineItem } from '@kbn/response-ops-alerts-table/types';

import { ESSENTIAL_ALERT_FIELDS } from '../../common';
import { ALERTS_BATCH_MAX_SIZE, SecurityAgentBuilderAttachments } from '../../common/constants';

export type BulkAlertsAttachmentInput = AttachmentInput<
  typeof SecurityAgentBuilderAttachments.alerts,
  { alertIds: string[] }
>;

export const hashIds = (ids: string[]): number => {
  // Math.imul(1, x) applies ToInt32 — keeps the accumulator in signed 32-bit range each step.
  const signed = [...ids]
    .sort()
    .reduce(
      (h, id) => [...id].reduce((a, c) => Math.imul(1, Math.imul(31, a) + c.charCodeAt(0)), h),
      0
    );
  // Convert signed 32-bit to unsigned without the >>> bitwise operator (banned by no-bitwise).
  const uint32Max = 2 ** 32;
  return signed < 0 ? signed + uint32Max : signed;
};

const chunkAlerts = (alertItems: TimelineItem[]): BulkAlertsAttachmentInput[] => {
  const batches: BulkAlertsAttachmentInput[] = [];
  for (let i = 0; i < alertItems.length; i += ALERTS_BATCH_MAX_SIZE) {
    batches.push({
      type: SecurityAgentBuilderAttachments.alerts,
      data: { alertIds: alertItems.slice(i, i + ALERTS_BATCH_MAX_SIZE).map((a) => a._id) },
    });
  }
  return batches;
};

/**
 * Converts alert items into a single AttachmentGroup whose items are the chunked batches.
 * The group renders as one chip in the UI and is flattened to AttachmentInput[] at the
 * serialization boundary before being sent to the server.
 */
export const alertsToAttachmentGroup = (alertItems: TimelineItem[]): AttachmentGroup => ({
  type: 'group',
  id: `alerts:${hashIds(alertItems.map((a) => a._id))}`,
  label: `${alertItems.length} Alert${alertItems.length !== 1 ? 's' : ''}`,
  items: chunkAlerts(alertItems),
});

export const stringifyEssentialAlertData = (rawData: Record<string, string[]>): string =>
  JSON.stringify(pick(rawData, ESSENTIAL_ALERT_FIELDS));
