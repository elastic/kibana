/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObject,
  SavedObjectsClientContract,
  type SavedObjectsCreateOptions,
  SavedObjectsFindOptions,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { withApmSpan } from '@kbn/apm-data-access-plugin/server/utils/with_apm_span';
import { isEqual } from 'lodash';
import {
  legacyMonitorAttributes,
  legacySyntheticsMonitorTypeSingle,
  syntheticsMonitorAttributes,
  syntheticsMonitorSavedObjectType,
  syntheticsMonitorSOTypes,
} from '../../common/types/saved_objects';
import { formatSecrets, normalizeSecrets } from '../synthetics_service/utils';
import {
  ConfigKey,
  EncryptedSyntheticsMonitorAttributes,
  MonitorFields,
  SyntheticsMonitor,
  SyntheticsMonitorWithSecretsAttributes,
} from '../../common/runtime_types';

const getSuccessfulResult = <T>(
  results: Array<PromiseSettledResult<T>>
): PromiseFulfilledResult<T>['value'] => {
  for (const result of results) {
    if (result.status === 'fulfilled') {
      return result.value;
    }
  }
  const firstError = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
  throw new Error(firstError?.reason || 'Unknown error');
};

export class MonitorConfigRepository {
  constructor(
    private soClient: SavedObjectsClientContract,
    private encryptedSavedObjectsClient: EncryptedSavedObjectsClient
  ) {}

  async get(id: string) {
    const results = await Promise.allSettled([
      this.soClient.get<EncryptedSyntheticsMonitorAttributes>(syntheticsMonitorSavedObjectType, id),
      this.soClient.get<EncryptedSyntheticsMonitorAttributes>(
        legacySyntheticsMonitorTypeSingle,
        id
      ),
    ]);

    return getSuccessfulResult(results);
  }

  async getDecrypted(
    id: string,
    spaceId: string
  ): Promise<{
    normalizedMonitor: SavedObject<SyntheticsMonitor>;
    decryptedMonitor: SavedObject<SyntheticsMonitorWithSecretsAttributes>;
  }> {
    const namespace = { namespace: spaceId };

    // Helper to attempt decryption and catch 404
    const tryGetDecrypted = async (soType: string) => {
      return await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<SyntheticsMonitorWithSecretsAttributes>(
        soType,
        id,
        namespace
      );
    };

    const results = await Promise.allSettled([
      tryGetDecrypted(syntheticsMonitorSavedObjectType),
      tryGetDecrypted(legacySyntheticsMonitorTypeSingle),
    ]);

    const decryptedMonitor = getSuccessfulResult(results);

    return {
      normalizedMonitor: normalizeSecrets(decryptedMonitor),
      decryptedMonitor,
    };
  }

  async create({ id, normalizedMonitor }: { id: string; normalizedMonitor: SyntheticsMonitor }) {
    const { spaces } = normalizedMonitor;
    const opts: SavedObjectsCreateOptions = {
      id,
      ...(id && { overwrite: true }),
      ...(spaces && { initialNamespaces: spaces }),
    };

    return await this.soClient.create<EncryptedSyntheticsMonitorAttributes>(
      syntheticsMonitorSavedObjectType,
      formatSecrets({
        ...normalizedMonitor,
        [ConfigKey.MONITOR_QUERY_ID]: normalizedMonitor[ConfigKey.CUSTOM_HEARTBEAT_ID] || id,
        [ConfigKey.CONFIG_ID]: id,
        revision: 1,
      }),
      opts
    );
  }

  async createBulk({ monitors }: { monitors: Array<{ id: string; monitor: MonitorFields }> }) {
    const newMonitors = monitors.map(({ id, monitor }) => ({
      id,
      type: syntheticsMonitorSavedObjectType,
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

  update(
    id: string,
    data: SyntheticsMonitorWithSecretsAttributes,
    decryptedPreviousMonitor: SavedObject<SyntheticsMonitorWithSecretsAttributes>
  ) {
    const soType = decryptedPreviousMonitor.type;
    const prevSpaces = (decryptedPreviousMonitor.namespaces || []).sort();
    const spaces = (data.spaces || []).sort();
    // If the spaces have changed, we need to delete the saved object and recreate it
    if (isEqual(prevSpaces, spaces)) {
      return this.soClient.update<MonitorFields>(soType, id, data);
    } else {
      return this.soClient.delete(soType, id).then(() => {
        return this.soClient.create(syntheticsMonitorSavedObjectType, data, {
          id,
          initialNamespaces: spaces,
        });
      });
    }
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
        type: syntheticsMonitorSavedObjectType,
        id,
        attributes,
      }))
    );
  }

  async find<T>(options: Omit<SavedObjectsFindOptions, 'type'>) {
    const findResult = this.soClient.find<T>({
      type: syntheticsMonitorSavedObjectType,
      ...options,
      perPage: options.perPage ?? 5000,
    });
    const legacyOptions = { ...options };
    if (legacyOptions.filter) {
      // replace all instances of syntheticsMonitorAttributes with legacyMonitorAttributes
      legacyOptions.filter = legacyOptions.filter.replace(
        new RegExp(syntheticsMonitorAttributes, 'g'),
        legacyMonitorAttributes
      );
    }
    const legacyFindResult = this.soClient.find<T>({
      type: legacySyntheticsMonitorTypeSingle,
      ...legacyOptions,
      perPage: legacyOptions.perPage ?? 5000,
    });
    const [result, legacyResult] = await Promise.all([findResult, legacyFindResult]);
    return {
      ...result,
      total: result.total + legacyResult.total,
      saved_objects: [...result.saved_objects, ...legacyResult.saved_objects],
    };
  }

  async findDecryptedMonitors({ spaceId, filter }: { spaceId: string; filter?: string }) {
    const finder =
      await this.encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<SyntheticsMonitorWithSecretsAttributes>(
        {
          filter,
          type: syntheticsMonitorSOTypes,
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
    return this.soClient.delete(syntheticsMonitorSavedObjectType, monitorId);
  }

  async bulkDelete(monitorIds: string[]) {
    return this.soClient.bulkDelete(
      monitorIds.map((monitor) => ({ type: syntheticsMonitorSavedObjectType, id: monitor }))
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
    const getConfigs = async (syntheticsMonitorType: string) => {
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
    };

    return withApmSpan('get_all_monitors', async () => {
      const [configs, legacyConfigs] = await Promise.all([
        getConfigs(syntheticsMonitorSavedObjectType),
        getConfigs(legacySyntheticsMonitorTypeSingle),
      ]);
      return [...configs, ...legacyConfigs];
    });
  }
}
