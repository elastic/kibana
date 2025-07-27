/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { DocumentationProduct } from '@kbn/product-doc-common';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { getInferenceIdFromWriteIndex } from '@kbn/observability-ai-assistant-plugin/server';
import type { FunctionRegistrationParameters } from '.';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { zodToParameters } from './schema_adapter';

export const RETRIEVE_DOCUMENTATION_NAME = 'retrieve_elastic_doc';
export const RETRIEVE_DOCUMENTATION_ID = 'retrieve_elastic_doc';

// Common schema definition that can be used across all formats
export const documentationSchema = z.object({
  query: z.string().describe(
    `The query to use to retrieve documentation
    Always write the query in English, as the documentation is available only in English.
    Examples:
    - "How to enable TLS for Elasticsearch?"
    - "What is Kibana Lens?"`
  ),
  product: z
    .enum(Object.values(DocumentationProduct) as [string, ...string[]])
    .optional()
    .describe(
      `If specified, will filter the products to retrieve documentation for
    Possible options are:
    - "kibana": Kibana product
    - "elasticsearch": Elasticsearch product
    - "observability": Elastic Observability solution
    - "security": Elastic Security solution
    If not specified, will search against all products
    `
    ),
});

export const documentationDescription = `Use this function to retrieve documentation about Elastic products.
You can retrieve documentation about the Elastic stack, such as Kibana and Elasticsearch,
or for Elastic solutions, such as Elastic Security, Elastic Observability or Elastic Enterprise Search`;

// Common handler logic that can be shared across formats
export const createDocumentationHandler = async (
  params: { query: string; product?: string },
  context: {
    llmTasks: any;
    connectorId?: string;
    request: any;
    inferenceId: string;
    simulateFunctionCalling?: boolean;
  }
) => {
  const { query, product } = params;
  const { llmTasks, connectorId, request, inferenceId, simulateFunctionCalling } = context;

  const response = await llmTasks.retrieveDocumentation({
    searchTerm: query,
    products: product ? [product] : undefined,
    max: 3,
    connectorId,
    request,
    functionCalling: simulateFunctionCalling ? 'simulated' : 'auto',
    inferenceId,
  });

  return {
    content: {
      documents: response.documents,
    },
  };
};

// Adapter for Observability format (FunctionRegistrationParameters)
export const createObservabilityDocumentationFunction = async (
  registrationParameters: FunctionRegistrationParameters
) => {
  const { functions, resources, pluginsStart: { llmTasks } } = registrationParameters;
  const esClient = (await resources.context.core).elasticsearch.client;
  const inferenceId =
    (await getInferenceIdFromWriteIndex(esClient, resources.logger)) ??
    defaultInferenceEndpoints.ELSER;
  const isProductDocAvailable =
    (await llmTasks.retrieveDocumentationAvailable({ inferenceId })) ?? false;

  if (isProductDocAvailable) {
    functions.registerInstruction(({ availableFunctionNames }) => {
      return availableFunctionNames.includes(RETRIEVE_DOCUMENTATION_NAME)
        ? `When asked questions about the Elastic stack or products, You should use the ${RETRIEVE_DOCUMENTATION_NAME} function before answering,
      to retrieve documentation related to the question. Consider that the documentation returned by the function
      is always more up to date and accurate than any own internal knowledge you might have.`
        : undefined;
    });
  }

  functions.registerFunction(
    {
      name: RETRIEVE_DOCUMENTATION_NAME,
      isInternal: !isProductDocAvailable,
      description: documentationDescription,
      parameters: zodToParameters(documentationSchema),
    },
    async ({ arguments: { query, product }, connectorId, simulateFunctionCalling }) => {
      return createDocumentationHandler(
        { query, product },
        {
          llmTasks,
          connectorId,
          request: resources.request,
          inferenceId,
          simulateFunctionCalling,
        }
      );
    }
  );
};

