/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  API_VERSIONS,
  HUNT_THREAT_INTEL_SUPPLY_RESTORE_URL,
  HUNT_THREAT_INTEL_SUPPLY_URL,
  type HuntThreatIntelSupplyStatus,
} from '@kbn/alertzero-common';
import { retryOnTransientError } from './retry_on_transient_error';
import { queryKeys } from '../query_keys';

export const useHuntThreatIntelSupplyStatus = (enabled: boolean) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.huntThreatIntelSupply.status(),
    queryFn: (): Promise<HuntThreatIntelSupplyStatus> =>
      services.http!.get<HuntThreatIntelSupplyStatus>(HUNT_THREAT_INTEL_SUPPLY_URL, {
        version: API_VERSIONS.internal.v1,
      }),
    enabled,
    keepPreviousData: true,
    retry: retryOnTransientError,
  });
};

export const useRestoreHuntThreatIntelSupply = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.huntThreatIntelSupply.status();

  return useMutation({
    mutationFn: (): Promise<HuntThreatIntelSupplyStatus> =>
      services.http!.post<HuntThreatIntelSupplyStatus>(HUNT_THREAT_INTEL_SUPPLY_RESTORE_URL, {
        version: API_VERSIONS.internal.v1,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
    onError: (error) => {
      const cause = error instanceof Error ? error : new Error(String(error));
      services.notifications!.toasts.addError(cause, {
        title: i18n.translate('xpack.alertzero.huntThreatIntelSupplyRestoreErrorTitle', {
          defaultMessage: 'Unable to restore threat intel supply',
        }),
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });
};

/** Invalidate TI supply status after a successful Hunt worker save. */
export const invalidateHuntThreatIntelSupplyStatus = async (
  queryClient: QueryClient
): Promise<void> => {
  await queryClient.invalidateQueries({ queryKey: queryKeys.huntThreatIntelSupply.status() });
};
