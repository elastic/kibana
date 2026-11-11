/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@kbn/react-query';
import type {
  NightshiftInvestigationsAPIClientRequestParamsOf,
  NightshiftInvestigationsAPIReturnType,
} from '@kbn/nightshift-investigations-plugin/public';
import { isScheduleOnlyAutomation } from '@kbn/nightshift-investigations-plugin/common';
import { isHttpClientError } from '../../common/http_error';
import { useKibana } from '../../hooks/use_kibana';
import {
  AUTOMATIONS_QUERY_KEY,
  RUN_QUOTAS_QUERY_KEY,
  automationRunActivityQueryKey,
} from '../query_keys';

type AutomationsResponse =
  NightshiftInvestigationsAPIReturnType<'GET /internal/nightshift/automations'>;
type Automation = AutomationsResponse['automations'][number];
type CreateAutomationBody =
  NightshiftInvestigationsAPIClientRequestParamsOf<'POST /internal/nightshift/automations'>['params']['body'];
type UpdateAutomationBody =
  NightshiftInvestigationsAPIClientRequestParamsOf<'PUT /internal/nightshift/automations/{id}'>['params']['body'];

export { AUTOMATIONS_QUERY_KEY } from '../query_keys';

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
  run: i18n.translate('xpack.nightshift.automations.runErrorMessage', {
    defaultMessage: 'Failed to run automation',
  }),
  delete: i18n.translate('xpack.nightshift.automations.deleteError', {
    defaultMessage: 'Failed to delete automation',
  }),
};

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

export const useFetchAutomations = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { notifications, nightshiftInvestigations } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;

  return useQuery({
    queryKey: AUTOMATIONS_QUERY_KEY,
    enabled: enabled && investigationsClient != null,
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

const RUNS_PAGE_SIZE = 100;

export const useAutomationRunsInRange = (
  id: string,
  startedAfter: string,
  startedBefore: string
) => {
  const investigationsClient = useKibana().services.nightshiftInvestigations?.investigationsClient;
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isLoading } = useInfiniteQuery({
    queryKey: [...AUTOMATIONS_QUERY_KEY, id, 'pagedRuns', startedAfter, startedBefore],
    enabled: investigationsClient != null,
    queryFn: async ({ pageParam = 1 }) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('GET /internal/nightshift/automations/{id}/runs', {
        params: {
          path: { id },
          query: { page: pageParam, size: RUNS_PAGE_SIZE, startedAfter, startedBefore },
        },
        signal: null,
      });
    },
    getNextPageParam: (lastPage, pages) =>
      pages.length * RUNS_PAGE_SIZE < lastPage.total ? pages.length + 1 : undefined,
    retry: false,
  });

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const runs = useMemo(() => data?.pages.flatMap((page) => page.runs) ?? [], [data]);
  const [firstPage] = data?.pages ?? [];
  return { runs, isLoading, usedToday: firstPage?.usedToday, total: firstPage?.total };
};

type RunCountsResponse =
  NightshiftInvestigationsAPIReturnType<'POST /internal/nightshift/automations/run_counts'>;
const RUN_COUNTS_CHUNK_SIZE = 100;

export const useAutomationsRunCounts = (
  ids: string[],
  startedAfter: string,
  startedBefore: string
) => {
  const investigationsClient = useKibana().services.nightshiftInvestigations?.investigationsClient;
  return useQuery({
    queryKey: [...AUTOMATIONS_QUERY_KEY, 'runCounts', ids, startedAfter, startedBefore],
    enabled: investigationsClient != null && ids.length > 0,
    queryFn: async ({ signal }): Promise<RunCountsResponse['counts']> => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      const chunks = Array.from({ length: Math.ceil(ids.length / RUN_COUNTS_CHUNK_SIZE) }, (_, i) =>
        ids.slice(i * RUN_COUNTS_CHUNK_SIZE, (i + 1) * RUN_COUNTS_CHUNK_SIZE)
      );
      const responses = await Promise.all(
        chunks.map((chunk) =>
          investigationsClient.fetch('POST /internal/nightshift/automations/run_counts', {
            params: { body: { ids: chunk, startedAfter, startedBefore } },
            signal: signal ?? null,
          })
        )
      );
      return Object.assign({}, ...responses.map(({ counts }) => counts));
    },
    retry: false,
  }).data;
};

type AutomationRunActivity =
  NightshiftInvestigationsAPIReturnType<'GET /internal/nightshift/automations/{id}/run_activity'>;
const RUN_ACTIVITY_POLL_INTERVAL_MS = 5_000;

export const useAutomationRunActivity = (
  automation: Pick<Automation, 'id' | 'isEnabled' | 'trigger' | 'runtime'>,
  { enabled = true }: { enabled?: boolean } = {}
) => {
  const { nightshiftInvestigations } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;
  const queryClient = useQueryClient();
  const queryKey = automationRunActivityQueryKey(automation.id);

  return useQuery({
    queryKey,
    enabled:
      enabled &&
      investigationsClient != null &&
      automation.isEnabled &&
      isScheduleOnlyAutomation(automation) &&
      (automation.runtime.overlapPolicy ?? 'drop') === 'drop',
    queryFn: async ({ signal }): Promise<AutomationRunActivity> => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      const activity = queryClient.getQueryData<AutomationRunActivity>(queryKey);
      return investigationsClient.fetch('GET /internal/nightshift/automations/{id}/run_activity', {
        params: { path: { id: automation.id }, query: { executionId: activity?.executionId } },
        signal: signal ?? null,
      });
    },
    refetchInterval: RUN_ACTIVITY_POLL_INTERVAL_MS,
  });
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
  onSuccess?: (variables: TVariables, data: TData) => void
) => {
  const { notifications } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async (_data, variables) => {
      await onSuccess?.(variables, _data);
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

export const useRunAutomation = () => {
  const queryClient = useQueryClient();
  const { nightshiftInvestigations, notifications } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;

  return useAutomationMutation<Pick<Automation, 'id' | 'name'>, { workflowExecutionId: string }>(
    ({ id }) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('POST /internal/nightshift/automations/{id}/run', {
        params: { path: { id } },
        signal: null,
      });
    },
    errorToastTitles.run,
    async ({ id, name }, { workflowExecutionId }) => {
      const queryKey = automationRunActivityQueryKey(id);
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<AutomationRunActivity>(queryKey, {
        isRunning: true,
        executionId: workflowExecutionId,
      });
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.nightshift.automations.runRequestedTitle', {
          defaultMessage: 'Run requested',
        }),
        text: name,
      });
      await queryClient.invalidateQueries({ queryKey: RUN_QUOTAS_QUERY_KEY });
    }
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
