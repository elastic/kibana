/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { z } from '@kbn/zod/v4';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { escapeKuery } from '@kbn/es-query';
import type { Logger } from '@kbn/core/server';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import type { ScopedEndpointArtifactListClient } from '../../../../../endpoint/services/scoped_endpoint_artifact_list_client';
import {
  GLOBAL_ARTIFACT_TAG,
  BY_POLICY_ARTIFACT_TAG_PREFIX,
} from '../../../../../../common/endpoint/service/artifacts/constants';
import { GET_ENDPOINT_ARTIFACTS_TOOL_ID } from '../..';

type ArtifactType =
  | 'endpoint_exceptions'
  | 'trusted_apps'
  | 'trusted_devices'
  | 'event_filters'
  | 'host_isolation_exceptions'
  | 'blocklists';

const ARTIFACT_TYPE_TO_LIST_ID: Record<ArtifactType, string> = {
  endpoint_exceptions: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
  trusted_apps: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
  trusted_devices: ENDPOINT_ARTIFACT_LISTS.trustedDevices.id,
  event_filters: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
  host_isolation_exceptions: ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id,
  blocklists: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
};

const ARTIFACT_TYPE_KEYS = Object.keys(ARTIFACT_TYPE_TO_LIST_ID) as ArtifactType[];

type ArtifactErrorType = 'not_authorized' | 'feature_disabled' | 'unknown_error';

const DEFAULT_PER_PAGE = 20;
const MAX_ARRAY_VALUES = 50;
const MAX_STRING_LENGTH = 512;

const getEndpointArtifactsSchema = z.object({
  artifactType: z
    .enum([
      'endpoint_exceptions',
      'trusted_apps',
      'trusted_devices',
      'event_filters',
      'host_isolation_exceptions',
      'blocklists',
    ])
    .optional()
    .describe('The type of artifact to retrieve. Omit to get summary counts for all types.'),
  search: z
    .string()
    .max(256)
    .optional()
    .describe(
      'Free text search across artifact fields (name, description, tags, and others). Best suited for searching by artifact name or description. Uses simple query string search.'
    ),
  osType: z
    .enum(['windows', 'linux', 'macos'])
    .optional()
    .describe('Filter artifacts by operating system.'),
  policyId: z
    .string()
    .max(128)
    .optional()
    .describe(
      'Filter to artifacts assigned to this policy ID (includes globally-assigned artifacts).'
    ),
  perPage: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe('Number of items per page. Default 20, max 50.'),
  page: z.number().int().min(1).optional().describe('Page number for pagination. Default 1.'),
});

export const classifyArtifactError = (error: unknown): ArtifactErrorType => {
  if (error instanceof Error) {
    const statusCode =
      'statusCode' in error
        ? (error as { statusCode: number }).statusCode
        : 'body' in error
        ? (error as { body?: { statusCode?: number } }).body?.statusCode
        : 'output' in error
        ? (error as { output?: { statusCode?: number } }).output?.statusCode
        : undefined;

    if (statusCode === 403) {
      return 'not_authorized';
    }

    if (
      'getStatusCode' in error &&
      typeof (error as { getStatusCode: () => number }).getStatusCode === 'function'
    ) {
      if ((error as { getStatusCode: () => number }).getStatusCode() === 403) {
        return 'not_authorized';
      }
    }

    if (error.message.includes('is not enabled') || error.message.includes('feature is disabled')) {
      return 'feature_disabled';
    }
  }

  return 'unknown_error';
};

export const buildArtifactFilter = (params: {
  osType?: string;
  policyId?: string;
}): string | undefined => {
  const filters: string[] = [];

  if (params.osType) {
    filters.push(`exception-list-agnostic.attributes.os_types:"${escapeKuery(params.osType)}"`);
  }

  if (params.policyId) {
    const escaped = escapeKuery(params.policyId);
    filters.push(
      `(exception-list-agnostic.attributes.tags:"${GLOBAL_ARTIFACT_TAG}" OR exception-list-agnostic.attributes.tags:"${BY_POLICY_ARTIFACT_TAG_PREFIX}${escaped}")`
    );
  }

  return filters.length > 0 ? filters.join(' AND ') : undefined;
};

const truncateArrayStrings = (values: unknown[]): { values: unknown[]; anyTruncated: boolean } => {
  let anyTruncated = false;
  const mapped = values.map((v: unknown) => {
    if (typeof v === 'string' && v.length > MAX_STRING_LENGTH) {
      anyTruncated = true;
      return v.slice(0, MAX_STRING_LENGTH);
    }
    return v;
  });
  return { values: mapped, anyTruncated };
};

const truncateEntries = (
  entries: ExceptionListItemSchema['entries']
): {
  entries: unknown[];
  truncatedCount: number;
} => {
  let truncatedCount = 0;

  const processed = entries.map((entry) => {
    const result: Record<string, unknown> = { ...entry };

    if ('value' in entry && Array.isArray(entry.value) && entry.value.length > MAX_ARRAY_VALUES) {
      truncatedCount++;
      const sliced = entry.value.slice(0, MAX_ARRAY_VALUES);
      const { values: truncated, anyTruncated } = truncateArrayStrings(sliced);
      result.value = truncated;
      result.value_truncated = true;
      result.value_total = entry.value.length;
      if (anyTruncated) {
        result.values_strings_truncated = true;
      }
    } else if ('value' in entry && Array.isArray(entry.value)) {
      const { values: truncated, anyTruncated } = truncateArrayStrings(entry.value);
      result.value = truncated;
      if (anyTruncated) {
        result.values_strings_truncated = true;
      }
    } else if (
      'value' in entry &&
      typeof entry.value === 'string' &&
      entry.value.length > MAX_STRING_LENGTH
    ) {
      result.value = entry.value.slice(0, MAX_STRING_LENGTH);
      result.string_truncated = true;
    }

    if ('entries' in entry && Array.isArray(entry.entries)) {
      const nested = truncateEntries(entry.entries);
      result.entries = nested.entries;
      truncatedCount += nested.truncatedCount;
    }

    return result;
  });

  return { entries: processed, truncatedCount };
};

