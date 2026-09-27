/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '../../../../hooks/use_kibana';
import { getFormattedError } from '../../../../util/errors';
import type { CortexPage, GetCortexPageResponse } from './types';

const cortexKeys = {
  availability: ['cortex', 'availability'] as const,
  pages: ['cortex', 'pages'] as const,
  anyPage: ['cortex', 'page'] as const,
  page: (id: string) => ['cortex', 'page', id] as const,
};

/** Fields a user can write on a Cortex page. */
export type CortexPageInput = Pick<
  CortexPage,
  'entity_type' | 'slug' | 'title' | 'description' | 'content' | 'status'
>;

/**
 * Typed client for the Nightshift routes, or undefined when the plugin is not installed. Every
 * query below stays disabled in that case.
 */
const useCortexClient = () => {
  const {
    dependencies: {
      start: { nightshiftInvestigations },
    },
  } = useKibana();

  return nightshiftInvestigations?.investigationsClient;
};

/**
 * Reports whether Cortex is usable: the Nightshift plugin has to be installed, and
 * `xpack.nightshift_investigations.cortex.enabled` has to be on.
 */
export const useCortexEnabled = (): boolean => {
  const client = useCortexClient();

  const { data } = useQuery({
    queryKey: cortexKeys.availability,
    queryFn: ({ signal }) =>
      client!.fetch('GET /internal/nightshift/cortex/availability', { signal: signal ?? null }),
    enabled: client !== undefined,
    retry: false,
  });

  return data?.enabled ?? false;
};

export const useCortexPages = () => {
  const client = useCortexClient();

  return useQuery({
    queryKey: cortexKeys.pages,
    queryFn: ({ signal }) =>
      client!.fetch('GET /internal/nightshift/cortex/pages', { signal: signal ?? null }),
    enabled: client !== undefined,
  });
};

export const useCortexPage = (id: string | undefined) => {
  const client = useCortexClient();

  return useQuery({
    queryKey: cortexKeys.page(id ?? ''),
    queryFn: ({ signal }) =>
      client!.fetch('GET /internal/nightshift/cortex/pages/{id}', {
        signal: signal ?? null,
        params: { path: { id: id! } },
      }),
    enabled: id !== undefined && client !== undefined,
  });
};

type CortexClient = NonNullable<ReturnType<typeof useCortexClient>>;

/** Runs a Cortex write, toasting failures and refreshing every cached page on success. */
const useCortexMutation = <TVariables>(
  write: (client: CortexClient, variables: TVariables) => Promise<GetCortexPageResponse>,
  errorTitle: string
) => {
  const client = useCortexClient();
  const queryClient = useQueryClient();
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();

  return useMutation<GetCortexPageResponse, Error, TVariables>({
    mutationFn: (variables) => write(client!, variables),
    onSuccess: ({ page }) => {
      queryClient.setQueryData(cortexKeys.page(page.id), { page });
      // A write can fold a legacy page id into the canonical one, so every cached page may be stale.
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: cortexKeys.pages }),
        queryClient.invalidateQueries({ queryKey: cortexKeys.anyPage }),
      ]);
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: errorTitle });
    },
  });
};

export const useCreateCortexPage = () =>
  useCortexMutation(
    (client, page: CortexPageInput) =>
      client.fetch('POST /internal/nightshift/cortex/pages', {
        signal: null,
        params: { body: page },
      }),
    i18n.translate('xpack.significantEventsApp.cortex.createErrorTitle', {
      defaultMessage: 'Could not create Cortex page',
    })
  );

export const useUpdateCortexPage = () =>
  useCortexMutation(
    (client, page: CortexPageInput) =>
      client.fetch('PUT /internal/nightshift/cortex/pages', {
        signal: null,
        params: { body: page },
      }),
    i18n.translate('xpack.significantEventsApp.cortex.updateErrorTitle', {
      defaultMessage: 'Could not save Cortex page',
    })
  );

export const useArchiveCortexPage = () =>
  useCortexMutation(
    (client, id: string) =>
      client.fetch('DELETE /internal/nightshift/cortex/pages/{id}', {
        signal: null,
        params: { path: { id } },
      }),
    i18n.translate('xpack.significantEventsApp.cortex.archiveErrorTitle', {
      defaultMessage: 'Could not archive Cortex page',
    })
  );
