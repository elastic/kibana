/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useMutation } from '@kbn/react-query';
import { usePluginContext } from './use_plugin_context';
import { useKibana } from './use_kibana';

type ServerError = IHttpFetchError<ResponseErrorBody>;

interface GenerateSloInput {
  prompt: string;
  connectorId?: string;
  previousMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface GenerateSloResponse {
  sloDefinition: Record<string, unknown>;
  explanation: string;
}

export function useGenerateSlo() {
  const {
    notifications: { toasts },
  } = useKibana().services;
  const { sloClient } = usePluginContext();

  return useMutation<GenerateSloResponse, ServerError, GenerateSloInput>(
    ['generateSlo'],
    ({ prompt, connectorId, previousMessages }) => {
      return sloClient.fetch('POST /internal/slo/ai/generate', {
        params: {
          body: {
            prompt,
            ...(connectorId ? { connectorId } : {}),
            ...(previousMessages?.length ? { previousMessages } : {}),
          },
        },
      });
    },
    {
      onError: (error) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate('xpack.slo.generateSlo.errorNotification', {
            defaultMessage: 'Failed to generate SLO definition',
          }),
        });
      },
    }
  );
}
