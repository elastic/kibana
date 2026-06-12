/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocumentationProduct } from '@kbn/product-doc-common';
import {
  RETRIEVE_ELASTIC_DOC_FUNCTION_NAME,
  getInferenceIdFromWriteIndex,
} from '@kbn/observability-ai-assistant-plugin/server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { FunctionRegistrationParameters } from '.';

export async function registerDocumentationFunction({
  functions,
  resources,
  pluginsStart: { llmTasks },
}: FunctionRegistrationParameters) {
  const esClient = (await resources.context.core).elasticsearch.client;
  const inferenceId =
    (await getInferenceIdFromWriteIndex(esClient, resources.logger)) ??
    defaultInferenceEndpoints.ELSER;
  const isProductDocAvailable =
    (await llmTasks.retrieveDocumentationAvailable({ inferenceId })) ?? false;

  functions.registerFunction(
    {
      name: RETRIEVE_ELASTIC_DOC_FUNCTION_NAME,
      isInternal: !isProductDocAvailable,
      description: `Use this function to retrieve documentation about Elastic products.
      You can retrieve documentation about the Elastic stack, such as Kibana and Elasticsearch,
      or for Elastic solutions, such as Elastic Security, Elastic Observability or Elastic Enterprise Search
      `,
      parameters: {
        type: 'object',
        properties: {
          query: {
            description: `The query to use to retrieve documentation
            Always write the query in English, as the documentation is available only in English.
            Examples:
            - "How to enable TLS for Elasticsearch?"
            - "What is Kibana Lens?"`,
            type: 'string' as const,
          },
          product: {
            description: `If specified, will filter the products to retrieve documentation for
            Possible options are:
            - "kibana": Kibana product
            - "elasticsearch": Elasticsearch product
            - "observability": Elastic Observability solution
            - "security": Elastic Security solution
            If not specified, will search against all products
            `,
            type: 'string' as const,
            enum: Object.values(DocumentationProduct),
          },
        },
        required: ['query'],
      } as const,
    },
    async ({ arguments: { query, product }, connectorId, simulateFunctionCalling }) => {
      const response = await llmTasks!.retrieveDocumentation({
        searchTerm: query,
        products: product ? [product] : undefined,
        max: 3,
        connectorId,
        request: resources.request,
        functionCalling: simulateFunctionCalling ? 'simulated' : 'auto',
        inferenceId,
      });

      return {
        content: {
          documents: response.documents,
        },
      };
    }
  );
}
