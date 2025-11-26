/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiFormRow,
  EuiFieldText,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBasicTable,
  EuiLink,
  EuiEmptyPrompt,
  EuiCopy,
  EuiButtonIcon,
  useGeneratedHtmlId,
  type EuiBasicTableColumn,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import type { CloudProviders } from '../types';
import { useCloudConnectorUsage } from '../hooks/use_cloud_connector_usage';
import { useUpdateCloudConnector } from '../hooks/use_update_cloud_connector';
import { isAwsCloudConnectorVars, isAzureCloudConnectorVars } from '../utils';

interface CloudConnectorPoliciesFlyoutProps {
  cloudConnectorId: string;
  cloudConnectorName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cloudConnectorVars: Record<string, any>;
  provider: CloudProviders;
  onClose: () => void;
}

export const CloudConnectorPoliciesFlyout: React.FC<CloudConnectorPoliciesFlyoutProps> = ({
  cloudConnectorId,
  cloudConnectorName: initialName,
  cloudConnectorVars,
  provider,
  onClose,
}) => {
  const { application } = useKibana().services;
  const flyoutTitleId = useGeneratedHtmlId();
  const [cloudConnectorName, setCloudConnectorName] = useState(initialName);
  const [editedName, setEditedName] = useState(initialName);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const {
    data: usageData,
    isLoading,
    error,
  } = useCloudConnectorUsage(
    cloudConnectorId,
    pageIndex + 1, // Convert from 0-based to 1-based
    pageSize
  );

  const usageItems = usageData?.items || [];
  const totalItemCount = usageData?.total || 0;

  const { mutate: updateConnector, isLoading: isUpdating } = useUpdateCloudConnector(
    cloudConnectorId,
    (updatedConnector) => {
      setCloudConnectorName(updatedConnector.name);
      setEditedName(updatedConnector.name);
    }
  );

  // Extract ARN or Subscription ID based on provider
  const identifier = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (isAwsCloudConnectorVars(cloudConnectorVars as any, provider)) {
      return cloudConnectorVars.role_arn?.value || '';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } else if (isAzureCloudConnectorVars(cloudConnectorVars as any, provider)) {
      return cloudConnectorVars.azure_credentials_cloud_connector_id?.value || '';
    }
    return '';
  }, [cloudConnectorVars, provider]);

  const identifierLabel =
    provider === 'aws'
      ? i18n.translate(
          'securitySolutionPackages.cloudSecurityPosture.cloudConnectorPoliciesFlyout.roleArnLabel',
          {
            defaultMessage: 'Role ARN',
          }
        )
      : i18n.translate(
          'securitySolutionPackages.cloudSecurityPosture.cloudConnectorPoliciesFlyout.cloudConnectorIdLabel',
          {
            defaultMessage: 'Cloud Connector ID',
          }
        );

  const handleSaveName = () => {
    if (editedName && editedName !== cloudConnectorName) {
      updateConnector({ name: editedName });
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedName(e.target.value);
  };

  const isSaveDisabled = !editedName || editedName === cloudConnectorName || isUpdating;

  const tableCaption = useMemo(
    () =>
      i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudConnectorPoliciesFlyout.tableCaption',
        {
          defaultMessage: 'Integrations using cloud connector {name}',
          values: { name: cloudConnectorName },
        }
      ),
    [cloudConnectorName]
  );

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions: [10, 25, 50],
    }),
    [pageIndex, pageSize, totalItemCount]
  );

  const onTableChange = useCallback(({ page }: { page?: { index: number; size: number } }) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  }, []);

  const handleNavigateToPolicy = useCallback(
    (policyId: string, packagePolicyId: string) => {
      const [, path] = pagePathGetters.edit_integration({ policyId, packagePolicyId });
      application?.navigateToApp('fleet', { path });
    },
    [application]
  );

  const columns: Array<EuiBasicTableColumn<(typeof usageItems)[0]>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate(
          'securitySolutionPackages.cloudSecurityPosture.cloudConnectorPoliciesFlyout.nameColumn',
          {
            defaultMessage: 'Name',
          }
        ),
        render: (name: string, item) => {
          // Use the first policy_id for navigation
          const policyId = item.policy_ids[0];
          if (!policyId) return name;

          return (
            <EuiLink
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                handleNavigateToPolicy(policyId, item.id);
              }}
              data-test-subj="cloudConnectorPolicyLink"
            >
              {name}
            </EuiLink>
          );
        },
      },
      {
        field: 'package',
        name: i18n.translate(
          'securitySolutionPackages.cloudSecurityPosture.cloudConnectorPoliciesFlyout.integrationTypeColumn',
          {
            defaultMessage: 'Integration Type',
          }
        ),
        render: (pkg: (typeof usageItems)[0]['package']) => pkg?.title || pkg?.name || '-',
      },
      {
        field: 'created_at',
        name: i18n.translate(
          'securitySolutionPackages.cloudSecurityPosture.cloudConnectorPoliciesFlyout.createdColumn',
          {
            defaultMessage: 'Created',
          }
        ),
        render: (createdAt: string) => new Date(createdAt).toLocaleDateString(),
      },
      {
        field: 'updated_at',
        name: i18n.translate(
          'securitySolutionPackages.cloudSecurityPosture.cloudConnectorPoliciesFlyout.lastUpdatedColumn',
          {
            defaultMessage: 'Last Updated',
          }
        ),
        render: (updatedAt: string) => new Date(updatedAt).toLocaleDateString(),
      },
    ],
    [handleNavigateToPolicy]
  );

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      aria-labelledby={flyoutTitleId}
      data-test-subj="cloudConnectorPoliciesFlyout"
    >
      <EuiFlyoutHeader hasBorder={false}>
        <EuiTitle size="s">
          <h2 id={flyoutTitleId}>{cloudConnectorName}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {identifierLabel}
              {': '}
              {identifier}
            </EuiText>
          </EuiFlexItem>
          {identifier && (
            <EuiFlexItem grow={false}>
              <EuiCopy textToCopy={identifier}>
                {(copy) => (
                  <EuiButtonIcon
                    onClick={copy}
                    iconType="copy"
                    aria-label={i18n.translate(
                      'securitySolutionPackages.cloudSecurityPosture.cloudConnectorPoliciesFlyout.copyIdentifier',
                      {
                        defaultMessage: 'Copy {label}',
                        values: { label: identifierLabel },
                      }
                    )}
                    size="xs"
                    data-test-subj="cloudConnectorCopyIdentifier"
                  />
                )}
              </EuiCopy>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        {/* Edit Name Section */}
        <EuiFormRow
          label={i18n.translate(
            'securitySolutionPackages.cloudSecurityPosture.cloudConnectorPoliciesFlyout.cloudConnectorNameLabel',
            {
              defaultMessage: 'Cloud Connector Name',
            }
          )}
          fullWidth
        >
          <EuiFieldText
            value={editedName}
            onChange={handleNameChange}
            fullWidth
            data-test-subj="cloudConnectorNameInput"
          />
        </EuiFormRow>

        <EuiSpacer size="m" />

        <EuiButton
          onClick={handleSaveName}
          isDisabled={isSaveDisabled}
          isLoading={isUpdating}
          iconType="save"
          fill
          data-test-subj="cloudConnectorSaveNameButton"
        >
          <FormattedMessage
            id="securitySolutionPackages.cloudSecurityPosture.cloudConnectorPoliciesFlyout.saveButton"
            defaultMessage="Save"
          />
        </EuiButton>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {/* Usage Section */}
        <EuiText size="xs">
          <h4>
            <FormattedMessage
              id="securitySolutionPackages.cloudSecurityPosture.cloudConnectorPoliciesFlyout.usedByTitle"
              defaultMessage="Used by {count} {count, plural, one {integration} other {integrations}}"
              values={{ count: totalItemCount }}
            />
          </h4>
        </EuiText>

        <EuiSpacer size="m" />
        <EuiHorizontalRule margin="none" style={{ height: 2 }} />
        {error ? (
          <EuiEmptyPrompt
            color="danger"
            iconType="error"
            title={
              <h3>
                <FormattedMessage
                  id="securitySolutionPackages.cloudSecurityPosture.cloudConnectorPoliciesFlyout.errorTitle"
                  defaultMessage="Failed to load policies"
                />
              </h3>
            }
            body={
              <p>
                <FormattedMessage
                  id="securitySolutionPackages.cloudSecurityPosture.cloudConnectorPoliciesFlyout.errorBody"
                  defaultMessage="There was an error loading the policies using this cloud connector. Please try again."
                />
              </p>
            }
          />
        ) : isLoading ? (
          <EuiBasicTable
            items={[]}
            columns={columns}
            loading={true}
            pagination={pagination}
            onChange={onTableChange}
            tableCaption={tableCaption}
            data-test-subj="cloudConnectorPoliciesTable"
          />
        ) : usageItems.length === 0 ? (
          <EuiEmptyPrompt
            iconType="inspect"
            title={
              <h3>
                <FormattedMessage
                  id="securitySolutionPackages.cloudSecurityPosture.cloudConnectorPoliciesFlyout.emptyStateTitle"
                  defaultMessage="No integrations using this cloud connector"
                />
              </h3>
            }
            body={
              <p>
                <FormattedMessage
                  id="securitySolutionPackages.cloudSecurityPosture.cloudConnectorPoliciesFlyout.emptyStateBody"
                  defaultMessage="This cloud connector is not currently used by any integrations."
                />
              </p>
            }
          />
        ) : (
          <EuiBasicTable
            items={usageItems}
            columns={columns}
            pagination={pagination}
            onChange={onTableChange}
            tableCaption={tableCaption}
            data-test-subj="cloudConnectorPoliciesTable"
          />
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
