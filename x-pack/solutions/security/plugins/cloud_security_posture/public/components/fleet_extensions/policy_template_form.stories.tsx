/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { Meta, Story } from '@storybook/react';
import type { ArgTypes } from '@storybook/react';

import {
  NewPackagePolicy,
  PackagePolicyReplaceDefineStepExtensionComponentProps,
  SetupTechnology,
} from '@kbn/fleet-plugin/public/types';
import { MemoryRouter, Route } from '@kbn/shared-ux-router';
import { getMockPackageInfo, getMockPolicyAWS } from './mocks';
import { CspPolicyTemplateForm } from './policy_template_form';
import { StorybookProvider } from '../../../.storybook/decorators/storybook_provider';
import { testAWSInteractions, testGCPInteractions } from './policy_template_form.stories.test';

const argTypes: ArgTypes = {
  isAgentlessEnabled: {
    control: {
      type: 'boolean',
    },
  },
  defaultSetupTechnology: {
    control: {
      type: 'select',
      options: Object.values(SetupTechnology),
    },
  },
  isEditPage: {
    control: {
      type: 'boolean',
    },
  },
  onChange: { action: 'onChange' },
  handleSetupTechnologyChange: { action: 'handleSetupTechnologyChange' },
  validationResults: { control: false },
  packageInfo: { control: false },
  integrationToEnable: {
    control: false,
  },
  newPolicy: { control: false },
};

export default {
  title: 'Integration Components/PolicyTemplateForm',
  component: CspPolicyTemplateForm,
  argTypes,
  decorators: [
    (CspPolicyTemplateFormChild) => {
      return (
        <StorybookProvider>
          <MemoryRouter initialEntries={['/add-integration/cspm']}>
            <Route path="/add-integration/:integration">
              <CspPolicyTemplateFormChild />
            </Route>
          </MemoryRouter>
        </StorybookProvider>
      );
    },
  ],
} as Meta;

const defaultArgs: PackagePolicyReplaceDefineStepExtensionComponentProps = {
  defaultSetupTechnology: SetupTechnology.AGENTLESS,
  integrationToEnable: 'cspm',
  isAgentlessEnabled: true,
  isEditPage: false,
  newPolicy: getMockPolicyAWS(),
  packageInfo: {
    ...getMockPackageInfo(),
    version: '1.13.0',
  },
  validationResults: undefined,
};

const Template: Story<PackagePolicyReplaceDefineStepExtensionComponentProps> = (args) => {
  const [packagePolicy, setPackagePolicy] = useState<Partial<NewPackagePolicy>>(args.newPolicy);

  const onChange = (changed: { isValid: boolean; updatedPolicy: NewPackagePolicy }) => {
    setPackagePolicy(changed.updatedPolicy);
    args.onChange(changed);
  };

  const defaultSetupTechnology = args.isAgentlessEnabled
    ? args.defaultSetupTechnology
    : SetupTechnology.AGENT_BASED;

  return (
    <CspPolicyTemplateForm
      defaultSetupTechnology={defaultSetupTechnology}
      handleSetupTechnologyChange={args.handleSetupTechnologyChange}
      integrationToEnable={args.integrationToEnable}
      isAgentlessEnabled={args.isAgentlessEnabled}
      isEditPage={args.isEditPage}
      // @ts-expect-error
      newPolicy={packagePolicy}
      onChange={onChange}
      packageInfo={args.packageInfo}
      setIntegrationToEnable={() => {}}
    />
  );
};

export const Default = Template.bind({});
Default.args = defaultArgs;

// export const TestAWS = Template.bind({});
// TestAWS.args = defaultArgs;
// TestAWS.play = testAWSInteractions;

// export const TestGCP = Template.bind({});
// TestGCP.args = defaultArgs;
// TestGCP.play = testGCPInteractions;
