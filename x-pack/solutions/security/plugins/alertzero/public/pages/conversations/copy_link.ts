/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { copyToClipboard } from '@elastic/eui';
import type { NotificationsStart } from '@kbn/core/public';
import { COPY_LINK_TOASTS } from './translations';

export const copyLinkWithToast = (
  toasts: NotificationsStart['toasts'] | undefined,
  link: string
): void => {
  if (copyToClipboard(link)) {
    toasts?.addSuccess(COPY_LINK_TOASTS.copied);
  } else {
    toasts?.addDanger(COPY_LINK_TOASTS.failed);
  }
};
