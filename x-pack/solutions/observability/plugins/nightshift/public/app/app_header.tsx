/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderBack, AppHeaderTab } from '@kbn/app-header';
import type { AppMenuConfig, AppMenuRunActionParams } from '@kbn/core-chrome-app-menu-components';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../common/ebt_constants';

const nightshiftPageTitle = i18n.translate('xpack.nightshift.pageTitle', {
  defaultMessage: 'Nightshift',
});

const investigationsPageTitle = i18n.translate('xpack.nightshift.investigationsPageTitle', {
  defaultMessage: 'Investigations',
});

const settingsLabel = i18n.translate('xpack.nightshift.settingsLinkLabel', {
  defaultMessage: 'Settings',
});

const managementLabel = i18n.translate('xpack.nightshift.managementLinkLabel', {
  defaultMessage: 'Management',
});

const sandboxSecretsLabel = i18n.translate('xpack.nightshift.sandboxSecretsLinkLabel', {
  defaultMessage: 'Sandbox secrets',
});

const investigationsLabel = i18n.translate('xpack.nightshift.investigationsButtonLabel', {
  defaultMessage: 'Investigations',
});

export const nightshiftTabs: AppHeaderTab[] = [
  {
    id: 'allInvestigations',
    'data-test-subj': 'nightshiftTabAllInvestigations',
    label: i18n.translate('xpack.nightshift.allInvestigationsTab', {
      defaultMessage: 'All investigations',
    }),
  },
  {
    id: 'automations',
    'data-test-subj': 'nightshiftTabAutomations',
    label: i18n.translate('xpack.nightshift.automations.tabLabel', {
      defaultMessage: 'Automations',
    }),
  },
];

const settingsEbtProps = getEbtProps({
  action: NIGHTSHIFT_EBT_ACTIONS.VIEW_SETTINGS,
  element: NIGHTSHIFT_EBT_ELEMENTS.PAGE_HEADER,
});

const managementEbtProps = getEbtProps({
  action: NIGHTSHIFT_EBT_ACTIONS.VIEW_MANAGEMENT,
  element: NIGHTSHIFT_EBT_ELEMENTS.PAGE_HEADER,
});

// App menu items do not expose arbitrary data attributes. Their run callback fires before the
// delegated document click handler, so the EBT attributes are present when that handler inspects it.
const applyEbtProps = (
  ebtProps: typeof settingsEbtProps,
  params?: AppMenuRunActionParams
): void => {
  if (!params) {
    return;
  }

  Object.entries(ebtProps).forEach(([attribute, value]) => {
    params.triggerElement.setAttribute(attribute, value);
  });
};

export function NightshiftAppHeader({
  onManagementClick,
  managementHref,
  onSettingsClick,
  settingsHref,
  onSandboxSecretsClick,
  onAutomationsClick,
  investigationsHref,
  tabs,
  back,
}: {
  onManagementClick: () => void | Promise<void>;
  managementHref: string;
  onSettingsClick?: () => void | Promise<void>;
  settingsHref?: string;
  /** Shows the sandbox secrets menu item when set. */
  onSandboxSecretsClick?: () => void;
  onAutomationsClick?: () => void | Promise<void>;
  investigationsHref?: string;
  tabs?: AppHeaderTab[];
  back?: AppHeaderBack;
}): React.ReactElement {
  const isInvestigationsPage = Boolean(tabs?.length);
  const menu = useMemo<AppMenuConfig>(
    () => ({
      items: [
        ...(onAutomationsClick && investigationsHref && !isInvestigationsPage
          ? [
              {
                id: 'nightshiftInvestigations',
                label: investigationsLabel,
                iconType: 'reporter',
                href: investigationsHref,
                run: () => void onAutomationsClick(),
                testId: 'nightshiftInvestigationsPrimaryAction',
              },
            ]
          : []),
        ...(onSandboxSecretsClick
          ? [
              {
                id: 'nightshiftSandboxSecrets',
                label: sandboxSecretsLabel,
                iconType: 'lock',
                run: () => onSandboxSecretsClick(),
                testId: 'nightshiftSandboxSecretsLink',
                overflow: true,
              },
            ]
          : []),
        {
          id: 'nightshiftManagement',
          label: managementLabel,
          iconType: 'managementApp',
          href: managementHref,
          run: (params) => {
            applyEbtProps(managementEbtProps, params);
            void onManagementClick();
          },
          testId: 'nightshiftManagementLink',
          overflow: true,
        },
        ...(onSettingsClick && settingsHref
          ? [
              {
                id: 'nightshiftSettings',
                label: settingsLabel,
                iconType: 'gear' as const,
                href: settingsHref,
                run: (params?: AppMenuRunActionParams) => {
                  applyEbtProps(settingsEbtProps, params);
                  void onSettingsClick();
                },
                testId: 'nightshiftSettingsLink',
                overflow: !isInvestigationsPage,
              },
            ]
          : []),
      ],
    }),
    [
      investigationsHref,
      isInvestigationsPage,
      managementHref,
      onAutomationsClick,
      onManagementClick,
      onSandboxSecretsClick,
      onSettingsClick,
      settingsHref,
    ]
  );

  return (
    <AppHeader
      title={isInvestigationsPage ? investigationsPageTitle : nightshiftPageTitle}
      back={back}
      tabs={tabs}
      menu={menu}
      spacing="standard"
    />
  );
}
