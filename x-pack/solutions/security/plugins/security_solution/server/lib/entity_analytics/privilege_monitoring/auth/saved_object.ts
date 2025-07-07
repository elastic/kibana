/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsType } from '@kbn/core/server';
import type { EncryptedSavedObjectTypeRegistration } from '@kbn/encrypted-saved-objects-plugin/server';
import { v5 as uuidv5 } from 'uuid';

const PRIVMON_API_KEY_SO_ID = 'd2ee7992-cb4d-473a-8f1a-44ba187d4ac9';

export const getPrivmonEncryptedSavedObjectId = (space: string) => {
  return uuidv5(space, PRIVMON_API_KEY_SO_ID);
};

export const SO_PRIVILEGE_MONITORING_API_KEY_TYPE = 'privmon-api-key';

export const PrivilegeMonitoringApiKeyType: SavedObjectsType = {
  name: SO_PRIVILEGE_MONITORING_API_KEY_TYPE,
  hidden: true,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {},
  },
  management: {
    importableAndExportable: false,
    displayName: 'Privilege Monitoring API key',
  },
};

export const PrivilegeMonitoringApiKeyEncryptionParams: EncryptedSavedObjectTypeRegistration = {
  type: SO_PRIVILEGE_MONITORING_API_KEY_TYPE,
  attributesToEncrypt: new Set(['apiKey']),
  attributesToIncludeInAAD: new Set(['id', 'name']),
};
