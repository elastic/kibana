/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { ALERT_SEVERITY } from '@kbn/rule-data-utils';
import type { TimelineNonEcsData } from '../../../common/search_strategy';
import {
  AGENT_BUILDER_INTERNAL_API,
  AGENT_BUILDER_PUBLIC_API,
  INCIDENT_INVESTIGATION_TEMPLATE_ID,
} from '../constants';
import {
  buildAlertAttachmentInput,
  buildRawDataFromAlert,
  getAlertInvestigationTitle,
} from './build_alert_attachment';

export interface CreateInvestigationFromAlertParams {
  http: HttpSetup;
  ecsData: Ecs;
  nonEcsData: TimelineNonEcsData[];
}

/**
 * Creates a collaborative incident investigation conversation with the alert attached.
 * Persists the conversation via converse, then applies the incident triage template metadata.
 */
export const createInvestigationFromAlert = async ({
  http,
  ecsData,
  nonEcsData,
}: CreateInvestigationFromAlertParams): Promise<string> => {
  const conversationId = uuidv4();
  const rawData = buildRawDataFromAlert({ ecsData, nonEcsData });
  const ruleName = getAlertInvestigationTitle({ ecsData, nonEcsData });
  const attachment = buildAlertAttachmentInput({ ecsData, nonEcsData });

  await http.post(`${AGENT_BUILDER_PUBLIC_API}/converse`, {
    body: JSON.stringify({
      conversation_id: conversationId,
      attachments: [attachment],
    }),
    version: '2023-10-31',
  });

  const customFields: Record<string, string> = {
    status: 'open',
  };

  const severity = rawData[ALERT_SEVERITY]?.[0];
  if (severity) {
    customFields.severity = severity;
  }

  const affectedHost = rawData['host.name']?.[0];
  if (affectedHost) {
    customFields.affected_host = affectedHost;
  }

  await http.patch(`${AGENT_BUILDER_INTERNAL_API}/conversations/${conversationId}`, {
    body: JSON.stringify({
      title: ruleName,
      template_id: INCIDENT_INVESTIGATION_TEMPLATE_ID,
      custom_fields: customFields,
    }),
  });

  return conversationId;
};
