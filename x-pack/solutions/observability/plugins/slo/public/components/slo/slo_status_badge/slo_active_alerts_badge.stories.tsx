/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { StoryFn } from '@storybook/react';
import { EuiFlexGroup } from '@elastic/eui';

import { KibanaReactStorybookDecorator } from '../../../utils/kibana_react.storybook_decorator';
import { SloActiveAlertsBadge as Component, Props } from './slo_active_alerts_badge';

export default {
  component: Component,
  title: 'app/SLO/Badges/SloActiveAlertsBadge',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: StoryFn<typeof Component> = (props: Props) => (
  <EuiFlexGroup>
    <Component {...props} />
  </EuiFlexGroup>
);

export const Default = {
  render: Template,
  args: { activeAlerts: 2 },
};
