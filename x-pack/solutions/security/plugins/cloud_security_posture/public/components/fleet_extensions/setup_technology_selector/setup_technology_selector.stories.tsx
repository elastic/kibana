/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Meta, Story } from '@storybook/react';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { SetupTechnologySelector, SetupTechnologySelectorProps } from './setup_technology_selector';

export default {
  title: 'Integration Components/SetupTechnologySelector',
  component: SetupTechnologySelector,
  argTypes: {
    onSetupTechnologyChange: { action: 'onSetupTechnologyChange' },
    setupTechnology: {
      control: {
        type: 'select',
        options: [SetupTechnology.AGENTLESS, SetupTechnology.AGENT_BASED],
      },
    },
    disabled: {
      control: 'boolean',
    },
  },
} as Meta;

const Template: Story<SetupTechnologySelectorProps> = (props: SetupTechnologySelectorProps) => (
  <SetupTechnologySelector {...props} />
);

const defaultProps: SetupTechnologySelectorProps = {
  disabled: false,
  setupTechnology: SetupTechnology.AGENTLESS,
  onSetupTechnologyChange: () => {},
};

export const AgentlessDefault = Template.bind({});
AgentlessDefault.args = defaultProps;
AgentlessDefault.argTypes = {
  onSetupTechnologyChange: { control: false },
};

export const AgentBasedDefault = Template.bind({});
AgentBasedDefault.args = {
  ...defaultProps,
  setupTechnology: SetupTechnology.AGENT_BASED,
};

// export const WithValidationErrors = Template.bind({});
// WithValidationErrors.args = {
//   // Provide props to simulate validation errors
//   initialValues: {
//     accessKeyId: '',
//     secretAccessKey: '',
//     sessionToken: '',
//   },
//   validationErrors: {
//     accessKeyId: 'Access Key ID is required',
//     secretAccessKey: 'Secret Access Key is required',
//     sessionToken: 'Session Token is required',
//   },
// };
