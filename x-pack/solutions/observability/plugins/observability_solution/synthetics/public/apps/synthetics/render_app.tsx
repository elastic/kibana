/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { i18n as i18nFormatter } from '@kbn/i18n';
import { AppMountParameters } from '@kbn/core-application-browser';
import { kibanaService } from '../../utils/kibana_service';
import { SyntheticsAppProps } from './contexts';
import { getIntegratedAppAvailability } from './utils/adapters';
import { DEFAULT_TIMEPICKER_QUICK_RANGES, INTEGRATED_SOLUTIONS } from '../../../common/constants';
import { SyntheticsApp } from './synthetics_app';

export const getSyntheticsAppProps = (): SyntheticsAppProps => {
  const { isDev, isServerless, coreStart, startPlugins, setupPlugins, appMountParameters } =
    kibanaService;

  const {
    application: { capabilities },
    chrome: { setBadge, setHelpExtension },
    docLinks,
    http: { basePath },
    i18n,
    theme,
  } = kibanaService.coreStart;

  const { apm, infrastructure, logs } = getIntegratedAppAvailability(
    capabilities,
    INTEGRATED_SOLUTIONS
  );

  const canSave = (capabilities.uptime.save ?? false) as boolean; // TODO: Determine for synthetics
  const darkMode = theme.getTheme().darkMode;

  return {
    isDev,
    setupPlugins,
    canSave,
    coreStart,
    i18n,
    startPlugins,
    basePath: basePath.get(),
    darkMode,
    commonlyUsedRanges: coreStart.uiSettings.get(DEFAULT_TIMEPICKER_QUICK_RANGES),
    isApmAvailable: apm,
    isInfraAvailable: infrastructure,
    isLogsAvailable: logs,
    renderGlobalHelpControls: () =>
      setHelpExtension({
        appName: SYNTHETICS_APP_NAME,
        links: [
          {
            linkType: 'documentation',
            href: `${docLinks.links.observability.monitorUptimeSynthetics}`,
          },
          {
            linkType: 'discuss',
            href: 'https://discuss.elastic.co/c/uptime', // Redirects to https://discuss.elastic.co/c/observability/synthetics/75
          },
        ],
      }),
    setBadge,
    appMountParameters,
    isServerless,
  };
};

export function renderApp(appMountParameters: AppMountParameters) {
  const props: SyntheticsAppProps = getSyntheticsAppProps();

  ReactDOM.render(<SyntheticsApp {...props} />, appMountParameters.element);

  return () => {
    props.startPlugins.data.search.session.clear();
    ReactDOM.unmountComponentAtNode(appMountParameters.element);
  };
}

const SYNTHETICS_APP_NAME = i18nFormatter.translate('xpack.synthetics.header.appName', {
  defaultMessage: 'Synthetics',
});
