/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { TILE_QUERY_TIMEOUT_MS } from './tile_query_timeout';

export const TILE_TIMEOUT_MESSAGE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.tiles.timedOut',
  { defaultMessage: 'Timed out' }
);

/**
 * Shows one warning when any tile count times out, once per page load and again for each new
 * range or filter (`runKey`), like Kibana's own search timeout notice; each tile says so itself.
 */
export const useTilesTimeoutNotice = (isAnyCountTimedOut: boolean, runKey: string): void => {
  const { addWarning } = useAppToasts();
  const currentKey = useRef<string>();
  const isNotified = useRef(false);

  useEffect(() => {
    // A run that did not time out must not hide the warning when its range or filter comes back.
    if (currentKey.current !== runKey) {
      currentKey.current = runKey;
      isNotified.current = false;
    }
    if (!isAnyCountTimedOut || isNotified.current) return;
    isNotified.current = true;
    addWarning({
      title: i18n.translate('xpack.securitySolution.entityAnalytics.home.tiles.timedOutTitle', {
        defaultMessage: 'Some tiles timed out',
      }),
      text: i18n.translate('xpack.securitySolution.entityAnalytics.home.tiles.timedOutText', {
        defaultMessage:
          'Their queries ran for more than {seconds} seconds and were stopped. Try a shorter time range or narrower filters.',
        values: { seconds: TILE_QUERY_TIMEOUT_MS / 1000 },
      }),
    });
  }, [isAnyCountTimedOut, runKey, addWarning]);
};
