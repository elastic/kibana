/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CreateSourceRequest, NightshiftSource } from '@kbn/nightshift-shared';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { getFormattedError } from '../../common/errors';
import { useKibana } from '../../hooks/use_kibana';
import { useBlocksNewActivity } from '../maintenance/use_significant_events_maintenance';
import { SOURCES_QUERY_KEY } from '../query_keys';
import { ONBOARDING_PAUSED_TOAST_TEXT } from './use_sources_api';

export type SourceDraftToCreate = CreateSourceRequest & { draftId: string };

export interface CreateSourcesResult {
  created: NightshiftSource[];
  failed: Array<{ draftId: string; error: Error }>;
}

/** Creates onboarding drafts in order, then refreshes the source catalog once. */
export const useCreateSources = () => {
  const {
    notifications: { toasts },
    nightshiftSources,
  } = useKibana().services;
  const queryClient = useQueryClient();
  const { isBlocked: isPaused } = useBlocksNewActivity();

  return useMutation<CreateSourcesResult, Error, SourceDraftToCreate[]>({
    mutationFn: async (drafts) => {
      const client = await nightshiftSources.getClient();
      const result: CreateSourcesResult = { created: [], failed: [] };

      for (const { draftId, ...body } of drafts) {
        try {
          const { source } = await client.fetch('POST /internal/nightshift/sources', {
            params: { body: { ...body, enabled: true } },
            signal: null,
          });
          result.created.push(source);
        } catch (error) {
          result.failed.push({ draftId, error: getFormattedError(error) });
        }
      }

      return result;
    },
    onSuccess: async ({ created, failed }, drafts) => {
      if (created.length > 0) {
        toasts.addSuccess({
          title: getDetectionEnabledToastTitle(created.length),
          text: isPaused ? ONBOARDING_PAUSED_TOAST_TEXT : undefined,
        });
      }

      const draftsById = new Map(drafts.map((draft) => [draft.draftId, draft]));
      failed.forEach(({ draftId, error }) => {
        const title = draftsById.get(draftId)?.title ?? '';
        toasts.addError(error, { title: getCreateSourceErrorToastTitle(title) });
      });

      await queryClient.invalidateQueries({ queryKey: SOURCES_QUERY_KEY });
    },
  });
};

const getDetectionEnabledToastTitle = (count: number) =>
  i18n.translate('xpack.nightshift.recommendedSources.detectionEnabledToastTitle', {
    defaultMessage: 'Detection enabled for {count, plural, one {# source} other {# sources}}',
    values: { count },
  });

const getCreateSourceErrorToastTitle = (title: string) =>
  i18n.translate('xpack.nightshift.recommendedSources.createSourceErrorToastTitle', {
    defaultMessage: 'Could not create source "{title}"',
    values: { title },
  });
