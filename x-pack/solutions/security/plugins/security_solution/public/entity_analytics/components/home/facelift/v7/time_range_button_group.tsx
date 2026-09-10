/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Preset window control that takes the super date picker's place in the v.7 KQL
 * bar. Rendered through Unified Search's `renderQueryInputAppend` slot, so it
 * sits inline between the query input and the Refresh button.
 *
 * Selecting a preset does two things: it moves the prototype's window (which
 * every overview metric counts inside — see `./active_time_range`) and it
 * pushes the same range into the global time picker, so anything still reading
 * `useGlobalTime` stays in step with what the buttons say.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButtonGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import dateMath from '@kbn/datemath';
import { useDispatch } from 'react-redux-v7';

import { inputsActions } from '../../../../../common/store/inputs';
import { InputsModelId } from '../../../../../common/store/inputs/constants';
import { useActiveTimeRange } from './active_time_range';
import type { FaceliftTimeRangeId } from './time_range';
import { FACELIFT_TIME_RANGES, FACELIFT_TIME_RANGE_IDS } from './time_range';

const LEGEND = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.timeRangeButtonGroup.legend',
  { defaultMessage: 'Time range' }
);

export const TimeRangeButtonGroup: React.FC = () => {
  const dispatch = useDispatch();
  const [timeRange, setTimeRange] = useActiveTimeRange();

  const options = useMemo(
    () =>
      FACELIFT_TIME_RANGE_IDS.map((id) => ({
        id,
        label: FACELIFT_TIME_RANGES[id].label,
        'data-test-subj': `eaFaceliftTimeRangeOption-${id}`,
      })),
    []
  );

  const onChange = useCallback(
    (id: string) => {
      const range = FACELIFT_TIME_RANGES[id as FaceliftTimeRangeId];
      if (!range) {
        return;
      }

      setTimeRange(range.id);

      const from = dateMath.parse(range.from)?.toISOString();
      const to = dateMath.parse(range.to, { roundUp: true })?.toISOString();
      if (!from || !to) {
        return;
      }
      dispatch(
        inputsActions.setRelativeRangeDatePicker({
          id: InputsModelId.global,
          fromStr: range.from,
          toStr: range.to,
          from,
          to,
        })
      );
    },
    [dispatch, setTimeRange]
  );

  return (
    <EuiFlexItem grow={false}>
      <EuiButtonGroup
        legend={LEGEND}
        options={options}
        idSelected={timeRange}
        onChange={onChange}
        buttonSize="compressed"
        color="text"
        data-test-subj="eaFaceliftTimeRangeButtonGroup"
      />
    </EuiFlexItem>
  );
};
