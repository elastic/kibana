/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import { StatusBar as Component, StatusBarProps } from './status_bar';
import { alert } from '../mock/alert';

export default {
  component: Component,
  title: 'app/AlertDetails/StatusBar',
  alert,
};

const Template: ComponentStory<typeof Component> = (props: StatusBarProps) => (
  <I18nProvider>
    <KibanaContextProvider services={services}>
      <Component {...props} />
    </KibanaContextProvider>
  </I18nProvider>
);

const defaultProps = {
  alert,
};

export const StatusBar = Template.bind({});
StatusBar.args = defaultProps;

const services = {
  http: {
    basePath: {
      prepend: () => 'http://test',
    },
  },
};