// Adapter for Security format (AssistantTool)
export const createSecurityDocumentationTool = (): AssistantTool => {
  return {
    id: RETRIEVE_DOCUMENTATION_ID,
    name: 'ProductDocumentationTool',
    description: documentationDescription,
    sourceRegister: 'observability_ai_assistant_app',
    isSupported: (params: AssistantToolParams): params is AssistantToolParams & { llmTasks: any; connectorId: string } => {
      return params.llmTasks != null && params.connectorId != null;
    },
    async getTool(params: AssistantToolParams) {
      if (!this.isSupported(params)) return null;

      const { connectorId, llmTasks, request, contentReferencesStore } = params;

      // Import tool from langchain/core/tools dynamically to avoid circular dependencies
      const { tool } = await import('@langchain/core/tools');

      return tool(
        async ({ query, product }) => {
          const esClient = (await params.esClient);
          const inferenceId = defaultInferenceEndpoints.ELSER;

          const response = await llmTasks.retrieveDocumentation({
            searchTerm: query,
            products: product ? [product] : undefined,
            max: 3,
            connectorId,
            request,
            functionCalling: 'auto',
            inferenceId,
          });

          // Enrich documents with content references if available
          const enrichedDocuments = contentReferencesStore
            ? response.documents.map((document: any) => {
                const reference = contentReferencesStore.add((p: any) =>
                  // Import the productDocumentationReference function dynamically
                  import('@kbn/elastic-assistant-common').then(({ productDocumentationReference }) =>
                    productDocumentationReference(p.id, document.title, document.url)
                  )
                );
                return {
                  ...document,
                  citation: reference ? `[${reference}]` : undefined,
                };
              })
            : response.documents;

          return {
            content: {
              documents: enrichedDocuments,
            },
          };
        },
        {
          name: 'ProductDocumentationTool',
          description: params.description || documentationDescription,
          schema: documentationSchema,
          tags: ['product-documentation'],
        }
      );
    },
  };
};

// Adapter for Onechat format (BuiltinToolDefinition)
export const createOnechatDocumentationTool = (): BuiltinToolDefinition => {
  return {
    id: '.retrieve_elastic_doc',
    name: 'Retrieve Elastic Documentation',
    description: documentationDescription,
    schema: documentationSchema,
    handler: async ({ query, product }, context) => {
      // For onechat, we need to get the llmTasks from the context
      // This would need to be provided through the onechat context
      // For now, we'll throw an error indicating this needs to be configured
      throw new Error(
        'Onechat documentation tool requires llmTasks to be available in the context. ' +
        'Please ensure the onechat plugin is configured with the necessary dependencies.'
      );
    },
  };
};

// Unified adapter that can register to any of the three formats
export class UnifiedDocumentationAdapter {
  static async registerToObservability(registrationParameters: FunctionRegistrationParameters) {
    return createObservabilityDocumentationFunction(registrationParameters);
  }

  static registerToSecurity(): AssistantTool {
    return createSecurityDocumentationTool();
  }

  static registerToOnechat(): BuiltinToolDefinition {
    return createOnechatDocumentationTool();
  }

  // Helper method to check if a format is supported
  static isFormatSupported(format: 'observability' | 'security' | 'onechat'): boolean {
    return ['observability', 'security', 'onechat'].includes(format);
  }

  // Get the common schema for use in other contexts
  static getSchema() {
    return documentationSchema;
  }

  // Get the common description
  static getDescription() {
    return documentationDescription;
  }

  // Get the parameters format for observability
  static getParameters() {
    return zodToParameters(documentationSchema);
  }
}

/**
 * Example usage:
 *
 * // For Observability
 * await UnifiedDocumentationAdapter.registerToObservability(registrationParameters);
 *
 * // For Security
 * const securityTool = UnifiedDocumentationAdapter.registerToSecurity();
 *
 * // For Onechat
 * const onechatTool = UnifiedDocumentationAdapter.registerToOnechat();
 *
 * // Get the schema for custom implementations
 * const schema = UnifiedDocumentationAdapter.getSchema();
 * const parameters = UnifiedDocumentationAdapter.getParameters();
 */
