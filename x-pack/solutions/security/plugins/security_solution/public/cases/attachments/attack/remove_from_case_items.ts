/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import { REMOVE_FROM_CASE_ACTION_ID } from '../../../common/constants/action_ids';
import { REMOVE_FROM_CASE } from '../../../detections/components/alerts_table/translations';

/** Builds the "Remove from case" menu item, or no item when `onRemove` is absent. */
export const getRemoveFromCaseItems = ({
  onRemove,
  closePopover,
}: {
  onRemove?: () => void;
  closePopover?: () => void;
}): EuiContextMenuPanelItemDescriptor[] =>
  onRemove == null
    ? []
    : [
        {
          key: REMOVE_FROM_CASE_ACTION_ID,
          'data-test-subj': REMOVE_FROM_CASE_ACTION_ID,
          name: REMOVE_FROM_CASE,
          onClick: () => {
            closePopover?.();
            onRemove();
          },
        },
      ];
