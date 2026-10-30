/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { AppHeaderBack, AppHeaderMenu, AppHeaderTab } from '@kbn/app-header';
import type { AppMenuPrimaryActionItem } from '@kbn/app-menu';
import { SecurityAppHeader } from '../../../common/components/app_header';
import * as i18n from './translations';

interface RuleFormAppHeaderProps {
  title: string;
  back: AppHeaderBack;
  isRulePreviewVisible: boolean;
  onToggleRulePreview: () => void;
  addToChatAction?: AppMenuPrimaryActionItem;
  tabs?: AppHeaderTab[];
}

/** App header shared by the rule creation and rule editing pages. */
const RuleFormAppHeaderComponent: React.FC<RuleFormAppHeaderProps> = ({
  title,
  back,
  isRulePreviewVisible,
  onToggleRulePreview,
  addToChatAction,
  tabs,
}) => {
  const menu = useMemo<AppHeaderMenu>(
    () => ({
      items: [
        {
          id: 'rulePreview',
          label: i18n.RULE_PREVIEW_TITLE,
          iconType: 'chartBarVerticalStack',
          isSelected: isRulePreviewVisible,
          run: onToggleRulePreview,
          testId: 'preview-container',
        },
      ],
      primaryActionItem: addToChatAction,
    }),
    [addToChatAction, isRulePreviewVisible, onToggleRulePreview]
  );

  return (
    <SecurityAppHeader title={title} back={back} menu={menu} tabs={tabs} spacing="largeBleed" />
  );
};

export const RuleFormAppHeader = memo(RuleFormAppHeaderComponent);
