/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import type {
  UpdatePackagePolicy,
  GetOnePackagePolicyResponse,
  UpdatePackagePolicyResponse,
} from '@kbn/fleet-plugin/common';
import type { CloudConnector } from '@kbn/fleet-plugin/common/types';
import { packagePolicyRouteService, API_VERSIONS } from '@kbn/fleet-plugin/common';
import { CLOUD_CONNECTOR_API_ROUTES } from '@kbn/fleet-plugin/public';
import type { PackagePolicyConfigRecord } from '@kbn/fleet-plugin/public/types';
import {
  updateInputVarsWithCredentials,
  isAwsCloudConnectorVars,
  isAzureCloudConnectorVars,
} from '../utils';
import type { CloudConnectorCredentials } from '../types';

interface UpdatePackagePolicyCloudConnectorParams {
  packagePolicyId: string;
  cloudConnectorId: string;
}

// Helper to convert cloud connector vars to credentials format
const convertCloudConnectorVarsToCredentials = (
  cloudConnector: CloudConnector
): CloudConnectorCredentials => {
  if (isAwsCloudConnectorVars(cloudConnector.vars, cloudConnector.cloudProvider)) {
    return {
      roleArn: cloudConnector.vars.role_arn?.value,
      externalId: cloudConnector.vars.external_id?.value?.id, // Secret reference ID
      cloudConnectorId: cloudConnector.id,
    };
  } else if (isAzureCloudConnectorVars(cloudConnector.vars, cloudConnector.cloudProvider)) {
    return {
      tenantId: cloudConnector.vars.tenant_id?.value?.id, // Secret reference ID
      clientId: cloudConnector.vars.client_id?.value?.id, // Secret reference ID
      azure_credentials_cloud_connector_id:
        cloudConnector.vars.azure_credentials_cloud_connector_id?.value,
      cloudConnectorId: cloudConnector.id,
    };
  }

  return { cloudConnectorId: cloudConnector.id };
};

export const useUpdatePackagePolicyCloudConnector = (
  onSuccess?: () => void,
  onError?: (error: Error) => void
) => {
  const { notifications, http } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation(
    async ({ packagePolicyId, cloudConnectorId }: UpdatePackagePolicyCloudConnectorParams) => {
      if (!http) {
        throw new Error('HTTP service is not available');
      }

      const cloudConnectorResponse = await http.get<{ item: CloudConnector }>(
        CLOUD_CONNECTOR_API_ROUTES.INFO_PATTERN.replace('{cloudConnectorId}', cloudConnectorId)
      );
      const cloudConnector = cloudConnectorResponse.item;

      // TODO: use sendGetOnePackagePolicy when this is moved to Fleet plugin
      const packagePolicyResponse = await http.get<GetOnePackagePolicyResponse>(
        packagePolicyRouteService.getInfoPath(packagePolicyId),
        {
          version: API_VERSIONS.public.v1,
        }
      );
      if (!packagePolicyResponse || !packagePolicyResponse.item) {
        throw new Error('Package policy not found');
      }
      const currentPolicy = packagePolicyResponse.item;

      const credentials = convertCloudConnectorVarsToCredentials(cloudConnector);

      const currentInput = currentPolicy.inputs?.find((input) => input.enabled);
      if (!currentInput?.streams?.[0]?.vars) {
        throw new Error('Unable to find input variables in package policy');
      }

      const updatedInputVars = updateInputVarsWithCredentials(
        currentInput.streams[0].vars as PackagePolicyConfigRecord,
        credentials
      );

      const updatedInputs = currentPolicy.inputs.map((input) => {
        if (input.enabled && input.streams?.[0]) {
          return {
            ...input,
            streams: input.streams.map((stream, idx) =>
              idx === 0 ? { ...stream, vars: updatedInputVars } : stream
            ),
          };
        }
        return input;
      });

      const body: Partial<UpdatePackagePolicy> = {
        cloud_connector_id: cloudConnectorId,
        inputs: updatedInputs,
      };

      // TODO: use sendUpdatePackagePolicy when this is moved to Fleet plugin
      const result = await http.put<UpdatePackagePolicyResponse>(
        packagePolicyRouteService.getUpdatePath(packagePolicyId),
        {
          version: API_VERSIONS.public.v1,
          body: JSON.stringify(body),
        }
      );

      return result;
    },
    {
      onSuccess: () => {
        // Invalidate relevant queries to refresh the UI
        queryClient.invalidateQueries(['cloud-connector-usage']);
        queryClient.invalidateQueries(['get-cloud-connectors']);

        notifications?.toasts.addSuccess({
          title: i18n.translate(
            'securitySolutionPackages.cloudSecurityPosture.switchCloudConnector.successTitle',
            {
              defaultMessage: 'Cloud connector switched successfully',
            }
          ),
        });

        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error: Error) => {
        notifications?.toasts.addError(error, {
          title: i18n.translate(
            'securitySolutionPackages.cloudSecurityPosture.switchCloudConnector.errorTitle',
            {
              defaultMessage: 'Failed to switch cloud connector',
            }
          ),
        });

        if (onError) {
          onError(error);
        }
      },
    }
  );
};
