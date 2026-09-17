/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import { SiemSearchBar } from '../../../common/components/search_bar';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { TIME_RANGE_OPTIONS } from './use_time_range_param';
import type { TimeRange } from './use_time_range_param';

interface Props {
  dataView: DataView;
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
}

export const EntitySearchBar: React.FC<Props> = ({ dataView, timeRange, onTimeRangeChange }) => (
  <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
    <EuiFlexItem>
      <SiemSearchBar dataView={dataView} id={InputsModelId.global} hideDatePicker />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButtonGroup
        legend="Time range"
        options={TIME_RANGE_OPTIONS.map((v) => ({ id: v, label: v }))}
        idSelected={timeRange}
        onChange={(id) => onTimeRangeChange(id as TimeRange)}
        buttonSize="compressed"
        color="primary"
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
