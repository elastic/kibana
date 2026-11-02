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

const detectionsLabel = i18n.translate('xpack.nightshift.detectionsLabel', {
  defaultMessage: 'Detections',
});

const investigateLabel = i18n.translate('xpack.nightshift.header.investigateButtonText', {
  defaultMessage: 'Investigate',
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

export const DETECTION_PAGE_TITLE = i18n.translate('xpack.nightshift.detectionPage.title', {
  defaultMessage: 'Detections',
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

const settingsEbtProps = getEbtProps({
  action: NIGHTSHIFT_EBT_ACTIONS.VIEW_SETTINGS,
  element: NIGHTSHIFT_EBT_ELEMENTS.PAGE_HEADER,
});

const knowledgeEbtProps = getEbtProps({
  action: NIGHTSHIFT_EBT_ACTIONS.VIEW_KNOWLEDGE,
  element: NIGHTSHIFT_EBT_ELEMENTS.PAGE_HEADER,
});

const sourcesEbtProps = getEbtProps({
  action: NIGHTSHIFT_EBT_ACTIONS.VIEW_SOURCES,
  element: NIGHTSHIFT_EBT_ELEMENTS.PAGE_HEADER,
});

const automationsEbtProps = getEbtProps({
  action: NIGHTSHIFT_EBT_ACTIONS.VIEW_AUTOMATIONS,
  element: NIGHTSHIFT_EBT_ELEMENTS.PAGE_HEADER,
});

const detectionsEbtProps = getEbtProps({
  action: NIGHTSHIFT_EBT_ACTIONS.VIEW_DETECTIONS,
  element: NIGHTSHIFT_EBT_ELEMENTS.PAGE_HEADER,
});

const startInvestigationEbtProps = getEbtProps({
  action: NIGHTSHIFT_EBT_ACTIONS.OPEN_START_INVESTIGATION,
  element: NIGHTSHIFT_EBT_ELEMENTS.PAGE_HEADER,
});

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
  page?: 'landing' | 'automations' | 'detection' | 'knowledge' | 'settings' | 'sources';
  onSourcesClick?: () => void | Promise<void>;
  sourcesHref?: string;
  onKnowledgeClick?: () => void | Promise<void>;
  knowledgeHref?: string;
  onSettingsClick?: () => void | Promise<void>;
  settingsHref?: string;
  onAutomationsClick?: () => void | Promise<void>;
  automationsHref?: string;
  onDetectionsClick?: () => void | Promise<void>;
  detectionsHref?: string;
  /** Renders "Investigate" (opens the start investigation modal) as the primary action when set. */
  onStartInvestigationClick?: () => void;
  tabs?: AppHeaderTab[];
  back?: AppHeaderBack;
}

export function NightshiftAppHeader({
  page = 'landing',
  onSourcesClick,
  sourcesHref,
  onKnowledgeClick,
  knowledgeHref,
  onSettingsClick,
  settingsHref,
  onAutomationsClick,
  automationsHref,
  onDetectionsClick,
  detectionsHref,
  onStartInvestigationClick,
  tabs,
  back,
}: NightshiftAppHeaderProps): React.ReactElement {
  const isLandingPage = page === 'landing';
  const isDetectionPage = page === 'detection';
  const menu = useMemo<AppMenuConfig>(
    () => ({
      ...(onStartInvestigationClick && {
        primaryActionItem: {
          id: 'nightshiftStartInvestigation',
          label: investigateLabel,
          iconType: 'inspect',
          testId: 'o11yNightshiftAppStartInvestigationButton',
          run: (params?: AppMenuRunActionParams) => {
            applyEbtProps(startInvestigationEbtProps, params);
            onStartInvestigationClick();
          },
        },
      }),
      items: [
        // Landing: Automations and Detections buttons; Settings in overflow.
        ...(isLandingPage && onAutomationsClick && automationsHref
          ? [
              {
                id: 'nightshiftAutomations',
                label: automationsLabel,
                iconType: 'workflow',
                href: automationsHref,
                run: (params?: AppMenuRunActionParams) => {
                  applyEbtProps(automationsEbtProps, params);
                  void onAutomationsClick();
                },
                testId: 'nightshiftAutomationsPrimaryAction',
              },
            ]
          : []),
        ...(isLandingPage && onDetectionsClick && detectionsHref
          ? [
              {
                id: 'nightshiftDetections',
                label: detectionsLabel,
                iconType: 'visGauge' as const,
                href: detectionsHref,
                run: (params?: AppMenuRunActionParams) => {
                  applyEbtProps(detectionsEbtProps, params);
                  void onDetectionsClick();
                },
                testId: 'nightshiftDetectionsPrimaryAction',
              },
            ]
          : []),
        // Landing and Detections: Knowledge in overflow.
        ...((isLandingPage || isDetectionPage) && onKnowledgeClick && knowledgeHref
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
        ...(isLandingPage && onSettingsClick && settingsHref
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
                overflow: true,
              },
            ]
          : []),

        // Detections: Sources and Settings as buttons.
        ...(isDetectionPage && onSourcesClick && sourcesHref
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
              },
            ]
          : []),
        ...(isDetectionPage && onSettingsClick && settingsHref
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
              },
            ]
          : []),

        // All other pages: no menu items.
      ],
    }),
    [
      automationsHref,
      detectionsHref,
      isDetectionPage,
      isLandingPage,
      knowledgeHref,
      onAutomationsClick,
      onDetectionsClick,
      onKnowledgeClick,
      onSourcesClick,
      onSettingsClick,
      onStartInvestigationClick,
      settingsHref,
      sourcesHref,
    ]
  );

  return (
    <AppHeader
      title={
        page === 'automations'
          ? automationsLabel
          : isDetectionPage
          ? DETECTION_PAGE_TITLE
          : page === 'knowledge'
          ? KNOWLEDGE_PAGE_TITLE
          : page === 'settings'
          ? SETTINGS_PAGE_TITLE
          : page === 'sources'
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
