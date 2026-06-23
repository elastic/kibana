/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { HttpSetup } from '@kbn/core/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { CaptureConfig, ComponentStatus } from '../../common/constants';
import { CAPTURE_LOG_INDEX_DEFAULT } from '../../common/constants';

const STATUS_QUERY_KEY = ['errorSentry', 'status'] as const;

const buildDiscoverEsqlUrl = (
  discover: DiscoverStart | undefined,
  index: string
): string | undefined => {
  return discover?.locator?.getRedirectUrl({
    query: { esql: `FROM ${index} | SORT @timestamp DESC | LIMIT 100` },
  });
};

export const useErrorSentryStatus = (http: HttpSetup, discover?: DiscoverStart) => {
  const queryClient = useQueryClient();

  const { isLoading, data, error, refetch } = useQuery(STATUS_QUERY_KEY, ({ signal }) =>
    http.get<{ components: ComponentStatus[]; captureConfig: CaptureConfig | null }>(
      '/internal/error_sentry/status',
      { signal }
    )
  );

  const { mutateAsync: install, isLoading: isInstalling } = useMutation(
    ['errorSentry', 'install'],
    () => http.post('/internal/error_sentry/install'),
    { onSuccess: () => queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY }) }
  );

  const {
    mutateAsync: repair,
    isLoading: isRepairing,
    variables: repairingId,
  } = useMutation(
    ['errorSentry', 'repair'],
    (componentId: string) =>
      http.post(`/internal/error_sentry/install/${encodeURIComponent(componentId)}`),
    { onSuccess: () => queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY }) }
  );

  const { mutateAsync: runCapture, isLoading: isRunningCapture } = useMutation(
    ['errorSentry', 'runCapture'],
    () => http.post<{ executionId: string }>('/internal/error_sentry/run_capture')
  );

  const { mutateAsync: runIntrospect, isLoading: isRunningIntrospect } = useMutation(
    ['errorSentry', 'runIntrospect'],
    () => http.post<{ executionId: string }>('/internal/error_sentry/run_introspect'),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ['errorSentry', 'captureConfig'] });
      },
    }
  );

  const { mutateAsync: exportConfig } = useMutation(
    ['errorSentry', 'export'],
    async () => {
      const response = await window.fetch(
        http.basePath.prepend('/internal/error_sentry/export'),
        { credentials: 'same-origin', headers: { 'x-elastic-internal-origin': 'kibana' } }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'error-sentry-export.zip';
      a.click();
      URL.revokeObjectURL(url);
    }
  );

  const discoverLogSourceUrl = buildDiscoverEsqlUrl(discover, CAPTURE_LOG_INDEX_DEFAULT);

  return {
    isLoading,
    isInstalling,
    repairingId: isRepairing ? repairingId ?? null : null,
    components: (data?.components ?? []).map((c) => {
      if (c.id === 'log_source' && discoverLogSourceUrl) {
        return { ...c, actionLink: discoverLogSourceUrl };
      }
      return {
        ...c,
        actionLink: c.actionLink ? http.basePath.prepend(c.actionLink) : undefined,
      };
    }),
    error: error
      ? String(
          (error as { body?: { message?: string } })?.body?.message ??
            (error instanceof Error ? error.message : error)
        )
      : null,
    captureConfig: data?.captureConfig ?? null,
    install,
    repair,
    runCapture,
    isRunningCapture,
    runIntrospect,
    isRunningIntrospect,
    exportConfig,
    refetch,
  };
};
