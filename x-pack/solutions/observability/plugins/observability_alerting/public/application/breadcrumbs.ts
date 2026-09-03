/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb, CoreStart, ScopedHistory } from '@kbn/core/public';
import { OBSERVABILITY_OVERVIEW_APP_ID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { OBSERVABILITY_ALERTING_INBOX_PATH } from '../constants';

const wrapBreadcrumb = (
  item: ChromeBreadcrumb,
  scopedHistory: ScopedHistory
): ChromeBreadcrumb => ({
  ...item,
  ...(item.href ? reactRouterNavigate(scopedHistory, item.href) : {}),
});

export const createObservabilityAlertingSetBreadcrumbs = ({
  application,
  chrome,
  history,
}: {
  application: CoreStart['application'];
  chrome: CoreStart['chrome'];
  history: ScopedHistory;
}): ((crumbs: ChromeBreadcrumb[], appHistory?: ScopedHistory) => void) => {
  return (crumbs: ChromeBreadcrumb[] = [], appHistory?: ScopedHistory) => {
    const observabilityCrumb: ChromeBreadcrumb = {
      text: i18n.translate('xpack.observabilityAlerting.breadcrumbs.observability', {
        defaultMessage: 'Observability',
      }),
      href: application.getUrlForApp(OBSERVABILITY_OVERVIEW_APP_ID),
    };

    const alertingCrumb: ChromeBreadcrumb = {
      text: i18n.translate('xpack.observabilityAlerting.breadcrumbs.alerting', {
        defaultMessage: 'Alerting',
      }),
      ...reactRouterNavigate(history, OBSERVABILITY_ALERTING_INBOX_PATH),
    };

    const surfaceCrumbs = crumbs
      .slice(1)
      .map((crumb) => wrapBreadcrumb(crumb, appHistory ?? history));

    chrome.setBreadcrumbs([observabilityCrumb, alertingCrumb, ...surfaceCrumbs]);
  };
};
