/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiComboBox, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import type { AwsCloudConnectorVars } from '@kbn/fleet-plugin/common/types';
import type {
  AwsCloudConnectorCredentials,
  AwsCloudConnectorOption,
  ComboBoxOption,
} from '../types';
import { useGetCloudConnectors } from '../hooks/use_get_cloud_connectors';
import { isAwsCloudConnectorVars } from '../utils';
import { AWS_PROVIDER } from '../constants';

export const AWSReusableConnectorForm: React.FC<{
  cloudConnectorId: string | undefined;
  isEditPage: boolean;
  credentials: AwsCloudConnectorCredentials;
  setCredentials: (credentials: AwsCloudConnectorCredentials) => void;
}> = ({ credentials, setCredentials, isEditPage, cloudConnectorId }) => {
  const { data: cloudConnectors = [] } = useGetCloudConnectors();

  // Filter the connectors to only AWS
  const awsConnectionData: AwsCloudConnectorOption[] = useMemo(() => {
    return cloudConnectors
      .filter((connector) => isAwsCloudConnectorVars(connector.vars, AWS_PROVIDER))
      .map((connector) => {
        const awsVars = connector.vars as AwsCloudConnectorVars;
        return {
          label: connector.name,
          value: connector.id,
          id: connector.id,
          roleArn: awsVars.role_arn,
          externalId: awsVars.external_id,
        };
      });
  }, [cloudConnectors]);

  // Convert cloud connectors to combo box options (only standard properties for EuiComboBox)
  const comboBoxOptions: ComboBoxOption[] = useMemo(
    () =>
      awsConnectionData.map((connector) => ({
        label: connector.label,
        value: connector.value,
      })),
    [awsConnectionData]
  );

  // Find the currently selected connector based on credentials
  const selectedConnector = useMemo(() => {
    const targetId = (isEditPage && cloudConnectorId) || credentials?.cloudConnectorId;
    return targetId ? comboBoxOptions.find((opt) => opt.value === targetId) || null : null;
  }, [isEditPage, cloudConnectorId, credentials?.cloudConnectorId, comboBoxOptions]);

  const handleConnectorChange = useCallback(
    (selected: Array<{ label: string; value?: string }>) => {
      const [selectedOption] = selected;

      if (selectedOption?.value) {
        const connector = awsConnectionData.find((opt) => opt.id === selectedOption.value);

        if (connector?.roleArn?.value && connector?.externalId?.value) {
          setCredentials({
            roleArn: connector.roleArn.value,
            externalId: connector.externalId.value,
            cloudConnectorId: connector.id,
          });
        }
      } else {
        // Handle deselection
        setCredentials({
          roleArn: undefined,
          externalId: undefined,
          cloudConnectorId: undefined,
        });
      }
    },
    [awsConnectionData, setCredentials]
  );

  return (
    <>
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudConnectorSetup.cloudFormation.cloudConnectorInstructions"
          defaultMessage="To streamline your AWS integration process, you can reuse the same Role ARN for different use cases within Elastic. Simply choose the existing Role ARN from the options below:"
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFormRow label="Role ARN" fullWidth>
        <EuiComboBox
          aria-label="Select Role ARN"
          placeholder="Select a Role ARN"
          options={comboBoxOptions}
          fullWidth
          singleSelection={true}
          selectedOptions={selectedConnector ? [selectedConnector] : []}
          onChange={handleConnectorChange}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
    </>
  );
};
