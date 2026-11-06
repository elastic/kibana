/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import { SiemSearchBar } from '../../../common/components/search_bar';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { TIME_RANGE_OPTIONS } from './entities_grid';
import type { TimeRange } from './entities_grid';

const TIME_RANGE_LEGEND = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.timeRange.legend',
  { defaultMessage: 'Time range' }
);

const TIME_RANGE_BUTTON_LABELS: Record<TimeRange, string> = {
  '24h': i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.timeRange.last24hButtonLabel',
    {
      defaultMessage: 'Last 24h',
    }
  ),
  '7d': i18n.translate('xpack.securitySolution.entityAnalytics.home.timeRange.last7dButtonLabel', {
    defaultMessage: 'Last 7d',
  }),
  '30d': i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.timeRange.last30dButtonLabel',
    {
      defaultMessage: 'Last 30d',
    }
  ),
};

interface Props {
  dataView: DataView;
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
}

export const EntitySearchBar: React.FC<Props> = ({ dataView, timeRange, onTimeRangeChange }) => {
  // The search bar renders the ranges between the query input and the Refresh button. Its props
  // are compared by reference, so the function only changes with the range.
  const renderTimeRange = useCallback(
    () => (
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          legend={TIME_RANGE_LEGEND}
          options={TIME_RANGE_OPTIONS.map((v) => ({
            id: v,
            label: TIME_RANGE_BUTTON_LABELS[v],
            'data-test-subj': `eaTimeRange-${v}`,
          }))}
          idSelected={timeRange}
          onChange={(id) => onTimeRangeChange(id as TimeRange)}
          buttonSize="compressed"
        />
      </EuiFlexItem>
    ),
    [timeRange, onTimeRangeChange]
  );

  return (
    <SiemSearchBar
      dataView={dataView}
      id={InputsModelId.global}
      displayStyle="inPage"
      hideDatePicker
      renderQueryInputAppend={renderTimeRange}
    />
  );
};
