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
export { getAdditionalScreenReaderOnlyContext } from './components/hover_actions/utils';

// Tooltip
export { PRESS, TooltipWithKeyboardShortcut } from './components/tooltip_with_keyboard_shortcut';
export type { TooltipWithKeyboardShortcutProps } from './components/tooltip_with_keyboard_shortcut';

// Strings consumed by the add-to-timeline button, which still lives in the `timelines` plugin because it
// depends on the plugin's redux store. They move out of this package together with that button once the
// store moves into `security_solution`.
// TODO: drop these once the add-to-timeline UI is relocated (https://github.com/elastic/kibana/issues/302611).
export {
  ADD_TO_TIMELINE,
  ADDED_TO_TIMELINE_OR_TEMPLATE_MESSAGE,
} from './components/hover_actions/actions/translations';
