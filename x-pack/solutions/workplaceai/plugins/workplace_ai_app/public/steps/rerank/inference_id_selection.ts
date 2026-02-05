/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type {
  PropertySelectionHandler,
  SelectionOption,
  SelectionDetails,
  SelectionContext,
} from '@kbn/workflows';

const TRANSLATIONS = {
  service: (service: string) =>
    i18n.translate('workplace_ai.workflowSteps.rerank.inferenceIdSelection.service', {
      defaultMessage: 'Service: {service}',
      values: { service },
    }),
  connectedToEndpoint: (service: string) =>
    i18n.translate('workplace_ai.workflowSteps.rerank.inferenceIdSelection.connectedToEndpoint', {
      defaultMessage: 'Connected to endpoint ({service})',
      values: { service },
    }),
  notFound: (input: string) =>
    i18n.translate('workplace_ai.workflowSteps.rerank.inferenceIdSelection.notFound', {
      defaultMessage: 'Inference endpoint "{input}" not found',
      values: { input },
    }),
};

interface InferenceEndpoint {
  inference_id: string;
  service: string;
  task_type: string;
}

interface InferenceEndpointsResponse {
  inference_endpoints: InferenceEndpoint[];
}

async function loadInferenceEndpoints(http: HttpStart): Promise<InferenceEndpoint[]> {
  const response = await http.get<InferenceEndpointsResponse>(
    '/internal/workplace_ai/inference_endpoints'
  );
  return response.inference_endpoints.filter((ep) => ep.task_type === 'rerank');
}

export function createInferenceIdSelectionHandler(
  getHttp: () => Promise<HttpStart>
): PropertySelectionHandler<string> {
  return {
    search: async (
      input: string,
      _context: SelectionContext
    ): Promise<SelectionOption<string>[]> => {
      try {
        const http = await getHttp();
        const endpoints = await loadInferenceEndpoints(http);
        return endpoints
          .filter((endpoint) => input === '' || endpoint.inference_id.includes(input))
          .map((endpoint) => ({
            value: endpoint.inference_id,
            label: getInferenceIdLabel(endpoint.inference_id),
            description: TRANSLATIONS.service(endpoint.service),
          }));
      } catch (error) {
        return [];
      }
    },

    resolve: async (
      value: string,
      _context: SelectionContext
    ): Promise<SelectionOption<string> | null> => {
      try {
        const http = await getHttp();
        const endpoints = await loadInferenceEndpoints(http);
        const endpoint = endpoints.find((ep) => ep.inference_id === value);
        if (!endpoint) {
          return null;
        }

        return {
          value: endpoint.inference_id,
          label: getInferenceIdLabel(endpoint.inference_id),
          description: TRANSLATIONS.service(endpoint.service),
        };
      } catch (error) {
        return null;
      }
    },

    getDetails: async (
      input: string,
      _context: SelectionContext,
      option: SelectionOption<string> | null
    ): Promise<SelectionDetails> => {
      if (option) {
        return { message: TRANSLATIONS.connectedToEndpoint(option.label) };
      }
      return { message: TRANSLATIONS.notFound(input) };
    },
  };
}

/**
 * Get the label for an inference ID.
 * Removes dot prefix and converts to title case.
 */
function getInferenceIdLabel(inferenceId: string): string {
  return inferenceId
    .replace(/^./, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
