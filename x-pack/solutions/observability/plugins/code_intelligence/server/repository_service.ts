/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import type { BatchRepositoryRequest } from '../common/extraction_batch';
import {
  isSafeRevision,
  validateRepositorySettings,
  type RepositorySettings,
  type RepositorySettingsInput,
  type RepositorySettingsProblem,
} from '../common/repository_settings';
import {
  START_EXTRACTION_ERROR_CODES,
  type StartExtractionErrorCode,
} from '../common/start_extraction_errors';
import {
  ElasticsearchRepositorySettingsStore,
  ensureSettingsIndex,
} from './adapters/elasticsearch_settings';
import { ExtractionAlreadyRunningError } from './extraction_already_running_error';
import { ExtractionCapacityExhaustedError } from './extraction_capacity_exhausted_error';
import type { BatchRepository } from './extraction_service';
import { SourceUnavailableError } from './source_session';

/** A repository that an extraction batch may select. */
export type ExtractableRepository = Pick<
  RepositorySettings,
  'repository' | 'remoteUrl' | 'defaultRef' | 'enabled' | 'githubConnectorId'
>;

/** Lists the repositories a batch selects from: the configured ones when given, otherwise the settings index. */
export const listExtractableRepositories = async (
  client: ElasticsearchClient,
  settingsIndex: string,
  configuredRepositories: readonly ExtractableRepository[] | undefined
): Promise<readonly ExtractableRepository[]> =>
  configuredRepositories ??
  (await new ElasticsearchRepositorySettingsStore(client, settingsIndex).list());

/** Why a batch cannot start; `code` is absent for plain input errors. */
export interface ExtractionRefusal {
  readonly code?: StartExtractionErrorCode;
  readonly message: string;
  readonly repository?: string;
  readonly extractionId?: string;
}

export type ExtractionSelection =
  | { readonly ok: true; readonly selected: readonly BatchRepository[] }
  | ({ readonly ok: false } & ExtractionRefusal);

/**
 * Resolves the requested repositories against the settings. An empty request selects every
 * enabled repository at its default ref; named repositories are selected even when disabled.
 */
export const selectBatchRepositories = (
  requested: readonly BatchRepositoryRequest[],
  settings: readonly ExtractableRepository[]
): ExtractionSelection => {
  if (new Set(requested.map(({ repository }) => repository)).size !== requested.length) {
    return { ok: false, message: 'Each repository may appear only once.' };
  }
  const byIdentity = new Map(settings.map((entry) => [entry.repository, entry]));
  const entries: readonly BatchRepositoryRequest[] =
    requested.length === 0
      ? settings.filter(({ enabled }) => enabled).map(({ repository }) => ({ repository }))
      : requested;
  const selected: BatchRepository[] = [];
  for (const entry of entries) {
    const configured = byIdentity.get(entry.repository);
    if (configured === undefined) {
      return {
        ok: false,
        code: START_EXTRACTION_ERROR_CODES.repositoryNotConfigured,
        message: 'Repository is not configured.',
        repository: entry.repository,
      };
    }
    const revision = entry.revision ?? configured.defaultRef;
    if (!isSafeRevision(revision)) {
      return { ok: false, message: `Revision for ${entry.repository} is invalid.` };
    }
    selected.push({
      repository: configured.repository,
      revision,
      remoteUrl: configured.remoteUrl,
      ...(configured.githubConnectorId === undefined
        ? {}
        : { githubConnectorId: configured.githubConnectorId }),
    });
  }
  if (selected.length === 0) {
    return {
      ok: false,
      code: START_EXTRACTION_ERROR_CODES.noRepositories,
      message: 'No enabled repositories to extract.',
    };
  }
  return { ok: true, selected };
};

/** Maps a known `ExtractionService.start` failure to its refusal; `undefined` for unexpected errors. */
export const describeStartFailure = (error: unknown): ExtractionRefusal | undefined => {
  if (error instanceof ExtractionAlreadyRunningError) {
    return {
      code: START_EXTRACTION_ERROR_CODES.alreadyRunning,
      message: error.message,
      ...(error.extractionId === undefined ? {} : { extractionId: error.extractionId }),
    };
  }
  if (error instanceof ExtractionCapacityExhaustedError) {
    return { code: START_EXTRACTION_ERROR_CODES.capacityExhausted, message: error.message };
  }
  if (error instanceof SourceUnavailableError) {
    return { code: START_EXTRACTION_ERROR_CODES.sandboxUnavailable, message: error.message };
  }
  return undefined;
};

export type RepositoryUpsertResult =
  | { readonly ok: true; readonly repository: RepositorySettings }
  | { readonly ok: false; readonly problems: readonly RepositorySettingsProblem[] };

/** Validates and stores 1 repository, creating the settings index on first write. */
export const upsertRepository = async (
  client: ElasticsearchClient,
  settingsIndex: string,
  input: RepositorySettingsInput
): Promise<RepositoryUpsertResult> => {
  const problems = validateRepositorySettings(input);
  if (problems.length > 0) return { ok: false, problems };
  // Like the catalog, the settings index is created by the user who first writes to it.
  await ensureSettingsIndex(client, settingsIndex);
  const store = new ElasticsearchRepositorySettingsStore(client, settingsIndex);
  return { ok: true, repository: await store.upsert(input) };
};
