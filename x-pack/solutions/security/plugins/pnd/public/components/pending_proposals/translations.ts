/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SECTION_TITLE = i18n.translate('xpack.pnd.pendingProposals.sectionTitle', {
  defaultMessage: 'Awaiting your decision',
});

export const LOADING = i18n.translate('xpack.pnd.pendingProposals.loading', {
  defaultMessage: 'Loading proposals',
});

export const LOAD_ERROR = i18n.translate('xpack.pnd.pendingProposals.loadError', {
  defaultMessage: 'Unable to load proposals',
});

export const EMPTY = i18n.translate('xpack.pnd.pendingProposals.empty', {
  defaultMessage: 'No proposals are awaiting a decision',
});

export const APPROVE = i18n.translate('xpack.pnd.pendingProposals.approve', {
  defaultMessage: 'Approve',
});

export const DISMISS = i18n.translate('xpack.pnd.pendingProposals.dismiss', {
  defaultMessage: 'Dismiss',
});

export const EXPIRED = i18n.translate('xpack.pnd.pendingProposals.expired', {
  defaultMessage: 'Expired',
});

export const NO_ACTION = i18n.translate('xpack.pnd.pendingProposals.noAction', {
  defaultMessage: 'No automated action — carry this out yourself, then approve',
});

export const APPROVE_MODAL_TITLE = i18n.translate('xpack.pnd.pendingProposals.approveModalTitle', {
  defaultMessage: 'Approve this action?',
});

export const APPROVE_CONFIRM = i18n.translate('xpack.pnd.pendingProposals.approveConfirm', {
  defaultMessage: 'Approve and run',
});

export const APPROVE_RUNS_AS_YOU = i18n.translate('xpack.pnd.pendingProposals.approveRunsAsYou', {
  defaultMessage: 'The action runs under your identity and is attributed to you.',
});

export const DISMISS_MODAL_TITLE = i18n.translate('xpack.pnd.pendingProposals.dismissModalTitle', {
  defaultMessage: 'Dismiss this proposal?',
});

export const DISMISS_RATIONALE_PLACEHOLDER = i18n.translate(
  'xpack.pnd.pendingProposals.dismissRationalePlaceholder',
  { defaultMessage: 'Why is this proposal being dismissed?' }
);

export const DISMISS_REASON_LABEL = i18n.translate(
  'xpack.pnd.pendingProposals.dismissReasonLabel',
  { defaultMessage: 'Reason' }
);

export const CANCEL = i18n.translate('xpack.pnd.pendingProposals.cancel', {
  defaultMessage: 'Cancel',
});

export const DECISION_FAILED = i18n.translate('xpack.pnd.pendingProposals.decisionFailed', {
  defaultMessage: 'The decision could not be recorded. Reload the queue and try again.',
});

export const DISMISS_REASON_LABELS: Record<string, string> = {
  wrong: i18n.translate('xpack.pnd.pendingProposals.dismissReason.wrong', {
    defaultMessage: 'Wrong',
  }),
  duplicate: i18n.translate('xpack.pnd.pendingProposals.dismissReason.duplicate', {
    defaultMessage: 'Duplicate',
  }),
  insufficient_evidence: i18n.translate(
    'xpack.pnd.pendingProposals.dismissReason.insufficientEvidence',
    { defaultMessage: 'Insufficient evidence' }
  ),
  low_value: i18n.translate('xpack.pnd.pendingProposals.dismissReason.lowValue', {
    defaultMessage: 'Low value',
  }),
  out_of_scope: i18n.translate('xpack.pnd.pendingProposals.dismissReason.outOfScope', {
    defaultMessage: 'Out of scope',
  }),
  already_handled: i18n.translate('xpack.pnd.pendingProposals.dismissReason.alreadyHandled', {
    defaultMessage: 'Already handled',
  }),
  other: i18n.translate('xpack.pnd.pendingProposals.dismissReason.other', {
    defaultMessage: 'Other',
  }),
};
