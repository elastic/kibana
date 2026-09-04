/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.pnd.brief.pageTitle', {
  defaultMessage: 'Brief',
});

export const WATCHES_FILTER_LABEL = i18n.translate('xpack.pnd.brief.watchesFilterLabel', {
  defaultMessage: 'Waiting on you from',
});

export const WATCH_FLOOR = i18n.translate('xpack.pnd.brief.watch.floor', {
  defaultMessage: 'Watch Floor',
});

export const WATCH_OFFICER = i18n.translate('xpack.pnd.brief.watch.officer', {
  defaultMessage: 'Watch Officer',
});

export const WATCH_DARK = i18n.translate('xpack.pnd.brief.watch.dark', {
  defaultMessage: 'Dark Watch',
});

export const WATCH_DEEP = i18n.translate('xpack.pnd.brief.watch.deep', {
  defaultMessage: 'Forensic Watch',
});

/**
 * Display name of PND's phase-4 watch, `system-security-watch-post-incident`.
 *
 * The i18n id keeps its `watch.detection` bytes deliberately: changing an id retires the
 * translated string in every locale, and the rename this constant went through was to the
 * *workflow id*, not to the copy. Renaming the copy is a separate, product-owned decision.
 */
export const WATCH_POST_INCIDENT = i18n.translate('xpack.pnd.brief.watch.detection', {
  defaultMessage: 'Post-Incident Watch',
});

export const LOADING = i18n.translate('xpack.pnd.brief.loading', {
  defaultMessage: 'Loading the approval queue…',
});

export const EMPTY_TITLE = i18n.translate('xpack.pnd.brief.emptyTitle', {
  defaultMessage: 'Nothing is waiting for your approval',
});

/**
 * What a KPI tile announces to a screen reader. The tile itself is a number and a phase name, which
 * is unreadable out of context, and it is a *button*: the label has to say both what the number
 * counts and what pressing it does.
 */
export const kpiTileAriaLabel = ({ count, label }: { count: number; label: string }): string =>
  i18n.translate('xpack.pnd.brief.kpiTileAriaLabel', {
    defaultMessage:
      'Go to {label}: {count, plural, one {# approval} other {# approvals}} waiting on you',
    values: { count, label },
  });

/** The older edge of a KPI tile's 24h sparkline. */
export const SPARKLINE_WINDOW_START = i18n.translate('xpack.pnd.brief.sparklineWindowStart', {
  defaultMessage: '24h ago',
});

/** The newer edge, which is the hour still filling. */
export const SPARKLINE_WINDOW_END = i18n.translate('xpack.pnd.brief.sparklineWindowEnd', {
  defaultMessage: 'Now',
});

/**
 * One hour of a sparkline, in its tooltip. Counts gates **opened** in that hour — a different
 * measurement from the tile's headline count, which is what is still waiting.
 */
export const sparklineEventCount = (count: number): string =>
  i18n.translate('xpack.pnd.brief.sparklineEventCount', {
    defaultMessage: '{count, plural, one {# event} other {# events}}',
    values: { count },
  });

export const REASONING_MISSING = i18n.translate('xpack.pnd.brief.reasoningMissing', {
  defaultMessage: 'No rationale was captured for this approval.',
});

export const APPROVE = i18n.translate('xpack.pnd.brief.approve', {
  defaultMessage: 'Approve',
});

export const DISMISS = i18n.translate('xpack.pnd.brief.dismiss', {
  defaultMessage: 'Dismiss',
});

export const APPROVED = i18n.translate('xpack.pnd.brief.approved', {
  defaultMessage: 'Approved',
});

export const DISMISSED = i18n.translate('xpack.pnd.brief.dismissed', {
  defaultMessage: 'Dismissed',
});

export const answeredBy = (respondedBy: string) =>
  i18n.translate('xpack.pnd.brief.answeredBy', {
    defaultMessage: 'by {respondedBy}',
    values: { respondedBy },
  });

/**
 * A gate the machine auto-respond path accepted, naming the user it ran as.
 *
 * The user is named because the resume really was run under their identity — but the sentence
 * leads with "automatically" so it can never be read as their decision on this gate.
 */