const trimItem = (item: ExceptionListItemSchema): Record<string, unknown> => {
  const { entries, truncatedCount } = truncateEntries(item.entries);
  return {
    item_id: item.item_id,
    list_id: item.list_id,
    name: item.name,
    description: item.description,
    entries,
    entries_summary: `${item.entries.length} condition${item.entries.length !== 1 ? 's' : ''}${
      truncatedCount > 0 ? ` (${truncatedCount} truncated)` : ''
    }`,
    os_types: item.os_types,
    tags: item.tags,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
};

const logAndClassifyError = (
  error: unknown,
  logger: Logger,
  context: string
): ArtifactErrorType => {
  const errorType = classifyArtifactError(error);
  if (errorType === 'unknown_error') {
    logger.error(`${context}: ${error instanceof Error ? error.message : String(error)}`);
  } else {
    logger.debug(`${context}: ${errorType}`);
  }
  return errorType;
};

const fetchSummary = async (
  client: ScopedEndpointArtifactListClient,
  filter: string | undefined,
  search: string | undefined,
  logger: Logger
): Promise<Record<string, { total: number } | { error: ArtifactErrorType }>> => {
  const entries = await Promise.all(
    ARTIFACT_TYPE_KEYS.map(async (artifactType) => {
      const listId = ARTIFACT_TYPE_TO_LIST_ID[artifactType];
      try {
        const result = await client.findEndpointArtifactListItems({
          listId,
          namespaceType: 'agnostic',
          filter,
          search,
          perPage: 1,
          page: 1,
          sortField: 'tie_breaker_id',
          sortOrder: 'asc',
        });
        return [artifactType, { total: result?.total ?? 0 }] as const;
      } catch (error) {
        const errorType = logAndClassifyError(error, logger, `Summary query for ${artifactType}`);
        return [artifactType, { error: errorType }] as const;
      }
    })
  );

  return Object.fromEntries(entries);
};

const fetchDetail = async (
  client: ScopedEndpointArtifactListClient,
  artifactType: ArtifactType,
  filter: string | undefined,
  search: string | undefined,
  page: number,
  perPage: number
) => {
  const listId = ARTIFACT_TYPE_TO_LIST_ID[artifactType];
  const result = await client.findEndpointArtifactListItems({
    listId,
    namespaceType: 'agnostic',
    filter,
    search,
    perPage,
    page,
    sortField: 'tie_breaker_id',
    sortOrder: 'asc',
  });

  const data = result?.data ?? [];
  const total = result?.total ?? 0;

  return {
    artifactType,
    total,
    page,
    perPage,
    items: data.map(trimItem),
  };
};

export const getEndpointArtifactsTool = (
  endpointAppContextService: EndpointAppContextService
): BuiltinSkillBoundedTool<typeof getEndpointArtifactsSchema> => {
  return {
    id: GET_ENDPOINT_ARTIFACTS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Query endpoint artifacts (endpoint exceptions, trusted apps, trusted devices, event filters, host isolation exceptions, blocklists). Call without artifactType to get a summary of all types, or with artifactType to get details for a specific type.',
    schema: getEndpointArtifactsSchema,
    handler: async (params, { request, savedObjectsClient, esClient, logger }) => {
      try {
        const { username } = await esClient.asCurrentUser.security.authenticate();
        const client = endpointAppContextService.getScopedEndpointArtifactClient(
          savedObjectsClient,
          request,
          username
        );

        const filter = buildArtifactFilter({
          osType: params.osType,
          policyId: params.policyId,
        });
        const search = params.search;

        if (!params.artifactType) {
          const summary = await fetchSummary(client, filter, search, logger);
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
                data: summary,
              },
            ],
          };
        }

        const page = params.page ?? 1;
        const perPage = params.perPage ?? DEFAULT_PER_PAGE;
        const detail = await fetchDetail(
          client,
          params.artifactType,
          filter,
          search,
          page,
          perPage
        );

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: detail,
            },
          ],
        };
      } catch (error) {
        const errorType = logAndClassifyError(
          error,
          logger,
          `Error in ${GET_ENDPOINT_ARTIFACTS_TOOL_ID}`
        );
        const ERROR_MESSAGES: Record<ArtifactErrorType, string> = {
          not_authorized: 'Not authorized to read endpoint artifacts',
          feature_disabled: 'Endpoint artifact feature is disabled',
          unknown_error: 'Failed to retrieve endpoint artifacts',
        };
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: ERROR_MESSAGES[errorType],
                metadata: {
                  error: errorType,
                  ...(params.artifactType ? { artifactType: params.artifactType } : {}),
                },
              },
            },
          ],
        };
      }
    },
  };
};
