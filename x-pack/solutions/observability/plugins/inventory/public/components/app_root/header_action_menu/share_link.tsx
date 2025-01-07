/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import copy from 'copy-to-clipboard';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty } from '@elastic/eui';
import { useKibana } from '../../../hooks/use_kibana';

const SHARE_BUTTON_LABEL = i18n.translate('xpack.inventory.shareLink.shareButtonLabel', {
  defaultMessage: 'Share',
});

const SHARE_TOAST_SUCCESS_LABEL = i18n.translate(
  'xpack.inventory.shareLink.shareToastSuccessLabel',
  { defaultMessage: 'Short URL copied to clipboard!' }
);

const SHARE_TOAST_FAILURE_LABEL = i18n.translate(
  'xpack.inventory.shareLink.shareToastFailureLabel',
  { defaultMessage: 'Short URL unable to be copied.' }
);

function useShortUrlService() {
  const {
    services: { share, notifications },
  } = useKibana();

  const [isLoading, setIsLoading] = useState(false);

  const copyShortUrl = useCallback(async () => {
    setIsLoading(true);

    try {
      const shortUrls = share.url.shortUrls.get(null);

      const { url } = await shortUrls.createFromLongUrl(window.location.toString());

      setIsLoading(false);

      if (copy(url)) {
        notifications.toasts.addSuccess({
          title: SHARE_TOAST_SUCCESS_LABEL,
          iconType: 'copyClipboard',
        });
      } else {
        throw new Error('Clipboard copy error');
      }
    } catch (e) {
      const err = e as Error;
      notifications.toasts.addDanger({
        title: SHARE_TOAST_FAILURE_LABEL,
        iconType: 'error',
        text: err.message,
      });
    }
  }, [share, notifications.toasts]);

  return {
    isLoading,
    copyShortUrl,
  };
}

export function ShareLink() {
  const { isLoading, copyShortUrl } = useShortUrlService();

  return (
    <EuiButtonEmpty
      data-test-subj="inventoryShareLinkButton"
      onClick={copyShortUrl}
      iconType="share"
      isLoading={isLoading}
    >
      {SHARE_BUTTON_LABEL}
    </EuiButtonEmpty>
  );
}
