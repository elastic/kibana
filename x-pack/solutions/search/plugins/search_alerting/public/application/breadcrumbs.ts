/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb, CoreStart, ScopedHistory } from '@kbn/core/public';
import { SEARCH_HOMEPAGE } from '@kbn/deeplinks-search';
import { i18n } from '@kbn/i18n';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { SEARCH_ALERTING_INBOX_PATH } from '../constants';

const wrapBreadcrumb = (
  item: ChromeBreadcrumb,
  scopedHistory: ScopedHistory
): ChromeBreadcrumb => ({
  ...item,
  ...(item.href ? reactRouterNavigate(scopedHistory, item.href) : {}),
});

export const createSearchAlertingSetBreadcrumbs = ({
  application,
  chrome,
  history,
}: {
  application: CoreStart['application'];
  chrome: CoreStart['chrome'];
  history: ScopedHistory;
}): ((crumbs: ChromeBreadcrumb[], appHistory?: ScopedHistory) => void) => {
  return (crumbs: ChromeBreadcrumb[] = [], appHistory?: ScopedHistory) => {
    const searchCrumb: ChromeBreadcrumb = {
      text: i18n.translate('xpack.searchAlerting.breadcrumbs.search', {
        defaultMessage: 'Search',
      }),
      href: application.getUrlForApp(SEARCH_HOMEPAGE),
    };

    const alertingCrumb: ChromeBreadcrumb = {
      text: i18n.translate('xpack.searchAlerting.breadcrumbs.alerting', {
        defaultMessage: 'Alerting',
      }),
      ...reactRouterNavigate(history, SEARCH_ALERTING_INBOX_PATH),
    };

    const surfaceCrumbs = crumbs
      .slice(1)
      .map((crumb) => wrapBreadcrumb(crumb, appHistory ?? history));

    chrome.setBreadcrumbs([searchCrumb, alertingCrumb, ...surfaceCrumbs]);
  };
};
