/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import {
  KNOWLEDGE_PURGE_CONFIRMATION,
  type KnowledgePurgePreview,
  type KnowledgePurgeResult,
} from '@kbn/nightshift-investigations-plugin/common';
import { useKibana } from '../../hooks/use_kibana';
import { getFormattedError } from '../../common/errors';

const purgeKeys = {
  preview: (since: string) => ['nightshift', 'knowledge', 'purge', 'preview', since] as const,
};

/** Undefined when `nightshift_investigations` is not installed; the section stays hidden. */
export const usePurgeClient = () =>
  useKibana().services.nightshiftInvestigations?.investigationsClient;

/** Counts what a purge at `since` would delete. Disabled until the operator picks a cutoff. */
export const usePurgePreview = (since: string | undefined) => {
  const client = usePurgeClient();

  return useQuery<KnowledgePurgePreview, Error>({
    queryKey: purgeKeys.preview(since ?? ''),
    queryFn: ({ signal }) =>
      client!.fetch('GET /internal/nightshift/knowledge/purge/preview', {
        signal: signal ?? null,
        params: { query: { since: since! } },
      }) as Promise<KnowledgePurgePreview>,
    enabled: client !== undefined && since !== undefined,
    // The stores keep changing while the operator reads the preview, so never serve a cached count.
    cacheTime: 0,
    staleTime: 0,
  });
};

export const usePurgeKnowledge = () => {
  const client = usePurgeClient();
  const { notifications } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation<KnowledgePurgeResult, Error, { since: string }>({
    mutationFn: ({ since }) =>
      client!.fetch('POST /internal/nightshift/knowledge/purge', {
        signal: null,
        params: { body: { since, confirm: KNOWLEDGE_PURGE_CONFIRMATION } },
      }) as Promise<KnowledgePurgeResult>,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['nightshift'] });
      const deleted = result.deleted;
      const summary = i18n.translate('xpack.nightshift.settings.purge.successToastText', {
        defaultMessage:
          'Deleted {memory, plural, one {# memory page} other {# memory pages}}, {cortex, plural, one {# Cortex page} other {# Cortex pages}}, {trees, plural, one {# decision tree document} other {# decision tree documents}} and {investigations, plural, one {# investigation} other {# investigations}}.',
        values: {
          memory: deleted.memory_pages,
          cortex: deleted.cortex_pages,
          trees: deleted.decision_trees,
          investigations: deleted.investigations,
        },
      });

      if (result.failures.length > 0) {
        notifications.toasts.addWarning({
          title: i18n.translate('xpack.nightshift.settings.purge.partialToastTitle', {
            defaultMessage: 'Purged with errors',
          }),
          text: `${summary} ${result.failures.map(({ scope }) => scope).join(', ')} failed.`,
        });
        return;
      }

      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.nightshift.settings.purge.successToastTitle', {
          defaultMessage: 'Purged everything learned since the cutoff',
        }),
        text: summary,
      });
    },
    onError: (error) => {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.nightshift.settings.purge.errorToastTitle', {
          defaultMessage: 'Failed to purge',
        }),
        text: getFormattedError(error).message,
      });
    },
  });
};
