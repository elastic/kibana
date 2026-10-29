/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

/**
 * Holds every definition entity (environments, apps, credentials and flags), told apart by
 * `type`. A single tiny index avoids spending one shard per tiny dataset, and lets Fleet
 * Server pick up every change with one `updated_at` delta query.
 *
 * Document shape (`_id` is `<type>:<key>`, or `credential:<app>:<environment>`):
 *
 * ```
 * { type, created_at, updated_at, revision, <type>: { ...attributes } }
 * ```
 *
 * - `environment`: `{ key, name, description }`
 * - `app`: `{ key, name, description }`
 * - `credential`: `{ app, environment, sdk_key_hash, sdk_key_hint, client_id }`
 * - `flag`: the flag definition, plus `environment` (the keys of `flag.environments`,
 *   derived on write so flags can be filtered by environment) and `created_by`
 *   (the Kibana user recorded when the flag is created).
 *
 * `created_at`, `updated_at` and `revision` (incremented on every write) are owned by
 * the repository; the API never accepts them.
 */
export const DEFINITIONS_INDEX = '.feature-flags-definitions';

/**
 * One document per evaluation context that Fleet Server observed, with ID
 * `sha256(app|environment|context_key)`. Fleet Server writes it; Kibana reads it for
 * autocomplete and removes stale documents.
 */
export const OBSERVED_CONTEXTS_INDEX = '.feature-flags-observed-contexts';

/** Only the searchable fields are mapped; everything else stays only in `_source`. */
export const definitionsMappings: MappingTypeMapping = {
  dynamic: false,
  properties: {
    type: { type: 'keyword' },
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
    environment: {
      properties: {
        key: { type: 'keyword' },
        name: { type: 'keyword' },
      },
    },
    app: {
      properties: {
        key: { type: 'keyword' },
        name: { type: 'keyword' },
      },
    },
    credential: {
      properties: {
        app: { type: 'keyword' },
        environment: { type: 'keyword' },
        sdk_key_hash: { type: 'keyword' },
        client_id: { type: 'keyword' },
      },
    },
    flag: {
      properties: {
        key: { type: 'keyword' },
        name: { type: 'keyword' },
        apps: { type: 'keyword' },
        tags: { type: 'keyword' },
        created_by: {
          properties: {
            username: { type: 'keyword' },
          },
        },
        environment: { type: 'keyword' },
      },
    },
  },
};

export const observedContextsMappings: MappingTypeMapping = {
  dynamic: false,
  properties: {
    app: { type: 'keyword' },
    environment: { type: 'keyword' },
    context_key: { type: 'keyword' },
    context: { type: 'flattened' },
    attributes: { type: 'keyword' },
    attribute_types: { type: 'flattened' },
    first_seen: { type: 'date' },
    last_seen: { type: 'date' },
  },
};

interface IndexDefinition {
  index: string;
  mappings: MappingTypeMapping;
}

export const FEATURE_FLAGS_INDICES: readonly IndexDefinition[] = [
  { index: DEFINITIONS_INDEX, mappings: definitionsMappings },
  { index: OBSERVED_CONTEXTS_INDEX, mappings: observedContextsMappings },
];

const isAlreadyExistsError = (error: unknown) =>
  error instanceof errors.ResponseError &&
  error.body?.error?.type === 'resource_already_exists_exception';

const ensureIndex = async (
  esClient: ElasticsearchClient,
  { index, mappings }: IndexDefinition
): Promise<void> => {
  if (await esClient.indices.exists({ index })) {
    await esClient.indices.putMapping({ index, ...mappings });
    return;
  }
  try {
    await esClient.indices.create({
      index,
      settings: { number_of_shards: 1, 'index.hidden': true },
      mappings,
    });
  } catch (error) {
    // Another Kibana instance created it first.
    if (!isAlreadyExistsError(error)) {
      throw error;
    }
    await esClient.indices.putMapping({ index, ...mappings });
  }
};

/**
 * Creates the indices once, on first use. A failed attempt is retried by the next caller.
 */
export class IndexManager {
  private ready?: Promise<void>;

  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger,
    private readonly indices: readonly IndexDefinition[] = FEATURE_FLAGS_INDICES
  ) {}

  public ensureReady(): Promise<void> {
    if (!this.ready) {
      this.ready = Promise.all(this.indices.map((index) => ensureIndex(this.esClient, index))).then(
        () => this.logger.info('Feature flags indices created'),
        (error) => {
          this.ready = undefined;
          this.logger.error(`Unable to create the feature flags indices: ${error.message}`);
          throw error;
        }
      );
    }
    return this.ready;
  }
}
