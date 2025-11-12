/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiSuperSelect, EuiFormRow, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  AwsCloudConnectorCredentials,
  AzureCloudConnectorCredentials,
  CloudProviders,
} from '../types';
import { useGetCloudConnectors } from '../hooks/use_get_cloud_connectors';
import { isAwsCloudConnectorVars, isAzureCloudConnectorVars } from '../utils';

interface ReusableConnectorSelectProps<T> {
  provider: CloudProviders;
  cloudConnectorId: string | undefined;
  credentials: T;
  setCredentials: (credentials: T) => void;
}

export const ReusableConnectorSelect = <
  T extends AwsCloudConnectorCredentials | AzureCloudConnectorCredentials
>({
  provider,
  cloudConnectorId,
  credentials,
  setCredentials,
}: ReusableConnectorSelectProps<T>) => {
  const { data: cloudConnectors = [] } = useGetCloudConnectors(provider);

  const label = (
    <FormattedMessage
      id="securitySolutionPackages.cloudSecurityPosture.cloudConnectorSetup.cloudConnectorLabel"
      defaultMessage="Cloud Connector Name"
    />
  );
  const truncateStyle = css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  // Create super select options with custom display
  const selectOptions: Array<EuiSuperSelectOption<string>> = useMemo(() => {
    return cloudConnectors.map((connector) => {
      let identifier = '';

      if (isAwsCloudConnectorVars(connector.vars, provider)) {
        identifier = connector.vars.role_arn?.value || '';
      } else if (isAzureCloudConnectorVars(connector.vars, provider)) {
        identifier = connector.vars.azure_credentials_cloud_connector_id?.value || '';
      }

      return {
        value: connector.id,
        inputDisplay: connector.name,
        dropdownDisplay: (
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem>
              <strong>{connector.name}</strong>
            </EuiFlexItem>
            {identifier && (
              <EuiFlexItem>
                <EuiText size="s" color="subdued">
                  <div css={truncateStyle}>{identifier}</div>
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
      };
    });
  }, [cloudConnectors, provider, truncateStyle]);

  // Find currently selected value
  const selectedValue = useMemo(() => {
    return cloudConnectorId || credentials?.cloudConnectorId || '';
  }, [cloudConnectorId, credentials?.cloudConnectorId]);

  const handleChange = useCallback(
    (value: string) => {
      const connector = cloudConnectors.find((c) => c.id === value);

      if (!connector) {
        return;
      }

      if (isAwsCloudConnectorVars(connector.vars, provider)) {
        // Extract the actual value, handling both string and CloudConnectorSecretReference
        const externalIdValue =
          typeof connector.vars.external_id?.value === 'string'
            ? connector.vars.external_id.value
            : connector.vars.external_id?.value;
        setCredentials({
          roleArn: connector.vars.role_arn?.value,
          externalId: externalIdValue,
          cloudConnectorId: connector.id,
        } as T);
      } else if (isAzureCloudConnectorVars(connector.vars, provider)) {
        setCredentials({
          tenantId: connector.vars.tenant_id?.value,
          clientId: connector.vars.client_id?.value,
          azure_credentials_cloud_connector_id:
            connector.vars.azure_credentials_cloud_connector_id?.value,
          cloudConnectorId: connector.id,
        } as T);
      }
    },
    [cloudConnectors, provider, setCredentials]
  );

  return (
    <EuiFormRow label={label} fullWidth>
      <EuiSuperSelect
        options={selectOptions}
        valueOfSelected={selectedValue}
        onChange={handleChange}
        fullWidth
        placeholder={i18n.translate(
          'xpack.cloudSecurityPosture.cloudConnectorSetup.reusableConnectorSelect.placeholder',
          {
            defaultMessage: 'Select a cloud connector',
          }
        )}
        hasDividers
        data-test-subj={`${provider}-cloud-connector-super-select`}
      />
    </EuiFormRow>
  );
};
