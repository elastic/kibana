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

interface SuggestSloInput {
  sloDefinition: Record<string, unknown>;
  connectorId?: string;
}

export interface SloSuggestion {
  title: string;
  description: string;
  field?: string;
  suggestedValue?: unknown;
}

interface SuggestSloResponse {
  suggestions: SloSuggestion[];
}

export function useSuggestSlo() {
  const {
    notifications: { toasts },
  } = useKibana().services;
  const { sloClient } = usePluginContext();

  return useMutation<SuggestSloResponse, ServerError, SuggestSloInput>(
    ['suggestSlo'],
    ({ sloDefinition, connectorId }) => {
      return sloClient.fetch('POST /internal/slo/ai/suggest', {
        params: {
          body: {
            sloDefinition,
            ...(connectorId ? { connectorId } : {}),
          },
        },
      });
    },
    {
      onError: (error) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate('xpack.slo.suggestSlo.errorNotification', {
            defaultMessage: 'Failed to get SLO suggestions',
          }),
        });
      },
    }
  );
}
