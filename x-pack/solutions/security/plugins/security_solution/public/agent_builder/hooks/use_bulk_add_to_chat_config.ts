/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { BulkAddToChatConfig, TimelineItem } from '@kbn/response-ops-alerts-table/types';
import { alertsToAttachmentGroup } from '../helpers';
import { BULK_ALERTS_ATTACHMENT_PROMPT } from '../components/prompts';
import { type BulkAlertPathway, useReportAddToChat } from './use_report_add_to_chat';

export const useBulkAddToChatConfig = (pathway: BulkAlertPathway): BulkAddToChatConfig => {
  const reportAddToChat = useReportAddToChat();

  const convertAlertToAttachment = useCallback(
    (alertItems: TimelineItem[]) => {
      reportAddToChat({ pathway, attachments: ['alert'], item_count: alertItems.length });
      return [alertsToAttachmentGroup(alertItems)];
    },
    [pathway, reportAddToChat]
  );

  return {
    convertAlertToAttachment,
    initialMessage: BULK_ALERTS_ATTACHMENT_PROMPT,
  };
};
