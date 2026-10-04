/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Last updated widget
export { LastUpdatedAt } from './components/last_updated';
export type { LastUpdatedAtProps } from './components/last_updated';
export { getLastUpdatedLazy as getLastUpdated } from './methods';

// Hover action buttons (copy / filter for / filter out)
export {
  getCopyButton,
  getFilterForValueButton,
  getFilterOutValueButton,
} from './components/hover_actions';
export type { CopyProps } from './components/hover_actions/actions/copy';
export type {
  FilterValueFnArgs,
  HoverActionComponentProps,
} from './components/hover_actions/actions/types';
export { createFilter, getAdditionalScreenReaderOnlyContext } from './components/hover_actions/utils';

// Clipboard
export { Clipboard } from './components/clipboard/clipboard';
export { WithCopyToClipboard } from './components/clipboard/with_copy_to_clipboard';

// Tooltip
export { TooltipWithKeyboardShortcut } from './components/tooltip_with_keyboard_shortcut';
export type { TooltipWithKeyboardShortcutProps } from './components/tooltip_with_keyboard_shortcut';

// Shared hooks / helpers consumed by the add-to-timeline button (still owned by the plugin for now)
export { useAppToasts } from './hooks/use_app_toasts';
export type { UseAppToasts } from './hooks/use_app_toasts';
export {
  ADD_TO_TIMELINE,
  ADDED_TO_TIMELINE_OR_TEMPLATE_MESSAGE,
} from './components/hover_actions/actions/translations';
