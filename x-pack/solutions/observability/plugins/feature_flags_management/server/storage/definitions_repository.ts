/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type {
  AggregationsStringTermsAggregate,
  AggregationsStringTermsBucket,
  QueryDslQueryContainer,
  SearchHit,
  SortCombinations,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AppAttributes } from '../../common/schemas/apps';
import type { EnvironmentAttributes } from '../../common/schemas/environments';
import type { CreatedBy, FlagDefinition } from '../../common/schemas/flags';
import { conflictError, notFoundError } from '../errors';
import { prefixToIncludePattern } from '../lib/lucene_prefix';
import { DEFINITIONS_INDEX } from './indices';
import { decodeVersion, encodeVersion } from './version';

export type DefinitionType = 'environment' | 'app' | 'credential' | 'flag';

export interface StoredCredentialAttributes {
  app: string;
  environment: string;
  /** Hex-encoded SHA-256 of the full SDK key, including its `ffsdk-` prefix. */
  sdk_key_hash: string;
  sdk_key_hint: string;
  client_id: string;
}

export interface StoredFlagAttributes extends FlagDefinition {
  /** Keys of `environments`, derived on write so flags can be filtered by environment. */
  environment: string[];
  /** Recorded when the flag is created. Updates keep the original user. */
  created_by?: CreatedBy;
}

export interface DefinitionAttributes {
  environment: EnvironmentAttributes;
  app: AppAttributes;
  credential: StoredCredentialAttributes;
  flag: StoredFlagAttributes;
}

interface DocumentMetadata<T extends DefinitionType> {
  type: T;
  created_at: string;
  updated_at: string;
  /** Incremented on every write; used as the change-history `sequence`. */
  revision: number;
}

type AttributesByType<T extends DefinitionType> = Record<T, DefinitionAttributes[T]>;

export type DefinitionDocument<T extends DefinitionType> = DocumentMetadata<T> &
  AttributesByType<T>;

export interface StoredEntity<T extends DefinitionType> {
  id: string;
  type: T;
  attributes: DefinitionAttributes[T];
  created_at: string;
  updated_at: string;
  revision: number;
  version: string;
}

export interface WriteOptions {
  /** Version the caller last read. The write fails with a conflict if the document changed since. */
  version?: string;
}

export interface SearchOptions {
  query?: QueryDslQueryContainer;
  from?: number;
  size?: number;
  sort?: SortCombinations[];
}

/** Upper bound for {@link DefinitionsRepository.findAll}, which loads whole entity types in memory. */
export const FIND_ALL_LIMIT = 10_000;
const FIND_ALL_PAGE_SIZE = 1_000;

const DEFAULT_SORT: Record<DefinitionType, string> = {
  environment: 'environment.key',
  app: 'app.key',
  credential: 'credential.environment',
  flag: 'flag.key',
};

const isStatus = (error: unknown, statusCode: number) =>
  error instanceof errors.ResponseError && error.statusCode === statusCode;

export const definitionId = (type: DefinitionType, ...parts: string[]) =>
  [type, ...parts].join(':');

interface DefinitionsRepositoryDeps {
  esClient: ElasticsearchClient;
  ensureReady: () => Promise<void>;
  now?: () => Date;
}

/**
 * Reads and writes `.feature-flags-definitions`. It owns `created_at`, `updated_at` and
 * `revision`, enforces optimistic concurrency with `if_seq_no`/`if_primary_term`, and
 * waits for a refresh on every write so the next read sees it.
 */
export class DefinitionsRepository {
  private readonly esClient: ElasticsearchClient;
  private readonly ensureReady: () => Promise<void>;
  private readonly now: () => Date;

  constructor({ esClient, ensureReady, now = () => new Date() }: DefinitionsRepositoryDeps) {
    this.esClient = esClient;
    this.ensureReady = ensureReady;
    this.now = now;
  }

  public async get<T extends DefinitionType>(
    type: T,
    id: string
  ): Promise<StoredEntity<T> | undefined> {
    await this.ensureReady();
    const result = await this.esClient.get<DefinitionDocument<T>>(
      { index: DEFINITIONS_INDEX, id },
      { ignore: [404] }
    );
    if (!result.found || !result._source || result._source.type !== type) {
      return undefined;
    }
    return this.toEntity(type, {
      id: result._id,
      source: result._source,
      seqNo: result._seq_no,
      primaryTerm: result._primary_term,
    });
  }

  public async getOrThrow<T extends DefinitionType>(type: T, id: string): Promise<StoredEntity<T>> {
    const entity = await this.get(type, id);
    if (!entity) {
      throw notFoundError(`The ${type} [${id}] does not exist.`);
    }
    return entity;
  }

