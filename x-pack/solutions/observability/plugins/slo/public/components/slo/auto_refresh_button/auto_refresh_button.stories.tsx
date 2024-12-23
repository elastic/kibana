/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { StoryFn } from '@storybook/react';

import { KibanaReactStorybookDecorator } from '../../../utils/kibana_react.storybook_decorator';
import { AutoRefreshButton as Component } from './auto_refresh_button';

export default {
  component: Component,
  title: 'app/SLO/ListPage/AutoRefreshButton',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: StoryFn<typeof Component> = () => {
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(true);

  const toggleEnabled = () => {
    setIsAutoRefreshing(!isAutoRefreshing);
  };

  return <Component isAutoRefreshing={isAutoRefreshing} onClick={toggleEnabled} />;
};

const defaultProps = {
  enabled: true,
  disabled: false,
};

export const AutoRefreshButton = {
  render: Template,
  args: defaultProps,
};
