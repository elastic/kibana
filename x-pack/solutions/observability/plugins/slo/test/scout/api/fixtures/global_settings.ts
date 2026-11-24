/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { Client } from '@elastic/elasticsearch';

export const GLOBAL_SETTINGS_PATH = 'api/observability/slos/_global_settings';

const SAVED_OBJECT_INDEX = '.kibana';
const SAVED_OBJECT_DOC_ID = 'slo-global-settings:slo-global-settings-singleton';
const SYSTEM_INDICES_USER = 'slo_global_settings_system_indices';

interface StoredSliRetention {
  enabled: boolean;
  periodDays: number;
  updatedAt: string;
}

export interface GlobalSettingsStore {
  deleteStoredGlobalSettings: () => Promise<void>;
  storeSliRetention: (sliRetention: StoredSliRetention) => Promise<void>;
  cleanup: () => Promise<void>;
}

/**
 * The global settings saved object is hidden, so no HTTP API can read or write it, and the
 * superuser cannot write the restricted `.kibana` index: use a dedicated user (stateful only).
 */
export const createGlobalSettingsStore = async (esClient: Client): Promise<GlobalSettingsStore> => {
  const password = randomUUID();
  await esClient.security.putRole({
    name: SYSTEM_INDICES_USER,
    indices: [
      {
        names: [`${SAVED_OBJECT_INDEX}*`],
        privileges: ['all'],
        allow_restricted_indices: true,
      },
    ],
  });
  await esClient.security.putUser({
    username: SYSTEM_INDICES_USER,
    password,
    roles: [SYSTEM_INDICES_USER],
  });
  const credentials = Buffer.from(`${SYSTEM_INDICES_USER}:${password}`).toString('base64');
  const headers = { authorization: `Basic ${credentials}` };

  return {
    deleteStoredGlobalSettings: async () => {
      await esClient.delete(
        { index: SAVED_OBJECT_INDEX, id: SAVED_OBJECT_DOC_ID, refresh: 'wait_for' },
        { headers, ignore: [404] }
      );
    },
    storeSliRetention: async (sliRetention) => {
      await esClient.index(
        {
          index: SAVED_OBJECT_INDEX,
          id: SAVED_OBJECT_DOC_ID,
          refresh: 'wait_for',
          document: {
            type: 'slo-global-settings',
            'slo-global-settings': { sliRetention },
            typeMigrationVersion: '10.1.0',
            updated_at: sliRetention.updatedAt,
          },
        },
        { headers }
      );
    },
    cleanup: async () => {
      await esClient.security.deleteUser({ username: SYSTEM_INDICES_USER }, { ignore: [404] });
      await esClient.security.deleteRole({ name: SYSTEM_INDICES_USER }, { ignore: [404] });
    },
  };
};
