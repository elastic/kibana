/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';

import { useKibana } from './use_kibana';

/**
 * Sets breadcrumbs for the Synonyms app.
 *
 * In project chrome (serverless or solution spaces), the navigation tree provides
 * the base path (e.g., "Data management > Relevance > Synonyms").
 * In classic chrome, we need to set the full path manually.
 */
export const useSynonymsBreadcrumbs = (setName?: string) => {
  const { history, searchNavigation, chrome } = useKibana().services;
  const chromeStyle = chrome.getChromeStyle();

  useEffect(() => {
    const breadcrumbs: ChromeBreadcrumb[] = [];

    // In classic chrome, we need to provide the full breadcrumb path.
    // In project chrome, the navigation tree handles the base path automatically.
    if (chromeStyle === 'classic') {
      breadcrumbs.push({
        text: i18n.translate('xpack.searchSynonyms.breadcrumbs.relevance.title', {
          defaultMessage: 'Relevance',
        }),
      });
      breadcrumbs.push({
        text: i18n.translate('xpack.searchSynonyms.breadcrumbs.synonyms.title', {
          defaultMessage: 'Synonyms',
        }),
        ...(setName ? reactRouterNavigate(history, '/') : {}),
      });
    }

    if (setName) {
      breadcrumbs.push({ text: setName });
    }

    if (breadcrumbs.length > 0) {
      searchNavigation?.breadcrumbs.setSearchBreadCrumbs(breadcrumbs);
    }

    return () => {
      searchNavigation?.breadcrumbs.clearBreadcrumbs();
    };
  }, [searchNavigation, history, setName, chromeStyle]);
};
