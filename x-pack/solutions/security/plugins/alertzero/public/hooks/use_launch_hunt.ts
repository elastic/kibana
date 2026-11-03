/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS } from '@kbn/alertzero-common';
import { HUNT_LIBRARY_URL } from '../../common/constants';
import type { HuntLaunchResponse } from '../../common/hunt_library';
import { queryKeys } from '../query_keys';

/**
 * Records a manual hunt session. The caller supplies the `sessionId`, so a retry of the same launch
 * sends the same id and the server reuses the session instead of recording a second one.
 */
export const useLaunchHunt = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      huntId,
      sessionId,
    }: {
      huntId: string;
      sessionId: string;
    }): Promise<HuntLaunchResponse> =>
      services.http!.post<HuntLaunchResponse>(
        `${HUNT_LIBRARY_URL}/${encodeURIComponent(huntId)}/launch`,
        {
          version: API_VERSIONS.internal.v1,
          body: JSON.stringify({ session_id: sessionId }),
        }
      ),
    // A launch is run history: refresh whatever shows it.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.huntLibrary.all }),
  });
};
