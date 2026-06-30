/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { TimelineNonEcsData } from '../../../common/search_strategy';
import { AGENT_BUILDER_PUBLIC_API } from '../constants';
import { buildAlertAttachmentInput } from './build_alert_attachment';

export interface AttachAlertToInvestigationParams {
  http: HttpSetup;
  conversationId: string;
  ecsData: Ecs;
  nonEcsData: TimelineNonEcsData[];
}

export const attachAlertToInvestigation = async ({
  http,
  conversationId,
  ecsData,
  nonEcsData,
}: AttachAlertToInvestigationParams): Promise<{ attachment_id: string }> => {
  const attachment = buildAlertAttachmentInput({ ecsData, nonEcsData });

  return http.post<{ attachment_id: string }>(
    `${AGENT_BUILDER_PUBLIC_API}/conversations/${conversationId}/attachments`,
    {
      body: JSON.stringify({
        type: attachment.type,
        data: attachment.data,
        description: attachment.data?.attachmentLabel,
      }),
      version: '2023-10-31',
    }
  );
};