export const answeredByAutonomyAutoRunBy = (respondedBy: string) =>
  i18n.translate('xpack.pnd.brief.answeredByAutonomyAutoRunBy', {
    defaultMessage: 'automatically by AlertZero autonomy, run by {respondedBy}',
    values: { respondedBy },
  });

export const ANSWERED_BY_AUTONOMY_AUTO = i18n.translate('xpack.pnd.brief.answeredByAutonomyAuto', {
  defaultMessage: 'automatically by AlertZero autonomy',
});

/**
 * A gate the autonomy dial auto-responded, naming the user who raised the level.
 *
 * They raised the autonomy level; they did not answer this proposal.
 */
export const answeredByAutonomyDialRunBy = (respondedBy: string) =>
  i18n.translate('xpack.pnd.brief.answeredByAutonomyDialRunBy', {
    defaultMessage: 'automatically after the autonomy level was raised, run by {respondedBy}',
    values: { respondedBy },
  });

export const ANSWERED_BY_AUTONOMY_DIAL = i18n.translate('xpack.pnd.brief.answeredByAutonomyDial', {
  defaultMessage: 'automatically after the autonomy level was raised',
});

/**
 * An answer with no responder and no auto-respond rationale.
 *
 * Replaces copy that claimed such a row was accepted "at this autonomy level" — a claim the data does
 * not support (D12). An external resume can settle a gate without stamping a principal, and an
 * autonomy-skipped gate never reaches the record at all, so the only honest statement is that nothing
 * was recorded.
 */
export const ANSWERED_BY_UNRECORDED = i18n.translate('xpack.pnd.brief.answeredByUnrecorded', {
  defaultMessage: 'by an unrecorded responder',
});

export const RATIONALE_LABEL = i18n.translate('xpack.pnd.brief.rationale.label', {
  defaultMessage: 'Rationale',
});

export const RATIONALE_HELP = i18n.translate('xpack.pnd.brief.rationale.help', {
  defaultMessage:
    'Recorded on the run and read back into the conversation. Required for a dismissal too — a dismissal is the analyst overriding the machine, which is the most important thing to keep.',
});

export const RATIONALE_REQUIRED = i18n.translate('xpack.pnd.brief.rationale.required', {
  defaultMessage: 'A rationale is required.',
});

/**
 * Fallback when the answer is an approval but the gate is not one of the Floor terminals that
 * name a consequence. Tuning uses {@link TUNING_APPLIED_TOAST} on a different path.
 */
export const APPROVED_TOAST = i18n.translate('xpack.pnd.brief.approvedToast', {
  defaultMessage: 'Approved. The run has moved on.',
});

export const DISMISSED_TOAST = i18n.translate('xpack.pnd.brief.dismissedToast', {
  defaultMessage: 'Dismissed. The run stops here.',
});

export const OPEN_INVESTIGATION_APPROVED_TOAST = i18n.translate(
  'xpack.pnd.brief.openInvestigationApprovedToast',
  {
    defaultMessage: 'Approved: The investigation will continue',
  }
);

export const INCIDENT_CONTAINED_APPROVED_TOAST = i18n.translate(
  'xpack.pnd.brief.incidentContainedApprovedToast',
  {
    defaultMessage: 'Approved: The incident is contained',
  }
);

/**
 * The one approval that creates a container: the 2026-08-17 Experience/UX sync, decision 6 —
 * *"opening one shows a toast with a link to the incident"*. The conversation may take a moment
 * to appear (`open_incident` runs after this resume); the link is derived immediately. See
 * {@link readOpenedIncidentId}.
 */
export const INCIDENT_OPENED_TOAST = i18n.translate('xpack.pnd.brief.incidentOpenedToast', {
  defaultMessage: 'Approved: Incident created',
});

/** The toast's action. Names the destination, since the toast has already said what happened. */
export const INCIDENT_OPENED_TOAST_LINK = i18n.translate(
  'xpack.pnd.brief.incidentOpenedToastLink',
  {
    defaultMessage: 'View the incident',
  }
);

export const ALREADY_ANSWERED_TOAST = i18n.translate('xpack.pnd.brief.alreadyAnsweredToast', {
  defaultMessage: 'This approval has already been answered, or the run has moved past it.',
});

