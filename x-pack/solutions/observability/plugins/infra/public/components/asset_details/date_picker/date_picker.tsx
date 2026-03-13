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
import type { OnRefreshChangeProps } from '@elastic/eui/src/components/date_picker/types';
import { FormattedMessage } from '@kbn/i18n-react';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import React, { useCallback, useMemo } from 'react';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useDatePickerContext } from '../hooks/use_date_picker';
import { Popover } from '../tabs/common/popover';

export const DatePicker = () => {
  const { dateRange, autoRefresh, setDateRange, setAutoRefresh, onRefresh } =
    useDatePickerContext();
  const {
    services: {
      uiSettings,
      data: {
        query: {
          timefilter: { history: timeHistory },
        },
      },
    },
  } = useKibanaContextForPlugin();

  const commonlyUsedRanges = useMemo(
    () =>
      uiSettings
        ?.get(UI_SETTINGS.TIMEPICKER_QUICK_RANGES)
        ?.map(({ from, to, display }: { from: string; to: string; display: string }) => ({
          start: from,
          end: to,
          label: display,
        })) ?? [],
    [uiSettings]
  );

  const recentlyUsedRanges = useMemo(
    () =>
      timeHistory?.get()?.map(({ from, to }: { from: string; to: string }) => ({
        start: from,
        end: to,
      })) ?? [],
    [timeHistory]
  );

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
        setDateRange({ from: dateRange.from, to: 'now' });
      }
    },
    [dateRange.from, setAutoRefresh, setDateRange]
  );

  return (
    <EuiFlexGroup gutterSize="xs" responsive={false} direction="column">
      <EuiFlexItem grow={false}>
        <MemoEuiSuperDatePicker
          commonlyUsedRanges={commonlyUsedRanges}
          recentlyUsedRanges={recentlyUsedRanges}
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
        icon="info"
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

const MemoEuiSuperDatePicker = React.memo((props: EuiSuperDatePickerProps) => (
  <EuiSuperDatePicker
    {...props}
    updateButtonProps={{
      iconOnly: true,
    }}
  />
));
