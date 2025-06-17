/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import { useEffect } from 'react';
import { getUserConversationsExist } from '@kbn/elastic-assistant';
import { licenseService } from '../licence/use_licence';
import { useAssistantAvailability } from '../assistant_availability/use_assistant_availability';
import { useKibana } from '../../context/typed_kibana_context/typed_kibana_context';
import { createConversations } from '../../utils/create_conversation';

export const useMigrateConversationsFromLocalStorage = () => {
  const hasEnterpriseLicense = licenseService.isEnterprise();
  const assistantAvailability = useAssistantAvailability();
  const { http, notifications, storage } = useKibana().services;

  useEffect(() => {
    const migrateConversationsFromLocalStorage = once(async () => {
      if (
        hasEnterpriseLicense &&
        assistantAvailability.isAssistantEnabled &&
        assistantAvailability.hasAssistantPrivilege
      ) {
        const conversationsExist = await getUserConversationsExist({
          http,
        });
        if (!conversationsExist) {
          await createConversations(notifications, http, storage);
        }
      }
    });
    migrateConversationsFromLocalStorage();
  }, [
    assistantAvailability.hasAssistantPrivilege,
    assistantAvailability.isAssistantEnabled,
    hasEnterpriseLicense,
    http,
    notifications,
    storage,
  ]);
};
