/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { ExpandableFlyout } from './src';

export { useExpandableFlyoutApi } from './src/hooks/use_expandable_flyout_api';
export { useExpandableFlyoutState } from './src/hooks/use_expandable_flyout_state';
export { useExpandableFlyoutHistory } from './src/hooks/use_expandable_flyout_history';

export { type FlyoutPanels as ExpandableFlyoutState } from './src/store/state';

export { ExpandableFlyoutProvider } from './src/provider';

export type { ExpandableFlyoutProps } from './src';
export type {
  FlyoutPanelProps,
  PanelPath,
  ExpandableFlyoutApi,
  FlyoutPanelHistory,
} from './src/types';
