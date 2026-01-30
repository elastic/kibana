/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import moment from 'moment';
import type { BurnRateWindow } from '../../../hooks/use_fetch_burn_rate_windows';
import { useFetchBurnRateWindows } from '../../../hooks/use_fetch_burn_rate_windows';
import { useFetchSloBurnRates } from '../../../../../hooks/use_fetch_slo_burn_rates';
import { getStatus } from '../utils';

const longWindowName = (window: string) => `${window}_LONG`;
const shortWindowName = (window: string) => `${window}_SHORT`;
const toPayload = (
  burnRateWindows: BurnRateWindow[]
): Array<{ name: string; duration: string }> => {
  return burnRateWindows.flatMap((window) => [
    {
      name: longWindowName(window.name),
      duration: `${window.longWindow.value}${window.longWindow.unit}`,
    },
    {
      name: shortWindowName(window.name),
      duration: `${window.shortWindow.value}${window.shortWindow.unit}`,
    },
  ]);
};

export function useBurnRatePanel(opts: {
  slo: SLOWithSummaryResponse;
  isAutoRefreshing?: boolean;
}) {
  const { slo, isAutoRefreshing } = opts;

  const burnRateWindows = useFetchBurnRateWindows(slo);
  const [selectedWindow, setSelectedWindow] = useState(burnRateWindows[0]);
  const { isLoading, data } = useFetchSloBurnRates({
    slo,
    shouldRefetch: isAutoRefreshing,
    windows: toPayload(burnRateWindows),
  });

  useEffect(() => {
    if (burnRateWindows.length > 0) {
      setSelectedWindow(burnRateWindows[0]);
    }
  }, [burnRateWindows]);

  const onBurnRateOptionChange = (windowName: string) => {
    const selected = burnRateWindows.find((opt) => opt.name === windowName) ?? burnRateWindows[0];
    setSelectedWindow(selected);
  };

  const threshold = selectedWindow.threshold;
  const longWindowBurnRate =
    data?.burnRates.find((curr) => curr.name === longWindowName(selectedWindow.name))?.burnRate ??
    0;
  const shortWindowBurnRate =
    data?.burnRates.find((curr) => curr.name === shortWindowName(selectedWindow.name))?.burnRate ??
    0;

  const currentStatus = getStatus(threshold, longWindowBurnRate, shortWindowBurnRate);

  const dataTimeRange = {
    from: moment()
      .subtract(selectedWindow.longWindow.value, selectedWindow.longWindow.unit)
      .toDate(),
    to: new Date(),
  };

  return {
    burnRateWindows,
    selectedWindow,
    onBurnRateOptionChange,
    shortWindowBurnRate,
    longWindowBurnRate,
    isLoading,
    threshold,
    currentStatus,
    dataTimeRange,
  };
}
