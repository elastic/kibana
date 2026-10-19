/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderDescription, AppHeaderTab } from '@kbn/app-header';
import { useRouteMatch } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { SYNTHETICS_SETTINGS_ROUTE } from '../../../../../common/constants';
import { useSyntheticsSettingsContext } from '../../contexts';
import { START_ADDING_LOCATIONS_DESCRIPTION } from './private_locations/empty_locations';

export type SettingsTabId =
  | 'data-retention'
  | 'params'
  | 'alerting'
  | 'private-locations'
  | 'api-keys'
  | 'advanced'
  | 'remote-clusters';

export const SETTINGS_PAGE_TITLE = i18n.translate(
  'xpack.synthetics.settingsRoute.pageHeaderTitle',
  {
    defaultMessage: 'Settings',
  }
);

const PRIVATE_LOCATIONS_DOCS_URL =
  'https://www.elastic.co/guide/en/observability/current/synthetics-private-location.html';

const PARAMS_DOCS_URL =
  'https://www.elastic.co/guide/en/observability/current/synthetics-params-secrets.html';

const PARAMS_PAGE_DESCRIPTION = i18n.translate('xpack.synthetics.params.description', {
  defaultMessage:
    'Define variables and parameters that you can use in the configuration of browser and lightweight monitors, such as credentials or URLs.',
});

export const getSettingsAppHeaderDescription = (
  tabId: SettingsTabId | undefined
): AppHeaderDescription | undefined => {
  if (tabId === 'private-locations') {
    return {
      text: START_ADDING_LOCATIONS_DESCRIPTION,
      learnMoreUrl: PRIVATE_LOCATIONS_DOCS_URL,
    };
  }

  if (tabId === 'params') {
    return {
      text: PARAMS_PAGE_DESCRIPTION,
      learnMoreUrl: PARAMS_DOCS_URL,
    };
  }

  return undefined;
};

export const useSettingsAppHeaderTabs = (syntheticsPath: string): AppHeaderTab[] => {
  const match = useRouteMatch<{ tabId: SettingsTabId }>(SYNTHETICS_SETTINGS_ROUTE);
  const { isServerless, isCCSEnabled } = useSyntheticsSettingsContext();
  const tabId = match?.params.tabId;

  const replaceTab = (newTabId: SettingsTabId) => {
    return `${syntheticsPath}${SYNTHETICS_SETTINGS_ROUTE.replace(':tabId', newTabId)}`;
  };

  const tabs: AppHeaderTab[] = [
    {
      id: 'alerting',
      label: i18n.translate('xpack.synthetics.settingsTabs.alerting', {
        defaultMessage: 'Alerting',
      }),
      isSelected: tabId === 'alerting',
      href: replaceTab('alerting'),
    },
    {
      id: 'private-locations',
      label: i18n.translate('xpack.synthetics.settingsTabs.privateLocations', {
        defaultMessage: 'Private Locations',
      }),
      isSelected: tabId === 'private-locations',
      href: replaceTab('private-locations'),
    },
    {
      id: 'params',
      label: i18n.translate('xpack.synthetics.settingsTabs.params', {
        defaultMessage: 'Global Parameters',
      }),
      isSelected: tabId === 'params' || !tabId,
      href: replaceTab('params'),
    },
    {
      id: 'data-retention',
      label: i18n.translate('xpack.synthetics.settingsTabs.dataRetention', {
        defaultMessage: 'Data Retention',
      }),
      isSelected: tabId === 'data-retention',
      href: replaceTab('data-retention'),
    },
    {
      id: 'api-keys',
      label: i18n.translate('xpack.synthetics.settingsTabs.apiKeys', {
        defaultMessage: 'Project API Keys',
      }),
      isSelected: tabId === 'api-keys',
      href: replaceTab('api-keys'),
    },
    {
      id: 'advanced',
      label: i18n.translate('xpack.synthetics.settingsTabs.advanced', {
        defaultMessage: 'Advanced',
      }),
      isSelected: tabId === 'advanced',
      href: replaceTab('advanced'),
    },
  ];

  if (!isServerless && isCCSEnabled) {
    tabs.push({
      id: 'remote-clusters',
      label: i18n.translate('xpack.synthetics.settingsTabs.remoteClusters', {
        defaultMessage: 'Remote Clusters',
      }),
      isSelected: tabId === 'remote-clusters',
      href: replaceTab('remote-clusters'),
    });
  }

  return tabs;
};
