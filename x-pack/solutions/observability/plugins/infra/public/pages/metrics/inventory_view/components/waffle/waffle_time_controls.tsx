/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WithEuiThemeProps } from '@elastic/eui';
import {
  EuiButton,
  EuiDatePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  withEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Moment } from 'moment';
import moment from 'moment';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { convertIntervalToString } from '../../../../../utils/convert_interval_to_string';
import { useWaffleTimeContext } from '../../hooks/use_waffle_time';

interface Props {
  interval: string;
}

type PropsWithTheme = Props & WithEuiThemeProps;

export const WaffleTimeControls = withEuiTheme(({ interval }: PropsWithTheme) => {
  const { currentTime, isAutoReloading, startAutoReload, stopAutoReload, jumpToTime } =
    useWaffleTimeContext();

  const currentMoment = moment(currentTime);
  const intervalAsString = convertIntervalToString(interval);

  const showingLastOneMinuteDataText = i18n.translate(
    'xpack.infra.waffleDatePicker.showingLastOneMinuteDataText',
    {
      defaultMessage: 'Last {duration} of data for the selected time',
      values: { duration: intervalAsString },
    }
  );

  const liveStreamingButton = isAutoReloading ? (
    <EuiButton
      data-test-subj="infraWaffleTimeControlsStopRefreshingButton"
      color="primary"
      iconSide="left"
      iconType="pause"
      onClick={stopAutoReload}
    >
      <FormattedMessage
        id="xpack.infra.waffleTime.stopRefreshingButtonLabel"
        defaultMessage="Stop refreshing"
      />
    </EuiButton>
  ) : (
    <EuiButton
      data-test-subj="infraWaffleTimeControlsAutoRefreshButton"
      iconSide="left"
      iconType="play"
      onClick={startAutoReload}
    >
      <FormattedMessage
        id="xpack.infra.waffleTime.autoRefreshButtonLabel"
        defaultMessage="Auto-refresh"
      />
    </EuiButton>
  );

  const handleChangeDate = useCallback(
    (time: Moment | null) => {
      if (time) {
        jumpToTime(time.valueOf());
      }
    },
    [jumpToTime]
  );

  return (
    <EuiFlexGroup gutterSize="m">
      <EuiFlexItem
        grow={false}
        data-test-subj="waffleDatePicker"
        aria-label={showingLastOneMinuteDataText}
      >
        <EuiToolTip
          content={showingLastOneMinuteDataText}
          delay="long"
          display="inlineBlock"
          position="top"
          data-test-subj="waffleDatePickerIntervalTooltip"
        >
          <EuiDatePicker
            dateFormat="L LTS"
            disabled={isAutoReloading}
            injectTimes={currentMoment ? [currentMoment] : []}
            isLoading={isAutoReloading}
            onChange={handleChangeDate}
            popoverPlacement="upRight"
            selected={currentMoment}
            shouldCloseOnSelect
            showTimeSelect
            timeFormat="LT"
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{liveStreamingButton}</EuiFlexItem>
    </EuiFlexGroup>
  );
});
