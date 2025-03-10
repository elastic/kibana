/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SHOWING = i18n.translate('xpack.securitySolution.eventsViewer.showingLabel', {
  defaultMessage: 'Showing',
});

export const EVENTS = i18n.translate('xpack.securitySolution.eventsViewer.eventsLabel', {
  defaultMessage: 'Events',
});

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.eventsViewer.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {event} other {events}}`,
  });

export const ACTIONS = i18n.translate('xpack.securitySolution.eventsViewer.actionsColumnLabel', {
  defaultMessage: 'Actions',
});

export const ERROR_TIMELINE_EVENTS = i18n.translate(
  'xpack.securitySolution.eventsViewer.timelineEvents.errorSearchDescription',
  {
    defaultMessage: `An error has occurred on timeline events search`,
  }
);
