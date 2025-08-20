/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuggestionChildrenProps } from '@kbn/cases-plugin/public';
import React from 'react';
import { Provider } from 'react-redux';
import { OverviewStatusMetaData } from '../../common/runtime_types';
import { SyntheticsSuggestion } from '../../common/types';
import { MetricItem } from '../apps/synthetics/components/monitors_page/overview/overview/metric_item/metric_item';
import { FlyoutParamProps } from '../apps/synthetics/components/monitors_page/overview/overview/types';
import { store } from '../apps/synthetics/state';
export function SyntheticsSuggestionChildren(props: SuggestionChildrenProps<SyntheticsSuggestion>) {
  const { suggestion } = props;
  if (suggestion.data.length === 1) {
    const syntheticsSuggestions = suggestion.data[0].payload as unknown as OverviewStatusMetaData;
    return (
      <Provider store={store}>
        <MetricItem
          key={syntheticsSuggestions.monitorQueryId}
          monitor={syntheticsSuggestions}
          onClick={function (params: FlyoutParamProps): void {
            throw new Error('Function not implemented.');
          }}
        />
      </Provider>
    );
  }
}
