/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../../common/lib/kibana';
import { EntityEventTypes } from '../../../../common/lib/telemetry';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import { fromApiLead } from './types';
import * as i18n from './translations';

const HUNTING_LEADS_QUERY_KEY = 'hunting-leads';
const LEAD_SCHEDULE_QUERY_KEY = 'lead-generation-status';
const LEAD_GENERATION_PRIVILEGES_QUERY_KEY = 'lead-generation-privileges';

const POLL_INTERVAL_MS = 2_000;
const MAX_POLLS = 30;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isPermissionDenied = (error: unknown): boolean =>
  (error as { body?: { statusCode?: number } })?.body?.statusCode === 403;

const FETCH_LEADS_PARAMS = {
  params: {
    page: 1 as const,
    perPage: 10 as const,
    sortField: 'priority' as const,
    sortOrder: 'desc' as const,
    status: 'active' as const,
  },
};

export const useHuntingLeads = (connectorId: string, isEnabled: boolean = true) => {
  const {
    fetchLeads,
    generateLeads: generateLeadsApi,
    fetchLeadGenerationStatus,
    enableLeadGeneration,
    disableLeadGeneration,
    fetchLeadGenerationPrivileges,
  } = useEntityAnalyticsRoutes();
  const queryClient = useQueryClient();
  const { addSuccess, addError, addWarning } = useAppToasts();
  const { telemetry } = useKibana().services;
  const abortCtrl = useRef(new AbortController());
  const [hasGenerated, setHasGenerated] = useState(false);
  const [readPermissionError, setReadPermissionError] = useState(false);
  const [writePermissionError, setWritePermissionError] = useState(false);

  const { data: privileges } = useQuery({
    queryKey: [LEAD_GENERATION_PRIVILEGES_QUERY_KEY],
    queryFn: fetchLeadGenerationPrivileges,
    enabled: isEnabled,
  });

  const proactiveReadPermissionError =
    isEnabled && privileges != null && !privileges.has_read_permissions;
  const proactiveWritePermissionError =
    isEnabled && privileges != null && !privileges.has_write_permissions;

  useEffect(() => {
    return () => {
      abortCtrl.current.abort();
    };
  }, []);

  const {
    data,
    isLoading: isLeadsLoading,
    refetch,
  } = useQuery({
    queryKey: [HUNTING_LEADS_QUERY_KEY],
    queryFn: ({ signal }) => fetchLeads({ signal, ...FETCH_LEADS_PARAMS }),
    enabled: isEnabled,
    onError: (error: Error) => {
      if (isPermissionDenied(error)) {
        setReadPermissionError(true);
      } else {
        addError(error, { title: i18n.FETCH_LEADS_ERROR });
      }
    },
  });

  const pollForCompletion = useCallback(
    async (executionUuid: string, signal: AbortSignal): Promise<'success' | 'timeout'> => {
      for (let i = 0; i < MAX_POLLS; i++) {
        if (signal.aborted) return 'timeout';
        await delay(POLL_INTERVAL_MS);
        if (signal.aborted) return 'timeout';

        const status = await fetchLeadGenerationStatus({ signal });
        if (status.lastExecutionUuid === executionUuid) {
          if (status.lastError) {
            throw new Error(status.lastError);
          }

          const result = await fetchLeads({ ...FETCH_LEADS_PARAMS, signal });
          queryClient.setQueryData([HUNTING_LEADS_QUERY_KEY], result);
          queryClient.setQueryData([LEAD_SCHEDULE_QUERY_KEY], status);
          return 'success';
        }
      }

      // Poll timed out waiting for the execution uuid to be persisted.
      // Fetch whatever leads are available so the cache is populated before
      // isGenerating flips to false, preventing a spurious empty-state flash.
      if (!signal.aborted) {
        const [finalResult, finalStatus] = await Promise.all([
          fetchLeads({ ...FETCH_LEADS_PARAMS, signal }),
          fetchLeadGenerationStatus({ signal }),
        ]);
        queryClient.setQueryData([HUNTING_LEADS_QUERY_KEY], finalResult);
        queryClient.setQueryData([LEAD_SCHEDULE_QUERY_KEY], finalStatus);
      }
      return 'timeout';
    },
    [fetchLeadGenerationStatus, fetchLeads, queryClient]
  );

  const { mutate: generate, isLoading: isGenerating } = useMutation({
    mutationFn: async () => {
      abortCtrl.current = new AbortController();
      const { signal } = abortCtrl.current;

      telemetry.reportEvent(EntityEventTypes.LeadGenerationGenerateClicked, {});
      const { executionUuid } = await generateLeadsApi({ params: { connectorId }, signal });
      return pollForCompletion(executionUuid, signal);
    },
    onSuccess: (result) => {
      setHasGenerated(true);
      if (result === 'timeout') {
        addWarning(i18n.GENERATE_TIMEOUT);
      } else {
        addSuccess(i18n.GENERATE_SUCCESS);
      }
    },
    onError: (error: Error) => {
      if (isPermissionDenied(error)) {
        setWritePermissionError(true);
      } else {
        addError(error, { title: i18n.GENERATE_ERROR });
      }
    },
  });

  const { data: statusData, isLoading: isStatusLoading } = useQuery({
    queryKey: [LEAD_SCHEDULE_QUERY_KEY],
    queryFn: ({ signal }) => fetchLeadGenerationStatus({ signal }),
    enabled: isEnabled,
    onError: (error: Error) => {
      if (isPermissionDenied(error)) {
        setReadPermissionError(true);
      } else {
        addError(error, { title: i18n.FETCH_STATUS_ERROR });
      }
    },
  });

  const { mutate: toggleSchedule } = useMutation({
    mutationFn: (enabled: boolean) =>
      enabled ? enableLeadGeneration({ connectorId }) : disableLeadGeneration(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LEAD_SCHEDULE_QUERY_KEY] }),
    onError: (error: Error) => addError(error, { title: i18n.SCHEDULE_UPDATE_ERROR }),
  });

  const isLoading = isLeadsLoading || isStatusLoading;

  return {
    leads: data?.leads?.map(fromApiLead) ?? [],
    totalCount: data?.total ?? 0,
    isLoading,
    isGenerating,
    hasGenerated,
    lastRunTimestamp: statusData?.lastRun ?? null,
    generate,
    refetch,
    isScheduled: statusData?.isEnabled ?? false,
    toggleSchedule,
    readPermissionError: proactiveReadPermissionError || readPermissionError,
    writePermissionError: proactiveWritePermissionError || writePermissionError,
  };
};
