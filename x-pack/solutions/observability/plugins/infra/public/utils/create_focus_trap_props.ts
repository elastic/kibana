/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutProps } from '@elastic/eui';

export type FocusTrapProps = EuiFlyoutProps['focusTrapProps'];

/**
 * Creates focusTrapProps for EuiFlyout components to restore focus to a trigger element.
 * Useful when opening a flyout from a context menu.
 */
export const createFocusTrapProps = (
  triggerElement: HTMLElement | null | undefined
): FocusTrapProps => {
  return {
    returnFocus: () => {
      if (triggerElement) {
        triggerElement.focus?.();
        return false; // Manual focus handled
      }
      return true; // Let EUI handle focus automatically
    },
  };
};
