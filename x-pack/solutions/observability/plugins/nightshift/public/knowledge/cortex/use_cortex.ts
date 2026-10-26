/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';
import { getFormattedError } from '../../common/errors';
import type { CortexPage, GetCortexPageResponse } from './types';

const cortexKeys = {
  pages: ['cortex', 'pages'] as const,
  anyPage: ['cortex', 'page'] as const,
  page: (id: string) => ['cortex', 'page', id] as const,
};

export type CortexPageInput = Pick<
  CortexPage,
  'entity_type' | 'slug' | 'title' | 'description' | 'content' | 'status'
>;

type CortexPageVersion = Required<Pick<CortexPage, 'version'>>;

/** Undefined when the plugin is not installed; every query below stays disabled. */
const useCortexClient = () => {
  const { nightshiftInvestigations } = useKibana().services;

  return nightshiftInvestigations?.investigationsClient;
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

const useCortexMutation = <TVariables>(
  write: (client: CortexClient, variables: TVariables) => Promise<GetCortexPageResponse>,
  errorTitle: string
) => {
  const client = useCortexClient();
  const queryClient = useQueryClient();
  const { toasts } = useKibana().services.notifications;

  const refreshCortex = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: cortexKeys.pages }),
      queryClient.invalidateQueries({ queryKey: cortexKeys.anyPage }),
    ]);

  return useMutation<GetCortexPageResponse, Error, TVariables>({
    mutationFn: (variables) => write(client!, variables),
    onSuccess: ({ page }) => {
      queryClient.setQueryData(cortexKeys.page(page.id), { page });
      // A write can fold a legacy page id into the canonical one, so every cached page may be stale.
      return refreshCortex();
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: errorTitle });
      return refreshCortex();
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
    i18n.translate('xpack.nightshift.knowledge.cortex.createErrorTitle', {
      defaultMessage: 'Could not create Cortex page',
    })
  );

export const useUpdateCortexPage = () =>
  useCortexMutation(
    (client, page: CortexPageInput & CortexPageVersion) =>
      client.fetch('PUT /internal/nightshift/cortex/pages', {
        signal: null,
        params: { body: page },
      }),
    i18n.translate('xpack.nightshift.knowledge.cortex.updateErrorTitle', {
      defaultMessage: 'Could not save Cortex page',
    })
  );

export const useArchiveCortexPage = () =>
  useCortexMutation(
    (client, { id, version }: CortexPageVersion & { id: string }) =>
      client.fetch('DELETE /internal/nightshift/cortex/pages/{id}', {
        signal: null,
        params: { path: { id }, query: { version } },
      }),
    i18n.translate('xpack.nightshift.knowledge.cortex.archiveErrorTitle', {
      defaultMessage: 'Could not archive Cortex page',
    })
  );
