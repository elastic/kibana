/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { RuleSnoozeBadge } from '../../../rule_management/components/rule_snooze_badge';
import * as i18n from './translations';

interface UseRuleSnoozeMenuParams {
  /** Rule's SO id (not ruleId). `undefined` while the rule is loading. */
  ruleId: string | undefined;
  isDisabled?: boolean;
}

interface UseRuleSnoozeMenuResult {
  /** The "Set snooze" app menu item, or `undefined` when the rule is not yet available. */
  menuItem: AppMenuItemType | undefined;
  /** The anchored snooze popover element to render alongside the app header. */
  popover: React.ReactNode;
}

/**
 * Provides the "Set snooze" app menu item plus the snooze scheduler popover it opens, anchored to
 * the menu button. Reuses the shared `RuleSnoozeBadge` in its externally-anchored mode.
 */
export const useRuleSnoozeMenu = ({
  ruleId,
  isDisabled,
}: UseRuleSnoozeMenuParams): UseRuleSnoozeMenuResult => {
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const closePopover = useCallback(() => setIsOpen(false), []);

  const menuItem = useMemo<AppMenuItemType | undefined>(() => {
    if (!ruleId) {
      return undefined;
    }

    return {
      id: 'setSnooze',
      label: i18n.SET_SNOOZE,
      iconType: 'bell',
      order: 5,
      testId: 'setSnoozeButton',
      disableButton: isDisabled,
      run: (params) => {
        setAnchorElement(params?.triggerElement ?? null);
        setIsOpen(true);
      },
    };
  }, [ruleId, isDisabled]);

  const popover =
    anchorElement && ruleId ? (
      <RuleSnoozeBadge
        ruleId={ruleId}
        anchorElement={anchorElement}
        isOpen={isOpen}
        onClose={closePopover}
      />
    ) : null;

  return { menuItem, popover };
};
