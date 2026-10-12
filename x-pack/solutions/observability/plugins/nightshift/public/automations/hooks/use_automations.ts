/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueries, useQuery, useQueryClient } from '@kbn/react-query';
import type {
  NightshiftInvestigationsAPIClientRequestParamsOf,
  NightshiftInvestigationsAPIReturnType,
} from '@kbn/nightshift-investigations-plugin/public';
import { isHttpClientError } from '../../common/http_error';
import { useKibana } from '../../hooks/use_kibana';

type AutomationsResponse =
  NightshiftInvestigationsAPIReturnType<'GET /internal/nightshift/automations'>;
type Automation = AutomationsResponse['automations'][number];
type CreateAutomationBody =
  NightshiftInvestigationsAPIClientRequestParamsOf<'POST /internal/nightshift/automations'>['params']['body'];
type UpdateAutomationBody =
  NightshiftInvestigationsAPIClientRequestParamsOf<'PUT /internal/nightshift/automations/{id}'>['params']['body'];

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

type InvestigationsClient = NonNullable<
  ReturnType<typeof useKibana>['services']['nightshiftInvestigations']
>['investigationsClient'];

export const useCurrentUsername = (): string | undefined => {
  const { security } = useKibana().services;
  const { data } = useQuery({
    queryKey: ['nightshift.currentUser'],
    queryFn: () => security.authc.getCurrentUser(),
  });
  return data?.username;
};

const getAutomationRunsQuery = (
  investigationsClient: InvestigationsClient | undefined,
  id: string,
  startedAfter: string,
  startedBefore: string
) => ({
  queryKey: [...AUTOMATIONS_QUERY_KEY, id, 'runs', startedAfter, startedBefore],
  enabled: investigationsClient != null,
  queryFn: async () => {
    if (!investigationsClient) {
      throw new Error('Nightshift investigations plugin is unavailable');
    }
    return investigationsClient.fetch('GET /internal/nightshift/automations/{id}/runs', {
      params: { path: { id }, query: { page: 1, size: 100, startedAfter, startedBefore } },
      signal: null,
    });
  },
  retry: false,
});

export const useAutomationRunsInRange = (
  id: string,
  startedAfter: string,
  startedBefore: string
) => {
  const { nightshiftInvestigations } = useKibana().services;
  return useQuery(
    getAutomationRunsQuery(
      nightshiftInvestigations?.investigationsClient,
      id,
      startedAfter,
      startedBefore
    )
  );
};

export const useRefreshAutomations = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: AUTOMATIONS_QUERY_KEY });
};

export const useAutomationsRunsInRange = (
  ids: string[],
  startedAfter: string,
  startedBefore: string
) => {
  const { nightshiftInvestigations } = useKibana().services;
  return useQueries({
    queries: ids.map((id) =>
      getAutomationRunsQuery(
        nightshiftInvestigations?.investigationsClient,
        id,
        startedAfter,
        startedBefore
      )
    ),
  });
};

const useAutomationMutation = <TVariables, TData = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
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

export const useCreateAutomation = (isClone = false) => {
  const { nightshiftInvestigations, notifications } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;

  return useAutomationMutation<CreateAutomationBody, { id: string }>(
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
        title: isClone
          ? i18n.translate('xpack.nightshift.automations.cloneSuccess', {
              defaultMessage: 'Automation duplicated (paused)',
            })
          : i18n.translate('xpack.nightshift.automations.createSuccess', {
              defaultMessage: 'Automation created',
            }),
        text: body.name,
      })
  );
};

export const useToggleAutomation = () => {
  const { nightshiftInvestigations, notifications } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;

  return useAutomationMutation<{ id: string; name: string; isEnabled: boolean }>(
    ({ id, isEnabled }) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('PUT /internal/nightshift/automations/{id}', {
        params: { path: { id }, body: { isEnabled } },
        signal: null,
      });
    },
    errorToastTitles.update,
    ({ name, isEnabled }) =>
      notifications.toasts.addSuccess({
        title: isEnabled
          ? i18n.translate('xpack.nightshift.automations.enabledToast', {
              defaultMessage: 'Automation enabled',
            })
          : i18n.translate('xpack.nightshift.automations.pausedToast', {
              defaultMessage: 'Automation paused',
            }),
        text: name,
      })
  );
};

export const useUpdateAutomation = () => {
  const { nightshiftInvestigations, notifications } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;

  return useAutomationMutation<{
    id: string;
    body: UpdateAutomationBody & { name: string };
  }>(
    ({ id, body }) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('PUT /internal/nightshift/automations/{id}', {
        params: { path: { id }, body },
        signal: null,
      });
    },
    errorToastTitles.update,
    ({ body }) =>
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.nightshift.automations.updateSuccess', {
          defaultMessage: 'Automation updated',
        }),
        text: body.name,
      })
  );
};

export const useDeleteAutomation = () => {
  const { nightshiftInvestigations, notifications } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;

  return useAutomationMutation<{ id: string; name: string }>(
    ({ id }) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('DELETE /internal/nightshift/automations/{id}', {
        params: { path: { id } },
        signal: null,
      });
    },
    errorToastTitles.delete,
    ({ name }) =>
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.nightshift.automations.deletedToast', {
          defaultMessage: 'Automation deleted',
        }),
        text: name,
      })
  );
};

export type { Automation, CreateAutomationBody, UpdateAutomationBody };
