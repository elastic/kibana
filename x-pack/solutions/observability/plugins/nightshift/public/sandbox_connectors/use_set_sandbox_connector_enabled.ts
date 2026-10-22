/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, type UseMutationResult } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type {
  PutSandboxConnectorEnabledResponse,
  SandboxConnector,
} from '@kbn/nightshift-investigations-plugin/common';
import { useKibana } from '../hooks/use_kibana';
import { useRefreshSandboxConnectors } from './use_fetch_sandbox_connectors';

export const useSetSandboxConnectorEnabled = (): UseMutationResult<
  PutSandboxConnectorEnabledResponse,
  Error,
  { connector: SandboxConnector; enabled: boolean }
> => {
  const { nightshiftInvestigations, notifications } = useKibana().services;
  const refresh = useRefreshSandboxConnectors();
  return useMutation({
    mutationFn: async ({ connector, enabled }) => {
      const investigationsClient = nightshiftInvestigations?.investigationsClient;
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch(
        'PUT /internal/nightshift/sandbox_connectors/{id}/enabled',
        {
          params: { path: { id: connector.id }, body: { enabled } },
          signal: null,
        }
      );
    },
    onSuccess: (response, { connector }) => {
      refresh();
      notifications.toasts.addSuccess({
        title: response.enabled
          ? i18n.translate('xpack.nightshift.sandboxConnectors.enabledToast', {
              defaultMessage: '{name} enabled',
              values: { name: connector.name },
            })
          : i18n.translate('xpack.nightshift.sandboxConnectors.disabledToast', {
              defaultMessage: '{name} disabled',
              values: { name: connector.name },
            }),
      });
    },
    onError: (error, { connector }) => {
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.nightshift.sandboxConnectors.enabledError', {
          defaultMessage: 'Could not update connector {name}',
          values: { name: connector.name },
        }),
      });
    },
  });
};
