/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { Meta, Story } from '@storybook/react';

import {
  NewPackagePolicy,
  PackagePolicyReplaceDefineStepExtensionComponentProps,
  SetupTechnology,
} from '@kbn/fleet-plugin/public/types';
import { MemoryRouter, Route } from '@kbn/shared-ux-router';
import { action } from '@storybook/addon-actions';
import { NewPackagePolicyPostureInput } from './utils';
import {
  getMockPackageInfo,
  getMockPolicyAWS,
  getMockPolicyAzure,
  getMockPolicyGCP,
} from './mocks';
import { CspPolicyTemplateForm } from './policy_template_form';
import { StorybookProviders } from '../../../.storybook/storybook_provider';
import {
  changePolicyName,
  toggleSetupTechnology,
} from './policy_template_form.stories.interactions';

export default {
  title: 'Integration Components/PolicyTemplateForm',
  component: CspPolicyTemplateForm,
  decorators: [
    (CspPolicyTemplateFormChild) => {
      return (
        <StorybookProviders>
          <MemoryRouter initialEntries={['/add-integration/cspm']}>
            <Route path="/add-integration/:integration">
              <CspPolicyTemplateFormChild />
            </Route>
          </MemoryRouter>
        </StorybookProviders>
      );
    },
  ],
} as Meta;

const Template: Story<PackagePolicyReplaceDefineStepExtensionComponentProps> = (args) => {
  const [packagePolicy, setPackagePolicy] = useState<Partial<NewPackagePolicy>>(args.newPolicy);
  const [integrationToEnable, setIntegrationToEnable] = useState('cloudbeat/cis_aws');

  const onChange = (opts: { isValid: boolean; updatedPolicy: Partial<NewPackagePolicy> }) => {
    args.onChange(opts);
    setPackagePolicy(opts.updatedPolicy);
  };

  return (
    <CspPolicyTemplateForm
      newPolicy={packagePolicy}
      isEditPage={false}
      onChange={onChange}
      integrationToEnable={integrationToEnable}
      setIntegrationToEnable={setIntegrationToEnable}
      packageInfo={args.packageInfo}
      isAgentlessEnabled={args.isAgentlessEnabled}
      defaultSetupTechnology={args.defaultSetupTechnology}
    />
  );
};

const packageInfo = getMockPackageInfo();

const mockAwsPolicy = getMockPolicyAWS();
const mockAwsInput = {
  ...mockAwsPolicy.inputs[0],
  type: 'cloudbeat/cis_aws', // Ensure the type is 'cloudbeat/cis_aws'
  policy_template: 'cspm',
} as NewPackagePolicyPostureInput;

const defaultPropsAWS: PackagePolicyReplaceDefineStepExtensionComponentProps = {
  newPolicy: mockAwsPolicy,
  input: mockAwsInput,
  updatePolicy: action('updatePolicy'),
  onChange: (opts: { isValid: boolean; updatedPolicy: Partial<NewPackagePolicy> }) => {
    action('onChange')(opts);
  },
  packageInfo,
  setIsValid: () => {},
  disabled: false,
  hasInvalidRequiredVars: false,
  isAgentlessEnabled: true,
  defaultSetupTechnology: SetupTechnology.AGENTLESS,
};

export const AWSForm = Template.bind({});
AWSForm.args = defaultPropsAWS;
AWSForm.play = async ({ canvasElement }) => {
  changePolicyName({ canvasElement, policyName: 'AWS Package Policy' });
  toggleSetupTechnology({ canvasElement, toggle: 'agent-based' });
  // toggleSetupTechnology({ canvasElement, toggle: 'agentless' });
};

const mockGCPPolicy = getMockPolicyGCP();
const mockGCPInput = {
  ...mockGCPPolicy.inputs[0],
  type: 'cloudbeat/cis_gcp', // Ensure the type is 'cloudbeat/cis_gcp'
  policy_template: 'cspm',
} as NewPackagePolicyPostureInput;

const defaultPropsGCP: PackagePolicyReplaceDefineStepExtensionComponentProps = {
  newPolicy: mockGCPPolicy,
  input: mockGCPInput,
  updatePolicy: action('updatePolicy'),
  onChange: (opts: { isValid: boolean; updatedPolicy: Partial<NewPackagePolicy> }) => {
    action('onChange')(opts);
  },
  packageInfo,
  setIsValid: () => {},
  disabled: false,
  hasInvalidRequiredVars: false,
  isAgentlessEnabled: true,
  defaultSetupTechnology: SetupTechnology.AGENTLESS,
};

export const GCPForm = Template.bind({});
GCPForm.args = defaultPropsGCP;
GCPForm.play = async ({ canvasElement }) => {
  changePolicyName({ canvasElement, policyName: 'GCP Package Policy' });
};

const mockAzurePolicy = getMockPolicyAzure();
const mockAzureInput = {
  ...mockAzurePolicy.inputs[0],
  type: 'cloudbeat/cis_azure', // Ensure the type is 'cloudbeat/cis_azure'
  policy_template: 'cspm',
} as NewPackagePolicyPostureInput;

const defaultPropsAzure: PackagePolicyReplaceDefineStepExtensionComponentProps = {
  newPolicy: mockAzurePolicy,
  input: mockAzureInput,
  updatePolicy: action('updatePolicy'),
  onChange: (opts: { isValid: boolean; updatedPolicy: Partial<NewPackagePolicy> }) => {
    action('onChange')(opts);
  },
  packageInfo,
  setIsValid: () => {},
  disabled: false,
  hasInvalidRequiredVars: false,
  isAgentlessEnabled: true,
  defaultSetupTechnology: SetupTechnology.AGENTLESS,
};

export const AzureForm = Template.bind({});
AzureForm.args = defaultPropsAzure;
AzureForm.play = async ({ canvasElement }) => {
  changePolicyName({ canvasElement, policyName: 'Azure Package Policy' });
};
