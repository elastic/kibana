/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { StoryFn } from '@storybook/react';

import { KibanaReactStorybookDecorator } from '../../../utils/kibana_react.storybook_decorator';
import { SloListEmpty as Component } from './slo_list_empty';

export default {
  component: Component,
  title: 'app/SLO/ListPage/SloListEmpty',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: StoryFn<typeof Component> = () => <Component />;

const defaultProps = {};

export const SloListEmpty = {
  render: Template,
  args: defaultProps,
};
