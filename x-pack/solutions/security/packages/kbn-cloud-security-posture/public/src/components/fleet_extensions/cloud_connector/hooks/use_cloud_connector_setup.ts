/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import type { NewPackagePolicy, NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import type {
  CloudConnectorSecretReference,
  PackagePolicyConfigRecord,
} from '@kbn/fleet-plugin/public/types';
import type { UpdatePolicy } from '../../types';
import { updateInputVarsWithCredentials, updatePolicyInputs } from '../utils';

export interface CloudConnectorCredentials {
  roleArn?: string;
  externalId?: string | CloudConnectorSecretReference;
  cloudConnectorId?: string;
}

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

export const useCloudConnectorSetup = (
  input: NewPackagePolicyInput,
  newPolicy: NewPackagePolicy,
  updatePolicy: UpdatePolicy
): UseCloudConnectorSetupReturn => {
  // State for new connection form
  const [newConnectionCredentials, setNewConnectionCredentials] =
    useState<CloudConnectorCredentials>(() => {
      const vars = input.streams[0]?.vars ?? {};
      const externalIdKey = Object.keys(vars).find((key) =>
        key.toLowerCase().includes('external_id')
      );
      return {
        roleArn: vars.role_arn?.value,
        externalId: externalIdKey ? vars[externalIdKey]?.value : undefined,
      };
    });

  // State for existing connection form
  const [existingConnectionCredentials, setExistingConnectionCredentials] =
    useState<CloudConnectorCredentials>({
      roleArn: undefined,
      externalId: undefined,
      cloudConnectorId: undefined,
    });

  // Update policy with new connection credentials
  const updatePolicyWithNewCredentials = useCallback(
    (credentials: CloudConnectorCredentials) => {
      const updatedPolicy = { ...newPolicy };
      const inputVars = input.streams.find((i) => i.enabled)?.vars;

      // Handle undefined cases safely
      const updatedInputVars = updateInputVarsWithCredentials(
        inputVars as PackagePolicyConfigRecord,
        credentials
      );
      setNewConnectionCredentials(credentials);

      // Apply updatedVars to the policy using utility function
      if (inputVars) {
        const updatedPolicyWithInputs = updatePolicyInputs(
          updatedPolicy,
          updatedInputVars as PackagePolicyConfigRecord
        );
        updatePolicy({
          updatedPolicy: { ...updatedPolicyWithInputs, cloud_connector_id: undefined },
        });
      }
    },
    [input.streams, newPolicy, updatePolicy]
  );

  // Update policy with existing connection credentials
  const updatePolicyWithExistingCredentials = useCallback(
    (credentials: CloudConnectorCredentials) => {
      const updatedPolicy = { ...newPolicy };
      const inputVars = input.streams.find((i) => i.enabled)?.vars;

      // Handle undefined cases safely
      const updatedInputVars = updateInputVarsWithCredentials(
        inputVars as PackagePolicyConfigRecord,
        credentials
      );
      // Update existing connection credentials state
      setExistingConnectionCredentials(credentials);

      // Apply updatedVars to the policy
      if (inputVars) {
        const updatedPolicyWithInputs = updatePolicyInputs(
          updatedPolicy,
          updatedInputVars as PackagePolicyConfigRecord
        );
        updatedPolicy.inputs = updatedPolicyWithInputs.inputs;
      }
      updatedPolicy.cloud_connector_id = credentials.cloudConnectorId;

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
