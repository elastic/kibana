/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type Type } from '@kbn/config-schema';
import type { IRouter, KibanaRequest } from '@kbn/core/server';

import {
  CATALOG_SEVERITIES,
  CATALOG_SEVERITY_RANGES,
  CATALOG_SIGNAL_TYPES,
  MAX_CATALOG_REPOSITORY_FILTERS,
  type CatalogSeverity,
  type CatalogSignalType,
} from '../common/catalog_filters';
import { MAX_BATCH_REPOSITORIES } from '../common/extraction_batch';
import {
  MAX_CONNECTOR_ID_LENGTH,
  MAX_REMOTE_URL_LENGTH,
  MAX_REPOSITORY_IDENTITY_LENGTH,
  MAX_REVISION_LENGTH,
  isRepositoryIdentity,
  isSafeRevision,
  validateRepositorySettings,
  type RepositorySettings,
} from '../common/repository_settings';
import {
  START_EXTRACTION_ERROR_CODES,
  type StartExtractionErrorAttributes,
} from '../common/start_extraction_errors';
import { ElasticsearchCatalogWriter } from './adapters/elasticsearch_catalog';
import {
  ElasticsearchRepositorySettingsStore,
  ensureSettingsIndex,
} from './adapters/elasticsearch_settings';
import { ExtractionAlreadyRunningError } from './extraction_already_running_error';
import { ExtractionCapacityExhaustedError } from './extraction_capacity_exhausted_error';
import type { BatchRepository, ExtractionService } from './extraction_service';
import { SourceUnavailableError } from './source_session';

const errorAttributes = (
  attributes: StartExtractionErrorAttributes
): StartExtractionErrorAttributes & Record<string, unknown> => ({ ...attributes });

const repositoryIdentity = schema.string({
  minLength: 3,
  maxLength: MAX_REPOSITORY_IDENTITY_LENGTH,
});
const revision = schema.string({ minLength: 1, maxLength: MAX_REVISION_LENGTH });
const identitySegment = schema.string({ minLength: 1, maxLength: MAX_REPOSITORY_IDENTITY_LENGTH });
const repositoryParams = schema.object({ owner: identitySegment, name: identitySegment });

/** A repeated query parameter arrives as an array, a single one as a plain value. */
const oneOrMany = <T>(type: Type<T>, maxSize: number) =>
  schema.oneOf([type, schema.arrayOf(type, { minSize: 1, maxSize })]);

const signalType: Type<CatalogSignalType> = schema.oneOf([
  schema.literal('log'),
  schema.literal('trace'),
  schema.literal('metric'),
]);
const severity: Type<CatalogSeverity> = schema.oneOf([
  schema.literal('low'),
  schema.literal('medium'),
  schema.literal('high'),
  schema.literal('critical'),
]);

const asArray = <T>(value: T | readonly T[] | undefined): readonly T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value as T];

/** A repository that an extraction batch may select. */
export type ExtractableRepository = Pick<
  RepositorySettings,
  'repository' | 'remoteUrl' | 'defaultRef' | 'enabled' | 'githubConnectorId'
>;

/** Services available once the plugin has started; extraction is absent when its source is unavailable. */
export interface RouteServices {
  readonly extractionService?: ExtractionService;
  /** Replaces the settings index as the extraction selection source, for the `local_git` source. */
  readonly configuredRepositories?: readonly ExtractableRepository[];
  /** Explains why extraction is unavailable, for example a missing `xpack.sandbox` configuration. */
  readonly extractionUnavailableReason?: string;
  readonly getSpaceId: (request: KibanaRequest) => string;
}

