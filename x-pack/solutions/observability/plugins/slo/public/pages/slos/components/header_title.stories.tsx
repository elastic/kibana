/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { KibanaReactStorybookDecorator } from '../../../utils/kibana_react.storybook_decorator';
import { HeaderTitle as Component } from './header_title';

export default {
  component: Component,
  title: 'app/SLO/ListPage/HeaderTitle',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = () => <Component />;

const defaultProps = {};

export const Default = Template.bind({});
Default.args = defaultProps;
