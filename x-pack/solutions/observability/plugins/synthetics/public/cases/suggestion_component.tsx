/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useSelector, useDispatch } from 'react-redux';
import type { SuggestionChildrenProps } from '@kbn/cases-plugin/public';

import { EuiBadge, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { MetricItem } from '../apps/synthetics/components/monitors_page/overview/overview/metric_item/metric_item';
import { selectOverviewTrends, trendStatsBatch } from '../apps/synthetics/state';
import type { OverviewStatusMetaData } from '../../common/runtime_types';
import type { SyntheticsSuggestion } from '../../common/types';
import type { FlyoutParamProps } from '../apps/synthetics/components/monitors_page/overview/overview/types';
export function SyntheticsSuggestionChildren(props: SuggestionChildrenProps<SyntheticsSuggestion>) {
  const { suggestion } = props;
  const trendData = useSelector(selectOverviewTrends);
  const syntheticsSuggestions = suggestion.data[0].payload as unknown as OverviewStatusMetaData;
  const dispatch = useDispatch();
  useEffect(() => {
    if (
      syntheticsSuggestions &&
      !trendData[syntheticsSuggestions.configId + syntheticsSuggestions.locationId]
    ) {
      dispatch(
        trendStatsBatch.get([
          {
            configId: syntheticsSuggestions.configId,
            locationId: syntheticsSuggestions.locationId,
            schedule: syntheticsSuggestions.schedule,
          },
        ])
      );
    }
  }, [dispatch, syntheticsSuggestions, trendData]);
  if (suggestion.data.length === 1) {
    return (
      <MetricItem
        key={syntheticsSuggestions.monitorQueryId}
        monitor={syntheticsSuggestions}
        onClick={function (params: FlyoutParamProps): void {
          throw new Error('Function not implemented.');
        }}
      />
      // <div>
      //   <EuiFlexItem grow={false} style={{ minHight: '300px' }}>
      //     <EuiTitle>
      //       <h3>{syntheticsSuggestions.name}</h3>
      //     </EuiTitle>
      //     <EuiTitle size="xxs">
      //       <h4 className="eui-textSubdued">{syntheticsSuggestions.urls}</h4>
      //     </EuiTitle>
      //     <EuiTitle size="xxs">
      //       <h4 className="eui-textSubdued">{syntheticsSuggestions.locationLabel}</h4>
      //     </EuiTitle>
      //     <EuiSpacer size="xl" />
      //     <EuiSpacer size="xl" />

      //     <EuiFlexItem grow={false}>
      //       <EuiBadge color={syntheticsSuggestions.status === 'up' ? 'success' : 'danger'}>
      //         {syntheticsSuggestions.status.toUpperCase()}
      //       </EuiBadge>
      //     </EuiFlexItem>
      //   </EuiFlexItem>
      // </div>
    );
  }
}
