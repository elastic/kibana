/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FLYOUT_TITLE = i18n.translate('xpack.pnd.lifecycleFlyout.title', {
  defaultMessage: 'Four-phase lifecycle',
});

export const FLYOUT_ARIA_LABEL = i18n.translate('xpack.pnd.lifecycleFlyout.ariaLabel', {
  defaultMessage: 'The four-phase lifecycle of this attack discovery',
});

export const CLOSE = i18n.translate('xpack.pnd.lifecycleFlyout.close', {
  defaultMessage: 'Close',
});

export const OPEN_FULL_PAGE = i18n.translate('xpack.pnd.lifecycleFlyout.openFullPage', {
  defaultMessage: 'Open full page',
});

export const flyoutSubtitle = (correlationId: string): string =>
  i18n.translate('xpack.pnd.lifecycleFlyout.subtitle', {
    defaultMessage: 'Attack discovery {correlationId}',
    values: { correlationId },
  });

// --- tabs --------------------------------------------------------------------------------------

export const TAB_OVERVIEW = i18n.translate('xpack.pnd.lifecycleFlyout.tabs.overview', {
  defaultMessage: 'Overview',
});

export const TAB_TIMELINE = i18n.translate('xpack.pnd.lifecycleFlyout.tabs.timeline', {
  defaultMessage: 'Timeline',
});

// --- Overview's sections -----------------------------------------------------------------------

/**
 * The headings of the three blocks that were tabs of their own until decision 1 of the 2026-08-17
 * sync left the flyout two tabs.
 *
 * ⚠️ Their message **ids** still read `…tabs.attachments`, `…tabs.tuning` and `…tabs.lifecycle`, and
 * that is deliberate: the strings are byte-identical, so re-keying them would retire three
 * translations and request three new ones to say the same words. `kibana-phf4.15`'s rule — copy may
 * move, ids do not — applies to a tab that became a heading exactly as it does to a component that
 * moved directory.
 */
export const SECTION_ATTACHMENTS = i18n.translate('xpack.pnd.lifecycleFlyout.tabs.attachments', {
  defaultMessage: 'Attachments',
});

export const SECTION_TUNING = i18n.translate('xpack.pnd.lifecycleFlyout.tabs.tuning', {
  defaultMessage: 'Review tuning',
});

export const SECTION_LIFECYCLE = i18n.translate('xpack.pnd.lifecycleFlyout.tabs.lifecycle', {
  defaultMessage: 'Lifecycle',
});

// --- Overview's summary section ----------------------------------------------------------------

export const OVERVIEW_EMPTY_TITLE = i18n.translate(
  'xpack.pnd.lifecycleFlyout.overview.emptyTitle',
  { defaultMessage: 'No lifecycle to summarize' }
);

export const OVERVIEW_EMPTY_BODY = i18n.translate('xpack.pnd.lifecycleFlyout.overview.emptyBody', {
  defaultMessage: 'The four-phase catalog produced no rows for this discovery.',
});

export const OVERVIEW_ALERT_ID_LABEL = i18n.translate(
  'xpack.pnd.lifecycleFlyout.overview.alertIdLabel',
  { defaultMessage: 'Attack discovery' }
);

export const OVERVIEW_PROGRESS_LABEL = i18n.translate(
  'xpack.pnd.lifecycleFlyout.overview.progressLabel',
  { defaultMessage: 'Progress' }
);

export const overviewProgress = (passed: number, total: number): string =>
  i18n.translate('xpack.pnd.lifecycleFlyout.overview.progress', {
    defaultMessage:
      '{passed} of {total} {total, plural, one {step} other {steps}} the thin slice executes',
    values: { passed, total },
  });

export const OVERVIEW_CURRENT_STEP_LABEL = i18n.translate(
  'xpack.pnd.lifecycleFlyout.overview.currentStepLabel',
  { defaultMessage: 'Waiting on' }
);

export const OVERVIEW_NOTHING_WAITING = i18n.translate(
  'xpack.pnd.lifecycleFlyout.overview.nothingWaiting',
  { defaultMessage: 'Nothing is waiting for a decision right now' }
);

export const OVERVIEW_RUNS_LABEL = i18n.translate('xpack.pnd.lifecycleFlyout.overview.runsLabel', {
  defaultMessage: 'Workflow runs',
});

export const OVERVIEW_STATUS_BREAKDOWN_LABEL = i18n.translate(
  'xpack.pnd.lifecycleFlyout.overview.statusBreakdownLabel',
  { defaultMessage: 'Rows by status' }
);

export const statusCountAriaLabel = (count: number, status: string): string =>
  i18n.translate('xpack.pnd.lifecycleFlyout.overview.statusCountAriaLabel', {
    defaultMessage: '{count} {count, plural, one {row} other {rows}} are {status}',
    values: { count, status },
  });

