/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';

import { PLUGIN_PATH } from '../../common';
import { useKibana } from './use_kibana';

/**
 * Sets breadcrumbs for the Playground app.
 *
 * In project chrome (serverless or solution spaces), the navigation tree provides
 * the base path (e.g., "Data management > Relevance > Playground").
 * In classic chrome, we need to set the full path manually.
 */
export const usePlaygroundBreadcrumbs = (playgroundName?: string) => {
  const { http, searchNavigation, chrome } = useKibana().services;
  const chromeStyle = chrome.getChromeStyle();

  useEffect(() => {
    const breadcrumbs: ChromeBreadcrumb[] = [];

    // In classic chrome, we need to provide the full breadcrumb path.
    // In project chrome, the navigation tree handles the base path automatically.
    if (chromeStyle === 'classic') {
      breadcrumbs.push({
        text: i18n.translate('xpack.searchPlayground.breadcrumbs.build', {
          defaultMessage: 'Build',
        }),
      });
      breadcrumbs.push({
        text: i18n.translate('xpack.searchPlayground.breadcrumbs.playground', {
          defaultMessage: 'Playground',
        }),
        href: playgroundName !== undefined ? http.basePath.prepend(PLUGIN_PATH) : undefined,
      });
    }

    if (playgroundName !== undefined) {
      breadcrumbs.push({ text: playgroundName });
    }

    if (breadcrumbs.length > 0) {
      searchNavigation?.breadcrumbs.setSearchBreadCrumbs(breadcrumbs);
    }

    return () => {
      searchNavigation?.breadcrumbs.clearBreadcrumbs();
    };
  }, [http, searchNavigation, chromeStyle, playgroundName]);
};
