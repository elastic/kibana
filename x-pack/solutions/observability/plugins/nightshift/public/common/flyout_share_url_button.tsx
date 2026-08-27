/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { copyToClipboard, type EuiFlyoutMenuCustomAction } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../hooks/use_kibana';

export const getFlyoutShareUrlAriaLabel = (): string =>
  i18n.translate('xpack.nightshift.flyout.shareUrlAriaLabel', {
    defaultMessage: 'Copy link to this flyout',
  });

export const useFlyoutShareUrlCustomAction = (
  getShareUrl: () => string
): EuiFlyoutMenuCustomAction => {
  const { notifications } = useKibana().services;
  const shareLabel = getFlyoutShareUrlAriaLabel();

  const onShareClick = useCallback(() => {
    const copied = copyToClipboard(getShareUrl());
    if (copied) {
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.nightshift.flyout.shareUrlSuccess', {
          defaultMessage: 'Copied link to clipboard',
        }),
      });
    }
  }, [getShareUrl, notifications.toasts]);

  return useMemo(
    () => ({
      iconType: 'link',
      'aria-label': shareLabel,
      onClick: onShareClick,
    }),
    [onShareClick, shareLabel]
  );
};
