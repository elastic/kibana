/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import type { NewPackagePolicy, NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import type {
  PackagePolicyConfigRecord,
  PackagePolicyConfigRecordEntry,
} from '@kbn/fleet-plugin/public/types';
import type { UpdatePolicy } from '../../types';
import type { CloudConnectorCredentials, AwsCloudConnectorCredentials } from '../types';
import {
  isAzureCloudConnectorVars,
  updateInputVarsWithCredentials,
  updatePolicyInputs,
} from '../utils';
import { AWS_CLOUD_CONNECTOR_FIELD_NAMES, AZURE_CLOUD_CONNECTOR_FIELD_NAMES } from '../constants';

export interface UseCloudConnectorSetupReturn {
  // State for new connection form
  newConnectionCredentials: CloudConnectorCredentials;
  setNewConnectionCredentials: (credentials: CloudConnectorCredentials) => void;

  // State for existing connection form
  existingConnectionCredentials: CloudConnectorCredentials;
  setExistingConnectionCredentials: (credentials: CloudConnectorCredentials) => void;

  // Update policy callbacks
  updatePolicyWithNewCredentials: (credentials: CloudConnectorCredentials) => void;
  updatePolicyWithExistingCredentials: (credentials: CloudConnectorCredentials) => void;
}

// Helper function to extract value from var entry (handles both string and secret reference)
const extractVarValue = (
  varEntry: PackagePolicyConfigRecordEntry | undefined
): string | undefined => {
  if (!varEntry?.value) {
    return undefined;
  }

  // Handle string values directly
  if (typeof varEntry.value === 'string') {
    return varEntry.value;
  }

  // Handle secret reference objects
  if (typeof varEntry.value === 'object' && 'id' in varEntry.value) {
    return varEntry.value.id;
  }

  return undefined;
};

// Helper function to create initial credentials based on existing vars
const createInitialCredentials = (vars: PackagePolicyConfigRecord): CloudConnectorCredentials => {
  if (isAzureCloudConnectorVars(vars, 'azure')) {
    const azureCredentialsId =
      extractVarValue(vars.azure_credentials_cloud_connector_id) ||
      extractVarValue(vars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID]);

    return {
      tenantId:
        extractVarValue(vars.tenant_id) ||
        extractVarValue(vars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID]),
      clientId:
        extractVarValue(vars.client_id) ||
        extractVarValue(vars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID]),
      azure_credentials_cloud_connector_id: azureCredentialsId,
    };
  }

  // Default to AWS credentials (role_arn is a text var, external_id could be secret or text)
  return {
    roleArn:
      extractVarValue(vars.role_arn) ||
      extractVarValue(vars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.ROLE_ARN]),
    externalId:
      extractVarValue(vars.external_id) ||
      extractVarValue(vars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.EXTERNAL_ID]),
  } as AwsCloudConnectorCredentials;
};

export const useCloudConnectorSetup = (
  input: NewPackagePolicyInput,
  newPolicy: NewPackagePolicy,
  updatePolicy: UpdatePolicy
): UseCloudConnectorSetupReturn => {
  // State for new connection form
  const [newConnectionCredentials, setNewConnectionCredentials] =
    useState<CloudConnectorCredentials>(() => {
      // Safely access vars from the first enabled stream or fallback to empty object
      const vars = input.streams?.find((stream) => stream.enabled)?.vars ?? {};
      return createInitialCredentials(vars);
    });

  // State for existing connection form
  const [existingConnectionCredentials, setExistingConnectionCredentials] =
    useState<CloudConnectorCredentials>({});

  // Update policy with new connection credentials
  const updatePolicyWithNewCredentials = useCallback(
    (credentials: CloudConnectorCredentials) => {
      const updatedPolicy = { ...newPolicy };
      const inputVars = input.streams?.find((i) => i.enabled)?.vars;

      // Handle undefined cases safely
      if (inputVars) {
        const updatedInputVars = updateInputVarsWithCredentials(
          inputVars as PackagePolicyConfigRecord,
          credentials
        );

        const updatedPolicyWithInputs = updatePolicyInputs(
          updatedPolicy,
          updatedInputVars as PackagePolicyConfigRecord
        );
        updatePolicy({
          updatedPolicy: { ...updatedPolicyWithInputs, cloud_connector_id: undefined },
        });
      }

      setNewConnectionCredentials(credentials);
    },
    [input.streams, newPolicy, updatePolicy]
  );

  // Update policy with existing connection credentials
  const updatePolicyWithExistingCredentials = useCallback(
    (credentials: CloudConnectorCredentials) => {
      const updatedPolicy = { ...newPolicy };
      const inputVars = input.streams?.find((i) => i.enabled)?.vars;

      // Handle undefined cases safely
      if (inputVars) {
        const updatedInputVars = updateInputVarsWithCredentials(
          inputVars as PackagePolicyConfigRecord,
          credentials
        );

        if (updatedInputVars) {
          const updatedPolicyWithInputs = updatePolicyInputs(updatedPolicy, updatedInputVars);
          // Create a clean copy to avoid circular references
          updatedPolicy.inputs = [...(updatedPolicyWithInputs.inputs || [])];
        }
      }

      // Update existing connection credentials state
      setExistingConnectionCredentials(credentials);

      // Set cloud connector ID if provided
      if (credentials.cloudConnectorId) {
        updatedPolicy.cloud_connector_id = credentials.cloudConnectorId;
      }

      updatePolicy({ updatedPolicy });
    },
    [input.streams, newPolicy, updatePolicy]
  );

  return {
    newConnectionCredentials,
    setNewConnectionCredentials,
    existingConnectionCredentials,
    setExistingConnectionCredentials,
    updatePolicyWithNewCredentials,
    updatePolicyWithExistingCredentials,
  };
};
