/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiIcon,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ChromeHeaderAppActionsConfig } from '@kbn/core-chrome-browser';

const noop = () => {};

const overflowKeyPadCss = css`
  justify-content: center;
  padding-block: 8px;
`;

const overflowKeyPadItemCss = css`
  width: 72px;
  height: 64px;
  min-width: 72px;
  min-height: 48px;
`;

export interface RulesHeaderAppActionsCallbacks {
  onAddElasticRules: () => void;
  onManageValueLists: () => void;
  onImportRules: () => void;
  onSettings: () => void;
  onCreateRule: () => void;
}

const ADD_ELASTIC_RULES = i18n.translate(
  'xpack.securitySolution.rules.headerAppActions.addElasticRules',
  { defaultMessage: 'Add Elastic rules' }
);

const MANAGE_VALUE_LISTS = i18n.translate(
  'xpack.securitySolution.rules.headerAppActions.manageValueLists',
  { defaultMessage: 'Manage value lists' }
);

const IMPORT_RULES = i18n.translate(
  'xpack.securitySolution.rules.headerAppActions.importRules',
  { defaultMessage: 'Import rules' }
);

const SETTINGS = i18n.translate(
  'xpack.securitySolution.rules.headerAppActions.settings',
  { defaultMessage: 'Settings' }
);

const RulesOverflowKeyPadSection: React.FC<{ onCreateRule: () => void }> = ({ onCreateRule }) => (
  <>
    <EuiKeyPadMenu css={overflowKeyPadCss}>
      <EuiKeyPadMenuItem
        label={i18n.translate('core.ui.chrome.headerGlobalNav.newLabel', { defaultMessage: 'New' })}
        onClick={onCreateRule}
        css={overflowKeyPadItemCss}
        data-test-subj="headerGlobalNav-overflowNew"
      >
        <EuiIcon type="plusInCircle" size="m" />
      </EuiKeyPadMenuItem>
      <EuiKeyPadMenuItem
        label={i18n.translate('core.ui.chrome.headerGlobalNav.favoriteLabel', {
          defaultMessage: 'Favorite',
        })}
        onClick={noop}
        css={overflowKeyPadItemCss}
        data-test-subj="headerGlobalNav-overflowFavorite"
      >
        <EuiIcon type="star" size="m" />
      </EuiKeyPadMenuItem>
      <EuiKeyPadMenuItem
        label={i18n.translate('core.ui.chrome.headerGlobalNav.shareLabel', {
          defaultMessage: 'Share',
        })}
        onClick={noop}
        css={overflowKeyPadItemCss}
        data-test-subj="headerGlobalNav-overflowShare"
      >
        <EuiIcon type="share" size="m" />
      </EuiKeyPadMenuItem>
    </EuiKeyPadMenu>
    <EuiHorizontalRule margin="none" />
  </>
);

/**
 * Header app actions config for the Security > Rules management page.
 * Secondary: plusInCircle add button (Create new rule). Overflow: keypad + Add Elastic rules, Manage value lists, Import rules, Settings.
 * Set when the Rules management page mounts; cleared when navigating away.
 */
export function getRulesHeaderAppActionsConfig(
  callbacks: RulesHeaderAppActionsCallbacks
): ChromeHeaderAppActionsConfig {
  const {
    onAddElasticRules,
    onManageValueLists,
    onImportRules,
    onSettings,
    onCreateRule,
  } = callbacks;

  return {
    overflowPanels: [
      {
        id: 0,
        title: '',
        items: [
          {
            renderItem: () => (
              <RulesOverflowKeyPadSection onCreateRule={onCreateRule} />
            ),
            key: 'keypad',
          },
          { name: ADD_ELASTIC_RULES, icon: 'indexOpen', onClick: onAddElasticRules },
          { name: MANAGE_VALUE_LISTS, icon: 'importAction', onClick: onManageValueLists },
          { name: IMPORT_RULES, icon: 'importAction', onClick: onImportRules },
          { isSeparator: true as const, key: 'sep-settings' },
          { name: SETTINGS, icon: 'gear', onClick: onSettings },
        ],
      },
    ],
    secondaryActions: [
      <EuiButtonIcon
        key="rules-add"
        size="xs"
        color="text"
        iconType="plusInCircle"
        onClick={onCreateRule}
        data-test-subj="headerGlobalNav-appActionsNewButton"
        aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.newAriaLabel', {
          defaultMessage: 'New',
        })}
      />,
    ],
  };
}
