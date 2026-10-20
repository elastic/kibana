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

const automationsLabel = i18n.translate('xpack.nightshift.automationsLabel', {
  defaultMessage: 'Automations',
});

export const SETTINGS_PAGE_TITLE = i18n.translate('xpack.nightshift.settingsPage.title', {
  defaultMessage: 'Settings',
});

export const KNOWLEDGE_PAGE_TITLE = i18n.translate('xpack.nightshift.knowledgePage.title', {
  defaultMessage: 'Knowledge',
});

export const SOURCES_PAGE_TITLE = i18n.translate('xpack.nightshift.sourcesPage.title', {
  defaultMessage: 'Sources',
});

const sourcesLabel = i18n.translate('xpack.nightshift.sourcesLinkLabel', {
  defaultMessage: 'Sources',
});

const settingsLabel = i18n.translate('xpack.nightshift.settingsLinkLabel', {
  defaultMessage: 'Settings',
});

const knowledgeLabel = i18n.translate('xpack.nightshift.knowledgeLinkLabel', {
  defaultMessage: 'Knowledge',
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

const knowledgeEbtProps = getEbtProps({
  action: NIGHTSHIFT_EBT_ACTIONS.VIEW_KNOWLEDGE,
  element: NIGHTSHIFT_EBT_ELEMENTS.PAGE_HEADER,
});

const managementEbtProps = getEbtProps({
  action: NIGHTSHIFT_EBT_ACTIONS.VIEW_MANAGEMENT,
  element: NIGHTSHIFT_EBT_ELEMENTS.PAGE_HEADER,
});

const sourcesEbtProps = getEbtProps({
  action: NIGHTSHIFT_EBT_ACTIONS.VIEW_SOURCES,
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

export interface NightshiftAppHeaderProps {
  page?: 'landing' | 'automations' | 'knowledge' | 'settings' | 'sources';
  onManagementClick: () => void | Promise<void>;
  managementHref: string;
  onSourcesClick?: () => void | Promise<void>;
  sourcesHref?: string;
  onKnowledgeClick?: () => void | Promise<void>;
  knowledgeHref?: string;
  onSettingsClick?: () => void | Promise<void>;
  settingsHref?: string;
  /** Shows the sandbox secrets menu item when set. */
  onSandboxSecretsClick?: () => void;
  onAutomationsClick?: () => void | Promise<void>;
  automationsHref?: string;
  tabs?: AppHeaderTab[];
  back?: AppHeaderBack;
}

export function NightshiftAppHeader({
  page = 'landing',
  onManagementClick,
  managementHref,
  onSourcesClick,
  sourcesHref,
  onKnowledgeClick,
  knowledgeHref,
  onSettingsClick,
  settingsHref,
  onSandboxSecretsClick,
  onAutomationsClick,
  automationsHref,
  tabs,
  back,
}: NightshiftAppHeaderProps): React.ReactElement {
  const isAutomationsPage = page === 'automations';
  const isKnowledgePage = page === 'knowledge';
  const isSourcesPage = page === 'sources';
  const isSettingsPage = page === 'settings';
  const menu = useMemo<AppMenuConfig>(
    () => ({
      items: [
        ...(onAutomationsClick && automationsHref && !isAutomationsPage
          ? [
              {
                id: 'nightshiftAutomations',
                label: automationsLabel,
                iconType: 'workflow',
                href: automationsHref,
                run: () => void onAutomationsClick(),
                testId: 'nightshiftAutomationsPrimaryAction',
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
        ...(onSourcesClick && sourcesHref && !isSourcesPage
          ? [
              {
                id: 'nightshiftSources',
                label: sourcesLabel,
                iconType: 'database' as const,
                href: sourcesHref,
                run: (params?: AppMenuRunActionParams) => {
                  applyEbtProps(sourcesEbtProps, params);
                  void onSourcesClick();
                },
                testId: 'nightshiftSourcesLink',
                overflow: true,
              },
            ]
          : []),
        ...(onKnowledgeClick && knowledgeHref && !isKnowledgePage
          ? [
              {
                id: 'nightshiftKnowledge',
                label: knowledgeLabel,
                iconType: 'documentation' as const,
                href: knowledgeHref,
                run: (params?: AppMenuRunActionParams) => {
                  applyEbtProps(knowledgeEbtProps, params);
                  void onKnowledgeClick();
                },
                testId: 'nightshiftKnowledgeLink',
                overflow: true,
              },
            ]
          : []),
        ...(onSettingsClick && settingsHref && !isSettingsPage
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
                overflow: !isAutomationsPage,
              },
            ]
          : []),
      ],
    }),
    [
      automationsHref,
      isAutomationsPage,
      isKnowledgePage,
      isSourcesPage,
      isSettingsPage,
      knowledgeHref,
      managementHref,
      onAutomationsClick,
      onKnowledgeClick,
      onManagementClick,
      onSandboxSecretsClick,
      onSourcesClick,
      onSettingsClick,
      settingsHref,
      sourcesHref,
    ]
  );

  return (
    <AppHeader
      title={
        isAutomationsPage
          ? automationsLabel
          : isKnowledgePage
          ? KNOWLEDGE_PAGE_TITLE
          : isSettingsPage
          ? SETTINGS_PAGE_TITLE
          : isSourcesPage
          ? SOURCES_PAGE_TITLE
          : nightshiftPageTitle
      }
      back={back}
      tabs={tabs}
      menu={menu}
      spacing="compact"
    />
  );
}
