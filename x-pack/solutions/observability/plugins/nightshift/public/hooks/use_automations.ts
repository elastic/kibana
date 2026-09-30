/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type {
  NightshiftInvestigationsAPIClientRequestParamsOf,
  NightshiftInvestigationsAPIReturnType,
} from '@kbn/nightshift-investigations-plugin/public';
import { isHttpClientError } from '../common/http_error';
import { useKibana } from './use_kibana';

type AutomationsResponse =
  NightshiftInvestigationsAPIReturnType<'GET /internal/nightshift/automations'>;
type Automation = AutomationsResponse['automations'][number];
type CreateAutomationBody =
  NightshiftInvestigationsAPIClientRequestParamsOf<'POST /internal/nightshift/automations'>['params']['body'];

export const AUTOMATIONS_QUERY_KEY = ['nightshift.automations'] as const;

export const AUTOMATIONS_LOAD_ERROR_TITLE = i18n.translate(
  'xpack.nightshift.automations.loadError',
  { defaultMessage: 'Failed to load automations' }
);

const errorToastTitles = {
  load: AUTOMATIONS_LOAD_ERROR_TITLE,
  create: i18n.translate('xpack.nightshift.automations.createError', {
    defaultMessage: 'Failed to create automation',
  }),
  update: i18n.translate('xpack.nightshift.automations.updateError', {
    defaultMessage: 'Failed to update automation',
  }),
  delete: i18n.translate('xpack.nightshift.automations.deleteError', {
    defaultMessage: 'Failed to delete automation',
  }),
};

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

export const useFetchAutomations = () => {
  const { notifications, nightshiftInvestigations } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;

  return useQuery({
    queryKey: AUTOMATIONS_QUERY_KEY,
    enabled: investigationsClient != null,
    queryFn: async ({ signal }): Promise<AutomationsResponse> => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('GET /internal/nightshift/automations', {
        signal: signal ?? null,
      });
    },
    retry: (failureCount, error) => !isHttpClientError(error) && failureCount < 3,
    onError: (error: unknown) =>
      notifications.toasts.addError(toError(error), { title: errorToastTitles.load }),
  });
};

export const useAutomationLastRun = (id: string) => {
  const { nightshiftInvestigations } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;

  return useQuery({
    queryKey: [...AUTOMATIONS_QUERY_KEY, id, 'runs'],
    enabled: investigationsClient != null,
    queryFn: async () => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('GET /internal/nightshift/automations/{id}/runs', {
        params: { path: { id }, query: { page: 1, size: 1 } },
        signal: null,
      });
    },
    retry: false,
  });
};

const useAutomationMutation = <TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
  errorTitle: string,
  onSuccess?: (variables: TVariables) => void
) => {
  const { notifications } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async (_data, variables) => {
      onSuccess?.(variables);
      await queryClient.invalidateQueries({ queryKey: AUTOMATIONS_QUERY_KEY });
    },
    onError: (error: unknown) =>
      notifications.toasts.addError(toError(error), { title: errorTitle }),
  });
};

export const useCreateAutomation = () => {
  const { nightshiftInvestigations, notifications } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;

  return useAutomationMutation<CreateAutomationBody>(
    (body) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('POST /internal/nightshift/automations', {
        params: { body },
        signal: null,
      });
    },
    errorToastTitles.create,
    (body) =>
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.nightshift.automations.createSuccess', {
          defaultMessage: 'Automation "{name}" created',
          values: { name: body.name },
        }),
      })
  );
};

export const useToggleAutomation = () => {
  const { nightshiftInvestigations } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;

  return useAutomationMutation<{ id: string; isEnabled: boolean }>(({ id, isEnabled }) => {
    if (!investigationsClient) {
      throw new Error('Nightshift investigations plugin is unavailable');
    }
    return investigationsClient.fetch('PUT /internal/nightshift/automations/{id}', {
      params: { path: { id }, body: { isEnabled } },
      signal: null,
    });
  }, errorToastTitles.update);
};

export const useDeleteAutomation = () => {
  const { nightshiftInvestigations } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;

  return useAutomationMutation<string>((id) => {
    if (!investigationsClient) {
      throw new Error('Nightshift investigations plugin is unavailable');
    }
    return investigationsClient.fetch('DELETE /internal/nightshift/automations/{id}', {
      params: { path: { id } },
      signal: null,
    });
  }, errorToastTitles.delete);
};

export type { Automation };
