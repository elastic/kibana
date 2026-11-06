/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '../../../hooks/use_kibana';
import { getFormattedError } from '../../../common/errors';
import type { WikiPage, GetWikiPageResponse } from './types';

const wikiKeys = {
  pages: ['wiki', 'pages'] as const,
  anyPage: ['wiki', 'page'] as const,
  page: (id: string) => ['wiki', 'page', id] as const,
};

export type WikiPageInput = Pick<
  WikiPage,
  'entity_type' | 'slug' | 'title' | 'description' | 'content' | 'status'
>;

type WikiPageVersion = Required<Pick<WikiPage, 'version'>>;

/** Undefined when the plugin is not installed; every query below stays disabled. */
const useWikiClient = () => {
  const { nightshiftInvestigations } = useKibana().services;

  return nightshiftInvestigations?.investigationsClient;
};

export const useWikiPages = () => {
  const client = useWikiClient();

  return useQuery({
    queryKey: wikiKeys.pages,
    queryFn: ({ signal }) =>
      client!.fetch('GET /internal/nightshift/wiki/pages', { signal: signal ?? null }),
    enabled: client !== undefined,
  });
};

export const useWikiPage = (id: string | undefined) => {
  const client = useWikiClient();

  return useQuery({
    queryKey: wikiKeys.page(id ?? ''),
    queryFn: ({ signal }) =>
      client!.fetch('GET /internal/nightshift/wiki/pages/{id}', {
        signal: signal ?? null,
        params: { path: { id: id! } },
      }),
    enabled: id !== undefined && client !== undefined,
  });
};

type WikiClient = NonNullable<ReturnType<typeof useWikiClient>>;

const useWikiMutation = <TVariables>(
  write: (client: WikiClient, variables: TVariables) => Promise<GetWikiPageResponse>,
  errorTitle: string
) => {
  const client = useWikiClient();
  const queryClient = useQueryClient();
  const { toasts } = useKibana().services.notifications;

  const refreshWiki = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: wikiKeys.pages }),
      queryClient.invalidateQueries({ queryKey: wikiKeys.anyPage }),
    ]);

  return useMutation<GetWikiPageResponse, Error, TVariables>({
    mutationFn: (variables) => write(client!, variables),
    onSuccess: ({ page }) => {
      queryClient.setQueryData(wikiKeys.page(page.id), { page });
      // A write can fold a legacy page id into the canonical one, so every cached page may be stale.
      return refreshWiki();
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: errorTitle });
      return refreshWiki();
    },
  });
};

export const useArchiveWikiPage = () =>
  useWikiMutation(
    (client, { id, version }: WikiPageVersion & { id: string }) =>
      client.fetch('DELETE /internal/nightshift/wiki/pages/{id}', {
        signal: null,
        params: { path: { id }, query: { version } },
      }),
    i18n.translate('xpack.nightshift.knowledge.wiki.archiveErrorTitle', {
      defaultMessage: 'Could not archive Wiki page',
    })
  );

/** Restores an archived page as tentative; agents can corroborate it again from there. */
export const useRestoreWikiPage = () =>
  useWikiMutation(
    (client, page: WikiPageInput & WikiPageVersion) =>
      client.fetch('PUT /internal/nightshift/wiki/pages', {
        signal: null,
        params: {
          body: {
            ...page,
            status: 'tentative',
          },
        },
      }),
    i18n.translate('xpack.nightshift.knowledge.wiki.restoreErrorTitle', {
      defaultMessage: 'Could not restore Wiki page',
    })
  );
