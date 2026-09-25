/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// ---------------------------------------------------------------------------
// Investigation close modal
// ---------------------------------------------------------------------------

export const CLOSE_INVESTIGATION_TITLE = i18n.translate(
  'xpack.alertzero.closeConfirmation.investigation.title',
  { defaultMessage: 'Close this investigation?' }
);

export const CLOSE_INVESTIGATION_BUTTON = i18n.translate(
  'xpack.alertzero.closeConfirmation.investigation.confirm',
  { defaultMessage: 'Close investigation' }
);

export const CLOSE_INVESTIGATION_PROPOSALS_WARNING = (count: number) =>
  i18n.translate('xpack.alertzero.closeConfirmation.investigation.proposalsWarning', {
    defaultMessage:
      '{count, plural, one {# pending proposal} other {# pending proposals}} will be dismissed.',
    values: { count },
  });

export const DISMISS_REASON_LABEL = i18n.translate(
  'xpack.alertzero.closeConfirmation.investigation.dismissReasonLabel',
  { defaultMessage: 'Reason for dismissing proposals' }
);

export const RATIONALE_LABEL = i18n.translate('xpack.alertzero.closeConfirmation.rationale.label', {
  defaultMessage: 'Notes (optional)',
});

export const RATIONALE_PLACEHOLDER = i18n.translate(
  'xpack.alertzero.closeConfirmation.rationale.placeholder',
  { defaultMessage: 'Why are these proposals being dismissed?' }
);

// ---------------------------------------------------------------------------
// Escalation close modal
// ---------------------------------------------------------------------------

export const CLOSE_ESCALATION_TITLE = i18n.translate(
  'xpack.alertzero.closeConfirmation.escalation.title',
  { defaultMessage: 'Close this escalation?' }
);

export const CLOSE_ESCALATION_BUTTON = i18n.translate(
  'xpack.alertzero.closeConfirmation.escalation.confirm',
  { defaultMessage: 'Close escalation' }
);

export const CLOSE_ESCALATION_LINKED_INVESTIGATIONS_LABEL = i18n.translate(
  'xpack.alertzero.closeConfirmation.escalation.linkedInvestigationsLabel',
  { defaultMessage: 'Linked investigations that will be closed:' }
);

export const CLOSE_ESCALATION_PROPOSALS_WARNING = (count: number) =>
  i18n.translate('xpack.alertzero.closeConfirmation.escalation.proposalsWarning', {
    defaultMessage:
      '{count, plural, one {# pending proposal} other {# pending proposals}} across linked investigations will be dismissed.',
    values: { count },
  });

export const CLOSE_ESCALATION_NO_PROPOSALS_WARNING = i18n.translate(
  'xpack.alertzero.closeConfirmation.escalation.noProposalsWarning',
  {
    defaultMessage:
      'Closing the escalation will also close its linked investigations and their chats.',
  }
);

export const CANCEL_BUTTON = i18n.translate('xpack.alertzero.closeConfirmation.cancelButton', {
  defaultMessage: 'Cancel',
});

export const NO_AUTOMATED_ACTION_LABEL = i18n.translate(
  'xpack.alertzero.closeConfirmation.proposals.noAutomatedAction',
  { defaultMessage: 'No automated action' }
);

export const MORE_PROPOSALS = (count: number) =>
  i18n.translate('xpack.alertzero.closeConfirmation.proposals.moreProposals', {
    defaultMessage: 'and {count} more',
    values: { count },
  });

export const INVESTIGATION_PROPOSAL_COUNT = (count: number) =>
  i18n.translate('xpack.alertzero.closeConfirmation.escalation.investigationProposalCount', {
    defaultMessage: '{count, plural, one {# pending proposal} other {# pending proposals}}',
    values: { count },
  });

export const CLOSE_TARGETS_CHANGED = i18n.translate(
  'xpack.alertzero.closeConfirmation.targetsChanged',
  {
    defaultMessage:
      'The pending proposals changed since this dialog was opened. Review the updated list and confirm again.',
  }
);

// ---------------------------------------------------------------------------
// Status toggle / reopening
// ---------------------------------------------------------------------------

export const REOPEN_INVESTIGATION_SUCCESS = i18n.translate(
  'xpack.alertzero.statusToggle.reopenInvestigation.success',
  { defaultMessage: 'Investigation reopened' }
);

export const REOPEN_ESCALATION_SUCCESS = i18n.translate(
  'xpack.alertzero.statusToggle.reopenEscalation.success',
  { defaultMessage: 'Escalation reopened' }
);

export const CLOSE_INVESTIGATION_SUCCESS = i18n.translate(
  'xpack.alertzero.statusToggle.closeInvestigation.success',
  { defaultMessage: 'Investigation closed' }
);

export const CLOSE_ESCALATION_SUCCESS = i18n.translate(
  'xpack.alertzero.statusToggle.closeEscalation.success',
  { defaultMessage: 'Escalation closed' }
);

export const PARTIAL_PROPOSAL_DISMISS_WARNING = i18n.translate(
  'xpack.alertzero.statusToggle.partialProposalDismiss',
  {
    defaultMessage:
      'Some pending proposals could not be dismissed automatically. Check the proposals queue.',
  }
);

export const STATUS_CHANGE_ERROR = i18n.translate('xpack.alertzero.statusToggle.error', {
  defaultMessage: 'Could not update the status. Please try again.',
});
