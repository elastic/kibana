/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { i18n as i18nFormatter } from '@kbn/i18n';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { getIntegratedAppAvailability } from '../lib/adapters/framework/capabilities_adapter';
import { DEFAULT_TIMEPICKER_QUICK_RANGES, INTEGRATED_SOLUTIONS } from '../../../common/constants';
import type { ExperimentalFeatures } from '../../../common/config';
import type { UptimeAppProps } from './uptime_app';
import { UptimeApp } from './uptime_app';
import type { ClientPluginsSetup, ClientPluginsStart } from '../../plugin';

export function renderApp(
  core: CoreStart,
  plugins: ClientPluginsSetup,
  startPlugins: ClientPluginsStart,
  appMountParameters: AppMountParameters,
  isDev: boolean,
  experimentalFeatures: ExperimentalFeatures
) {
  const {
    application: { capabilities },
    chrome: { setBadge, setHelpExtension },
    docLinks,
    http: { basePath },
    i18n,
    theme,
  } = core;

  const { apm, infrastructure, logs } = getIntegratedAppAvailability(
    capabilities,
    INTEGRATED_SOLUTIONS
  );

  const canSave = (capabilities.uptime.save ?? false) as boolean;
  const darkMode = theme.getTheme().darkMode;

  const props: UptimeAppProps = {
    isDev,
    plugins,
    canSave,
    core,
    i18n,
    startPlugins,
    basePath: basePath.get(),
    darkMode,
    commonlyUsedRanges: core.uiSettings.get(DEFAULT_TIMEPICKER_QUICK_RANGES),
    isApmAvailable: apm,
    isInfraAvailable: infrastructure,
    isLogsAvailable: logs,
    renderGlobalHelpControls: () =>
      setHelpExtension({
        appName: i18nFormatter.translate('xpack.uptime.legacyHeader.appName', {
          defaultMessage: 'Uptime',
        }),
        links: [
          {
            linkType: 'documentation',
            href: `${docLinks.links.observability.monitorUptime}`,
          },
        ],
      }),
    setBadge,
    appMountParameters,
    setBreadcrumbs: core.chrome.setBreadcrumbs,
  };

  ReactDOM.render(<UptimeApp {...props} />, appMountParameters.element);

  return () => {
    startPlugins.data.search.session.clear();
    ReactDOM.unmountComponentAtNode(appMountParameters.element);
  };
}