  public async mget<T extends DefinitionType>(
    type: T,
    ids: readonly string[]
  ): Promise<Map<string, StoredEntity<T>>> {
    const found = new Map<string, StoredEntity<T>>();
    if (ids.length === 0) {
      return found;
    }
    await this.ensureReady();
    const result = await this.esClient.mget<DefinitionDocument<T>>({
      index: DEFINITIONS_INDEX,
      ids: [...ids],
    });
    for (const doc of result.docs) {
      if ('found' in doc && doc.found && doc._source?.type === type) {
        found.set(
          doc._id,
          this.toEntity(type, {
            id: doc._id,
            source: doc._source,
            seqNo: doc._seq_no,
            primaryTerm: doc._primary_term,
          })
        );
      }
    }
    return found;
  }

  public async create<T extends DefinitionType>(
    type: T,
    id: string,
    attributes: DefinitionAttributes[T]
  ): Promise<StoredEntity<T>> {
    await this.ensureReady();
    const now = this.now().toISOString();
    const document = this.toDocument(type, attributes, {
      created_at: now,
      updated_at: now,
      revision: 1,
    });
    try {
      const result = await this.esClient.index({
        index: DEFINITIONS_INDEX,
        id,
        document,
        op_type: 'create',
        refresh: 'wait_for',
      });
      return this.toEntity(type, {
        id,
        source: document,
        seqNo: result._seq_no,
        primaryTerm: result._primary_term,
      });
    } catch (error) {
      if (isStatus(error, 409)) {
        throw conflictError(`The ${type} [${id}] already exists.`);
      }
      throw error;
    }
  }

  public async update<T extends DefinitionType>(
    type: T,
    id: string,
    attributes: DefinitionAttributes[T],
    { version }: WriteOptions = {}
  ): Promise<StoredEntity<T>> {
    const current = await this.getForWrite(type, id, version);
    const document = this.toDocument(type, attributes, {
      created_at: current.created_at,
      updated_at: this.now().toISOString(),
      revision: current.revision + 1,
    });
    const { seqNo, primaryTerm } = decodeVersion(current.version);
    try {
      const result = await this.esClient.index({
        index: DEFINITIONS_INDEX,
        id,
        document,
        if_seq_no: seqNo,
        if_primary_term: primaryTerm,
        refresh: 'wait_for',
      });
      return this.toEntity(type, {
        id,
        source: document,
        seqNo: result._seq_no,
        primaryTerm: result._primary_term,
      });
    } catch (error) {
      throw this.toConflict(error, type, id);
    }
  }

  /** Hard-deletes the document and returns its last state. */
  public async delete<T extends DefinitionType>(
    type: T,
    id: string,
    { version }: WriteOptions = {}
  ): Promise<StoredEntity<T>> {
    const current = await this.getForWrite(type, id, version);
    const { seqNo, primaryTerm } = decodeVersion(current.version);
    try {
      await this.esClient.delete({
        index: DEFINITIONS_INDEX,
        id,
        if_seq_no: seqNo,
        if_primary_term: primaryTerm,
        refresh: 'wait_for',
      });
      return current;
    } catch (error) {
      throw this.toConflict(error, type, id);
    }
  }

  public async search<T extends DefinitionType>(
    type: T,
    { query, from = 0, size = 100, sort }: SearchOptions = {}
  ): Promise<{ items: Array<StoredEntity<T>>; total: number }> {
    await this.ensureReady();
    const result = await this.esClient.search<DefinitionDocument<T>>({
      index: DEFINITIONS_INDEX,
      query: this.scopedQuery(type, query),
      from,
      size,
      sort: sort ?? [{ [DEFAULT_SORT[type]]: 'asc' }],
      seq_no_primary_term: true,
      track_total_hits: true,
    });
    const { total } = result.hits;
    return {
      items: result.hits.hits.flatMap((hit) => this.hitToEntity(type, hit)),
      total: typeof total === 'number' ? total : total?.value ?? 0,
    };
  }

  /**
   * Loads every document of a type (up to {@link FIND_ALL_LIMIT}) with `search_after`.
   * `_shard_doc` is the tiebreaker: sorting on `_id` needs fielddata, which Elasticsearch
   * disables by default (`indices.id_field_data.enabled`).
   */
  public async findAll<T extends DefinitionType>(
    type: T,
    query?: QueryDslQueryContainer
  ): Promise<Array<StoredEntity<T>>> {
    await this.ensureReady();
    const pit = await this.esClient.openPointInTime({
      index: DEFINITIONS_INDEX,
      keep_alive: '1m',
    });
    let pitId = pit.id;
    const items: Array<StoredEntity<T>> = [];
    let searchAfter: SearchHit['sort'];
    try {
      while (items.length < FIND_ALL_LIMIT) {
        const result = await this.esClient.search<DefinitionDocument<T>>({
          pit: { id: pitId, keep_alive: '1m' },
          query: this.scopedQuery(type, query),
          size: FIND_ALL_PAGE_SIZE,
          sort: [{ [DEFAULT_SORT[type]]: 'asc' }, '_shard_doc'],
          search_after: searchAfter,
          seq_no_primary_term: true,
          track_total_hits: false,
        });
        if (result.pit_id) {
          pitId = result.pit_id;
        }
        const { hits } = result.hits;
        items.push(...hits.flatMap((hit) => this.hitToEntity(type, hit)));
        if (hits.length < FIND_ALL_PAGE_SIZE) {
          break;
        }
        searchAfter = hits[hits.length - 1].sort;
      }
      return items;
    } finally {
      await this.esClient.closePointInTime({ id: pitId }).catch(() => undefined);
    }
  }

