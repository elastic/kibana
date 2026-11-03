/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { types } from '@kbn/storage-adapter';
import { defineInvestigationAttachment } from '@kbn/agentic-investigations-plugin/server';
import {
  NOTIFICATION_ROUTING_ATTACHMENT_TYPE,
  notificationRoutingSchema,
  type StoredNotificationRouting,
} from './notification_routing_schema';

export * from './notification_routing_schema';

const notificationRoutingStorageSettings = {
  name: '.kibana-nightshift-notification-routing',
  schema: {
    properties: {
      spaceId: types.keyword({}),
      conversationId: types.keyword({}),
      investigationId: types.keyword({}),
      destinations: types.object({ enabled: false }),
      executions: types.object({ enabled: false }),
      attempts: types.object({ enabled: false }),
    },
  },
};

export const notificationRoutingAttachment = defineInvestigationAttachment<
  typeof NOTIFICATION_ROUTING_ATTACHMENT_TYPE,
  typeof notificationRoutingStorageSettings,
  StoredNotificationRouting
>({
  type: NOTIFICATION_ROUTING_ATTACHMENT_TYPE,
  storageSettings: notificationRoutingStorageSettings,
  schema: notificationRoutingSchema,
  hiddenInConversation: true,
  maxContentLength: 500,
  agentDescription:
    'The workflow manages notification delivery. Do not send lifecycle notifications yourself.',
  format: ({ destinations }) =>
    `The investigation workflow manages lifecycle notifications to ${destinations.length} destination(s).`,
});
