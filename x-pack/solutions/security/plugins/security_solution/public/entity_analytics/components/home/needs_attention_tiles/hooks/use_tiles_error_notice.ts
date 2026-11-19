/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';

/**
 * Shows one error toast for every tile whose count failed, once the counts have settled so that it
 * can name them all, once per page load and again for each new range or filter (`runKey`). Each
 * tile says so itself; a timeout has its own notice (`useTilesTimeoutNotice`).
 */
export const useTilesErrorNotice = (
  failedTitles: string[],
  isSettled: boolean,
  runKey: string
): void => {
  // `addDanger` is only on the toasts service itself, which `useAppToasts` exposes as `api`.
  const { api: toasts } = useAppToasts();
  const currentKey = useRef<string>();
  const isNotified = useRef(false);

  useEffect(() => {
    // A run that did not fail must not hide the toast when its range or filter comes back.
    if (currentKey.current !== runKey) {
      currentKey.current = runKey;
      isNotified.current = false;
    }
    if (!isSettled || failedTitles.length === 0 || isNotified.current) return;
    isNotified.current = true;
    toasts.addDanger({
      title: i18n.translate('xpack.securitySolution.entityAnalytics.home.tiles.countFailedTitle', {
        defaultMessage: "Some metrics couldn't load",
      }),
      text: i18n.translate('xpack.securitySolution.entityAnalytics.home.tiles.countFailedText', {
        defaultMessage: "{tiles} didn't load. Refresh the page to try again.",
        values: {
          // The design's copy has no comma before "and" (A, B and C). Plain `en` adds one, the
          // British list style does not; other languages keep their own.
          tiles: new Intl.ListFormat(i18n.getLocale() === 'en' ? 'en-GB' : i18n.getLocale(), {
            style: 'long',
            type: 'conjunction',
          }).format(failedTitles),
        },
      }),
    });
  }, [failedTitles, isSettled, runKey, toasts]);
};
