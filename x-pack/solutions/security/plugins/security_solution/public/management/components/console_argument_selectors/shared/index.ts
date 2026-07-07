/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { BaseSelectorState, BaseSelectorConfig } from './types';
export {
  SHARED_TRUNCATION_STYLE,
  CUSTOM_SCRIPTS_CONFIG,
  PENDING_ACTIONS_CONFIG,
} from './constants';
export {
  useGenericErrorToast,
  useBaseSelectorState,
  useBaseSelectorHandlers,
  useRenderDelay,
  useFocusManagement,
} from './hooks';
export {
  transformCustomScriptsToOptions,
  createSelectionHandler,
  createKeyDownHandler,
  checkActionCancelPermission,
} from './utils';
export type { PendingActionItem } from './utils';
