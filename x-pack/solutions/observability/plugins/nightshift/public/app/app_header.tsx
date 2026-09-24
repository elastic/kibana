/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { AppHeader } from '@kbn/app-header';
import type { AppMenuConfig, AppMenuRunActionParams } from '@kbn/core-chrome-app-menu-components';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../common/ebt_constants';

const nightshiftPageTitle = i18n.translate('xpack.nightshift.pageTitle', {
  defaultMessage: 'Nightshift',
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
}: {
  onManagementClick: () => void | Promise<void>;
  managementHref: string;
  onSettingsClick: () => void | Promise<void>;
  settingsHref: string;
  /** Shows the sandbox secrets menu item when set. */
  onSandboxSecretsClick?: () => void;
}): React.ReactElement {
  const menu = useMemo<AppMenuConfig>(
    () => ({
      items: [
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
        },
        {
          id: 'nightshiftSettings',
          label: settingsLabel,
          iconType: 'gear',
          href: settingsHref,
          run: (params) => {
            applyEbtProps(settingsEbtProps, params);
            void onSettingsClick();
          },
          testId: 'nightshiftSettingsLink',
          overflow: true,
        },
      ],
    }),
    [managementHref, onManagementClick, onSandboxSecretsClick, onSettingsClick, settingsHref]
  );

  return <AppHeader title={nightshiftPageTitle} menu={menu} spacing="compact" />;
}
