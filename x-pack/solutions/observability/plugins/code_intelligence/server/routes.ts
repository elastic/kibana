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
  CATALOG_SIGNAL_TYPES,
  MAX_CATALOG_REPOSITORY_FILTERS,
  type CatalogSeverity,
  type CatalogSignalType,
  type CatalogSort,
} from '../common/catalog_filters';
import { MAX_BATCH_REPOSITORIES } from '../common/extraction_batch';
import {
  FINDING_STATUSES,
  MAX_FINDING_REPOSITORY_FILTERS,
  MAX_FINDING_REVIEW_NOTE_LENGTH,
  type FindingStatus,
} from '../common/finding_filters';
import {
  MAX_CONNECTOR_ID_LENGTH,
  MAX_REMOTE_URL_LENGTH,
  MAX_REPOSITORY_IDENTITY_LENGTH,
  MAX_REVISION_LENGTH,
  isRepositoryIdentity,
} from '../common/repository_settings';
import {
  START_EXTRACTION_ERROR_CODES,
  type StartExtractionErrorAttributes,
} from '../common/start_extraction_errors';
import { ElasticsearchCatalogWriter } from './adapters/elasticsearch_catalog';
import { ElasticsearchFindingsWriter } from './adapters/elasticsearch_findings';
import { ElasticsearchRepositorySettingsStore } from './adapters/elasticsearch_settings';
import { getCatalogEntry, searchCatalog, summarizeCatalog } from './catalog_service';
import type { ExtractionService } from './extraction_service';
import { getFinding, searchFindings, updateFindingStatus } from './findings_service';
import {
  describeStartFailure,
  listExtractableRepositories,
  selectBatchRepositories,
  upsertRepository,
} from './repository_service';

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
const catalogSort: Type<CatalogSort> = schema.oneOf([
  schema.literal('default'),
  schema.literal('severity_desc'),
  schema.literal('severity_asc'),
]);

const findingStatus: Type<FindingStatus> = schema.oneOf([
  schema.literal('open'),
  schema.literal('verified'),
  schema.literal('invalid'),
]);

const asArray = <T>(value: T | readonly T[] | undefined): readonly T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value as T];

/** Services available once the plugin has started; extraction is absent when its source is unavailable. */
export interface RouteServices {
  readonly extractionService?: ExtractionService;
  /** Explains why extraction is unavailable, for example a missing `xpack.sandbox` configuration. */
  readonly extractionUnavailableReason?: string;
  readonly getSpaceId: (request: KibanaRequest) => string;
}

