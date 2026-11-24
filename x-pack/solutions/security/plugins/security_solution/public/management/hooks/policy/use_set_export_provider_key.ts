/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { EXPORT_PROVIDER_KEY_ROUTE } from '../../../../common/endpoint/constants';
import type {
  SetExportProviderKeyRequestBody,
  SetExportProviderKeyResponse,
} from '../../../../common/api/endpoint';
import { resolvePathVariables } from '../../../common/utils/resolve_path_variables';
import { useHttp } from '../../../common/lib/kibana';

interface SetExportProviderKeyParams {
  packagePolicyId: string;
  providerId: string;
  /** Plaintext; sent only to `EXPORT_PROVIDER_KEY_ROUTE`, never logged or stored elsewhere */
  accountKey: string;
  /** The package policy `version` the caller last saw */
  packagePolicyVersion: string;
}

export interface UseSetExportProviderKeyResult {
  /** Rejects with the `IHttpFetchError` of the request */
  setExportProviderKey: (
    params: SetExportProviderKeyParams
  ) => Promise<SetExportProviderKeyResponse>;
  isLoading: boolean;
}

/**
 * Sets or replaces the stored storage account key of one export provider of a policy. Not a
 * react-query mutation on purpose: mutation state keeps its variables (here the plaintext key) in
 * the shared query client after the request has finished.
 */
export const useSetExportProviderKey = (): UseSetExportProviderKeyResult => {
  const http = useHttp();
  const [isLoading, setIsLoading] = useState(false);

  const setExportProviderKey = useCallback(
    async ({
      packagePolicyId,
      providerId,
      accountKey,
      packagePolicyVersion,
    }: SetExportProviderKeyParams): Promise<SetExportProviderKeyResponse> => {
      const body: SetExportProviderKeyRequestBody = {
        type: 'account_key',
        account_key: accountKey,
        package_policy_version: packagePolicyVersion,
      };

      setIsLoading(true);

      try {
        return await http.put<SetExportProviderKeyResponse>(
          resolvePathVariables(EXPORT_PROVIDER_KEY_ROUTE, {
            package_policy_id: packagePolicyId,
            provider_id: providerId,
          }),
          { version: '1', body: JSON.stringify(body) }
        );
      } finally {
        setIsLoading(false);
      }
    },
    [http]
  );

  return { setExportProviderKey, isLoading };
};
