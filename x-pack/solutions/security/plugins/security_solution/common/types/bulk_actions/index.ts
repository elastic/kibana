/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type { TimelineItem } from '../../search_strategy';

/** Groups a custom bulk action can be placed in within the bulk-action menu. */
export type CustomBulkActionGroupId = 'cases' | 'timeline';

export interface CustomBulkAction {
  key: string;
  label: string;
  icon?: IconType;
  /** Optional group to place this action in within the bulk-action menu. Ungrouped actions render last. */
  groupId?: CustomBulkActionGroupId;
  disableOnQuery?: boolean;
  disabledLabel?: string;
  onClick: (items?: TimelineItem[]) => void;
  ['data-test-subj']?: string;
}

export type CustomBulkActionProp = Omit<CustomBulkAction, 'onClick'> & {
  onClick: (eventIds: string[]) => void;
};
