/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiSpacer, EuiTabs, EuiTab, EuiText, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
import type { CloudSetup } from '@kbn/cloud-plugin/public';

import { CloudConnectorForm } from './cloud_connector_form';
import { ReusableCloudConnectorForm } from './reusable_cloud_connector_form';
import type { UpdatePolicy } from '../types';

interface CloudConnectorTab {
  id: string;
  name: React.ReactNode;
  content: React.ReactNode;
}

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
  const isCloudConnectorReusableEnabled = true;
  const [selectedTabId, setSelectedTabId] = useState('new-connection');
  const CLOUD_FORMATION_EXTERNAL_DOC_URL =
    'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html';
  const tabs: CloudConnectorTab[] = [
    {
      id: 'new-connection',
      name: (
        <FormattedMessage
          id="securitySolutionPackages.cspmIntegration.cloudConnector.newConnectionTab"
          defaultMessage="New Connection"
        />
      ),
      content: (
        <>
          <EuiSpacer size="m" />
          <div>
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.guide.description.cloudConnectors"
                defaultMessage="Create a reusable IAM role in your AWS account, then give Elastic its Role ARN and the External ID shown below.  You’ll need rights to launch a CloudFormation stack and create/update IAM roles in the target AWS account {learnMore}."
                values={{
                  learnMore: (
                    <EuiLink
                      href={CLOUD_FORMATION_EXTERNAL_DOC_URL}
                      target="_blank"
                      rel="noopener nofollow noreferrer"
                      data-test-subj="externalLink"
                    >
                      <FormattedMessage
                        id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.guide.learnMoreLinkText"
                        defaultMessage="Learn more about CloudFormation"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </EuiText>
          </div>
          <EuiSpacer size="l" />
          <CloudConnectorForm
            input={input}
            templateName={templateName}
            newPolicy={newPolicy}
            packageInfo={packageInfo}
            updatePolicy={updatePolicy}
            isEditPage={isEditPage}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
            cloud={cloud}
            cloudProvider={cloudProvider}
          />
        </>
      ),
    },
    {
      id: 'existing-connection',
      name: (
        <FormattedMessage
          id="securitySolutionPackages.cspmIntegration.cloudConnector.existingConnectionTab"
          defaultMessage="Existing Connection"
        />
      ),
      content: (
        <ReusableCloudConnectorForm
          input={input}
          templateName={templateName}
          newPolicy={newPolicy}
          packageInfo={packageInfo}
          updatePolicy={updatePolicy}
          isEditPage={isEditPage}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
          cloud={cloud}
          cloudProvider={cloudProvider}
        />
      ),
    },
  ];

  const onTabClick = (tab: { id: string }) => {
    setSelectedTabId(tab.id);
  };

  return (
    <>
      {!isCloudConnectorReusableEnabled && (
        <CloudConnectorForm
          input={input}
          templateName={templateName}
          newPolicy={newPolicy}
          packageInfo={packageInfo}
          updatePolicy={updatePolicy}
          isEditPage={isEditPage}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
          cloud={cloud}
          cloudProvider={cloudProvider}
        />
      )}
      {isCloudConnectorReusableEnabled && (
        <>
          <EuiSpacer size="m" />
          <EuiTabs>
            {tabs.map((tab) => (
              <EuiTab
                key={tab.id}
                onClick={() => onTabClick(tab)}
                isSelected={tab.id === selectedTabId}
                disabled={tab.id === 'existing-connection'}
              >
                {tab.name}
              </EuiTab>
            ))}
          </EuiTabs>
          <EuiSpacer size="m" />
          {tabs.find((tab) => tab.id === selectedTabId)?.content}
        </>
      )}
    </>
  );
};
