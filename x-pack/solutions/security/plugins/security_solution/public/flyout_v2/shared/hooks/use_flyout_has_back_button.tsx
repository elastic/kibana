/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSyncExternalStore } from 'react';
import { getFlyoutManagerStore } from '@elastic/eui';

/**
 * Returns `true` when the EUI flyout menu is currently rendering a "Back" button.
 *
 * The managed flyout shows the back button (`data-test-subj="euiFlyoutMenuBackButton"`) exactly
 * when the current session has navigation history, i.e. `store.historyItems.length > 0`. We read
 * that same value from the EUI flyout manager store (a module-level singleton shared across React
 * roots) and stay reactive to navigation via `useSyncExternalStore`.
 *
 * This is a stopgap: EUI does not expose whether a flyout was opened first vs. as part of a
 * navigation stack. It lets the tools flyout header only reserve room for the close button when
 * there is no back button pushing the header onto its own row. It should be removed once the
 * flyout headers are reworked.
 */
export const useFlyoutHasBackButton = (): boolean => {
  const store = getFlyoutManagerStore();
  return useSyncExternalStore(
    store.subscribe,
    () => store.historyItems.length > 0,
    () => false
  );
};
