/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
  EuiText,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SWITCH_CONNECTOR_MODAL_TEST_SUBJECTS } from '@kbn/cloud-security-posture-common/test_subjects';
import type { AccountType } from '@kbn/fleet-plugin/common/types';
import type { CloudProviders, CloudConnectorCredentials } from '../types';
import { useGetCloudConnectors } from '../hooks/use_get_cloud_connectors';
import { CloudConnectorSelector } from '../form/cloud_connector_selector';
import { useUpdatePackagePolicyCloudConnector } from '../hooks/use_update_package_policy';
import { AccountBadge } from '../components/account_badge';

interface SwitchConnectorModalProps {
  packagePolicyId: string;
  packagePolicyName: string;
  currentCloudConnectorId: string;
  currentCloudConnectorName: string;
  provider: CloudProviders;
  accountType?: AccountType;
  onClose: () => void;
  onSuccess: (newCloudConnectorId: string) => void;
}

export const SwitchConnectorModal: React.FC<SwitchConnectorModalProps> = ({
  packagePolicyId,
  packagePolicyName,
  currentCloudConnectorId,
  currentCloudConnectorName,
  provider,
  accountType,
  onClose,
  onSuccess,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const [selectedCredentials, setSelectedCredentials] = useState<CloudConnectorCredentials>({
    cloudConnectorId: undefined,
  });

  const { data: allCloudConnectors = [] } = useGetCloudConnectors(provider);

  const { mutate: updatePackagePolicy, isLoading } = useUpdatePackagePolicyCloudConnector(
    () => {
      // Pass the newly selected connector ID to the success callback
      if (selectedCredentials.cloudConnectorId) {
        onSuccess(selectedCredentials.cloudConnectorId);
      }
      onClose();
    },
    () => {
      // Error handling is done by the hook
    }
  );

  // Filter connectors by provider and account type, excluding current connector
  const compatibleConnectors = useMemo(() => {
    return allCloudConnectors.filter(
      (connector) =>
        connector.cloudProvider === provider &&
        connector.accountType === accountType &&
        connector.id !== currentCloudConnectorId
    );
  }, [allCloudConnectors, provider, accountType, currentCloudConnectorId]);

  const hasCompatibleConnectors = compatibleConnectors.length > 0;
  const canSwitch = selectedCredentials.cloudConnectorId !== undefined;

  const handleSwitch = useCallback(() => {
    if (selectedCredentials.cloudConnectorId) {
      updatePackagePolicy({
        packagePolicyId,
        cloudConnectorId: selectedCredentials.cloudConnectorId,
      });
    }
  }, [packagePolicyId, selectedCredentials.cloudConnectorId, updatePackagePolicy]);

  return (
    <EuiModal
      onClose={onClose}
      style={{ maxWidth: 600 }}
      aria-labelledby={modalTitleId}
      data-test-subj={SWITCH_CONNECTOR_MODAL_TEST_SUBJECTS.MODAL}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle
          id={modalTitleId}
          data-test-subj={SWITCH_CONNECTOR_MODAL_TEST_SUBJECTS.TITLE}
        >
          <FormattedMessage
            id="securitySolutionPackages.cloudSecurityPosture.switchConnectorModal.title"
            defaultMessage="Switch Cloud Connector"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <strong>
              <FormattedMessage
                id="securitySolutionPackages.cloudSecurityPosture.switchConnectorModal.policyName"
                defaultMessage="Integration:"
              />
            </strong>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" data-test-subj={SWITCH_CONNECTOR_MODAL_TEST_SUBJECTS.POLICY_NAME}>
              {packagePolicyName}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>
                <FormattedMessage
                  id="securitySolutionPackages.cloudSecurityPosture.switchConnectorModal.currentConnector"
                  defaultMessage="Current Cloud Connector:"
                />
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText
              size="s"
              data-test-subj={SWITCH_CONNECTOR_MODAL_TEST_SUBJECTS.CURRENT_CONNECTOR_NAME}
            >
              {currentCloudConnectorName}
            </EuiText>
          </EuiFlexItem>
          {accountType && (
            <EuiFlexItem grow={false}>
              <AccountBadge accountType={accountType} variant="default" />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiCallOut
          title={i18n.translate(
            'securitySolutionPackages.cloudSecurityPosture.switchConnectorModal.warningTitle',
            {
              defaultMessage: 'Switching cloud connectors',
            }
          )}
          color="warning"
          iconType="warning"
          size="s"
          data-test-subj={SWITCH_CONNECTOR_MODAL_TEST_SUBJECTS.WARNING_CALLOUT}
        >
          <p>
            <FormattedMessage
              id="securitySolutionPackages.cloudSecurityPosture.switchConnectorModal.warningMessage"
              defaultMessage="This will change the cloud credentials used by this integration. Make sure the new connector has access to the same resources."
            />
          </p>
        </EuiCallOut>

        <EuiSpacer size="m" />

        {hasCompatibleConnectors ? (
          <>
            <CloudConnectorSelector
              provider={provider}
              cloudConnectorId={selectedCredentials.cloudConnectorId}
              credentials={selectedCredentials}
              setCredentials={setSelectedCredentials}
            />
          </>
        ) : (
          <EuiCallOut
            announceOnMount={false}
            title={i18n.translate(
              'securitySolutionPackages.cloudSecurityPosture.switchConnectorModal.noConnectorsTitle',
              {
                defaultMessage: 'No compatible connectors available',
              }
            )}
            color="danger"
            iconType="error"
            data-test-subj={SWITCH_CONNECTOR_MODAL_TEST_SUBJECTS.NO_CONNECTORS_CALLOUT}
          >
            <p>
              <FormattedMessage
                id="securitySolutionPackages.cloudSecurityPosture.switchConnectorModal.noConnectorsMessage"
                defaultMessage="There are no other cloud connectors with the same provider and account type."
                values={{
                  provider: provider.toUpperCase(),
                  accountType: accountType || 'undefined',
                }}
              />
            </p>
          </EuiCallOut>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={onClose}
          disabled={isLoading}
          data-test-subj={SWITCH_CONNECTOR_MODAL_TEST_SUBJECTS.CANCEL_BUTTON}
        >
          <FormattedMessage
            id="securitySolutionPackages.cloudSecurityPosture.switchConnectorModal.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton
          onClick={handleSwitch}
          fill
          disabled={!canSwitch || isLoading || !hasCompatibleConnectors}
          isLoading={isLoading}
          data-test-subj={SWITCH_CONNECTOR_MODAL_TEST_SUBJECTS.SWITCH_BUTTON}
        >
          <FormattedMessage
            id="securitySolutionPackages.cloudSecurityPosture.switchConnectorModal.switchButton"
            defaultMessage="Switch Connector"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
