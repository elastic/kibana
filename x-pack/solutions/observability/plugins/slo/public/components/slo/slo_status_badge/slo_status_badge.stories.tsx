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
import { SloStatusBadge as Component, SloStatusProps } from './slo_status_badge';
import { buildSlo } from '../../../data/slo/slo';

export default {
  component: Component,
  title: 'app/SLO/Badges/SloStatusBadge',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: StoryFn<typeof Component> = (props: SloStatusProps) => (
  <EuiFlexGroup>
    <Component {...props} />
  </EuiFlexGroup>
);

const defaultProps = {
  slo: buildSlo(),
};

export const SloStatusBadge = {
  render: Template,
  args: defaultProps,
};
