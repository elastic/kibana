/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const OPEN_SESSION_VIEW = i18n.translate(
  'xpack.securitySolution.timeline.body.openSessionViewLabel',
  {
    defaultMessage: 'Open Session View',
  }
);

export const VIEW_DETAILS = i18n.translate(
  'xpack.securitySolution.hoverActions.viewDetailsAriaLabel',
  {
    defaultMessage: 'View details',
  }
);

export const VIEW_DETAILS_FOR_ROW = ({
  ariaRowindex,
  columnValues,
}: {
  ariaRowindex: number;
  columnValues: string;
}) =>
  i18n.translate('xpack.securitySolution.hoverActions.viewDetailsForRowAriaLabel', {
    values: { ariaRowindex, columnValues },
    defaultMessage:
      'View details for the alert or event in row {ariaRowindex}, with columns {columnValues}',
  });

export const ACTION_INVESTIGATE_IN_RESOLVER = i18n.translate(
  'xpack.securitySolution.hoverActions.investigateInResolverTooltip',
  {
    defaultMessage: 'Analyze event',
  }
);

export const ACTION_INVESTIGATE_IN_RESOLVER_FOR_ROW = ({
  ariaRowindex,
  columnValues,
}: {
  ariaRowindex: number;
  columnValues: string;
}) =>
  i18n.translate('xpack.securitySolution.hoverActions.investigateInResolverForRowAriaLabel', {
    values: { ariaRowindex, columnValues },
    defaultMessage: 'Analyze the alert or event in row {ariaRowindex}, with columns {columnValues}',
  });

export const SEND_ALERT_TO_TIMELINE_FOR_ROW = ({
  ariaRowindex,
  columnValues,
}: {
  ariaRowindex: number;
  columnValues: string;
}) =>
  i18n.translate('xpack.securitySolution.hoverActions.sendAlertToTimelineForRowAriaLabel', {
    values: { ariaRowindex, columnValues },
    defaultMessage: 'Send the alert in row {ariaRowindex} to timeline, with columns {columnValues}',
  });

export const ADD_NOTES_FOR_ROW = ({
  ariaRowindex,
  columnValues,
}: {
  ariaRowindex: number;
  columnValues: string;
}) =>
  i18n.translate('xpack.securitySolution.hoverActions.addNotesForRowAriaLabel', {
    values: { ariaRowindex, columnValues },
    defaultMessage:
      'Add notes for the event in row {ariaRowindex} to timeline, with columns {columnValues}',
  });

export const MORE_ACTIONS_FOR_ROW = ({
  ariaRowindex,
  columnValues,
}: {
  ariaRowindex: number;
  columnValues: string;
}) =>
  i18n.translate('xpack.securitySolution.hoverActions.moreActionsForRowAriaLabel', {
    values: { ariaRowindex, columnValues },
    defaultMessage:
      'Select more actions for the alert or event in row {ariaRowindex}, with columns {columnValues}',
  });

export const PIN_EVENT_FOR_ROW = ({
  ariaRowindex,
  columnValues,
  isPinned,
}: {
  ariaRowindex: number;
  columnValues: string;
  isPinned: boolean;
}) =>
  i18n.translate('xpack.securitySolution.hoverActions.pinEventForRowAriaLabel', {
    defaultMessage:
      '{isPinned, select, true {Unpin} other {Pin} } the event in row {ariaRowindex} to timeline, with columns {columnValues}',
    values: { ariaRowindex, columnValues, isPinned },
  });

export const UNPINNED = (isAlert: boolean) =>
  i18n.translate('xpack.securitySolution.timeline.body.pinning.pinTooltip', {
    values: { isAlert },
    defaultMessage: 'Pin {isAlert, select, true{alert} other{event}}',
  });

export const PINNED = (isAlert: boolean) =>
  i18n.translate('xpack.securitySolution.timeline.body.pinning.unpinTooltip', {
    values: { isAlert },
    defaultMessage: 'Unpin {isAlert, select, true{alert} other{event}}',
  });

export const DISABLE_PIN = (isAlert: boolean) =>
  i18n.translate('xpack.securitySolution.timeline.body.pinning.disablePinnnedTooltip', {
    values: { isAlert },
    defaultMessage:
      'This {isAlert, select, true{alert} other{event}} may not be pinned while editing a template timeline',
  });

export const PINNED_WITH_NOTES = (isAlert: boolean) =>
  i18n.translate('xpack.securitySolution.timeline.body.pinning.pinnnedWithNotesTooltip', {
    values: { isAlert },
    defaultMessage:
      'This {isAlert, select, true{alert} other{event}} cannot be unpinned because it has notes in Timeline',
  });