export const DECISION_FAILED_TOAST = i18n.translate('xpack.pnd.brief.decisionFailedToast', {
  defaultMessage: 'The decision could not be recorded.',
});

// The `tune` approval: the one decision that writes to a production detection rule.

export const TUNING_APPROVAL_TITLE = i18n.translate('xpack.pnd.brief.tuning.title', {
  defaultMessage: 'Apply this tuning to a detection rule',
});

export const TUNING_APPROVAL_CONFIRM = i18n.translate('xpack.pnd.brief.tuning.confirm', {
  defaultMessage: 'Approve and apply',
});

export const TUNING_RULE_ID_NOTE = i18n.translate('xpack.pnd.brief.tuning.ruleIdNote', {
  defaultMessage:
    'The rule id below is authored by the model and may not name a real rule. It is the rule’s id (the uuid in the rule’s URL), not its rule_id. Confirm or correct it before approving.',
});

export const TUNING_NO_CHANGE_TITLE = i18n.translate('xpack.pnd.brief.tuning.noChangeTitle', {
  defaultMessage: 'This action carries no machine-readable change',
});

export const TUNING_NO_CHANGE_BODY = i18n.translate('xpack.pnd.brief.tuning.noChangeBody', {
  defaultMessage:
    'Nothing could be read back from the action, so AlertZero will apply the change you choose here instead of one the model wrote. Enable or disable is the only change offered: it is visible, explainable and reversible.',
});

export const TUNING_DISABLE_RULE_LABEL = i18n.translate('xpack.pnd.brief.tuning.disableRuleLabel', {
  defaultMessage: 'Disable the rule',
});

export const TUNING_LEGACY_RECOVERY_TITLE = i18n.translate(
  'xpack.pnd.brief.tuning.legacyRecoveryTitle',
  {
    defaultMessage: 'These fields were read back out of prose',
  }
);

export const TUNING_LEGACY_RECOVERY_BODY = i18n.translate(
  'xpack.pnd.brief.tuning.legacyRecoveryBody',
  {
    defaultMessage:
      'This action was parked by an older version of the Detection Watch, which wrote the rule and the change as a sentence rather than as data. They were recovered by pattern matching, so check the rule name and id against the rule itself before approving.',
  }
);

export const TUNING_APPLIED_TOAST = i18n.translate('xpack.pnd.brief.tuning.appliedToast', {
  defaultMessage: 'Approved, and the detection rule was changed.',
});

export const TUNING_APPLY_FAILED_TITLE = i18n.translate('xpack.pnd.brief.tuning.applyFailedTitle', {
  defaultMessage: 'The approval was recorded, but the rule was NOT changed',
});

export const TUNING_APPLY_FORBIDDEN = i18n.translate('xpack.pnd.brief.tuning.applyForbidden', {
  defaultMessage:
    'You are not authorized to change detection rules. The gate has been resumed, but the rule is unchanged — ask someone with the detection-rules write privilege to apply it.',
});

export const TUNING_APPLY_NOT_FOUND = i18n.translate('xpack.pnd.brief.tuning.applyNotFound', {
  defaultMessage:
    'No detection rule has that id, so nothing was changed. The id came from the model — correct it below and apply again.',
});

export const TUNING_APPLY_REJECTED = i18n.translate('xpack.pnd.brief.tuning.applyRejected', {
  defaultMessage:
    'AlertZero refused the change: it is outside the fields a tuning may patch (enable/disable, custom highlighted fields, investigation guide). That is a finding worth reporting, not something to retry — the model proposed a change that would alter which documents the rule matches.',
});

export const TUNING_APPLY_FAILED_FALLBACK = i18n.translate(
  'xpack.pnd.brief.tuning.applyFailedFallback',
  {
    defaultMessage: 'The detection rule was not changed.',
  }
);

export const TUNING_GATE_ALREADY_ANSWERED = i18n.translate(
  'xpack.pnd.brief.tuning.gateAlreadyAnswered',
  {
    defaultMessage:
      'The approval was already answered, so nothing was applied. Reopen the rule tuning from the lifecycle if it still needs to be applied.',
  }
);
