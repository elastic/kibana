/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import type { AttachmentInput, AttachmentGroup } from '@kbn/agent-builder-common/attachments';
import type { TimelineItem } from '@kbn/response-ops-alerts-table/types';

import { ESSENTIAL_ALERT_FIELDS } from '../../common';
import { ALERTS_BATCH_MAX_SIZE, SecurityAgentBuilderAttachments } from '../../common/constants';

export type BulkAlertsAttachmentInput = AttachmentInput<
  typeof SecurityAgentBuilderAttachments.alerts,
  { alertIds: string[] }
>;

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
  id: uuidv4(),
  label: `${alertItems.length} Alert${alertItems.length !== 1 ? 's' : ''}`,
  items: chunkAlerts(alertItems),
});

export const stringifyEssentialAlertData = (rawData: Record<string, string[]>): string =>
  JSON.stringify(pick(rawData, ESSENTIAL_ALERT_FIELDS));
