/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.pnd.investigation.pageTitle', {
  defaultMessage: 'Investigation',
});

export const TAB_OVERVIEW = i18n.translate('xpack.pnd.investigation.tab.overview', {
  defaultMessage: 'Overview',
});

export const PROPOSAL_LINKED_TO = i18n.translate('xpack.pnd.investigation.proposal.linkedTo', {
  defaultMessage: 'Raised under',
});

export const TAB_PROPOSALS = i18n.translate('xpack.pnd.investigation.tab.proposals', {
  defaultMessage: 'Proposals',
});

export const TAB_TIMELINE = i18n.translate('xpack.pnd.investigation.tab.timeline', {
  defaultMessage: 'Timeline',
});

export const ACTION_APPROVE = i18n.translate('xpack.pnd.investigation.action.approve', {
  defaultMessage: 'Approve',
});

export const ACTION_APPROVE_ISOLATE = i18n.translate(
  'xpack.pnd.investigation.action.approveIsolate',
  {
    defaultMessage: 'Approve & isolate endpoint',
  }
);

export const ACTION_APPROVE_ESCALATE = i18n.translate(
  'xpack.pnd.investigation.action.approveEscalate',
  {
    defaultMessage: 'Approve & escalate to Deep Watch',
  }
);

export const ACTION_MODIFY = i18n.translate('xpack.pnd.investigation.action.modify', {
  defaultMessage: 'Modify',
});

export const ACTION_DISMISS = i18n.translate('xpack.pnd.investigation.action.dismiss', {
  defaultMessage: 'Dismiss',
});

export const ACTION_ESCALATE = i18n.translate('xpack.pnd.investigation.action.escalate', {
  defaultMessage: 'Escalate',
});

export const ACTION_DEFER = i18n.translate('xpack.pnd.investigation.action.defer', {
  defaultMessage: 'Defer',
});

export const ACTION_ASSIGN = i18n.translate('xpack.pnd.investigation.action.assign', {
  defaultMessage: 'Assign',
});

export const ASSIGN_TITLE = i18n.translate('xpack.pnd.investigation.assign.title', {
  defaultMessage: 'Assign — owner',
});

export const ASSIGN_UNASSIGN = i18n.translate('xpack.pnd.investigation.assign.unassign', {
  defaultMessage: 'Unassign',
});

export const CONFIRM_ASSIGN_TITLE = (assignee: string | null) =>
  i18n.translate('xpack.pnd.investigation.confirmAssign.title', {
    defaultMessage: 'Assign this proposal to {assignee}?',
    values: { assignee: assignee ?? 'no one (unassign)' },
  });
export const CONFIRM_ASSIGN_BODY = i18n.translate('xpack.pnd.investigation.confirmAssign.body', {
  defaultMessage: 'The proposal stays pending — assignment only changes ownership.',
});
export const CONFIRM_ASSIGN_CONFIRM = i18n.translate(
  'xpack.pnd.investigation.confirmAssign.confirm',
  { defaultMessage: 'Assign' }
);

export const DISMISS_REASON_TITLE = i18n.translate('xpack.pnd.investigation.dismissReason.title', {
  defaultMessage: 'Dismiss — reason',
});
export const DISMISS_REASON_WRONG = i18n.translate('xpack.pnd.investigation.dismissReason.wrong', {
  defaultMessage: 'Wrong',
});
export const DISMISS_REASON_DUPLICATE = i18n.translate(
  'xpack.pnd.investigation.dismissReason.duplicate',
  { defaultMessage: 'Duplicate' }
);
export const DISMISS_REASON_INSUFFICIENT = i18n.translate(
  'xpack.pnd.investigation.dismissReason.insufficientEvidence',
  { defaultMessage: 'Insufficient evidence' }
);
export const DISMISS_REASON_LOW_VALUE = i18n.translate(
  'xpack.pnd.investigation.dismissReason.lowValue',
  { defaultMessage: 'Low value' }
);
export const DISMISS_REASON_OUT_OF_SCOPE = i18n.translate(
  'xpack.pnd.investigation.dismissReason.outOfScope',
  { defaultMessage: 'Out of scope' }
);
export const DISMISS_REASON_ALREADY_HANDLED = i18n.translate(
  'xpack.pnd.investigation.dismissReason.alreadyHandled',
  { defaultMessage: 'Already handled' }
);
export const DISMISS_REASON_OTHER = i18n.translate('xpack.pnd.investigation.dismissReason.other', {
  defaultMessage: 'Other',
});

export const OVERVIEW_AFFECTED = i18n.translate('xpack.pnd.investigation.overview.affected', {
  defaultMessage: 'Affected surface',
});

export const OVERVIEW_WATCHED_BY = i18n.translate('xpack.pnd.investigation.overview.watchedBy', {
  defaultMessage: 'Watched by',
});

