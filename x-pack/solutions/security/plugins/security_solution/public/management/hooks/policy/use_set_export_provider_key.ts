/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions, UseMutationResult } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useMutation } from '@kbn/react-query';
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

export type UseSetExportProviderKeyOptions = Omit<
  UseMutationOptions<SetExportProviderKeyResponse, IHttpFetchError, SetExportProviderKeyParams>,
  'mutationFn'
>;

export type UseSetExportProviderKeyResult = UseMutationResult<
  SetExportProviderKeyResponse,
  IHttpFetchError,
  SetExportProviderKeyParams
>;

/** Sets or replaces the stored storage account key of one export provider of a policy. */
export const useSetExportProviderKey = (
  options?: UseSetExportProviderKeyOptions
): UseSetExportProviderKeyResult => {
  const http = useHttp();

  return useMutation<SetExportProviderKeyResponse, IHttpFetchError, SetExportProviderKeyParams>(
    ({ packagePolicyId, providerId, accountKey, packagePolicyVersion }) => {
      const body: SetExportProviderKeyRequestBody = {
        type: 'account_key',
        account_key: accountKey,
        package_policy_version: packagePolicyVersion,
      };

      return http.put<SetExportProviderKeyResponse>(
        resolvePathVariables(EXPORT_PROVIDER_KEY_ROUTE, {
          package_policy_id: packagePolicyId,
          provider_id: providerId,
        }),
        { version: '1', body: JSON.stringify(body) }
      );
    },
    options
  );
};
