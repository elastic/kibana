/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { copyToClipboard } from '@elastic/eui';
import type { NotificationsStart } from '@kbn/core/public';
import { COPY_LINK_TOASTS } from './translations';

/**
 * Copies the link and returns whether it worked. Only a failure is reported here: each control
 * confirms success its own way (the flyout's tooltip, the card menu's toast).
 */
export const copyLink = (
  toasts: NotificationsStart['toasts'] | undefined,
  link: string
): boolean => {
  const copied = copyToClipboard(link);
  if (!copied) {
    toasts?.addDanger(COPY_LINK_TOASTS.failed);
  }
  return copied;
};
