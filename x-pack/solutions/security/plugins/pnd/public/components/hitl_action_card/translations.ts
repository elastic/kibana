/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const APPROVAL_REQUIRED = i18n.translate('xpack.pnd.hitlActionCard.approvalRequired', {
  defaultMessage: 'Approval required',
});

export const APPROVE = i18n.translate('xpack.pnd.hitlActionCard.approve', {
  defaultMessage: 'Approve',
});

export const BLAST_RADIUS = i18n.translate('xpack.pnd.hitlActionCard.blastRadius', {
  defaultMessage: 'Blast radius',
});

export const BLAST_RADIUS_EMPTY = i18n.translate('xpack.pnd.hitlActionCard.blastRadiusEmpty', {
  defaultMessage:
    'No blast radius is available for this action. It is not correlated to an Attack Discovery, or its alerts are no longer readable.',
});

export const CANCEL = i18n.translate('xpack.pnd.hitlActionCard.cancel', {
  defaultMessage: 'Cancel',
});

export const DECISION_LABEL = i18n.translate('xpack.pnd.hitlActionCard.decisionLabel', {
  defaultMessage: 'Decision',
});

export const DISMISS = i18n.translate('xpack.pnd.hitlActionCard.dismiss', {
  defaultMessage: 'Dismiss',
});

export const ERROR_TITLE = i18n.translate('xpack.pnd.hitlActionCard.errorTitle', {
  defaultMessage: 'The decision was not recorded',
});

export const DESTINATION_IP = i18n.translate('xpack.pnd.hitlActionCard.destinationIp', {
  defaultMessage: 'Destination IP',
});

export const HOST = i18n.translate('xpack.pnd.hitlActionCard.host', {
  defaultMessage: 'Host',
});

export const REASONING_MISSING = i18n.translate('xpack.pnd.hitlActionCard.reasoningMissing', {
  defaultMessage: 'This gate carries no reasoning.',
});

export const REQUIRED_FIELD_ERROR = i18n.translate('xpack.pnd.hitlActionCard.requiredFieldError', {
  defaultMessage: 'This field is required',
});

export const SELECT_PLACEHOLDER = i18n.translate('xpack.pnd.hitlActionCard.selectPlaceholder', {
  defaultMessage: 'Select a value',
});

export const SOURCE_IP = i18n.translate('xpack.pnd.hitlActionCard.sourceIp', {
  defaultMessage: 'Source IP',
});

export const SUBMIT = i18n.translate('xpack.pnd.hitlActionCard.submit', {
  defaultMessage: 'Submit',
});

export const RATIONALE_HELP = i18n.translate('xpack.pnd.hitlActionCard.rationaleHelp', {
  defaultMessage: 'Recorded with the decision, and shown in the approval history.',
});

export const RATIONALE_LABEL = i18n.translate('xpack.pnd.hitlActionCard.rationaleLabel', {
  defaultMessage: 'Rationale',
});

export const USER = i18n.translate('xpack.pnd.hitlActionCard.user', {
  defaultMessage: 'User',
});

/** The card names what it is asking the analyst to sign off on. */
export const approvalRequiredAriaLabel = (title: string): string =>
  i18n.translate('xpack.pnd.hitlActionCard.approvalRequiredAriaLabel', {
    defaultMessage: 'Approval required: {title}',
    values: { title },
  });

/** How many of the discovery's constituent alerts carry this entity. */
export const entityAlertCount = (count: number): string =>
  i18n.translate('xpack.pnd.hitlActionCard.entityAlertCount', {
    defaultMessage: '{count, plural, one {# alert} other {# alerts}}',
    values: { count },
  });

/** The entities left after the visible lines, when a blast radius is long. */
export const moreEntities = (count: number): string =>
  i18n.translate('xpack.pnd.hitlActionCard.moreEntities', {
    defaultMessage: '{count, plural, one {# more entity} other {# more entities}}',
    values: { count },
  });
