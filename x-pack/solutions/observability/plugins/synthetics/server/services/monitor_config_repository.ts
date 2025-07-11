/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObject,
  type SavedObjectsBulkCreateObject,
  SavedObjectsClientContract,
  type SavedObjectsCreateOptions,
  SavedObjectsFindOptions,
  type SavedObjectsFindResponse,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { withApmSpan } from '@kbn/apm-data-access-plugin/server/utils/with_apm_span';
import { isEmpty, isEqual } from 'lodash';
import { Logger } from '@kbn/logging';
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
  throw firstError?.reason || new Error('Unknown error');
};

export class MonitorConfigRepository {
  constructor(
    private soClient: SavedObjectsClientContract,
    private encryptedSavedObjectsClient: EncryptedSavedObjectsClient,
    private logger?: Logger // Replace with appropriate logger type
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
    const newMonitors: Array<SavedObjectsBulkCreateObject<EncryptedSyntheticsMonitorAttributes>> =
      monitors.map(({ id, monitor }) => {
        const { spaces } = monitor;

        return {
          id,
          type: savedObjectType ?? syntheticsMonitorSavedObjectType,
          attributes: formatSecrets({
            ...monitor,
            [ConfigKey.MONITOR_QUERY_ID]: monitor[ConfigKey.CUSTOM_HEARTBEAT_ID] || id,
            [ConfigKey.CONFIG_ID]: id,
            revision: 1,
          }),
          ...(!isEmpty(spaces) && { initialNamespaces: spaces }),
        };
      });
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
    types: string[] = syntheticsMonitorSOTypes,
    soClient: SavedObjectsClientContract = this.soClient
  ): Promise<SavedObjectsFindResponse<T>> {
    const promises: Array<Promise<SavedObjectsFindResponse<T>>> = types.map((type) => {
      const opts = {
        type,
        ...options,
        perPage: options.perPage ?? 5000,
      };
      return soClient.find<T>(this.handleLegacyOptions(opts, type));
    });
    const [result, legacyResult] = await Promise.all(promises);
    return {
      ...result,
      total: result.total + legacyResult.total,
      saved_objects: [...result.saved_objects, ...legacyResult.saved_objects],
    };
  }

  async findDecryptedMonitors({ spaceId, filter }: { spaceId: string; filter?: string }) {
    const getDecrypted = async (soType: string) => {
      // Handle legacy filter if the type is legacy
      const legacyFilter =
        soType === legacySyntheticsMonitorTypeSingle ? this.handleLegacyFilter(filter) : filter;
      const finder =
        await this.encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<SyntheticsMonitorWithSecretsAttributes>(
          {
            filter: legacyFilter,
            type: soType,
            perPage: 500,
            namespaces: [spaceId],
          }
        );

      const decryptedMonitors: Array<
        SavedObjectsFindResult<SyntheticsMonitorWithSecretsAttributes>
      > = [];
      for await (const result of finder.find()) {
        decryptedMonitors.push(...result.saved_objects);
      }

      finder.close().catch(() => {});

      return decryptedMonitors;
    };

    const [decryptedMonitors, legacyDecryptedMonitors] = await Promise.all([
      getDecrypted(syntheticsMonitorSavedObjectType),
      getDecrypted(legacySyntheticsMonitorTypeSingle),
    ]);
    return [...decryptedMonitors, ...legacyDecryptedMonitors];
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
    const getConfigs = async (syntheticsMonitorType: string) => {
      const findFilter =
        syntheticsMonitorType === legacySyntheticsMonitorTypeSingle
          ? this.handleLegacyFilter(filter)
          : filter;

      const finder = this.soClient.createPointInTimeFinder<T>({
        type: syntheticsMonitorType,
        perPage: 5000,
        search,
        sortField,
        sortOrder,
        fields,
        filter: findFilter,
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

  handleLegacyFilter = (filter?: string): string | undefined => {
    if (!filter) {
      return filter;
    }
    // Replace syntheticsMonitorAttributes with legacyMonitorAttributes in the filter
    return filter.replace(new RegExp(syntheticsMonitorAttributes, 'g'), legacyMonitorAttributes);
  };

  handleLegacyOptions(options: Omit<SavedObjectsFindOptions, 'type'>, type: string) {
    // convert the options to string and replace if the type is opposite of either of the synthetics monitor types
    try {
      const opts = JSON.stringify(options);
      if (type === syntheticsMonitorSavedObjectType) {
        return JSON.parse(
          opts.replace(new RegExp(legacyMonitorAttributes, 'g'), syntheticsMonitorAttributes)
        );
      } else if (type === legacySyntheticsMonitorTypeSingle) {
        return JSON.parse(
          opts.replace(new RegExp(syntheticsMonitorAttributes, 'g'), legacyMonitorAttributes)
        );
      }
    } catch (e) {
      this.logger?.error(`Error parsing handleLegacyOptions: ${e}`);
      return options;
    }
  }
}
