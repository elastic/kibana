/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaReactStorybookDecorator } from '../../../utils/kibana_react.storybook_decorator';
import { buildSlo } from '../../../data/slo/slo';
import { SloDetails as Component, Props } from './slo_details';

export default {
  component: Component,
  title: 'app/SLO/DetailsPage/SloDetails',
  decorators: [KibanaReactStorybookDecorator],
};

const defaultProps: Props = {
  slo: buildSlo(),
  isAutoRefreshing: false,
  selectedTabId: 'overview',
};

export const SloDetails = {
  args: defaultProps,
};