export const registerRoutes = ({
  catalogIndex,
  settingsIndex,
  getServices,
  router,
}: {
  readonly catalogIndex: string;
  readonly settingsIndex: string;
  readonly getServices: () => RouteServices;
  readonly router: IRouter;
}): void => {
  router.get(
    {
      path: '/internal/code_intelligence/repositories',
      options: { access: 'internal', description: 'Lists every repository in the settings index.' },
      security: { authz: { enabled: false, reason: 'This private route is feature gated.' } },
      validate: false,
    },
    async (context, _request, response) => {
      const { elasticsearch } = await context.core;
      const store = new ElasticsearchRepositorySettingsStore(
        elasticsearch.client.asCurrentUser,
        settingsIndex
      );
      return response.ok({ body: { repositories: await store.list() } });
    }
  );

  router.put(
    {
      path: '/internal/code_intelligence/repositories/{owner}/{name}',
      options: {
        access: 'internal',
        description:
          'Adds or replaces the settings of the repository `{owner}/{name}`. The body `repository` must match the path.',
      },
      security: { authz: { enabled: false, reason: 'This private route is feature gated.' } },
      validate: {
        params: repositoryParams,
        body: schema.object({
          repository: repositoryIdentity,
          remoteUrl: schema.string({ minLength: 1, maxLength: MAX_REMOTE_URL_LENGTH }),
          defaultRef: schema.maybe(revision),
          enabled: schema.maybe(schema.boolean()),
          githubConnectorId: schema.maybe(
            schema.string({ minLength: 1, maxLength: MAX_CONNECTOR_ID_LENGTH })
          ),
        }),
      },
    },
    async (context, request, response) => {
      const identity = `${request.params.owner}/${request.params.name}`;
      if (identity !== request.body.repository) {
        return response.badRequest({
          body: { message: 'The repository in the path must match the repository in the body.' },
        });
      }
      const problems = validateRepositorySettings(request.body);
      if (problems.length > 0) {
        return response.badRequest({
          body: {
            message: problems.map(({ message }) => message).join(' '),
            attributes: { problems },
          },
        });
      }
      const { elasticsearch } = await context.core;
      const client = elasticsearch.client.asCurrentUser;
      // Like the catalog, the settings index is created by the user who first writes to it.
      await ensureSettingsIndex(client, settingsIndex);
      const store = new ElasticsearchRepositorySettingsStore(client, settingsIndex);
      return response.ok({ body: { repository: await store.upsert(request.body) } });
    }
  );

  router.delete(
    {
      path: '/internal/code_intelligence/repositories/{owner}/{name}',
      options: {
        access: 'internal',
        description:
          'Removes the settings of the repository `{owner}/{name}`. Its documents in the catalog index are not deleted.',
      },
      security: { authz: { enabled: false, reason: 'This private route is feature gated.' } },
      validate: { params: repositoryParams },
    },
    async (context, request, response) => {
      const identity = `${request.params.owner}/${request.params.name}`;
      if (!isRepositoryIdentity(identity)) {
        return response.badRequest({ body: { message: 'Repository identity is invalid.' } });
      }
      const { elasticsearch } = await context.core;
      const store = new ElasticsearchRepositorySettingsStore(
        elasticsearch.client.asCurrentUser,
        settingsIndex
      );
      return (await store.delete(identity))
        ? response.ok({ body: { deleted: true } })
        : response.notFound({ body: { message: 'Repository was not found.' } });
    }
  );

  router.post(
    {
      path: '/internal/code_intelligence/extractions',
      options: {
        access: 'internal',
        description:
          'Starts 1 extraction batch. Without `repositories`, the batch covers every enabled repository at its default ref.',
      },
      security: { authz: { enabled: false, reason: 'This private route is feature gated.' } },
      validate: {
        body: schema.object({
          repositories: schema.maybe(
            schema.arrayOf(
              schema.object({ repository: repositoryIdentity, revision: schema.maybe(revision) }),
              { maxSize: MAX_BATCH_REPOSITORIES }
            )
          ),
        }),
      },
    },
    async (context, request, response) => {
      const { configuredRepositories, extractionService, extractionUnavailableReason, getSpaceId } =
        getServices();
      const sourceUnavailable = (message: string) =>
        response.customError({
          statusCode: 503,
          body: {
            message,
            attributes: errorAttributes({ code: START_EXTRACTION_ERROR_CODES.sandboxUnavailable }),
          },
        });
      if (extractionService === undefined) {
        return sourceUnavailable(extractionUnavailableReason ?? 'Extraction is unavailable.');
      }
      const requested = request.body.repositories ?? [];
      if (new Set(requested.map(({ repository }) => repository)).size !== requested.length) {
        return response.badRequest({ body: { message: 'Each repository may appear only once.' } });
      }
      const { elasticsearch } = await context.core;
      const settings: readonly ExtractableRepository[] =
        configuredRepositories ??
        (await new ElasticsearchRepositorySettingsStore(
          elasticsearch.client.asCurrentUser,
          settingsIndex
        ).list());
      const byIdentity = new Map(settings.map((entry) => [entry.repository, entry]));
      const selected: BatchRepository[] = [];
      for (const entry of requested.length === 0
        ? settings.filter(({ enabled }) => enabled).map(({ repository }) => ({ repository }))
        : requested) {
        const configured = byIdentity.get(entry.repository);
        if (configured === undefined) {
          return response.badRequest({
            body: {
              message: 'Repository is not configured.',
              attributes: errorAttributes({
                code: START_EXTRACTION_ERROR_CODES.repositoryNotConfigured,
                repository: entry.repository,
              }),
            },
          });
        }
        const entryRevision =
          ('revision' in entry ? entry.revision : undefined) ?? configured.defaultRef;
        if (!isSafeRevision(entryRevision)) {
          return response.badRequest({
            body: { message: `Revision for ${entry.repository} is invalid.` },
          });
        }
        selected.push({
          repository: configured.repository,
          revision: entryRevision,
          remoteUrl: configured.remoteUrl,
          ...(configured.githubConnectorId === undefined
            ? {}
            : { githubConnectorId: configured.githubConnectorId }),
        });
      }
      if (selected.length === 0) {
        return response.badRequest({
          body: {
            message: 'No enabled repositories to extract.',
            attributes: errorAttributes({ code: START_EXTRACTION_ERROR_CODES.noRepositories }),
          },
        });
      }
      try {
        const id = await extractionService.start(
          selected,
          request,
          getSpaceId(request),
          new ElasticsearchCatalogWriter(elasticsearch.client.asCurrentUser, catalogIndex)
        );
        return response.accepted({ body: { id } });
      } catch (error) {
        if (error instanceof ExtractionAlreadyRunningError) {
          return response.conflict({
            body: {
              message: error.message,
              attributes: errorAttributes({
                code: START_EXTRACTION_ERROR_CODES.alreadyRunning,
                ...(error.extractionId === undefined ? {} : { extractionId: error.extractionId }),
              }),
            },
          });
        }
        if (error instanceof ExtractionCapacityExhaustedError) {
          return response.customError({
            statusCode: 429,
            body: {
              message: error.message,
              attributes: errorAttributes({ code: START_EXTRACTION_ERROR_CODES.capacityExhausted }),
            },
          });
        }
        if (error instanceof SourceUnavailableError) return sourceUnavailable(error.message);
        // The router logs unexpected errors and answers 500 without leaking their details.
        throw error;
      }
    }
  );

  router.get(
    {
      path: '/internal/code_intelligence/extractions/{id}',
      options: { access: 'internal' },
      security: { authz: { enabled: false, reason: 'This private route is feature gated.' } },
      validate: {
        params: schema.object({ id: schema.string({ minLength: 36, maxLength: 36 }) }),
      },
    },
    async (_context, request, response) => {
      const status = getServices().extractionService?.get(request.params.id);
      return status === undefined
        ? response.notFound({ body: { message: 'Extraction was not found.' } })
        : response.ok({ body: status });
    }
  );

  router.get(
    {
      path: '/internal/code_intelligence/catalog',
      options: { access: 'internal' },
      security: { authz: { enabled: false, reason: 'This private route is feature gated.' } },
      validate: {
        query: schema.object({
          repository: schema.maybe(oneOrMany(repositoryIdentity, MAX_CATALOG_REPOSITORY_FILTERS)),
          kind: schema.maybe(oneOrMany(signalType, CATALOG_SIGNAL_TYPES.length)),
          severity: schema.maybe(oneOrMany(severity, CATALOG_SEVERITIES.length)),
          q: schema.maybe(schema.string({ minLength: 1, maxLength: 512 })),
          page: schema.number({ defaultValue: 1, min: 1, max: 100 }),
          perPage: schema.number({ defaultValue: 25, min: 1, max: 100 }),
        }),
      },
    },
    async (context, request, response) => {
      const { elasticsearch } = await context.core;
      const client = elasticsearch.client.asCurrentUser;
      const repositories = asArray(request.query.repository);
      const kinds = asArray(request.query.kind);
      const severities = asArray(request.query.severity);
      const filters: object[] = [];
      if (repositories.length > 0) filters.push({ terms: { repository: repositories } });
      if (kinds.length > 0) filters.push({ terms: { signal_type: kinds } });
      if (severities.length > 0) {
        filters.push({
          bool: {
            should: severities.map((level) => ({
              range: { severity_score: CATALOG_SEVERITY_RANGES[level] },
            })),
            minimum_should_match: 1,
          },
        });
      }
      const { q } = request.query;
      // `title` and `description` are `semantic_text`, which rejects `match`/`multi_match`.
      const textQuery =
        q === undefined
          ? {}
          : {
              should: [
                { semantic: { field: 'title', query: q } },
                { semantic: { field: 'description', query: q } },
                { match: { query: q } },
              ],
              minimum_should_match: 1,
            };
      const result = await client.search<Record<string, unknown>>({
        index: catalogIndex,
        from: (request.query.page - 1) * request.query.perPage,
        size: request.query.perPage,
        query: { bool: { filter: filters, ...textQuery } },
        sort:
          q === undefined
            ? [{ updated_at: 'desc' }, '_doc']
            : ['_score', { updated_at: 'desc' }, '_doc'],
      });
      return response.ok({
        body: {
          page: request.query.page,
          perPage: request.query.perPage,
          total:
            typeof result.hits.total === 'number'
              ? result.hits.total
              : result.hits.total?.value ?? 0,
          items: result.hits.hits.map((hit) => ({ id: hit._id, ...hit._source })),
        },
      });
    }
  );

  router.get(
    {
      path: '/internal/code_intelligence/catalog/{id}',
      options: { access: 'internal' },
      security: { authz: { enabled: false, reason: 'This private route is feature gated.' } },
      validate: {
        params: schema.object({ id: schema.string({ minLength: 1, maxLength: 512 }) }),
      },
    },
    async (context, request, response) => {
      const { elasticsearch } = await context.core;
      const client = elasticsearch.client.asCurrentUser;
      const result = await client.get<Record<string, unknown>>(
        { index: catalogIndex, id: request.params.id },
        { ignore: [404] }
      );
      return result.found
        ? response.ok({ body: { id: result._id, ...result._source } })
        : response.notFound({ body: { message: 'Catalog document was not found.' } });
    }
  );
};
