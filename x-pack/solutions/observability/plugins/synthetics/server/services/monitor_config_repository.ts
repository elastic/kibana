/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { withApmSpan } from '@kbn/apm-data-access-plugin/server/utils/with_apm_span';
import { formatSecrets, normalizeSecrets } from '../synthetics_service/utils';
import { syntheticsMonitorType } from '../../common/types/saved_objects';
import {
  ConfigKey,
  EncryptedSyntheticsMonitorAttributes,
  MonitorFields,
  SyntheticsMonitor,
  SyntheticsMonitorWithSecretsAttributes,
} from '../../common/runtime_types';

export class MonitorConfigRepository {
  constructor(
    private soClient: SavedObjectsClientContract,
    private encryptedSavedObjectsClient: EncryptedSavedObjectsClient
  ) {}

  async get(id: string) {
    return await this.soClient.get<EncryptedSyntheticsMonitorAttributes>(syntheticsMonitorType, id);
  }

  async getDecrypted(id: string, spaceId: string): Promise<SavedObject<SyntheticsMonitor>> {
    const decryptedMonitor =
      await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<SyntheticsMonitorWithSecretsAttributes>(
        syntheticsMonitorType,
        id,
        {
          namespace: spaceId,
        }
      );
    return normalizeSecrets(decryptedMonitor);
  }

  async create({ id, normalizedMonitor }: { id: string; normalizedMonitor: SyntheticsMonitor }) {
    return await this.soClient.create<EncryptedSyntheticsMonitorAttributes>(
      syntheticsMonitorType,
      formatSecrets({
        ...normalizedMonitor,
        [ConfigKey.MONITOR_QUERY_ID]: normalizedMonitor[ConfigKey.CUSTOM_HEARTBEAT_ID] || id,
        [ConfigKey.CONFIG_ID]: id,
        revision: 1,
      }),
      id
        ? {
            id,
            overwrite: true,
          }
        : undefined
    );
  }

  async createBulk({ monitors }: { monitors: Array<{ id: string; monitor: MonitorFields }> }) {
    const newMonitors = monitors.map(({ id, monitor }) => ({
      id,
      type: syntheticsMonitorType,
      attributes: formatSecrets({
        ...monitor,
        [ConfigKey.MONITOR_QUERY_ID]: monitor[ConfigKey.CUSTOM_HEARTBEAT_ID] || id,
        [ConfigKey.CONFIG_ID]: id,
        revision: 1,
      }),
    }));
    const result = await this.soClient.bulkCreate<EncryptedSyntheticsMonitorAttributes>(
      newMonitors
    );
    return result.saved_objects;
  }

  async bulkUpdate({
    monitors,
  }: {
    monitors: Array<{
      attributes: MonitorFields;
      id: string;
    }>;
  }) {
    return await this.soClient.bulkUpdate<MonitorFields>(
      monitors.map(({ attributes, id }) => ({
        type: syntheticsMonitorType,
        id,
        attributes,
      }))
    );
  }

  find<T>(options: Omit<SavedObjectsFindOptions, 'type'>) {
    return this.soClient.find<T>({
      type: syntheticsMonitorType,
      ...options,
      perPage: options.perPage ?? 5000,
    });
  }

  async findDecryptedMonitors({ spaceId, filter }: { spaceId: string; filter?: string }) {
    const finder =
      await this.encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<SyntheticsMonitorWithSecretsAttributes>(
        {
          filter,
          type: syntheticsMonitorType,
          perPage: 500,
          namespaces: [spaceId],
        }
      );

    const decryptedMonitors: Array<SavedObjectsFindResult<SyntheticsMonitorWithSecretsAttributes>> =
      [];
    for await (const result of finder.find()) {
      decryptedMonitors.push(...result.saved_objects);
    }

    finder.close().catch(() => {});

    return decryptedMonitors;
  }

  async delete(monitorId: string) {
    return this.soClient.delete(syntheticsMonitorType, monitorId);
  }

  async bulkDelete(monitorIds: string[]) {
    return this.soClient.bulkDelete(
      monitorIds.map((monitor) => ({ type: syntheticsMonitorType, id: monitor }))
    );
  }

  async getAll<
    T extends EncryptedSyntheticsMonitorAttributes = EncryptedSyntheticsMonitorAttributes
  >({
    search,
    fields,
    filter,
    sortField = 'name.keyword',
    sortOrder = 'asc',
    searchFields,
    showFromAllSpaces,
  }: {
    search?: string;
    filter?: string;
    showFromAllSpaces?: boolean;
  } & Pick<SavedObjectsFindOptions, 'sortField' | 'sortOrder' | 'fields' | 'searchFields'>) {
    return withApmSpan('get_all_monitors', async () => {
      const finder = this.soClient.createPointInTimeFinder<T>({
        type: syntheticsMonitorType,
        perPage: 5000,
        search,
        sortField,
        sortOrder,
        fields,
        filter,
        searchFields,
        ...(showFromAllSpaces && { namespaces: ['*'] }),
      });

      const hits: Array<SavedObjectsFindResult<T>> = [];
      for await (const result of finder.find()) {
        hits.push(...result.saved_objects);
      }

      finder.close().catch(() => {});

      return hits;
    });
  }
}
