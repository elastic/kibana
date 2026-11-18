/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { Redirect } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID } from '../../../common';
import { STORAGE_KEY_PREFIX, TELEMETRY_PREFIX } from '../../home_config';
import { useKibana } from '../../hooks/use_kibana';

export const SearchWebCrawlsPage = () => {
  const {
    services: { application, console: consolePlugin, history, searchNavigation, webCrawler },
  } = useKibana();

  useEffect(() => {
    if (searchNavigation) {
      searchNavigation.breadcrumbs.setSearchBreadCrumbs([
        {
          text: i18n.translate('xpack.searchHomepage.breadcrumbs.home', { defaultMessage: 'Home' }),
          href: application.getUrlForApp(PLUGIN_ID),
        },
        {
          text: i18n.translate('xpack.searchHomepage.breadcrumbs.webCrawls', {
            defaultMessage: 'Web crawls',
          }),
        },
      ]);
    }
  }, [application, searchNavigation]);

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );
  const navigateHome = useCallback(() => application.navigateToApp(PLUGIN_ID), [application]);

  if (!webCrawler) {
    return <Redirect to="/" />;
  }
  const { WebCrawlsPage } = webCrawler;

  return (
    <>
      <WebCrawlsPage
        telemetryPrefix={TELEMETRY_PREFIX}
        storageKeyPrefix={STORAGE_KEY_PREFIX}
        solutionNav={searchNavigation?.useClassicNavigation(history)}
        onNavigateHome={navigateHome}
      />
      {embeddableConsole}
    </>
  );
};
