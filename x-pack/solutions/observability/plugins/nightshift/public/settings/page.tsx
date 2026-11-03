/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageTemplate } from '@elastic/eui';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { Redirect, useHistory, useLocation, useParams } from 'react-router-dom';
import { NightshiftAppHeader } from '../components/app_header';
import { useKibana } from '../hooks/use_kibana';
import { DetectionsSettingsTab } from './detections_settings_tab';
import { GeneralSettingsTab } from './general_settings_tab';
import { useAppsEnabled } from './hooks/use_apps_enabled';
import { InvestigationsSettingsTab } from './investigations_settings_tab';
import {
  getDefaultSettingsTab,
  getVisibleSettingsTabs,
  isSettingsTabId,
  type SettingsTabId,
} from './settings_tabs';

const nightshiftLabel = i18n.translate('xpack.nightshift.settingsPage.backToNightshiftLabel', {
  defaultMessage: 'Nightshift',
});

const detectionsLabel = i18n.translate('xpack.nightshift.settingsPage.backToDetectionsLabel', {
  defaultMessage: 'Detections',
});

const settingsTabLabels: Record<SettingsTabId, string> = {
  general: i18n.translate('xpack.nightshift.settingsPage.tabs.general', {
    defaultMessage: 'General',
  }),
  investigations: i18n.translate('xpack.nightshift.settingsPage.tabs.investigations', {
    defaultMessage: 'Investigations',
  }),
  detections: i18n.translate('xpack.nightshift.settingsPage.tabs.detections', {
    defaultMessage: 'Detections',
  }),
};

interface SettingsPageHeaderProps {
  onCustomContextClick?: () => void;
}

export function SettingsPage({ headerProps }: { headerProps: SettingsPageHeaderProps }) {
  const { onCustomContextClick } = headerProps;
  const { application } = useKibana().services;
  const { tab } = useParams<{ tab?: string }>();
  const history = useHistory();
  const { search } = useLocation();
  const isAppsEnabled = useAppsEnabled();
  const { canManage } = getNightshiftCapabilities(application.capabilities.nightshift);

  if (isAppsEnabled === undefined) {
    return null;
  }

  const visibleTabs = getVisibleSettingsTabs({ isAppsEnabled });

  if (!tab || !isSettingsTabId(tab) || !visibleTabs.includes(tab)) {
    return <Redirect to={`/settings/${getDefaultSettingsTab(visibleTabs)}`} />;
  }

  const tabs = visibleTabs.map((id) => ({
    id,
    label: settingsTabLabels[id],
    isSelected: tab === id,
    href: application.getUrlForApp(NIGHTSHIFT_APP_ID, { path: `/settings/${id}` }),
    onClick: (event?: React.MouseEvent) => {
      event?.preventDefault();
      history.push(`/settings/${id}`);
    },
    'data-test-subj': `nightshiftSettingsTab-${id}`,
  }));
  const backToDetections =
    tab === 'detections' && new URLSearchParams(search).get('origin') === 'detections';

  return (
    <>
      <NightshiftAppHeader
        page="settings"
        back={{
          href: application.getUrlForApp(NIGHTSHIFT_APP_ID, {
            path: backToDetections ? '/detections/events' : '/',
          }),
          label: backToDetections ? detectionsLabel : nightshiftLabel,
        }}
        tabs={tabs}
      />
      <EuiPageTemplate.Section component="div" restrictWidth={false}>
        {tab === 'general' && <GeneralSettingsTab />}
        {tab === 'investigations' && (
          <InvestigationsSettingsTab
            onCustomContextClick={onCustomContextClick}
            canEditCustomContext={canManage}
          />
        )}
        {tab === 'detections' && <DetectionsSettingsTab />}
      </EuiPageTemplate.Section>
    </>
  );
}