export const OVERVIEW_STATUS = i18n.translate('xpack.pnd.investigation.overview.status', {
  defaultMessage: 'Status',
});

export const TIMELINE_EMPTY = i18n.translate('xpack.pnd.investigation.timeline.empty', {
  defaultMessage: 'No timeline events yet.',
});

export const BACK_TO_BRIEF = i18n.translate('xpack.pnd.investigation.backToBrief', {
  defaultMessage: 'Back to Brief',
});

export const NOT_FOUND = i18n.translate('xpack.pnd.investigation.notFound', {
  defaultMessage: 'Investigation not found',
});

export const LOAD_ERROR_TITLE = i18n.translate('xpack.pnd.investigation.loadError.title', {
  defaultMessage: 'Unable to load investigation',
});

export const LOAD_ERROR_BODY = i18n.translate('xpack.pnd.investigation.loadError.body', {
  defaultMessage: 'Something went wrong while fetching this investigation.',
});

export const LOADING = i18n.translate('xpack.pnd.investigation.loading', {
  defaultMessage: 'Loading investigation…',
});

export const STATUS_UPDATED = i18n.translate('xpack.pnd.investigation.statusUpdated', {
  defaultMessage: 'Proposal status updated (mock)',
});

export const DECISIONS_UNAVAILABLE = i18n.translate(
  'xpack.pnd.investigation.decisionsUnavailable',
  {
    defaultMessage:
      'Proposal decisions are disabled until durable approval workflows are connected.',
  }
);

export const LOADING_PROPOSALS = i18n.translate('xpack.pnd.investigation.loadingProposals', {
  defaultMessage: 'Loading proposals…',
});

export const PROPOSALS_LOAD_ERROR = i18n.translate('xpack.pnd.investigation.proposalsLoadError', {
  defaultMessage: 'Unable to load proposals',
});

export const PROPOSAL_NOT_FOUND = i18n.translate('xpack.pnd.investigation.proposalNotFound', {
  defaultMessage: 'Proposal not found',
});

export const RETRY = i18n.translate('xpack.pnd.investigation.retry', {
  defaultMessage: 'Retry',
});

export const FLOW_STAGE_DETECTED = i18n.translate('xpack.pnd.investigation.flow.stage.detected', {
  defaultMessage: 'Detected',
});

export const FLOW_STAGE_INVESTIGATED = i18n.translate(
  'xpack.pnd.investigation.flow.stage.investigated',
  {
    defaultMessage: 'Investigated',
  }
);

export const FLOW_STAGE_PROPOSED = i18n.translate('xpack.pnd.investigation.flow.stage.proposed', {
  defaultMessage: 'Proposed',
});

export const FLOW_STAGE_DECIDED = i18n.translate('xpack.pnd.investigation.flow.stage.decided', {
  defaultMessage: 'Decided',
});

export const FLOW_EMPTY = i18n.translate('xpack.pnd.investigation.flow.empty', {
  defaultMessage: 'No timeline events recorded for this investigation yet.',
});

export const FLOW_SOURCE_INVESTIGATION = i18n.translate(
  'xpack.pnd.investigation.flow.source.investigation',
  {
    defaultMessage: 'Investigation',
  }
);

export const flowSourceProposal = (proposalType: string): string =>
  i18n.translate('xpack.pnd.investigation.flow.source.proposal', {
    defaultMessage: 'Proposal · {proposalType}',
    values: { proposalType },
  });

// --- Decision confirmation modal copy -------------------------------------
//
// Every proposal decision button has a real side effect — up to and including
// isolating a live endpoint from the network — so each one is gated behind an
// EuiConfirmModal (https://eui.elastic.co/docs/containers/modal/#confirming-an-action).
// Per EUI's guidance the title is framed as a question (never "Are you sure?"),
// the body states the concrete consequence, and the confirm button names the
// action explicitly rather than a generic "Confirm".

export const CONFIRM_MODAL_CANCEL = i18n.translate('xpack.pnd.investigation.confirmModal.cancel', {
  defaultMessage: 'Cancel',
});

export const CONFIRM_ACCEPT_ISOLATE_TITLE = i18n.translate(
  'xpack.pnd.investigation.confirmModal.acceptIsolate.title',
  { defaultMessage: 'Isolate endpoint and approve this proposal?' }
);
export const CONFIRM_ACCEPT_ISOLATE_BODY = i18n.translate(
  'xpack.pnd.investigation.confirmModal.acceptIsolate.body',
  {
    defaultMessage:
      'This immediately isolates the affected endpoint from the network, blocking all traffic except to Elastic Defend. An analyst can release the isolation afterward from the endpoint response actions.',
  }
);
export const CONFIRM_ACCEPT_ISOLATE_CONFIRM = i18n.translate(
  'xpack.pnd.investigation.confirmModal.acceptIsolate.confirm',
  { defaultMessage: 'Isolate & approve' }
);

