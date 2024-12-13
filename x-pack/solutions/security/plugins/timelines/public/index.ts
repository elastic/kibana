/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Careful of exporting anything from this file as any file(s) you export here will cause your page bundle size to increase.
// If you're using functions/types/etc... internally or within integration tests it's best to import directly from their paths
// than expose the functions/types/etc... here. You should _only_ expose functions/types/etc... that need to be shared with other plugins here.

// When you do have to add things here you might want to consider creating a package to share with
// other plugins instead as packages are easier to break down and you do not have to carry the cost of extra plugin weight on
// first download since the other plugins/areas of your code can directly pull from the package in their async imports.
// See: https://docs.elastic.dev/kibana-dev-docs/key-concepts/platform-intro#public-plugin-api

import type { CoreStart } from '@kbn/core/public';

import { TimelinesPlugin } from './plugin';

export type { TimelinesUIStart } from './types';
export type { OnColumnFocused } from '../common/utils/accessibility';

export {
  ARIA_COLINDEX_ATTRIBUTE,
  ARIA_ROWINDEX_ATTRIBUTE,
  DATA_COLINDEX_ATTRIBUTE,
  DATA_ROWINDEX_ATTRIBUTE,
  FIRST_ARIA_INDEX,
  arrayIndexToAriaIndex,
  elementOrChildrenHasFocus,
  isArrowDownOrArrowUp,
  isArrowUp,
  isEscape,
  isTab,
  focusColumn,
  getFocusedAriaColindexCell,
  getFocusedDataColindexCell,
  getNotesContainerClassName,
  getRowRendererClassName,
  getTableSkipFocus,
  handleSkipFocus,
  onKeyDownFocusHandler,
  stopPropagationAndPreventDefault,
} from '../common/utils/accessibility';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new TimelinesPlugin();
}

export type { AddToTimelineButtonProps } from './components/hover_actions/actions/add_to_timeline';

export type TimelinesStartServices = Pick<CoreStart, 'analytics' | 'i18n' | 'theme'>;
