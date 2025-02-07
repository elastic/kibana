/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocumentationProduct } from '@kbn/product-doc-common';
import { FunctionVisibility } from '@kbn/observability-ai-assistant-plugin/common';
import type { FunctionRegistrationParameters } from '.';

export const RETRIEVE_DOCUMENTATION_NAME = 'retrieve_elastic_doc';

export async function registerDocumentationFunction({
  functions,
  resources,
  pluginsStart: { llmTasks },
}: FunctionRegistrationParameters) {
  const isProductDocAvailable = (await llmTasks.retrieveDocumentationAvailable()) ?? false;

  functions.registerInstruction(({ availableFunctionNames }) => {
    return availableFunctionNames.includes(RETRIEVE_DOCUMENTATION_NAME)
      ? `When asked questions about the Elastic stack or products, You should use the ${RETRIEVE_DOCUMENTATION_NAME} function before answering,
      to retrieve documentation related to the question. Consider that the documentation returned by the function
      is always more up to date and accurate than any own internal knowledge you might have.`
      : undefined;
  });

  functions.registerFunction(
    {
      name: RETRIEVE_DOCUMENTATION_NAME,
      visibility: isProductDocAvailable
        ? FunctionVisibility.AssistantOnly
        : FunctionVisibility.Internal,
      description: `Use this function to retrieve documentation about Elastic products.
      You can retrieve documentation about the Elastic stack, such as Kibana and Elasticsearch,
      or for Elastic solutions, such as Elastic Security, Elastic Observability or Elastic Enterprise Search
      `,
      parameters: {
        type: 'object',
        properties: {
          query: {
            description: `The query to use to retrieve documentation
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
      });

      return {
        content: {
          documents: response.documents,
        },
      };
    }
  );
}