export const registerRoutes = ({
  catalogIndex,
  findingsIndex,
  settingsIndex,
  getServices,
  router,
}: {
  readonly catalogIndex: string;
  readonly findingsIndex: string;
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
      const { elasticsearch } = await context.core;
      const result = await upsertRepository(
        elasticsearch.client.asCurrentUser,
        settingsIndex,
        request.body
      );
      if (!result.ok) {
        return response.badRequest({
          body: {
            message: result.problems.map(({ message }) => message).join(' '),
            attributes: { problems: result.problems },
          },
        });
      }
      return response.ok({ body: { repository: result.repository } });
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
      const { extractionService, extractionUnavailableReason, getSpaceId } = getServices();
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
      const { elasticsearch } = await context.core;
      const selection = selectBatchRepositories(
        request.body.repositories ?? [],
        await listExtractableRepositories(elasticsearch.client.asCurrentUser, settingsIndex)
      );
      if (!selection.ok) {
        const { code, message, repository } = selection;
        return response.badRequest({
          body:
            code === undefined
              ? { message }
              : {
                  message,
                  attributes: errorAttributes({
                    code,
                    ...(repository === undefined ? {} : { repository }),
                  }),
                },
        });
      }
      try {
        const id = await extractionService.start(selection.selected, request, getSpaceId(request), {
          catalogWriter: new ElasticsearchCatalogWriter(
            elasticsearch.client.asCurrentUser,
            catalogIndex
          ),
          findingsWriter: new ElasticsearchFindingsWriter(
            elasticsearch.client.asCurrentUser,
            findingsIndex
          ),
        });
        return response.accepted({ body: { id } });
      } catch (error) {
        const failure = describeStartFailure(error);
        if (failure?.code === START_EXTRACTION_ERROR_CODES.alreadyRunning) {
          return response.conflict({
            body: {
              message: failure.message,
              attributes: errorAttributes({
                code: failure.code,
                ...(failure.extractionId === undefined
                  ? {}
                  : { extractionId: failure.extractionId }),
              }),
            },
          });
        }
        if (failure?.code === START_EXTRACTION_ERROR_CODES.capacityExhausted) {
          return response.customError({
            statusCode: 429,
            body: { message: failure.message, attributes: errorAttributes({ code: failure.code }) },
          });
        }
        if (failure !== undefined) return sourceUnavailable(failure.message);
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
          sort: schema.maybe(catalogSort),
          page: schema.number({ defaultValue: 1, min: 1, max: 100 }),
          perPage: schema.number({ defaultValue: 25, min: 1, max: 100 }),
        }),
      },
    },
    async (context, request, response) => {
      const { elasticsearch } = await context.core;
      const { query } = request;
      return response.ok({
        body: await searchCatalog(elasticsearch.client.asCurrentUser, catalogIndex, {
          repositories: asArray(query.repository),
          signalTypes: asArray(query.kind),
          severities: asArray(query.severity),
          ...(query.q === undefined ? {} : { q: query.q }),
          ...(query.sort === undefined ? {} : { sort: query.sort }),
          page: query.page,
          perPage: query.perPage,
        }),
      });
    }
  );

  router.get(
    {
      path: '/internal/code_intelligence/catalog_summary',
      options: {
        access: 'internal',
        description: 'Counts catalog entries per repository and severity level.',
      },
      security: { authz: { enabled: false, reason: 'This private route is feature gated.' } },
      validate: false,
    },
    async (context, _request, response) => {
      const { elasticsearch } = await context.core;
      const repositories = await summarizeCatalog(elasticsearch.client.asCurrentUser, catalogIndex);
      return response.ok({ body: { repositories } });
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
      const entry = await getCatalogEntry(
        elasticsearch.client.asCurrentUser,
        catalogIndex,
        request.params.id
      );
      return entry === undefined
        ? response.notFound({ body: { message: 'Catalog document was not found.' } })
        : response.ok({ body: entry });
    }
  );

  router.get(
    {
      path: '/internal/code_intelligence/findings',
      options: {
        access: 'internal',
        description:
          'Lists classifier findings, newest first; any selected value of a filter matches.',
      },
      security: { authz: { enabled: false, reason: 'This private route is feature gated.' } },
      validate: {
        query: schema.object({
          repository: schema.maybe(oneOrMany(repositoryIdentity, MAX_FINDING_REPOSITORY_FILTERS)),
          status: schema.maybe(oneOrMany(findingStatus, FINDING_STATUSES.length)),
          kind: schema.maybe(oneOrMany(signalType, CATALOG_SIGNAL_TYPES.length)),
          q: schema.maybe(schema.string({ minLength: 1, maxLength: 512 })),
          page: schema.number({ defaultValue: 1, min: 1, max: 100 }),
          perPage: schema.number({ defaultValue: 25, min: 1, max: 100 }),
        }),
      },
    },
    async (context, request, response) => {
      const { elasticsearch } = await context.core;
      const { query } = request;
      return response.ok({
        body: await searchFindings(elasticsearch.client.asCurrentUser, findingsIndex, {
          repositories: asArray(query.repository),
          statuses: asArray(query.status),
          signalTypes: asArray(query.kind),
          ...(query.q === undefined ? {} : { q: query.q }),
          page: query.page,
          perPage: query.perPage,
        }),
      });
    }
  );

  router.get(
    {
      path: '/internal/code_intelligence/findings/{id}',
      options: { access: 'internal' },
      security: { authz: { enabled: false, reason: 'This private route is feature gated.' } },
      validate: {
        params: schema.object({ id: schema.string({ minLength: 1, maxLength: 512 }) }),
      },
    },
    async (context, request, response) => {
      const { elasticsearch } = await context.core;
      const finding = await getFinding(
        elasticsearch.client.asCurrentUser,
        findingsIndex,
        request.params.id
      );
      return finding === undefined
        ? response.notFound({ body: { message: 'Finding was not found.' } })
        : response.ok({ body: finding });
    }
  );

  router.post(
    {
      path: '/internal/code_intelligence/findings/{id}/status',
      options: {
        access: 'internal',
        description:
          'Sets the review state of 1 finding to `open`, `verified`, or `invalid`, with an optional note. Re-extraction keeps the state.',
      },
      security: { authz: { enabled: false, reason: 'This private route is feature gated.' } },
      validate: {
        params: schema.object({ id: schema.string({ minLength: 1, maxLength: 512 }) }),
        body: schema.object({
          status: findingStatus,
          note: schema.maybe(
            schema.string({ minLength: 1, maxLength: MAX_FINDING_REVIEW_NOTE_LENGTH })
          ),
        }),
      },
    },
    async (context, request, response) => {
      const { elasticsearch } = await context.core;
      const finding = await updateFindingStatus(elasticsearch.client.asCurrentUser, findingsIndex, {
        id: request.params.id,
        status: request.body.status,
        ...(request.body.note === undefined ? {} : { note: request.body.note }),
      });
      return finding === undefined
        ? response.notFound({ body: { message: 'Finding was not found.' } })
        : response.ok({ body: finding });
    }
  );
};
