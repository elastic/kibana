/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { Meta, Story } from '@storybook/react';
import { within, userEvent, waitFor } from '@storybook/testing-library';
import { expect } from '@storybook/jest';
import {
  NewPackagePolicy,
  PackagePolicyReplaceDefineStepExtensionComponentProps,
  SetupTechnology,
} from '@kbn/fleet-plugin/public/types';
import { MemoryRouter, Route } from '@kbn/shared-ux-router';
import { NewPackagePolicyPostureInput } from './utils';
import { getMockPolicyAWS, getMockPackageInfo } from './mocks';
import { CspPolicyTemplateForm } from './policy_template_form';
import { action } from '@storybook/addon-actions';
import { StorybookProviders } from '../../../.storybook/storybook_provider';

const mockNewPolicy = getMockPolicyAWS();

const mockInput = {
  ...mockNewPolicy.inputs[0],
  type: 'cloudbeat/cis_aws', // Ensure the type is 'cloudbeat/cis_aws'
  policy_template: 'cspm',
} as NewPackagePolicyPostureInput;

const mockPackageInfo = getMockPackageInfo();

const defaultProps: PackagePolicyReplaceDefineStepExtensionComponentProps = {
  newPolicy: mockNewPolicy,
  input: mockInput,
  updatePolicy: action('updatePolicy'),
  onChange: (opts: { isValid: boolean; updatedPolicy: Partial<NewPackagePolicy> }) => {
    action('onChange')(opts);
  },
  packageInfo: mockPackageInfo,
  setIsValid: () => {},
  disabled: false,
  hasInvalidRequiredVars: false,
  isAgentlessEnabled: false,
  defaultSetupTechnology: SetupTechnology.AGENT_BASED,
};

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
      packageInfo={mockPackageInfo}
      isAgentlessEnabled={args.isAgentlessEnabled}
      defaultSetupTechnology={args.defaultSetupTechnology}
    />
  );
};

export const AgentBased = Template.bind({});
AgentBased.args = defaultProps;
AgentBased.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await waitFor(() => {
    expect(canvas.getByLabelText('Name')).toBeInTheDocument;
  });

  const nameInput = canvas.getByLabelText('Name');
  await userEvent.clear(nameInput);
  await userEvent.type(nameInput, 'AWS Package Policy');
  expect(nameInput).toHaveValue('AWS Package Policy');
};

export const Agentless = Template.bind({});
Agentless.args = {
  ...defaultProps,
  isAgentlessEnabled: true,
  defaultSetupTechnology: SetupTechnology.AGENTLESS,
};
