/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  CreateSourceRequest,
  NightshiftSource,
  UpdateSourceRequest,
} from '@kbn/nightshift-shared';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { getFormattedError } from '../util/errors';
import { DISCOVERY_QUERIES_QUERY_KEY } from './use_fetch_discovery_queries';
import { DISCOVERY_QUERIES_OCCURRENCES_QUERY_KEY } from './use_fetch_discovery_queries_occurrences';
import { SOURCES_QUERY_KEY } from './use_fetch_sources';
import { useKibana } from './use_kibana';

// Query key prefixes of everything a source's knowledge feeds. The source id follows each prefix.
const SOURCE_KNOWLEDGE_QUERY_KEYS = [
  ['features'],
  DISCOVERY_QUERIES_QUERY_KEY,
  DISCOVERY_QUERIES_OCCURRENCES_QUERY_KEY,
  ['queryOccurrenceStats'],
];

/** Source writes. Create and update errors are left to the caller, which shows them inline. */
export function useSourcesApi() {
  const {
    core: {
      notifications: { toasts },
    },
    dependencies: {
      start: {
        nightshiftSources,
        significantEvents: { significantEventsRepositoryClient },
      },
    },
  } = useKibana();
  const queryClient = useQueryClient();

  const invalidateSources = () => queryClient.invalidateQueries({ queryKey: SOURCES_QUERY_KEY });
  // Every knowledge query goes stale, since lists across sources include this one, but only this
  // source's queries refetch now: each Sources table row holds its own, one request per row.
  const invalidateSourceKnowledge = ({ id }: NightshiftSource) =>
    Promise.all(
      SOURCE_KNOWLEDGE_QUERY_KEYS.flatMap((queryKey) => [
        queryClient.invalidateQueries({ queryKey, refetchType: 'none' }),
        queryClient.invalidateQueries({ queryKey: [...queryKey, id] }),
      ])
    );

  const createSource = useMutation<NightshiftSource, Error, CreateSourceRequest>({
    mutationFn: async (body) => {
      const client = await nightshiftSources.getClient();
      const { source } = await client.fetch('POST /internal/nightshift/sources', {
        params: { body },
        signal: null,
      });
      return source;
    },
    onSuccess: (source) => {
      toasts.addSuccess({ title: getSourceCreatedToastTitle(source.title) });
      return invalidateSources();
    },
  });

  const updateSource = useMutation<
    NightshiftSource,
    Error,
    { sourceId: string; body: UpdateSourceRequest }
  >({
    mutationFn: async ({ sourceId, body }) => {
      const client = await nightshiftSources.getClient();
      const { source } = await client.fetch('PUT /internal/nightshift/sources/{sourceId}', {
        params: { path: { sourceId }, body },
        signal: null,
      });
      return source;
    },
    onSuccess: (source) => {
      toasts.addSuccess({ title: getSourceSavedToastTitle(source.title) });
      return invalidateSources();
    },
  });

  const setSourceEnabled = useMutation<
    NightshiftSource,
    Error,
    { sourceId: string; enabled: boolean }
  >({
    mutationFn: async ({ sourceId, enabled }) => {
      const client = await nightshiftSources.getClient();
      const { source } = await client.fetch(
        enabled
          ? 'POST /internal/nightshift/sources/{sourceId}/_enable'
          : 'POST /internal/nightshift/sources/{sourceId}/_disable',
        { params: { path: { sourceId } }, signal: null }
      );
      return source;
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: SET_ENABLED_ERROR_TOAST_TITLE });
    },
    onSettled: invalidateSources,
  });

  const deleteSource = useMutation<void, Error, NightshiftSource>({
    mutationFn: async ({ id }) => {
      const client = await nightshiftSources.getClient();
      await client.fetch('DELETE /internal/nightshift/sources/{sourceId}', {
        params: { path: { sourceId: id } },
        signal: null,
      });
    },
    onSuccess: (_, source) => {
      toasts.addSuccess({ title: getSourceDeletedToastTitle(source.title) });
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: DELETE_ERROR_TOAST_TITLE });
    },
    onSettled: (_, __, source) =>
      Promise.all([invalidateSources(), invalidateSourceKnowledge(source)]),
  });

  const resetSourceKnowledge = useMutation<void, Error, NightshiftSource>({
    mutationFn: async ({ id }) => {
      await significantEventsRepositoryClient.fetch(
        'POST /internal/streams/{streamName}/knowledge_indicators/_reset',
        { params: { path: { streamName: id } }, signal: null }
      );
    },
    onSuccess: (_, source) => {
      toasts.addSuccess({ title: getKnowledgeResetToastTitle(source.title) });
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: RESET_ERROR_TOAST_TITLE });
    },
    onSettled: (_, __, source) => invalidateSourceKnowledge(source),
  });

  return { createSource, updateSource, setSourceEnabled, deleteSource, resetSourceKnowledge };
}

const getSourceCreatedToastTitle = (title: string) =>
  i18n.translate('xpack.significantEventsApp.sources.createdToastTitle', {
    defaultMessage: 'Source "{title}" created',
    values: { title },
  });

const getSourceSavedToastTitle = (title: string) =>
  i18n.translate('xpack.significantEventsApp.sources.savedToastTitle', {
    defaultMessage: 'Source "{title}" saved',
    values: { title },
  });

const getSourceDeletedToastTitle = (title: string) =>
  i18n.translate('xpack.significantEventsApp.sources.deletedToastTitle', {
    defaultMessage: 'Source "{title}" deleted',
    values: { title },
  });

const getKnowledgeResetToastTitle = (title: string) =>
  i18n.translate('xpack.significantEventsApp.sources.knowledgeResetToastTitle', {
    defaultMessage: 'Knowledge of "{title}" reset',
    values: { title },
  });

const SET_ENABLED_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.significantEventsApp.sources.setEnabledErrorToastTitle',
  { defaultMessage: 'Could not update the source' }
);

const DELETE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.significantEventsApp.sources.deleteErrorToastTitle',
  { defaultMessage: 'Could not delete the source' }
);

const RESET_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.significantEventsApp.sources.resetErrorToastTitle',
  { defaultMessage: 'Could not reset the knowledge of the source' }
);
