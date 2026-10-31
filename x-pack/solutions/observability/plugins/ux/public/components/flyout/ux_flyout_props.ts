/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHasActiveSession, type EuiFlyoutProps } from '@elastic/eui';
import { useRef } from 'react';

export type UxFlyoutSession = 'start' | 'inherit';

/** Overlay, not push: push flyouts do not portal and break inside page panels. */
export const uxFlyoutProps = ({
  title,
  size = 'm',
  session = 'start',
}: {
  title: string;
  size?: EuiFlyoutProps['size'];
  session?: UxFlyoutSession;
}): Pick<
  EuiFlyoutProps,
  'session' | 'resizable' | 'hasAnimation' | 'flyoutMenuProps' | 'size'
> => ({
  session,
  // Child flyouts cannot share size "m" (or use "l" unless the parent is "fill").
  size: session === 'inherit' ? 's' : size,
  resizable: true,
  hasAnimation: session !== 'inherit',
  flyoutMenuProps: { title },
});

/** Join the current flyout stack when one is open; otherwise start a new session. */
export const useUxFlyoutSession = (explicit?: UxFlyoutSession): UxFlyoutSession => {
  const hasActiveSession = useHasActiveSession();
  // Lock the first decision. After session="start" registers, hasActiveSession
  // becomes true and flipping to inherit remounts this flyout as its own child.
  const locked = useRef<UxFlyoutSession | undefined>(explicit);
  if (explicit) {
    return explicit;
  }
  if (!locked.current) {
    locked.current = hasActiveSession ? 'inherit' : 'start';
  }
  return locked.current;
};
