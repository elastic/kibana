/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { Message } from '@kbn/elastic-assistant-common';
import { parse } from '@kbn/datemath';
import { bulkUpdateConversations, type Conversation } from '@kbn/elastic-assistant';
import { loadAllActions as loadConnectors } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import { i18n } from '@kbn/i18n';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { APP_ID } from '../../../common';
import { LOCAL_STORAGE_KEY } from '../helpers';

const LOCAL_CONVERSATIONS_MIGRATION_STATUS_TOAST_TITLE = i18n.translate(
  'xpack.securitySolution.assistant.conversationMigrationStatus.title',
  {
    defaultMessage: 'Local storage conversations persisted successfully.',
  }
);

export const createConversations = async (
  notifications: NotificationsStart,
  http: HttpSetup,
  storage: Storage
) => {
  // migrate conversations with messages from the local storage
  // won't happen next time
  const conversations = storage.get(`${APP_ID}.${LOCAL_STORAGE_KEY}`);

  if (conversations && Object.keys(conversations).length > 0) {
    const conversationsToCreate = Object.values(conversations).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) => c.messages && c.messages.length > 0
    );

    const transformMessage = (m: Message) => {
      const timestamp = parse(m.timestamp ?? '')?.toISOString();
      return {
        ...m,
        timestamp: timestamp == null ? new Date().toISOString() : timestamp,
      };
    };
    const connectors = await loadConnectors({ http });

    // post bulk create
    const bulkResult = await bulkUpdateConversations(
      http,
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: conversationsToCreate.reduce((res: Record<string, Conversation>, c: any) => {
          // ensure actionTypeId is added to apiConfig from legacy conversation data
          if (c.apiConfig && !c.apiConfig.actionTypeId) {
            const selectedConnector = (connectors ?? []).find(
              (connector) => connector.id === c.apiConfig.connectorId
            );
            if (selectedConnector) {
              c.apiConfig = {
                ...c.apiConfig,
                actionTypeId: selectedConnector.actionTypeId,
              };
            } else {
              c.apiConfig = undefined;
            }
          }
          res[c.id] = {
            ...c,
            messages: (c.messages ?? []).map(transformMessage),
            title: c.id,
            replacements: c.replacements,
          };
          return res;
        }, {}),
      },
      notifications.toasts
    );
    if (bulkResult && bulkResult.success) {
      storage.remove(`${APP_ID}.${LOCAL_STORAGE_KEY}`);
      notifications.toasts?.addSuccess({
        iconType: 'check',
        title: LOCAL_CONVERSATIONS_MIGRATION_STATUS_TOAST_TITLE,
      });
      return true;
    }
    return false;
  }
};
