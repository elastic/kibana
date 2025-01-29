/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useTrackedPromise } from '@kbn/use-tracked-promise';
import { i18n } from '@kbn/i18n';
import { useKibana } from './use_kibana';

// Errors
const UNAUTHORIZED_ERROR = i18n.translate(
  'xpack.observability_onboarding.installIntegration.error.unauthorized',
  {
    defaultMessage:
      'Required kibana privilege {requiredKibanaPrivileges} is missing, please add the required privilege to the role of the authenticated user.',
    values: {
      requiredKibanaPrivileges: "['Fleet', 'Integrations']",
    },
  }
);

type ErrorType = 'AuthorizationError' | 'UnknownError';
export interface IntegrationInstallationError {
  type: ErrorType;
  message: string;
}

type IntegrationInstallStatus = 'installed' | 'installing' | 'install_failed' | 'not_installed';

export const useInstallIntegrations = ({
  onIntegrationCreationSuccess,
  onIntegrationCreationFailure,
  packages = ['system'],
}: {
  onIntegrationCreationSuccess?: ({ versions }: { versions?: string[] }) => void;
  onIntegrationCreationFailure: (error: IntegrationInstallationError) => void;
  packages?: string[];
}) => {
  const {
    services: { http },
  } = useKibana();
  const [requestState, callPerformRequest] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: async () => {
        const options = {
          headers: { 'Elastic-Api-Version': '2023-10-31' },
        };

        const integrations = [];
        for (const packageName of packages) {
          const { item: integration } = await http.get<{
            item: { version: string; status: IntegrationInstallStatus };
          }>(`/api/fleet/epm/packages/${packageName}`, options);

          if (integration.status !== 'installed') {
            await http.post(`/api/fleet/epm/packages/${packageName}`, options);
          }
          integrations.push(integration);
        }

        return {
          versions: integrations.map((integration) => integration.version),
        };
      },
      onResolve: ({ versions }: { versions?: string[] }) => {
        onIntegrationCreationSuccess?.({ versions });
      },
      onReject: (requestError: any) => {
        if (requestError?.body?.statusCode === 403) {
          onIntegrationCreationFailure({
            type: 'AuthorizationError' as const,
            message: UNAUTHORIZED_ERROR,
          });
        } else {
          onIntegrationCreationFailure({
            type: 'UnknownError' as const,
            message: requestError?.body?.message,
          });
        }
      },
    },
    [onIntegrationCreationSuccess, onIntegrationCreationFailure]
  );

  const performRequest = useCallback(() => {
    callPerformRequest();
  }, [callPerformRequest]);

  return {
    performRequest,
    requestState,
  };
};
