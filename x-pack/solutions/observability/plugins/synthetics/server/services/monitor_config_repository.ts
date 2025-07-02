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
  type SavedObjectsFindResponse,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { withApmSpan } from '@kbn/apm-data-access-plugin/server/utils/with_apm_span';
import { isEmpty, isEqual } from 'lodash';
import { parseArrayFilters } from '../routes/common';
import {
  legacySyntheticsMonitorTypeSingle,
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
  throw firstError?.reason || new Error('Unknown error');
};

export class MonitorConfigRepository {
  constructor(
    private soClient: SavedObjectsClientContract,
    private encryptedSavedObjectsClient: EncryptedSavedObjectsClient
  ) {}

  async get(id: string) {
    // we need to resolve both syntheticsMonitorSavedObjectType and legacySyntheticsMonitorTypeSingle
    const results = await this.soClient.bulkGet<EncryptedSyntheticsMonitorAttributes>([
      { type: syntheticsMonitorSavedObjectType, id },
      { type: legacySyntheticsMonitorTypeSingle, id },
    ]);
    const resolved = results.saved_objects.find((obj) => obj?.attributes);
    if (!resolved) {
      throw new Error('Monitor not found');
    }
    return resolved;
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

  async create({
    id,
    spaceId,
    normalizedMonitor,
    savedObjectType,
  }: {
    id: string;
    normalizedMonitor: SyntheticsMonitor;
    spaceId: string;
    savedObjectType?: string;
  }) {
    let { spaces } = normalizedMonitor;
    // Ensure spaceId is included in spaces
    if (isEmpty(spaces)) {
      spaces = [spaceId];
    } else if (!spaces?.includes(spaceId)) {
      spaces = [...(spaces ?? []), spaceId];
    }

    const opts: SavedObjectsCreateOptions = {
      id,
      ...(id && { overwrite: true }),
      ...(!isEmpty(spaces) && { initialNamespaces: spaces }),
    };

    return await this.soClient.create<EncryptedSyntheticsMonitorAttributes>(
      savedObjectType ?? syntheticsMonitorSavedObjectType,
      formatSecrets({
        ...normalizedMonitor,
        [ConfigKey.MONITOR_QUERY_ID]: normalizedMonitor[ConfigKey.CUSTOM_HEARTBEAT_ID] || id,
        [ConfigKey.CONFIG_ID]: id,
        revision: 1,
        [ConfigKey.KIBANA_SPACES]: spaces,
      }),
      opts
    );
  }

  async createBulk({
    monitors,
    savedObjectType,
  }: {
    monitors: Array<{ id: string; monitor: MonitorFields }>;
    savedObjectType?: string;
  }) {
    const newMonitors = monitors.map(({ id, monitor }) => ({
      id,
      type: savedObjectType ?? syntheticsMonitorSavedObjectType,
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

  async update(
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
      await this.soClient.delete(soType, id, { force: true });
      return await this.soClient.create(syntheticsMonitorSavedObjectType, data, {
        id,
        ...(!isEmpty(spaces) && { initialNamespaces: spaces }),
      });
    }
  }

  async bulkUpdate({
    monitors,
    namespace,
  }: {
    monitors: Array<{
      attributes: MonitorFields;
      id: string;
      soType: string;
    }>;
    namespace?: string;
  }) {
    return this.soClient.bulkUpdate<MonitorFields>(
      monitors.map(({ attributes, id, soType }) => ({
        type: soType,
        id,
        attributes,
        namespace,
      }))
    );
  }

  async find<T>(
    options: Omit<SavedObjectsFindOptions, 'type'>,
    soClient: SavedObjectsClientContract = this.soClient
  ): Promise<SavedObjectsFindResponse<T>> {
    const { page = 1, perPage = 5000, sortField } = options;

    return soClient.find<T>({
      ...options,
      type: syntheticsMonitorSOTypes,
      page,
      perPage,
      sortField,
    });
  }

  async findDecryptedMonitors({
    spaceId,
    configIds,
    locations,
  }: {
    spaceId: string;
    configIds?: string[];
    locations?: string[];
  }) {
    const filtersStr = parseArrayFilters({ configIds, locations });
    const finder =
      await this.encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<SyntheticsMonitorWithSecretsAttributes>(
        {
          filter: filtersStr,
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

  async bulkDelete(
    monitors: Array<{
      id: string;
      type: string;
    }>
  ) {
    return this.soClient.bulkDelete(monitors, {
      force: true,
    });
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
        type: [syntheticsMonitorSavedObjectType, legacySyntheticsMonitorTypeSingle],
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

  getAggs = () => {};
}
