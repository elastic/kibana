/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EXTERNAL_ALERTS_UNIT = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.eventsTab.externalAlertsUnit', {
    values: { totalCount },
    defaultMessage: `external {totalCount, plural, =1 {alert} other {alerts}}`,
  });

export const EVENTS_UNIT = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.hosts.navigaton.eventsUnit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {event} other {events}}`,
  });

export const SHOWING = i18n.translate('xpack.securitySolution.eventsTab.showing', {
  defaultMessage: 'Showing',
});

export const ALERTS_GRAPH_TITLE = i18n.translate(
  'xpack.securitySolution.eventsTab.alertsGraphTitle',
  {
    defaultMessage: 'External alert trend',
  }
);

export const ERROR_FETCHING_ALERTS_DATA = i18n.translate(
  'xpack.securitySolution.eventsTab.errorFetchingAlertsData',
  {
    defaultMessage: 'Failed to query alerts data',
  }
);

export const ERROR_FETCHING_EVENTS_DATA = i18n.translate(
  'xpack.securitySolution.eventsTab.errorFetchingEventsData',
  {
    defaultMessage: 'Failed to query events data',
  }
);

export const SHOW_EXTERNAL_ALERTS = i18n.translate(
  'xpack.securitySolution.eventsTab.showExternalAlerts',
  {
    defaultMessage: 'Show only external alerts',
  }
);

export const EVENTS_GRAPH_TITLE = i18n.translate('xpack.securitySolution.eventsGraphTitle', {
  defaultMessage: 'Events',
});

export const EVENTS_GRAPH_NO_BREAKDOWN_TITLE = i18n.translate(
  'xpack.securitySolution.eventsHistogram.selectOptions.noBreakDownLabel',
  {
    defaultMessage: 'No breakdown',
  }
);
