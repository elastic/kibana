/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { EuiFlexGroup } from '@elastic/eui';
import { KibanaReactStorybookDecorator } from '../../../../utils/kibana_react.storybook_decorator';
import {
  buildCustomKqlIndicator,
  buildApmAvailabilityIndicator,
  buildApmLatencyIndicator,
} from '../../../../data/slo/indicator';
import { SloIndicatorTypeBadge as Component, Props } from './slo_indicator_type_badge';
import { buildSlo } from '../../../../data/slo/slo';

export default {
  component: Component,
  title: 'app/SLO/Badges/SloIndicatorTypeBadge',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: Props) => (
  <EuiFlexGroup gutterSize="s">
    <Component {...props} />
  </EuiFlexGroup>
);

export const WithCustomKql = Template.bind({});
WithCustomKql.args = { slo: buildSlo({ indicator: buildCustomKqlIndicator() }) };

export const WithApmAvailability = Template.bind({});
WithApmAvailability.args = { slo: buildSlo({ indicator: buildApmAvailabilityIndicator() }) };

export const WithApmLatency = Template.bind({});
WithApmLatency.args = { slo: buildSlo({ indicator: buildApmLatencyIndicator() }) };