  /**
   * Distinct values of a keyword field, most frequent first.
   * `prefix` keeps values that start with it.
   */
  public async distinctValues(
    type: DefinitionType,
    field: string,
    { prefix, size }: { prefix?: string; size: number }
  ): Promise<string[]> {
    await this.ensureReady();
    const result = await this.esClient.search<
      unknown,
      { values: AggregationsStringTermsAggregate }
    >({
      index: DEFINITIONS_INDEX,
      size: 0,
      query: this.scopedQuery(type),
      aggs: {
        values: {
          terms: {
            field,
            size,
            ...(prefix ? { include: prefixToIncludePattern(prefix) } : {}),
          },
        },
      },
    });
    const buckets = result.aggregations?.values.buckets;
    if (!Array.isArray(buckets)) {
      return [];
    }
    return (buckets as AggregationsStringTermsBucket[]).flatMap((bucket) =>
      typeof bucket.key === 'string' ? [bucket.key] : []
    );
  }

  public async count(type: DefinitionType, query?: QueryDslQueryContainer): Promise<number> {
    await this.ensureReady();
    const result = await this.esClient.count({
      index: DEFINITIONS_INDEX,
      query: this.scopedQuery(type, query),
    });
    return result.count;
  }

  private async getForWrite<T extends DefinitionType>(
    type: T,
    id: string,
    version: string | undefined
  ): Promise<StoredEntity<T>> {
    const current = await this.getOrThrow(type, id);
    if (version !== undefined) {
      const expected = decodeVersion(version);
      const actual = decodeVersion(current.version);
      if (expected.seqNo !== actual.seqNo || expected.primaryTerm !== actual.primaryTerm) {
        throw conflictError(
          `The ${type} [${id}] was changed by someone else. Reload it and try again.`
        );
      }
    }
    return current;
  }

  private toConflict(error: unknown, type: DefinitionType, id: string) {
    if (isStatus(error, 409)) {
      return conflictError(
        `The ${type} [${id}] was changed by someone else. Reload it and try again.`
      );
    }
    if (isStatus(error, 404)) {
      return notFoundError(`The ${type} [${id}] does not exist.`);
    }
    return error;
  }

  private scopedQuery(
    type: DefinitionType,
    query?: QueryDslQueryContainer
  ): QueryDslQueryContainer {
    return { bool: { filter: [{ term: { type } }, ...(query ? [query] : [])] } };
  }

  private toDocument<T extends DefinitionType>(
    type: T,
    attributes: DefinitionAttributes[T],
    metadata: Omit<DocumentMetadata<T>, 'type'>
  ): DefinitionDocument<T> {
    // Attributes are nested under their type, so they can never override the metadata.
    const nested = { [type]: attributes } as AttributesByType<T>;
    return {
      ...nested,
      type,
      created_at: metadata.created_at,
      updated_at: metadata.updated_at,
      revision: metadata.revision,
    };
  }

  private hitToEntity<T extends DefinitionType>(
    type: T,
    hit: SearchHit<DefinitionDocument<T>>
  ): Array<StoredEntity<T>> {
    if (!hit._id || !hit._source) {
      return [];
    }
    return [
      this.toEntity(type, {
        id: hit._id,
        source: hit._source,
        seqNo: hit._seq_no,
        primaryTerm: hit._primary_term,
      }),
    ];
  }

  private toEntity<T extends DefinitionType>(
    type: T,
    {
      id,
      source,
      seqNo,
      primaryTerm,
    }: {
      id: string;
      source: DefinitionDocument<T>;
      seqNo: number | undefined;
      primaryTerm: number | undefined;
    }
  ): StoredEntity<T> {
    const nested: AttributesByType<T> = source;
    return {
      id,
      type,
      attributes: nested[type],
      created_at: source.created_at,
      updated_at: source.updated_at,
      revision: source.revision ?? 1,
      version: encodeVersion({ seqNo: seqNo ?? 0, primaryTerm: primaryTerm ?? 0 }),
    };
  }
}
