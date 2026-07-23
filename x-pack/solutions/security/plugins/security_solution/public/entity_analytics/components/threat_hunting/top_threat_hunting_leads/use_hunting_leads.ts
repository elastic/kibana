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
import { useLeadGenerationPrivileges } from '../../../api/hooks/use_lead_generation_privileges';
import { fromApiLead } from './types';
import * as i18n from './translations';
import { MAX_RECENT_LEADS } from './utils';

const HUNTING_LEADS_QUERY_KEY = 'hunting-leads';
const LEAD_SCHEDULE_QUERY_KEY = 'lead-generation-status';

const POLL_INTERVAL_MS = 2_000;
// Active-poll window = MAX_POLLS * POLL_INTERVAL_MS = 150s. The UI advertises
// "up to two minutes"; the extra ~30s of headroom keeps runs that finish a
// touch late from routinely hitting the "taking longer than expected" warning.
// Keep this window below IN_FLIGHT_STALE_MS so reload-resume still works.
const MAX_POLLS = 75;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isPermissionDenied = (error: unknown): boolean =>
  (error as { body?: { statusCode?: number } })?.body?.statusCode === 403;

const FETCH_LEADS_PARAMS = {
  params: {
    page: 1 as const,
    perPage: MAX_RECENT_LEADS,
    sortField: 'priority' as const,
    sortOrder: 'desc' as const,
    status: 'active' as const,
  },
};

// ---------------------------------------------------------------------------
// Reload-resume: persists the currently in-flight generation's executionUuid
// so that reloading the page while a run is still going doesn't drop the
// "Generating..." UI. This is a client-only, best-effort mechanism (scoped to
// the current browser via localStorage): it does not survive a different
// browser/device, and it can't detect generations triggered from chat.
// ---------------------------------------------------------------------------

const IN_FLIGHT_STORAGE_KEY_PREFIX = 'securitySolution.entityAnalytics.leadGeneration.inFlight';
// A run should normally finish within the ~2 min the UI advertises; treat
// anything older than this as abandoned rather than resuming it forever.
const IN_FLIGHT_STALE_MS = 5 * 60 * 1000;

interface InFlightGeneration {
  executionUuid: string;
  startedAt: number;
}

const getInFlightStorageKey = (spaceId: string): string =>
  `${IN_FLIGHT_STORAGE_KEY_PREFIX}.${spaceId}`;

const readInFlightGeneration = (spaceId: string): InFlightGeneration | null => {
  try {
    const raw = localStorage.getItem(getInFlightStorageKey(spaceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InFlightGeneration>;
    if (typeof parsed.executionUuid !== 'string' || typeof parsed.startedAt !== 'number') {
      return null;
    }
    return { executionUuid: parsed.executionUuid, startedAt: parsed.startedAt };
  } catch {
    return null;
  }
};

const writeInFlightGeneration = (spaceId: string, entry: InFlightGeneration): void => {
  try {
    localStorage.setItem(getInFlightStorageKey(spaceId), JSON.stringify(entry));
  } catch {
    // localStorage may be unavailable (e.g. private browsing); resuming after
    // a reload is a best-effort enhancement, so failures here are ignored.
  }
};

const clearInFlightGeneration = (spaceId: string): void => {
  try {
    localStorage.removeItem(getInFlightStorageKey(spaceId));
  } catch {
    // See writeInFlightGeneration.
  }
};

export const useHuntingLeads = (
  connectorId: string,
  isEnabled: boolean = true,
  spaceId: string = 'default'
) => {
  const {
    fetchLeads,
    generateLeads: generateLeadsApi,
    fetchLeadGenerationStatus,
    enableLeadGeneration,
    disableLeadGeneration,
  } = useEntityAnalyticsRoutes();
  const queryClient = useQueryClient();
  const { addSuccess, addError, addWarning } = useAppToasts();
  const { telemetry } = useKibana().services;
  const abortCtrl = useRef(new AbortController());
  const [hasGenerated, setHasGenerated] = useState(false);
  const [readPermissionError, setReadPermissionError] = useState(false);
  const [writePermissionError, setWritePermissionError] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const hasCheckedResumeRef = useRef(false);

  const { data: privileges } = useLeadGenerationPrivileges(isEnabled);

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

  const { mutate: generate, isLoading: isGeneratingMutation } = useMutation({
    mutationFn: async () => {
      abortCtrl.current = new AbortController();
      const { signal } = abortCtrl.current;

      telemetry.reportEvent(EntityEventTypes.LeadGenerationGenerateClicked, {});
      const { executionUuid } = await generateLeadsApi({ params: { connectorId }, signal });
      writeInFlightGeneration(spaceId, { executionUuid, startedAt: Date.now() });
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
    onSettled: () => {
      clearInFlightGeneration(spaceId);
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

  // On mount, resume tracking a generation run that was still in progress
  // before the page was reloaded (see the "Reload-resume" note above). This
  // only runs once, after the status query settles.
  useEffect(() => {
    if (!isEnabled || hasCheckedResumeRef.current || isStatusLoading || !statusData) {
      return;
    }
    hasCheckedResumeRef.current = true;

    const stored = readInFlightGeneration(spaceId);
    if (!stored) return;

    if (Date.now() - stored.startedAt > IN_FLIGHT_STALE_MS) {
      clearInFlightGeneration(spaceId);
      return;
    }

    if (statusData.lastExecutionUuid === stored.executionUuid) {
      // The run already finished (successfully or not) while we were away.
      clearInFlightGeneration(spaceId);
      return;
    }

    abortCtrl.current = new AbortController();
    const { signal } = abortCtrl.current;
    setIsResuming(true);
    pollForCompletion(stored.executionUuid, signal)
      .then(() => {
        setHasGenerated(true);
      })
      .catch((error: Error) => {
        if (!isPermissionDenied(error)) {
          addError(error, { title: i18n.GENERATE_ERROR });
        }
      })
      .finally(() => {
        clearInFlightGeneration(spaceId);
        setIsResuming(false);
      });
  }, [isEnabled, isStatusLoading, statusData, spaceId, pollForCompletion, addError]);

  const { mutate: toggleSchedule } = useMutation({
    mutationFn: (enabled: boolean) =>
      enabled ? enableLeadGeneration({ connectorId }) : disableLeadGeneration(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LEAD_SCHEDULE_QUERY_KEY] }),
    onError: (error: Error) => addError(error, { title: i18n.SCHEDULE_UPDATE_ERROR }),
  });

  const isLoading = isLeadsLoading || isStatusLoading;
  const isGenerating = isGeneratingMutation || isResuming;

  return {
    leads: data?.leads?.map(fromApiLead) ?? [],
    // `total` is a raw count unaffected by `perPage`, so clamp it to the same
    // cap applied to the fetched leads to avoid the displayed count exceeding
    // what a consumer (e.g. the flyout) can actually show.
    totalCount: Math.min(data?.total ?? 0, MAX_RECENT_LEADS),
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
