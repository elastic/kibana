/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Meta, Story } from '@storybook/react';
import { PackagePolicyReplaceDefineStepExtensionComponentProps } from '@kbn/fleet-plugin/public/types';
import { MemoryRouter, Route } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import { ThemeProvider } from '@emotion/react';
import { euiDarkVars } from '@kbn/ui-theme';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { NewPackagePolicyPostureInput } from './utils';
import { getMockPolicyAWS, getMockPackageInfo } from './mocks';
import { CspPolicyTemplateForm } from './policy_template_form';

const mockNewPolicy = getMockPolicyAWS({
  access_key_id: {
    type: 'text',
    value: 'access-key-id',
  },
  secret_access_key: {
    type: 'text',
    value: 'secret-access-key',
  },
});

const mockInput = {
  ...mockNewPolicy.inputs[0],
  type: 'cloudbeat/cis_aws', // Ensure the type is 'cloudbeat/cis_aws'
  policy_template: 'cspm',
} as NewPackagePolicyPostureInput;

const mockPackageInfo = getMockPackageInfo();

const defaultProps: PackagePolicyReplaceDefineStepExtensionComponentProps = {
  newPolicy: mockNewPolicy,
  input: mockInput,
  updatePolicy: () => {},
  onChange: () => {},
  packageInfo: mockPackageInfo,
  setIsValid: () => {},
  disabled: false,
  hasInvalidRequiredVars: false,
};

export default {
  title: 'Integration Components/PolicyTemplateForm',
  component: CspPolicyTemplateForm,
  decorators: [
    (CspPolicyTemplateFormChild) => {
      const queryClient = new QueryClient();
      return (
        <I18nProvider>
          <ThemeProvider theme={{ eui: euiDarkVars, darkMode: true }}>
            <QueryClientProvider client={queryClient}>
              <MemoryRouter initialEntries={['/add-integration/cspm']}>
                <Route path="/add-integration/:integration">
                  <CspPolicyTemplateFormChild />
                </Route>
              </MemoryRouter>
            </QueryClientProvider>
          </ThemeProvider>
        </I18nProvider>
      );
    },
  ],
} as Meta;

const Template: Story<PackagePolicyReplaceDefineStepExtensionComponentProps> = (args) => (
  <CspPolicyTemplateForm {...args} />
);

export const Default = Template.bind({});
Default.args = defaultProps;
