/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { useKibana } from './use_kibana';

const QUERY_RULES_BREADCRUMB_TEXT = i18n.translate(
  'xpack.searchQueryRules.breadcrumbs.queryRules',
  {
    defaultMessage: 'Query Rules',
  }
);

export const useQueryRulesBreadcrumbs = (rulesetId?: string) => {
  const { searchNavigation, history, cloud } = useKibana().services;
  const isServerless = cloud?.isServerlessEnabled ?? false;

  useEffect(() => {
    if (!isServerless) {
      searchNavigation?.breadcrumbs.setSearchBreadCrumbs([
        {
          text: i18n.translate('xpack.searchQueryRules.breadcrumbs.relevance', {
            defaultMessage: 'Relevance',
          }),
        },
        ...(rulesetId && rulesetId.trim().length > 0
          ? [
              {
                text: QUERY_RULES_BREADCRUMB_TEXT,
                ...reactRouterNavigate(history, '/'),
              },
              {
                text: rulesetId,
              },
            ]
          : [
              {
                text: QUERY_RULES_BREADCRUMB_TEXT,
              },
            ]),
      ]);
    } else {
      if (rulesetId && rulesetId.trim().length > 0) {
        searchNavigation?.breadcrumbs.setSearchBreadCrumbs([
          {
            text: rulesetId,
          },
        ]);
      }
    }

    return () => {
      // Clear breadcrumbs on unmount;
      searchNavigation?.breadcrumbs.clearBreadcrumbs();
    };
  }, [searchNavigation, history, rulesetId, isServerless]);
};
