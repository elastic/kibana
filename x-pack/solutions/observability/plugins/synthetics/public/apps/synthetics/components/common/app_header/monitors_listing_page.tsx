/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderBack } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { PLUGIN } from '../../../../../../common/constants/plugin';
import type { ClientPluginsStart } from '../../../../../plugin';
import { getGettingStartedBackLink } from '../../getting_started/getting_started_back_link';
import { getMonitorsAppHeaderTabs } from './get_monitors_app_header_tabs';
import { MONITORS_TITLE, SyntheticsPage } from './synthetics_page';

export function MonitorsListingPage({
  selectedTab,
  toolbar,
  paddingSize = 'l',
  children,
}: {
  selectedTab?: 'overview' | 'management' | 'errors';
  toolbar?: React.ReactNode;
  paddingSize?: 'none' | 's' | 'm' | 'l';
  children: React.ReactNode;
}): React.ReactElement {
  const { search } = useLocation();
  const { application } = useKibana<ClientPluginsStart>().services;
  const syntheticsPath = application.getUrlForApp(PLUGIN.SYNTHETICS_PLUGIN_ID);
  const tabs = selectedTab
    ? getMonitorsAppHeaderTabs(syntheticsPath, selectedTab, search)
    : undefined;
  const backLink = getGettingStartedBackLink({
    search,
    getUrlForApp: (appId, options) => application?.getUrlForApp(appId, options) ?? '',
  });
  const back: AppHeaderBack | undefined = backLink
    ? {
        href: backLink.href,
        label: i18n.translate('xpack.synthetics.gettingStarted.backToSelectionShort', {
          defaultMessage: 'selection',
        }),
      }
    : undefined;

  return (
    <SyntheticsPage
      title={MONITORS_TITLE}
      tabs={tabs}
      back={back}
      toolbar={toolbar}
      menu={{ showCreateMonitor: Boolean(selectedTab) }}
      paddingSize={paddingSize}
    >
      {children}
    </SyntheticsPage>
  );
}
