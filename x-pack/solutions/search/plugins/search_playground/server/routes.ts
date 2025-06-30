/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID } from '../common';
import { sendMessageEvent, SendMessageEventData } from './analytics/events';
import { fetchFields } from './lib/fetch_query_source_fields';
import { createAssist as Assist } from './utils/assist';
import { ConversationalChain } from './lib/conversational_chain';
import { errorHandler } from './utils/error_handler';
import { handleStreamResponse } from './utils/handle_stream_response';
import {
  APIRoutes,
  DefineRoutesOptions,
  ElasticsearchRetrieverContentField,
  QueryTestResponse,
} from './types';
import { getChatParams } from './lib/get_chat_params';
import { fetchIndices } from './lib/fetch_indices';
import { isNotNullish } from '../common/is_not_nullish';
import { MODELS } from '../common/models';
import { ContextLimitError } from './lib/errors';
import { contextDocumentHitMapper } from './utils/context_document_mapper';
import { parseSourceFields } from './utils/parse_source_fields';
import { getErrorMessage } from '../common/errors';
import { defineSavedPlaygroundRoutes } from './routes/saved_playgrounds';

const EMPTY_INDICES_ERROR_MESSAGE = i18n.translate(
  'xpack.searchPlayground.serverErrors.emptyIndices',
  {
    defaultMessage: 'Indices cannot be empty',
  }
);

