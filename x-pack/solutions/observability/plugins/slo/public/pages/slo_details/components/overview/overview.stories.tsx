/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KibanaReactStorybookDecorator } from '../../../../utils/kibana_react.storybook_decorator';
import { buildSlo } from '../../../../data/slo/slo';
import { SloDetailsPageDefinition as Component } from '../definition/page_definition';
import { SloDetailsContextProvider } from '../slo_details_context';

export default {
  component: Component,
  title: 'app/SLO/DetailsPage/Definition',
  decorators: [KibanaReactStorybookDecorator],
};

const contextValue = {
  slo: buildSlo(),
  isAutoRefreshing: false,
  isFlyout: false,
};

export const SloDetails = {
  render: () => (
    <SloDetailsContextProvider value={contextValue}>
      <Component />
    </SloDetailsContextProvider>
  ),
};
