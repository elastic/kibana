/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import { useEffect } from 'react';
import { getUserConversationsExist } from '@kbn/elastic-assistant';
import { createConversations } from './create_conversation';
import { useKibana } from '../../common/lib/kibana';
import { licenseService } from '../../common/hooks/use_license';
import { useAssistantAvailability } from '../use_assistant_availability';

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

export const MigrateConversationsFromLocalStorage = () => {
  useMigrateConversationsFromLocalStorage();
  return null;
};