export function parseElasticsearchQuery(esQuery: string) {
  return (question: string) => {
    try {
      const replacedQuery = esQuery.replace(/\"{query}\"/g, JSON.stringify(question));
      const query = JSON.parse(replacedQuery);
      return query as Partial<SearchRequest>;
    } catch (e) {
      throw new Error(
        i18n.translate('xpack.searchPlayground.serverErrors.parseRetriever', {
          defaultMessage:
            "Failed to parse the Elasticsearch Query. Check Query to make sure it's valid.",
        }),
        {
          cause: e,
        }
      );
    }
  };
}

export function defineRoutes(routeOptions: DefineRoutesOptions) {
  const { logger, router, getStartServices } = routeOptions;

  router.post(
    {
      path: APIRoutes.POST_QUERY_SOURCE_FIELDS,
      options: {
        access: 'internal',
      },
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID],
        },
      },
      validate: {
        body: schema.object({
          indices: schema.arrayOf(schema.string()),
        }),
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { indices } = request.body;

      const fields = await fetchFields(client, indices);

      return response.ok({
        body: fields,
      });
    })
  );

  router.post(
    {
      path: APIRoutes.POST_CHAT_MESSAGE,
      options: {
        access: 'internal',
      },
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID],
        },
      },
      validate: {
        body: schema.object({
          data: schema.object({
            connector_id: schema.string(),
            indices: schema.string(),
            prompt: schema.string(),
            citations: schema.boolean(),
            elasticsearch_query: schema.string(),
            summarization_model: schema.maybe(schema.string()),
            doc_size: schema.number(),
            source_fields: schema.string(),
          }),
          messages: schema.any(),
        }),
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const [{ analytics }, { actions, cloud, inference }] = await getStartServices();

      const { client } = (await context.core).elasticsearch;
      const aiClient = Assist({
        es_client: client.asCurrentUser,
      });
      const { messages, data } = request.body;
      const { chatModel, chatPrompt, questionRewritePrompt, connector, summarizationModel } =
        await getChatParams(
          {
            connectorId: data.connector_id,
            model: data.summarization_model,
            citations: data.citations,
            prompt: data.prompt,
          },
          { actions, inference, logger, request }
        );

      let sourceFields: ElasticsearchRetrieverContentField;

      try {
        sourceFields = parseSourceFields(data.source_fields);
      } catch (e) {
        logger.error('Failed to parse the source fields', e);
        throw Error(e);
      }

      const model = MODELS.find((m) => m.model === summarizationModel);
      const modelPromptLimit = model?.promptTokenLimit;

      const chain = ConversationalChain({
        model: chatModel,
        rag: {
          index: data.indices,
          retriever: parseElasticsearchQuery(data.elasticsearch_query),
          content_field: sourceFields,
          size: Number(data.doc_size),
          inputTokensLimit: modelPromptLimit,
        },
        prompt: chatPrompt,
        questionRewritePrompt,
      });

      try {
        const stream = await chain.stream(aiClient, messages);

        analytics.reportEvent<SendMessageEventData>(sendMessageEvent.eventType, {
          connectorType:
            connector.actionTypeId +
            (connector.config?.apiProvider ? `-${connector.config.apiProvider}` : ''),
          model: summarizationModel ?? '',
          isCitationsEnabled: data.citations,
        });

        return handleStreamResponse({
          logger,
          stream,
          response,
          request,
          isCloud: cloud?.isCloudEnabled ?? false,
        });
      } catch (e) {
        if (e instanceof ContextLimitError) {
          return response.badRequest({
            body: {
              message: i18n.translate(
                'xpack.searchPlayground.serverErrors.exceedsModelTokenLimit',
                {
                  defaultMessage:
                    'Your request uses {approxPromptTokens} input tokens. This exceeds the model token limit of {modelLimit} tokens. Please try using a different model thats capable of accepting larger prompts or reducing the prompt by decreasing the size of the context documents. If you are unsure, please see our documentation.',
                  values: { modelLimit: e.modelLimit, approxPromptTokens: e.currentTokens },
                }
              ),
            },
          });
        }

        logger.error('Failed to create the chat stream', e);

        if (typeof e === 'object') {
          return response.badRequest({
            body: {
              message: e.message,
            },
          });
        }

        throw e;
      }
    })
  );

  // SECURITY: We don't apply any authorization tags to this route because all actions performed
  // on behalf of the user making the request and governed by the user's own cluster privileges.
  router.get(
    {
      path: APIRoutes.GET_INDICES,
      options: {
        access: 'internal',
      },
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID],
        },
      },
      validate: {
        query: schema.object({
          search_query: schema.maybe(schema.string()),
          size: schema.number({ defaultValue: 10, min: 0 }),
          exact: schema.maybe(schema.boolean({ defaultValue: false })),
        }),
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const { search_query: searchQuery, exact, size } = request.query;
      const {
        client: { asCurrentUser },
      } = (await context.core).elasticsearch;

      const { indexNames } = await fetchIndices(asCurrentUser, searchQuery, { exact });
      const indexNameSlice = indexNames.slice(0, size).filter(isNotNullish);

      return response.ok({
        body: {
          indices: indexNameSlice,
        },
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.post(
    {
      path: APIRoutes.POST_SEARCH_QUERY,
      options: {
        access: 'internal',
      },
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID],
        },
      },
      validate: {
        body: schema.object({
          search_query: schema.string(),
          elasticsearch_query: schema.string(),
          indices: schema.arrayOf(schema.string()),
          size: schema.maybe(schema.number({ defaultValue: 10, min: 0 })),
          from: schema.maybe(schema.number({ defaultValue: 0, min: 0 })),
        }),
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { elasticsearch_query: elasticsearchQuery, indices, size, from } = request.body;

      try {
        if (indices.length === 0) {
          return response.badRequest({
            body: {
              message: EMPTY_INDICES_ERROR_MESSAGE,
            },
          });
        }
        let parsedElasticsearchQuery: Partial<SearchRequest>;
        try {
          parsedElasticsearchQuery = parseElasticsearchQuery(elasticsearchQuery)(
            request.body.search_query
          );
        } catch (e) {
          logger.error(e);
          return response.badRequest({
            body: {
              message: getErrorMessage(e),
            },
          });
        }

        const searchResult = await client.asCurrentUser.search({
          ...parsedElasticsearchQuery,
          index: indices,
          from,
          size,
        });
        const total = searchResult.hits.total
          ? typeof searchResult.hits.total === 'object'
            ? searchResult.hits.total.value
            : searchResult.hits.total
          : 0;

        return response.ok({
          body: {
            executionTime: searchResult.took,
            results: searchResult.hits.hits,
            pagination: {
              from,
              size,
              total,
            },
          },
        });
      } catch (e) {
        logger.error('Failed to search the query', e);

        if (typeof e === 'object' && e.message) {
          return response.badRequest({
            body: {
              message: e.message,
            },
          });
        }

        throw e;
      }
    })
  );
  router.post(
    {
      path: APIRoutes.GET_INDEX_MAPPINGS,
      options: {
        access: 'internal',
      },
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID],
        },
      },
      validate: {
        body: schema.object({
          indices: schema.arrayOf(schema.string()),
        }),
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { indices } = request.body;

      try {
        if (indices.length === 0) {
          return response.badRequest({
            body: {
              message: EMPTY_INDICES_ERROR_MESSAGE,
            },
          });
        }

        const mappings = await client.asCurrentUser.indices.getMapping({
          index: indices,
        });
        return response.ok({
          body: {
            mappings,
          },
        });
      } catch (e) {
        logger.error('Failed to get index mappings', e);
        if (typeof e === 'object' && e.message) {
          return response.badRequest({
            body: {
              message: e.message,
            },
          });
        }
        throw e;
      }
    })
  );
  router.post(
    {
      path: APIRoutes.POST_QUERY_TEST,
      options: {
        access: 'internal',
      },
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID],
        },
      },
      validate: {
        body: schema.object({
          query: schema.string(),
          elasticsearch_query: schema.string(),
          indices: schema.arrayOf(schema.string()),
          size: schema.maybe(schema.number({ defaultValue: 10, min: 0 })),
          from: schema.maybe(schema.number({ defaultValue: 0, min: 0 })),
          chat_context: schema.maybe(
            schema.object({
              source_fields: schema.string(),
              doc_size: schema.number(),
            })
          ),
        }),
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const {
        elasticsearch_query: elasticsearchQuery,
        indices,
        size,
        from,
        chat_context: chatContext,
      } = request.body;

      if (indices.length === 0) {
        return response.badRequest({
          body: {
            message: EMPTY_INDICES_ERROR_MESSAGE,
          },
        });
      }
      let searchQuery: Partial<SearchRequest>;
      try {
        searchQuery = parseElasticsearchQuery(elasticsearchQuery)(request.body.query);
      } catch (e) {
        logger.error(e);
        return response.badRequest({
          body: {
            message: getErrorMessage(e),
          },
        });
      }

      if (!chatContext) {
        const searchResponse = await client.asCurrentUser.search({
          ...searchQuery,
          index: indices,
          from,
          size,
        });
        const body: QueryTestResponse = {
          searchResponse,
        };

        return response.ok({
          body,
          headers: {
            'content-type': 'application/json',
          },
        });
      } else {
        let sourceFields: ElasticsearchRetrieverContentField;
        try {
          sourceFields = parseSourceFields(chatContext.source_fields);
        } catch (e) {
          logger.error('Failed to parse the source fields', e);
          throw Error(e);
        }
        const searchResponse = await client.asCurrentUser.search({
          ...searchQuery,
          index: indices,
          size: chatContext.doc_size,
        });
        const documents = searchResponse.hits.hits.map(contextDocumentHitMapper(sourceFields));

        const body: QueryTestResponse = {
          documents,
          searchResponse,
        };
        return response.ok({
          body,
          headers: {
            'content-type': 'application/json',
          },
        });
      }
    })
  );

  defineSavedPlaygroundRoutes(routeOptions);
}