export const CONFIRM_ACCEPT_ESCALATE_TITLE = i18n.translate(
  'xpack.pnd.investigation.confirmModal.acceptEscalate.title',
  { defaultMessage: 'Approve and escalate to Deep Watch?' }
);
export const CONFIRM_ACCEPT_ESCALATE_BODY = i18n.translate(
  'xpack.pnd.investigation.confirmModal.acceptEscalate.body',
  {
    defaultMessage:
      'This triggers a live Watch workflow that hands this investigation to the Deep Watch tier for forensic follow-up.',
  }
);
export const CONFIRM_ACCEPT_ESCALATE_CONFIRM = i18n.translate(
  'xpack.pnd.investigation.confirmModal.acceptEscalate.confirm',
  { defaultMessage: 'Approve & escalate' }
);

export const CONFIRM_ACCEPT_TITLE = i18n.translate(
  'xpack.pnd.investigation.confirmModal.accept.title',
  { defaultMessage: 'Approve this proposal?' }
);
export const CONFIRM_ACCEPT_BODY = i18n.translate(
  'xpack.pnd.investigation.confirmModal.accept.body',
  { defaultMessage: 'The recommended action is recorded as approved on this investigation.' }
);
export const CONFIRM_ACCEPT_CONFIRM = i18n.translate(
  'xpack.pnd.investigation.confirmModal.accept.confirm',
  { defaultMessage: 'Approve' }
);

export const CONFIRM_MODIFY_TITLE = i18n.translate(
  'xpack.pnd.investigation.confirmModal.modify.title',
  { defaultMessage: 'Modify this proposal?' }
);
export const CONFIRM_MODIFY_BODY = i18n.translate(
  'xpack.pnd.investigation.confirmModal.modify.body',
  {
    defaultMessage:
      'The proposal is marked modified, replacing the original recommendation with an analyst note.',
  }
);
export const CONFIRM_MODIFY_CONFIRM = i18n.translate(
  'xpack.pnd.investigation.confirmModal.modify.confirm',
  { defaultMessage: 'Modify' }
);

export const CONFIRM_ESCALATE_TITLE = i18n.translate(
  'xpack.pnd.investigation.confirmModal.escalate.title',
  { defaultMessage: 'Escalate this proposal to a case?' }
);
export const CONFIRM_ESCALATE_BODY = i18n.translate(
  'xpack.pnd.investigation.confirmModal.escalate.body',
  {
    defaultMessage:
      'This marks the proposal escalated and links it to a case for follow-up outside the Brief queue.',
  }
);
export const CONFIRM_ESCALATE_CONFIRM = i18n.translate(
  'xpack.pnd.investigation.confirmModal.escalate.confirm',
  { defaultMessage: 'Escalate' }
);

export const CONFIRM_DEFER_TITLE = i18n.translate(
  'xpack.pnd.investigation.confirmModal.defer.title',
  { defaultMessage: 'Defer this decision?' }
);
export const CONFIRM_DEFER_BODY = i18n.translate(
  'xpack.pnd.investigation.confirmModal.defer.body',
  {
    defaultMessage: 'The proposal stays pending and returns to the queue for a later decision.',
  }
);
export const CONFIRM_DEFER_CONFIRM = i18n.translate(
  'xpack.pnd.investigation.confirmModal.defer.confirm',
  { defaultMessage: 'Defer' }
);

export const CONFIRM_DISMISS_TITLE = (reasonLabel: string) =>
  i18n.translate('xpack.pnd.investigation.confirmModal.dismiss.title', {
    defaultMessage: 'Dismiss this proposal as "{reasonLabel}"?',
    values: { reasonLabel },
  });
export const CONFIRM_DISMISS_BODY = i18n.translate(
  'xpack.pnd.investigation.confirmModal.dismiss.body',
  {
    defaultMessage:
      "This records the dismissal reason on the investigation and drops the proposal out of the Brief queue. You can still find it under this investigation's Proposals tab afterward.",
  }
);
export const CONFIRM_DISMISS_CONFIRM = i18n.translate(
  'xpack.pnd.investigation.confirmModal.dismiss.confirm',
  { defaultMessage: 'Dismiss' }
);

export const COVERAGE_GAP_CHIP = {
  LABEL: i18n.translate('xpack.pnd.investigation.coverageGapChip.label', {
    defaultMessage: 'Coverage gap',
  }),
  LABEL_PLURAL: (count: number) =>
    i18n.translate('xpack.pnd.investigation.coverageGapChip.labelPlural', {
      defaultMessage: '{count} coverage gaps',
      values: { count },
    }),
  CLICK_HINT: i18n.translate('xpack.pnd.investigation.coverageGapChip.clickHint', {
    defaultMessage: 'View the resulting Detection Watch proposal',
  }),
};
