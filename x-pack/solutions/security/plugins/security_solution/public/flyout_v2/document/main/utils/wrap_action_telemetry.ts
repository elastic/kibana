/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent } from 'react';
import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import type { FlyoutActionType, FlyoutType } from '../../../../common/lib/telemetry';
import type { ReportActionClickedParams } from '../../../shared/hooks/use_flyout_telemetry';

/**
 * Wraps a list of EUI context-menu items so that clicking one reports a `FlyoutActionClicked`
 * telemetry event (via `reportActionClicked`) before invoking the item's original `onClick`, when
 * known. Items are matched by their existing `data-test-subj`; an item whose test-subj isn't in
 * `actionsByTestSubj` (or is a pure separator/render-custom item, with neither `onClick` nor
 * `panel`) passes through unchanged.
 *
 * Some actions (e.g. "Mark as closed", which opens a closing-reason sub-panel) are pure
 * panel-navigation items with a `panel` id and no `onClick` of their own — EUI's `EuiContextMenu`
 * calls an item's `onClick` (if present) and then navigates to its `panel` (if present)
 * independently, so injecting an `onClick` that only reports telemetry is safe here: it doesn't
 * suppress or alter the panel navigation.
 */
export const wrapActionTelemetry = <T extends EuiContextMenuPanelItemDescriptor>(
  items: T[],
  actionsByTestSubj: Partial<Record<string, FlyoutActionType>>,
  reportActionClicked: (params: ReportActionClickedParams) => void,
  flyoutType: FlyoutType = 'document'
): T[] =>
  items.map((item) => {
    const testSubj = item['data-test-subj'];
    const action = typeof testSubj === 'string' ? actionsByTestSubj[testSubj] : undefined;
    const hasPanel = (item as { panel?: unknown }).panel != null;
    if (!action || (!item.onClick && !hasPanel)) {
      return item;
    }

    const onClick = item.onClick as ((event: MouseEvent<Element>) => void) | undefined;

    return {
      ...item,
      onClick: (event: MouseEvent<Element>) => {
        reportActionClicked({ flyoutType, action });
        onClick?.(event);
      },
    };
  });
