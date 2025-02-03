/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';
import { KibanaReactStorybookDecorator } from '../../../utils/kibana_react.storybook_decorator';
import { Cases as Component, CasesProps } from './cases';

export default {
  title: 'app/Cases',
  component: Component,
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: CasesProps) => <Component {...props} />;

const defaultProps: CasesProps = {
  permissions: {
    read: true,
    all: true,
    create: true,
    delete: true,
    push: true,
    update: true,
    connectors: true,
    settings: true,
    reopenCase: true,
    createComment: true,
    assign: true,
  },
};

export const CasesPageWithAllPermissions = Template.bind({});
CasesPageWithAllPermissions.args = defaultProps;

export const CasesPageWithNoPermissions = Template.bind({});
CasesPageWithNoPermissions.args = {
  permissions: {
    read: false,
    all: false,
    create: false,
    delete: false,
    push: false,
    update: false,
    connectors: false,
    settings: false,
    reopenCase: false,
    createComment: false,
    assign: false,
  },
};
