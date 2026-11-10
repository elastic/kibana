/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type { InvestigatorServiceAccountStatus } from '@kbn/nightshift-investigations-plugin/common';
import type { DetectionEngineServiceAccountStatus } from '@kbn/significant-events-plugin/common';
import { isHttpClientError } from '../../common/http_error';
import { useKibana } from '../../hooks/use_kibana';

/** The query key of the investigator's setup status, which the setup hook refreshes. */
export const INVESTIGATOR_SERVICE_ACCOUNT_QUERY_KEY = [
  'nightshift.investigatorServiceAccount',
] as const;

/** Reads whether Nightshift is set up with its service account in the current space. */
export const useInvestigatorServiceAccount = (): UseQueryResult<
  InvestigatorServiceAccountStatus,
  Error
> => {
  const investigationsClient = useKibana().services.nightshiftInvestigations?.investigationsClient;

  return useQuery<InvestigatorServiceAccountStatus, Error>({
    queryKey: INVESTIGATOR_SERVICE_ACCOUNT_QUERY_KEY,
    enabled: investigationsClient != null,
    queryFn: async ({ signal }) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('GET /internal/nightshift/investigations/service_account', {
        signal: signal ?? null,
      });
    },
    retry: (failureCount, error) => !isHttpClientError(error) && failureCount < 3,
  });
};

/**
 * Nightshift is usable in a space once service accounts are on, its investigation entry point is
 * installed, enabled, and bound to the space's agent account, and its detection engine is bound to
 * the detection account. A space set up before the detection account existed has only the first.
 */
export const isNightshiftSetUp = ({
  investigator,
  detection,
}: {
  investigator: InvestigatorServiceAccountStatus | undefined;
  detection: DetectionEngineServiceAccountStatus | undefined;
}): boolean =>
  investigator?.serviceAccountsEnabled === true &&
  investigator.installed === true &&
  investigator.enabled === true &&
  investigator.bound === true &&
  detection?.serviceAccountId != null;