export const OVERVIEW_PARTICIPANTS_LABEL = i18n.translate(
  'xpack.pnd.lifecycleFlyout.overview.participantsLabel',
  { defaultMessage: 'Participants' }
);

export const OVERVIEW_PARTICIPANTS_EMPTY = i18n.translate(
  'xpack.pnd.lifecycleFlyout.overview.participantsEmpty',
  { defaultMessage: 'No participants' }
);

export const participantsAriaLabel = (count: number): string =>
  i18n.translate('xpack.pnd.lifecycleFlyout.overview.participantsAriaLabel', {
    defaultMessage: '{count} {count, plural, one {watch} other {watches}} produced this discovery',
    values: { count },
  });

// --- Overview's attachments section ------------------------------------------------------------

export const ATTACHMENTS_EMPTY_TITLE = i18n.translate(
  'xpack.pnd.lifecycleFlyout.attachments.emptyTitle',
  { defaultMessage: 'No sub-investigations yet' }
);

export const ATTACHMENTS_EMPTY_BODY = i18n.translate(
  'xpack.pnd.lifecycleFlyout.attachments.emptyBody',
  {
    defaultMessage:
      'A sub-investigation, and the attachments on it, is created when this discovery parks a human-in-the-loop gate. Nothing has parked one yet.',
  }
);

export const ATTACHMENTS_LOADING = i18n.translate('xpack.pnd.lifecycleFlyout.attachments.loading', {
  defaultMessage: 'Loading attachments',
});

export const ATTACHMENTS_THREAD_ERROR = i18n.translate(
  'xpack.pnd.lifecycleFlyout.attachments.threadError',
  { defaultMessage: 'The attachments on this sub-investigation could not be read.' }
);

export const ATTACHMENTS_THREAD_EMPTY = i18n.translate(
  'xpack.pnd.lifecycleFlyout.attachments.threadEmpty',
  { defaultMessage: 'This sub-investigation has no attachments.' }
);

export const ATTACHMENT_NO_CONTENT = i18n.translate(
  'xpack.pnd.lifecycleFlyout.attachments.noContent',
  { defaultMessage: 'This attachment has no text to show inline.' }
);

export const attachmentsTruncated = (shown: number, total: number): string =>
  i18n.translate('xpack.pnd.lifecycleFlyout.attachments.truncated', {
    defaultMessage: 'Showing {shown} of {total} attachments on this sub-investigation.',
    values: { shown, total },
  });

// --- Overview's review-tuning section ----------------------------------------------------------

export const TUNING_EMPTY_TITLE = i18n.translate('xpack.pnd.lifecycleFlyout.tuning.emptyTitle', {
  defaultMessage: 'No tuning is waiting for a decision',
});

export const TUNING_EMPTY_BODY = i18n.translate('xpack.pnd.lifecycleFlyout.tuning.emptyBody', {
  defaultMessage:
    'A drafted tuning appears here while this discovery is parked at the apply-tuning gate. Once the tuning has been applied or dismissed the gate resolves and there is nothing left to review.',
});

export const TUNING_LOADING = i18n.translate('xpack.pnd.lifecycleFlyout.tuning.loading', {
  defaultMessage: 'Loading the drafted tuning',
});

export const TUNING_REASONING_TITLE = i18n.translate(
  'xpack.pnd.lifecycleFlyout.tuning.reasoningTitle',
  { defaultMessage: 'Why this tuning' }
);

// --- Timeline tab ------------------------------------------------------------------------------

export const TIMELINE_EMPTY_TITLE = i18n.translate(
  'xpack.pnd.lifecycleFlyout.timeline.emptyTitle',
  { defaultMessage: 'No steps have run yet' }
);

export const TIMELINE_EMPTY_BODY = i18n.translate('xpack.pnd.lifecycleFlyout.timeline.emptyBody', {
  defaultMessage:
    'This discovery correlated to a run, but none of its steps has recorded a start time yet. The Lifecycle section of the Overview tab lists every documented step in the meantime.',
});

export const TIMELINE_STARTED = i18n.translate('xpack.pnd.lifecycleFlyout.timeline.started', {
  defaultMessage: 'Started',
});

export const TIMELINE_FINISHED = i18n.translate('xpack.pnd.lifecycleFlyout.timeline.finished', {
  defaultMessage: 'Finished',
});

export const timelineStepAriaLabel = (step: string): string =>
  i18n.translate('xpack.pnd.lifecycleFlyout.timeline.viewStepAriaLabel', {
    defaultMessage: 'View the step execution for {step}',
    values: { step },
  });
