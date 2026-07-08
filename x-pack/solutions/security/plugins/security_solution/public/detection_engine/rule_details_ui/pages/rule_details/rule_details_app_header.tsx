/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { AppHeader } from '@kbn/app-header';
import type {
  AppHeaderBack,
  AppHeaderBadge,
  AppHeaderMetadataItems,
  AppHeaderTab,
} from '@kbn/app-header';
import type {
  AppMenuConfig,
  AppMenuItemType,
  AppMenuPrimaryActionItem,
} from '@kbn/core-chrome-app-menu-components';
import {
  useRuleActionsMenuItems,
  type UseRuleActionsMenuItemsParams,
} from './rule_actions_overflow/use_rule_actions_menu_items';
import { useMlJobsSettingsMenu } from '../../../rule_management_ui/components/rules_table/use_ml_jobs_settings_menu';

interface RuleDetailsAppHeaderProps {
  title: string;
  back: AppHeaderBack;
  badges: AppHeaderBadge[];
  metadata?: AppHeaderMetadataItems;
  tabs: AppHeaderTab[];
  switchConfig: AppMenuConfig['switch'];
  primaryActionItem?: AppMenuPrimaryActionItem;
  /** Menu items that do not depend on the rule customizations context (edit, refresh). */
  staticItems: AppMenuItemType[];
  actionsParams: UseRuleActionsMenuItemsParams;
}

/**
 * Renders the rule details app header. Kept as a child of `RuleCustomizationsContextProvider` so the
 * rule actions menu (which reads that context via `useRuleActionsMenuItems`) can access it — a hook
 * cannot consume a context provider rendered by its own component.
 */
export const RuleDetailsAppHeader = React.memo<RuleDetailsAppHeaderProps>(
  ({
    title,
    back,
    badges,
    metadata,
    tabs,
    switchConfig,
    primaryActionItem,
    staticItems,
    actionsParams,
  }) => {
    const actionsMenuItems = useRuleActionsMenuItems(actionsParams);
    const { menuItem: mlJobSettingsMenuItem, popover: mlJobSettingsPopover } =
      useMlJobsSettingsMenu();

    const menu = useMemo<AppMenuConfig>(
      () => ({
        switch: switchConfig,
        primaryActionItem,
        items: [
          ...staticItems,
          ...(mlJobSettingsMenuItem ? [mlJobSettingsMenuItem] : []),
          ...actionsMenuItems,
        ],
      }),
      [switchConfig, primaryActionItem, staticItems, mlJobSettingsMenuItem, actionsMenuItems]
    );

    return (
      <>
        <AppHeader
          title={title}
          back={back}
          badges={badges}
          metadata={metadata}
          tabs={tabs}
          menu={menu}
          padding={{ bleed: 'l' }}
        />
        {mlJobSettingsPopover}
      </>
    );
  }
);

RuleDetailsAppHeader.displayName = 'RuleDetailsAppHeader';
