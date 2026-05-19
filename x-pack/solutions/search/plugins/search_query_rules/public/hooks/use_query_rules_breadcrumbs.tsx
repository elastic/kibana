/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { useKibana } from './use_kibana';

const QUERY_RULES_BREADCRUMB_TEXT = i18n.translate(
  'xpack.searchQueryRules.breadcrumbs.queryRules',
  {
    defaultMessage: 'Query rules',
  }
);

/**
 * Sets breadcrumbs for the Query Rules app.
 *
 * In project chrome (serverless or solution spaces), the navigation tree provides
 * the base path (e.g., "Data management > Relevance > Query rules").
 * In classic chrome, we need to set the full path manually.
 */
export const useQueryRulesBreadcrumbs = (rulesetId?: string) => {
  const { searchNavigation, history, chrome } = useKibana().services;
  const chromeStyle = chrome.getChromeStyle();

  useEffect(() => {
    const breadcrumbs: ChromeBreadcrumb[] = [];

    // In classic chrome, we need to provide the full breadcrumb path.
    // In project chrome, the navigation tree handles the base path automatically.
    if (chromeStyle === 'classic') {
      breadcrumbs.push({
        text: i18n.translate('xpack.searchQueryRules.breadcrumbs.relevance', {
          defaultMessage: 'Relevance',
        }),
      });
      breadcrumbs.push({
        text: QUERY_RULES_BREADCRUMB_TEXT,
        ...(rulesetId && rulesetId.trim().length > 0 ? reactRouterNavigate(history, '/') : {}),
      });
    }

    if (rulesetId && rulesetId.trim().length > 0) {
      breadcrumbs.push({ text: rulesetId });
    }

    if (breadcrumbs.length > 0) {
      searchNavigation?.breadcrumbs.setSearchBreadCrumbs(breadcrumbs);
    }

    return () => {
      searchNavigation?.breadcrumbs.clearBreadcrumbs();
    };
  }, [searchNavigation, history, rulesetId, chromeStyle]);
};
