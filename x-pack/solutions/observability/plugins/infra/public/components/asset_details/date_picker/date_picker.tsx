/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiSuperDatePicker,
  EuiFlexItem,
  EuiFlexGroup,
  EuiText,
  type OnTimeChangeProps,
  type OnRefreshProps,
  type EuiSuperDatePickerProps,
} from '@elastic/eui';
import type {
  OnRefreshChangeProps,
  DurationRange,
} from '@elastic/eui/src/components/date_picker/types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback } from 'react';
import { useDatePickerContext } from '../hooks/use_date_picker';
import { Popover } from '../tabs/common/popover';

const COMMONLY_USED_RANGES: DurationRange[] = [
  {
    start: 'now-15m',
    end: 'now',
    label: i18n.translate('xpack.infra.assetDetails.datePicker.commonlyUsedRanges.last15Minutes', {
      defaultMessage: 'Last 15 minutes',
    }),
  },
  {
    start: 'now-1h',
    end: 'now',
    label: i18n.translate('xpack.infra.assetDetails.datePicker.commonlyUsedRanges.last1Hour', {
      defaultMessage: 'Last 1 hour',
    }),
  },
  {
    start: 'now-3h',
    end: 'now',
    label: i18n.translate('xpack.infra.assetDetails.datePicker.commonlyUsedRanges.last3Hours', {
      defaultMessage: 'Last 3 hours',
    }),
  },
  {
    start: 'now-24h',
    end: 'now',
    label: i18n.translate('xpack.infra.assetDetails.datePicker.commonlyUsedRanges.last24Hours', {
      defaultMessage: 'Last 24 hours',
    }),
  },
  {
    start: 'now-7d',
    end: 'now',
    label: i18n.translate('xpack.infra.assetDetails.datePicker.commonlyUsedRanges.last7Days', {
      defaultMessage: 'Last 7 days',
    }),
  },
];

export const DatePicker = () => {
  const { dateRange, autoRefresh, setDateRange, setAutoRefresh, onRefresh } =
    useDatePickerContext();

  const handleRefresh = useCallback(
    ({ start, end }: OnRefreshProps) => {
      onRefresh({ from: start, to: end });
    },
    [onRefresh]
  );
  const handleTimeChange = useCallback(
    ({ start, end, isInvalid }: OnTimeChangeProps) => {
      if (!isInvalid) {
        setDateRange({ from: start, to: end });
      }
    },
    [setDateRange]
  );

  const handleAutoRefreshChange = useCallback(
    ({ isPaused, refreshInterval }: OnRefreshChangeProps) => {
      setAutoRefresh({
        isPaused,
        interval: refreshInterval,
      });

      if (!isPaused) {
        // when auto refresh is enabled, we need to force the end range to `now` in order for it to work automatically
        // otherwise,  users have to manually set `now` in the date picker
        setDateRange({ from: dateRange.from, to: 'now' });
      }
    },
    [dateRange.from, setAutoRefresh, setDateRange]
  );

  return (
    <EuiFlexGroup gutterSize="xs" responsive={false} direction="column">
      <EuiFlexItem grow={false}>
        <MemoEuiSuperDatePicker
          commonlyUsedRanges={COMMONLY_USED_RANGES}
          start={dateRange.from}
          end={dateRange.to}
          isPaused={autoRefresh?.isPaused}
          onTimeChange={handleTimeChange}
          onRefresh={handleRefresh}
          onRefreshChange={handleAutoRefreshChange}
          refreshInterval={autoRefresh?.interval}
          width="full"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ minHeight: '18px' }}>
        {autoRefresh && !autoRefresh.isPaused && <AutoRefreshTroubleshootMessage />}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const AutoRefreshTroubleshootMessage = () => (
  <EuiFlexGroup gutterSize="xs" alignItems="baseline" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color="subdued">
        <FormattedMessage
          id="xpack.infra.assetDetails.datePicker.tooltip.autoRefresh"
          defaultMessage="Experiencing continually loading data?"
        />
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <Popover
        iconSize="s"
        iconColor="subdued"
        icon="iInCircle"
        data-test-subj="infraAssetDetailsMetadataPopoverButton"
      >
        <EuiText size="xs">
          <FormattedMessage
            id="xpack.infra.assetDetails.datePicker.tooltip.autoRefresh.troubleshoot"
            defaultMessage="Try increasing the refresh interval, shortening the date range or turning off auto-refresh."
          />
        </EuiText>
      </Popover>
    </EuiFlexItem>
  </EuiFlexGroup>
);

// Memo EuiSuperDatePicker to prevent re-renders from resetting the auto-refresh cycle
const MemoEuiSuperDatePicker = React.memo((props: EuiSuperDatePickerProps) => (
  <EuiSuperDatePicker
    {...props}
    updateButtonProps={{
      iconOnly: true,
    }}
  />
));
