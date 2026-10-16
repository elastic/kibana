/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getErrorMessage, getStatusCode } from '../errors';

/** A plain index for documents the engine updates in place, with a versioned mapping. */
export interface ManagedIndexDefinition {
  name: string;
  /** Bump it whenever `mappings` change; the mapping is then updated in place on next use. */
  version: number;
  mappings: estypes.MappingTypeMapping;
}

/** Creates the engine's mutable indices on first use, and upgrades their mappings. */
export interface IManagedIndexInstaller {
  /** Resolves once the index exists with the current mapping. Cheap after the first call. */
  ensure(definition: ManagedIndexDefinition): Promise<void>;
}

function isAlreadyExists(error: unknown): boolean {
  return getErrorMessage(error).includes('resource_already_exists_exception');
}

/**
 * One installer per Kibana process. Installs are idempotent, so the cache only saves round trips;
 * a failed install is forgotten so the next call retries it.
 */
export function createManagedIndexInstaller({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): IManagedIndexInstaller {
  const installs = new Map<string, Promise<void>>();

  const install = async ({ name, version, mappings }: ManagedIndexDefinition) => {
    const versioned = { ...mappings, _meta: { ...mappings._meta, version } };
    if (!(await esClient.indices.exists({ index: name }))) {
      try {
        await esClient.indices.create({
          index: name,
          // Shard and replica counts are left to the cluster: serverless rejects them.
          settings: { 'index.hidden': true },
          mappings: versioned,
        });
        logger.debug(`Created ${name} (mapping version ${version})`);
        return;
      } catch (error) {
        // Two Kibana nodes can race to create the index; the loser upgrades below instead.
        if (!isAlreadyExists(error)) {
          throw error;
        }
      }
    }
    const current = await esClient.indices.getMapping({ index: name });
    const installed = Object.values(current)[0]?.mappings?._meta?.version;
    if (typeof installed === 'number' && installed >= version) {
      return;
    }
    // Additive changes only; a breaking mapping change needs a new index name.
    try {
      await esClient.indices.putMapping({
        index: name,
        properties: versioned.properties,
        dynamic: versioned.dynamic,
        _meta: versioned._meta,
      });
      logger.info(`Updated the mapping of ${name} to version ${version}`);
    } catch (error) {
      if (getStatusCode(error) !== 403) {
        throw error;
      }
      // The Kibana system user cannot change mappings of indices it does not manage. The
      // mapping is not dynamic, so new fields are still stored, only not searchable.
      logger.warn(
        `Could not update the mapping of ${name} to version ${version}: the Kibana system user lacks "manage" on it. New fields are stored but not searchable until it is applied.`
      );
    }
  };

  return {
    ensure(definition) {
      const existing = installs.get(definition.name);
      if (existing) {
        return existing;
      }
      const pending = install(definition).catch((error) => {
        installs.delete(definition.name);
        throw error;
      });
      installs.set(definition.name, pending);
      return pending;
    },
  };
}
