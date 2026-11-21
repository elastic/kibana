/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import {
  NATIVE_VULN_SCANNER_API_VERSION,
  ONBOARDING_PLAN_PATH,
  ONBOARDING_RUNTIME_PIN_PATH,
  ONBOARDING_SCHEDULE_PATH,
  KNOWLEDGE_PATH,
  ONBOARDING_STATUS_PATH,
  SCAN_PATH,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/constants';
import type {
  InsufficientLicenseStatus,
  OnboardingPlan,
  OnboardingStatus,
  RuntimePinResult,
  VulnerabilityKnowledgeResponse,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/types';
import type { InventoryPackBody } from '@kbn/cloud-security-posture-common/native_vuln_scanner/pack_body';
import { useKibana } from '../hooks/use_kibana';

export type OnboardingStatusResponse = OnboardingStatus | InsufficientLicenseStatus;

export const NATIVE_VULN_SCANNER_STATUS_QUERY_KEY = 'csp_native_vuln_scanner_status';
export const NATIVE_VULN_SCANNER_AVAILABILITY_QUERY_KEY = 'csp_native_vuln_scanner_availability';

/** Status refetch interval while an inventory is pending or a scan runs. */
export const STATUS_POLL_INTERVAL_MS = 30000;
/** Faster interval right after "Scan now", so the user sees the run start and end. */
export const SCAN_POLL_INTERVAL_MS = 5000;

const OSQUERY_API_VERSION = '2023-10-31';
const OSQUERY_PACKS_PATH = '/api/osquery/packs';
const OSQUERY_LIVE_QUERIES_PATH = '/api/osquery/live_queries';

export const isInsufficientLicense = (
  status: OnboardingStatusResponse | undefined
): status is InsufficientLicenseStatus => status?.license === 'insufficient';

const hasPendingInventory = (status: OnboardingStatusResponse | undefined): boolean =>
  !!status &&
  !isInsufficientLicense(status) &&
  (status.scanRunning || status.policies.some(({ state }) => state === 'pending_inventory'));

export interface OsqueryPackSummary {
  saved_object_id: string;
  name: string;
  description?: string;
  policy_ids?: string[];
}

interface OsqueryPackFindResponse {
  data: OsqueryPackSummary[];
}

interface OsqueryPackWriteResponse {
  data: { saved_object_id?: string; id?: string };
}

export interface PackUpdateBody {
  policy_ids: string[];
  description: string;
  enabled?: boolean;
  schedule_type?: InventoryPackBody['schedule_type'];
  interval?: number;
  queries?: InventoryPackBody['queries'];
}

export type NativeVulnScannerClient = ReturnType<typeof useNativeVulnScannerClient>;

export const useNativeVulnScannerClient = () => {
  const { http } = useKibana().services;

  return useMemo(() => {
    const version = NATIVE_VULN_SCANNER_API_VERSION;

    return {
      getStatus: () => http.get<OnboardingStatusResponse>(ONBOARDING_STATUS_PATH, { version }),
      getPlan: (policyIds: string[]) =>
        http.post<OnboardingPlan>(ONBOARDING_PLAN_PATH, {
          version,
          body: JSON.stringify({ policyIds }),
        }),
      pinRuntime: (policyIds: string[]) =>
        http.post<{ results: RuntimePinResult[] }>(ONBOARDING_RUNTIME_PIN_PATH, {
          version,
          body: JSON.stringify({ policyIds }),
        }),
      setSchedule: (enabled: boolean) =>
        http.post<{ enabled: boolean }>(ONBOARDING_SCHEDULE_PATH, {
          version,
          body: JSON.stringify({ enabled }),
        }),
      scanNow: () => http.post<{ executionId: string }>(SCAN_PATH, { version }),

      /** The osquery route searches name and description fuzzily, so callers keep the exact name. */
      findPacks: (name: string) =>
        http.get<OsqueryPackFindResponse>(OSQUERY_PACKS_PATH, {
          version: OSQUERY_API_VERSION,
          query: { search: `"${name}"`, pageSize: 100 },
        }),
      createPack: (body: InventoryPackBody, policyIds: string[]) =>
        http.post<OsqueryPackWriteResponse>(OSQUERY_PACKS_PATH, {
          version: OSQUERY_API_VERSION,
          body: JSON.stringify({ ...body, policy_ids: policyIds }),
        }),
      updatePack: (packId: string, body: PackUpdateBody) =>
        http.put<OsqueryPackWriteResponse>(`${OSQUERY_PACKS_PATH}/${encodeURIComponent(packId)}`, {
          version: OSQUERY_API_VERSION,
          body: JSON.stringify(body),
        }),
      runPackLiveQuery: (packId: string, policyIds: string[]) =>
        http.post<unknown>(OSQUERY_LIVE_QUERIES_PATH, {
          version: OSQUERY_API_VERSION,
          body: JSON.stringify({ pack_id: packId, agent_policy_ids: policyIds }),
        }),
    };
  }, [http]);
};

/**
 * The onboarding status. It polls while any policy waits for its first inventory or a scan runs,
 * and faster right after the user starts a scan.
 */
export const useNativeVulnScannerStatus = ({ awaitingScan }: { awaitingScan: boolean }) => {
  const client = useNativeVulnScannerClient();

  return useQuery([NATIVE_VULN_SCANNER_STATUS_QUERY_KEY], () => client.getStatus(), {
    refetchInterval: (data) => {
      if (awaitingScan) return SCAN_POLL_INTERVAL_MS;
      return hasPendingInventory(data) ? STATUS_POLL_INTERVAL_MS : false;
    },
  });
};

/**
 * Whether the scanner routes exist (status answers 200). The routes are absent when the plugin is
 * off, so any failure counts as "not available" and is swallowed instead of logged.
 */
export const useNativeVulnScannerAvailability = () => {
  const client = useNativeVulnScannerClient();

  return useQuery(
    [NATIVE_VULN_SCANNER_AVAILABILITY_QUERY_KEY],
    async () => {
      try {
        await client.getStatus();
        return true;
      } catch (e) {
        return false;
      }
    },
    { retry: false, refetchOnWindowFocus: false, staleTime: Infinity }
  );
};

export const NATIVE_VULN_SCANNER_KNOWLEDGE_QUERY_KEY = 'csp_native_vuln_scanner_knowledge';

/**
 * The vendor text of a native-scanner finding. A 404 (no text for the CVE) or 403 (the caller
 * cannot read the knowledge index) is an expected answer, so it never retries and the flyout
 * just hides the vendor sections.
 */
export const useVulnerabilityKnowledge = ({
  knowledgeId,
  advisoryIds,
}: {
  knowledgeId: string | undefined;
  advisoryIds: string[];
}) => {
  const { http } = useKibana().services;

  return useQuery(
    [NATIVE_VULN_SCANNER_KNOWLEDGE_QUERY_KEY, knowledgeId, advisoryIds],
    () =>
      http.get<VulnerabilityKnowledgeResponse>(
        KNOWLEDGE_PATH.replace('{knowledge_id}', encodeURIComponent(knowledgeId ?? '')),
        {
          version: NATIVE_VULN_SCANNER_API_VERSION,
          query: { advisory_ids: advisoryIds },
        }
      ),
    { enabled: !!knowledgeId, retry: false, refetchOnWindowFocus: false }
  );
};
