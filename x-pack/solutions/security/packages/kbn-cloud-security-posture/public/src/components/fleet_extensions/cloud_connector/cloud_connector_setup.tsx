/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { EuiSpacer, EuiText, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
import type { CloudSetup } from '@kbn/cloud-plugin/public';

import { NewCloudConnectorForm } from './form/new_cloud_connector_form';
import { ReusableCloudConnectorForm } from './form/reusable_cloud_connector_form';
import { useGetCloudConnectors } from './hooks/use_get_cloud_connectors';
import { useCloudConnectorSetup } from './hooks/use_cloud_connector_setup';
import { CloudConnectorTabs, type CloudConnectorTab } from './cloud_connector_tabs';
import type { UpdatePolicy } from '../types';
import { TABS, CLOUD_FORMATION_EXTERNAL_DOC_URL } from './constants';
import { isCloudConnectorReusableEnabled } from './utils';
export interface CloudConnectorSetupProps {
  input: NewPackagePolicyInput;
  newPolicy: NewPackagePolicy;
  packageInfo: PackageInfo;
  updatePolicy: UpdatePolicy;
  isEditPage?: boolean;
  hasInvalidRequiredVars: boolean;
  cloud?: CloudSetup;
  cloudProvider?: string;
  templateName: string;
}

export const CloudConnectorSetup: React.FC<CloudConnectorSetupProps> = ({
  input,
  newPolicy,
  packageInfo,
  updatePolicy,
  isEditPage = false,
  hasInvalidRequiredVars,
  cloud,
  cloudProvider,
  templateName,
}) => {
  const reusableFeatureEnabled = isCloudConnectorReusableEnabled(packageInfo.version, templateName);

  const { data: cloudConnectors } = useGetCloudConnectors();
  const cloudConnectorsCount = cloudConnectors?.length;
  const [selectedTabId, setSelectedTabId] = useState<string>(TABS.NEW_CONNECTION);

  useEffect(() => {
    setSelectedTabId(
      cloudConnectorsCount && cloudConnectorsCount > 0
        ? TABS.EXISTING_CONNECTION
        : TABS.NEW_CONNECTION
    );
  }, [cloudConnectorsCount]);

  // Use the cloud connector setup hook
  const {
    newConnectionCredentials,
    existingConnectionCredentials,
    updatePolicyWithNewCredentials,
    updatePolicyWithExistingCredentials,
  } = useCloudConnectorSetup(input, newPolicy, updatePolicy);

  const tabs: CloudConnectorTab[] = [
    {
      id: TABS.NEW_CONNECTION,
      name: (
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudConnectorSetup.newConnectionTab"
          defaultMessage="New Connection"
        />
      ),
      content: (
        <>
          <EuiSpacer size="m" />
          <div>
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="securitySolutionPackages.cloudSecurityPosture.cloudConnectorSetup.cloudFormation.guide.description.cloudConnectors"
                defaultMessage="Create a reusable IAM role in your AWS account, then give Elastic its Role ARN and the External ID shown below. You’ll need rights to launch a CloudFormation stack and create/update IAM roles in the target AWS account {learnMore}."
                values={{
                  learnMore: (
                    <EuiLink
                      href={CLOUD_FORMATION_EXTERNAL_DOC_URL}
                      target="_blank"
                      rel="noopener nofollow noreferrer"
                      data-test-subj="externalLink"
                    >
                      <FormattedMessage
                        id="securitySolutionPackages.assetInventory.agentlessForm.cloudFormation.guide.learnMoreLinkText"
                        defaultMessage="Learn more about CloudFormation"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </EuiText>
          </div>
          <EuiSpacer size="l" />
          <NewCloudConnectorForm
            input={input}
            templateName={templateName}
            newPolicy={newPolicy}
            packageInfo={packageInfo}
            updatePolicy={updatePolicy}
            isEditPage={isEditPage}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
            cloud={cloud}
            cloudProvider={cloudProvider}
            credentials={newConnectionCredentials}
            setCredentials={updatePolicyWithNewCredentials}
          />
        </>
      ),
    },
    {
      id: TABS.EXISTING_CONNECTION,
      name: (
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudConnectorSetup.existingConnectionTab"
          defaultMessage="Existing Connection"
        />
      ),
      content: (
        <ReusableCloudConnectorForm
          isEditPage={isEditPage}
          newPolicy={newPolicy}
          cloudProvider={cloudProvider}
          credentials={existingConnectionCredentials}
          setCredentials={updatePolicyWithExistingCredentials}
        />
      ),
    },
  ];

  const onTabClick = useCallback(
    (tab: { id: 'new-connection' | 'existing-connection' }) => {
      setSelectedTabId(tab.id);

      if (tab.id === TABS.NEW_CONNECTION && newConnectionCredentials.roleArn) {
        updatePolicyWithNewCredentials(newConnectionCredentials);
      } else if (
        tab.id === TABS.EXISTING_CONNECTION &&
        existingConnectionCredentials.cloudConnectorId
      ) {
        updatePolicyWithExistingCredentials(existingConnectionCredentials);
      }
    },
    [
      newConnectionCredentials,
      existingConnectionCredentials,
      updatePolicyWithNewCredentials,
      updatePolicyWithExistingCredentials,
    ]
  );

  return (
    <>
      {/* This shows the Phase 2 Reusable Cloud connector Form */}
      {!reusableFeatureEnabled && (
        <NewCloudConnectorForm
          input={input}
          templateName={templateName}
          newPolicy={newPolicy}
          packageInfo={packageInfo}
          updatePolicy={updatePolicy}
          isEditPage={isEditPage}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
          cloud={cloud}
          cloudProvider={cloudProvider}
          credentials={newConnectionCredentials}
          setCredentials={updatePolicyWithNewCredentials}
        />
      )}
      {reusableFeatureEnabled && (
        <CloudConnectorTabs
          tabs={tabs}
          selectedTabId={selectedTabId}
          onTabClick={onTabClick}
          isEditPage={isEditPage}
          cloudProvider={cloudProvider || 'aws'}
          cloudConnectorsCount={cloudConnectorsCount || 0}
        />
      )}
    </>
  );
};
