/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { copyToClipboard, type EuiFlyoutMenuCustomAction } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useToasts } from '../../../common/lib/kibana';

export const SHARE_ENTITY_FLYOUT_LABEL = i18n.translate(
  'xpack.securitySolution.flyoutV2.entity.shareEntityLabel',
  {
    defaultMessage: 'Share entity',
  }
);

const COPIED_LINK_TOAST_TITLE = i18n.translate(
  'xpack.securitySolution.flyoutV2.entity.shareEntityCopiedToastTitle',
  {
    defaultMessage: 'Copied link to clipboard',
  }
);

/**
 * EuiFlyoutMenu custom action that copies the current entity flyout URL — same
 * share icon as the Alert flyout (`share`), wired for the menu bar API.
 */
export const useFlyoutShareUrlCustomAction = (
  getShareUrl: () => string = () => window.location.href
): EuiFlyoutMenuCustomAction => {
  const toasts = useToasts();

  const onClick = useCallback(() => {
    if (copyToClipboard(getShareUrl())) {
      toasts.addSuccess({ title: COPIED_LINK_TOAST_TITLE });
    }
  }, [getShareUrl, toasts]);

  return useMemo(
    () => ({
      iconType: 'share',
      'aria-label': SHARE_ENTITY_FLYOUT_LABEL,
      onClick,
    }),
    [onClick]
  );
};
