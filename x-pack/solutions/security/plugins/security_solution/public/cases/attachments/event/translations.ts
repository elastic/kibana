/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EVENT_COMMENT_LABEL_TITLE = i18n.translate(
  'xpack.securitySolution.cases.eventCommentLabelTitle',
  {
    defaultMessage: 'added an event',
  }
);

export const MULTIPLE_EVENTS_COMMENT_LABEL_TITLE = (totalEvents: number) =>
  i18n.translate('xpack.securitySolution.cases.generatedEventCommentLabelTitle', {
    values: { totalEvents },
    defaultMessage: 'added {totalEvents} events',
  });

export const SHOW_EVENT_TOOLTIP = i18n.translate('xpack.securitySolution.cases.showEventTooltip', {
  defaultMessage: 'Show event details',
});

export const DELETE_EVENTS_SUCCESS_TITLE = (totalEvents: number) =>
  i18n.translate(
    'xpack.securitySolution.cases.userActions.attachments.events.successToasterTitle',
    {
      defaultMessage:
        'Deleted {totalEvents, plural, =1 {one} other {{totalEvents}}} {totalEvents, plural, =1 {event} other {events}}',
      values: { totalEvents },
    }
  );

export const REMOVE_EVENTS = (totalEvents: number): string =>
  i18n.translate('xpack.securitySolution.cases.caseView.events.remove', {
    values: { totalEvents },
    defaultMessage: 'Remove {totalEvents, plural, =1 {event} other {events}}',
  });

export const REMOVE = i18n.translate('xpack.securitySolution.cases.caseView.events.removeButton', {
  defaultMessage: 'Remove',
});

export const ADDED_EVENT = i18n.translate('xpack.securitySolution.cases.attachments.event.added', {
  defaultMessage: 'added an event',
});

export const REMOVED_EVENT = i18n.translate(
  'xpack.securitySolution.cases.attachments.event.removed',
  {
    defaultMessage: 'removed an event',
  }
);
