/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import Boom from '@hapi/boom';
import type { ILicense } from '@kbn/licensing-types';
import type { QueryDslQueryContainer, SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { formatAnnotation } from './format_annotations';
import { checkAnnotationsPermissions } from './permissions';
import type {
  Annotation,
  CreateAnnotationParams,
  DeleteAnnotationParams,
  FindAnnotationParams,
  GetByIdAnnotationParams,
} from '../../../common/annotations';
import { DEFAULT_ANNOTATION_INDEX } from '../../../common/annotations';
import {
  unwrapEsResponse,
  WrappedElasticsearchClientError,
} from '../../../common/utils/unwrap_es_response';

function getEsErrorType(error: unknown): string | undefined {
  if (error instanceof WrappedElasticsearchClientError) {
    return (error.originalError as any)?.body?.error?.type;
  }
  return (error as any)?.meta?.body?.error?.type ?? (error as any)?.body?.error?.type;
}

function throwIfSecurityException(error: unknown, message: string): never {
  if (getEsErrorType(error) === 'security_exception') {
    throw Boom.forbidden(message);
  }
  throw error;
}

export function createAnnotationsClient(params: {
  index: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  license?: ILicense;
}) {
  const { index, esClient, license } = params;

  const readIndex =
    index === DEFAULT_ANNOTATION_INDEX ? index : `${index},${DEFAULT_ANNOTATION_INDEX}`;

  function ensureGoldLicense<T extends (...args: any[]) => any>(fn: T): T {
    return ((...args) => {
      if (!license?.hasAtLeast('gold')) {
        throw Boom.forbidden('Annotations require at least a gold license or a trial license.');
      }
      return fn(...args);
    }) as T;
  }

  const validateAnnotation = (annotation: CreateAnnotationParams | Annotation) => {
    // make sure to check one of message of annotation.title is present
    if (!annotation.message && !annotation.annotation.title) {
      throw Boom.badRequest('Annotation must have a message or a annotation.title');
    }
  };

  const indexAnnotation = async (
    doc: CreateAnnotationParams,
    eventMeta: Record<string, string>,
    docId?: string
  ): Promise<{ _id: string; _index: string; _source: Annotation }> => {
    validateAnnotation(doc);

    const annotation = {
      ...doc,
      annotation: {
        ...doc.annotation,
        title: doc.annotation.title || doc.message,
      },
      event: { ...doc.event, ...eventMeta },
    };

    try {
      const body = await unwrapEsResponse(
        esClient.index(
          {
            index,
            ...(docId && { id: docId }),
            body: annotation,
            refresh: 'wait_for',
          },
          { meta: true }
        )
      );

      return {
        _id: body._id,
        _index: body._index,
        _source: annotation as unknown as Annotation,
      };
    } catch (error) {
      return throwIfSecurityException(
        error,
        'You do not have the required permissions to create annotations. ' +
          'The annotations index may not exist and your role lacks the create_index privilege. ' +
          'Contact your administrator.'
      );
    }
  };

  return {
    index,
    create: ensureGoldLicense(
      async (
        createParams: CreateAnnotationParams
      ): Promise<{ _id: string; _index: string; _source: Annotation }> => {
        return indexAnnotation(createParams, { created: new Date().toISOString() });
      }
    ),
    update: ensureGoldLicense(
      async (
        updateParams: Annotation
      ): Promise<{ _id: string; _index: string; _source: Annotation }> => {
        const { id, ...rest } = updateParams;
        return indexAnnotation(rest, { updated: new Date().toISOString() }, id);
      }
    ),
    getById: ensureGoldLicense(async (getByIdParams: GetByIdAnnotationParams) => {
      const { id } = getByIdParams;

      const response = await esClient.search<Annotation>({
        index: readIndex,
        ignore_unavailable: true,
        query: {
          bool: {
            filter: [
              {
                term: {
                  _id: id,
                },
              },
            ],
          },
        },
      });
      const document = response.hits.hits?.[0];
      return {
        ...document,
        _source: formatAnnotation(document._source!),
      };
    }),
    find: ensureGoldLicense(async (findParams: FindAnnotationParams) => {
      const { start, end, sloId, sloInstanceId, serviceName, filter, size } = findParams ?? {};
      const filterJSON = filter ? JSON.parse(filter) : {};

      const termsFilter = Object.keys(filterJSON).map((filterKey) => ({
        term: { [filterKey]: filterJSON[filterKey] },
      }));

      const shouldClauses: QueryDslQueryContainer[] = [];
      if (sloId || sloInstanceId) {
        const query: QueryDslQueryContainer = {
          bool: {
            should: [
              {
                term: {
                  'slo.id': '*',
                },
              },
              {
                bool: {
                  filter: [
                    ...(sloId
                      ? [
                          {
                            match_phrase: {
                              'slo.id': sloId,
                            },
                          },
                        ]
                      : []),
                    ...(sloInstanceId
                      ? [
                          {
                            match_phrase: {
                              'slo.instanceId': sloInstanceId,
                            },
                          },
                        ]
                      : []),
                  ],
                },
              },
            ],
          },
        };
        shouldClauses.push(query);
      }

      const result = await esClient.search({
        index: readIndex,
        size: size ?? 10000,
        ignore_unavailable: true,
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: start ?? 'now-30d',
                    lte: end ?? 'now',
                  },
                },
              },
              ...(Object.keys(filterJSON).length !== 0
                ? termsFilter
                : [
                    {
                      bool: {
                        should: [
                          ...(serviceName
                            ? [
                                {
                                  term: {
                                    'service.name': serviceName,
                                  },
                                },
                              ]
                            : []),
                          ...shouldClauses,
                        ],
                      },
                    },
                  ]),
            ],
          },
        },
      });

      const items = result.hits.hits.map((hit) => ({
        ...formatAnnotation(hit._source as Annotation),
        id: hit._id,
      }));

      return {
        items,
        total: (result.hits.total as SearchTotalHits)?.value,
      };
    }),
    delete: ensureGoldLicense(async (deleteParams: DeleteAnnotationParams) => {
      const { id } = deleteParams;

      try {
        return await esClient.deleteByQuery({
          index: readIndex,
          ignore_unavailable: true,
          query: {
            term: {
              _id: id,
            },
          },
          refresh: true,
        });
      } catch (error) {
        return throwIfSecurityException(
          error,
          'You do not have the required permissions to delete annotations. ' +
            'Contact your administrator.'
        );
      }
    }),
    permissions: async () => {
      const permissions = await checkAnnotationsPermissions({ index, esClient });
      const hasGoldLicense = license?.hasAtLeast('gold') ?? false;

      return { index, hasGoldLicense, ...permissions.index[index] };
    },
  };
}
