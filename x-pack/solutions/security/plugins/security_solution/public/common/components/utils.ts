/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { throttle } from 'lodash/fp';
import { useMemo, useState } from 'react';
import useResizeObserver from 'use-resize-observer/polyfilled';
import { niceTimeFormatByDay, timeFormatter } from '@elastic/charts';
import moment from 'moment-timezone';
import type { IToasts } from '@kbn/core/public';

export const getDaysDiff = (minDate: moment.Moment, maxDate: moment.Moment) => {
  const diff = maxDate.diff(minDate, 'days');

  if (diff <= 1 && !minDate.isSame(maxDate)) {
    return 2; // to return proper pattern from niceTimeFormatByDay
  }

  return diff;
};

export const histogramDateTimeFormatter = (domain: [string, string] | null, fixedDiff?: number) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const diff = fixedDiff ?? getDaysDiff(moment(domain![0]), moment(domain![1]));
  const format = niceTimeFormatByDay(diff);
  return timeFormatter(format);
};

export const useThrottledResizeObserver = (wait = 100) => {
  const [size, setSize] = useState<{ width?: number; height?: number }>({ width: 0, height: 0 });
  const onResize = useMemo(() => throttle(wait, setSize), [wait]);
  const { ref } = useResizeObserver<HTMLDivElement>({ onResize });

  return { ref, ...size };
};

/**
 * Displays an error toast with a specified title and a short message.
 * Also allows to set a detailed message that will appear in the modal when user clicks the "See full error" button.
 *
 * @param title The title of the toast notification. Appears in both the toast header and the modal header.
 * @param shortMessage An optional short message. Appears under toast header.
 * @param fullMessage The full error message. Appears in the modal when user clicks the "See full error" button.
 * @param toasts The toasts service instance.
 */
export function showErrorToast({
  title,
  shortMessage,
  fullMessage,
  toasts,
}: {
  title: string;
  shortMessage?: string;
  fullMessage: string;
  toasts: IToasts;
}) {
  const error = new Error('Error details');
  error.stack = fullMessage;
  toasts.addError(error, {
    title,
    // Fall back to a space to ensure that the toast component does not render its default message
    toastMessage: shortMessage ?? ' ',
  });
}
