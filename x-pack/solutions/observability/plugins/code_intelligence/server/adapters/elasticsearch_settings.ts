/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from '@kbn/core/server';

import {
  DEFAULT_REPOSITORY_REF,
  type RepositorySettings,
  type RepositorySettingsInput,
} from '../../common/repository_settings';

/** Settings documents are few and small; one page lists them all. */
const MAX_LISTED_REPOSITORIES = 1_000;

export const settingsMappings: estypes.MappingTypeMapping = {
  dynamic: 'strict',
  properties: {
    repository: { type: 'keyword' },
    remoteUrl: { type: 'keyword' },
    defaultRef: { type: 'keyword' },
    enabled: { type: 'boolean' },
    githubConnectorId: { type: 'keyword' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
  },
};

/** Creates the settings index when it is missing, tolerating a concurrent creation by another instance. */
export const ensureSettingsIndex = async (
  client: ElasticsearchClient,
  index: string
): Promise<void> => {
  if (await client.indices.exists({ index })) return;
  try {
    await client.indices.create({ index, mappings: settingsMappings });
  } catch (error) {
    if (!(await client.indices.exists({ index }))) throw error;
  }
};

const toSettings = (
  source: Partial<RepositorySettings> | undefined
): RepositorySettings | undefined =>
  source === undefined ||
  typeof source.repository !== 'string' ||
  typeof source.remoteUrl !== 'string' ||
  typeof source.createdAt !== 'string' ||
  typeof source.updatedAt !== 'string'
    ? undefined
    : {
        repository: source.repository,
        remoteUrl: source.remoteUrl,
        defaultRef:
          typeof source.defaultRef === 'string' ? source.defaultRef : DEFAULT_REPOSITORY_REF,
        enabled: source.enabled !== false,
        ...(typeof source.githubConnectorId === 'string'
          ? { githubConnectorId: source.githubConnectorId }
          : {}),
        createdAt: source.createdAt,
        updatedAt: source.updatedAt,
      };

/** Reads and writes the one-document-per-repository settings index. Documents use the repository identity as `_id`. */
export class ElasticsearchRepositorySettingsStore {
  constructor(
    private readonly client: ElasticsearchClient,
    private readonly index: string,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  public async list(): Promise<RepositorySettings[]> {
    const result = await this.client.search<Partial<RepositorySettings>>(
      {
        index: this.index,
        size: MAX_LISTED_REPOSITORIES,
        query: { match_all: {} },
        sort: [{ repository: 'asc' }],
      },
      { ignore: [404] }
    );
    return (result.hits?.hits ?? []).flatMap(({ _source }) => toSettings(_source) ?? []);
  }

  public async get(repository: string): Promise<RepositorySettings | undefined> {
    const result = await this.client.get<Partial<RepositorySettings>>(
      { index: this.index, id: repository },
      { ignore: [404] }
    );
    return result.found ? toSettings(result._source) : undefined;
  }

  /** Adds or replaces one repository, keeping its original `createdAt`. Input must already be validated. */
  public async upsert(input: RepositorySettingsInput): Promise<RepositorySettings> {
    const existing = await this.get(input.repository);
    const now = this.now();
    const settings: RepositorySettings = {
      repository: input.repository,
      remoteUrl: input.remoteUrl,
      defaultRef: input.defaultRef ?? DEFAULT_REPOSITORY_REF,
      enabled: input.enabled ?? true,
      ...(input.githubConnectorId === undefined
        ? {}
        : { githubConnectorId: input.githubConnectorId }),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await this.client.index({
      index: this.index,
      id: input.repository,
      document: settings,
      refresh: 'wait_for',
    });
    return settings;
  }

  /** Removes one repository's settings; returns false when it did not exist. */
  public async delete(repository: string): Promise<boolean> {
    const result = await this.client.delete(
      { index: this.index, id: repository, refresh: 'wait_for' },
      { ignore: [404] }
    );
    return result.result === 'deleted';
  }
}
