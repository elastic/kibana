/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Copy for the per-watch settings page.
 *
 * The API carries ids only, so every autonomy level, select option, run outcome and per-watch intro
 * resolves to a message here. Keep the id maps in step with `WATCH_SETTINGS_SEED` in
 * `@kbn/pnd-common`.
 */

import { i18n } from '@kbn/i18n';
import {
  SYSTEM_SECURITY_WATCH_DARK_ID,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
} from '@kbn/pnd-common';

/* -------------------------------------------------------------------------- */
/* Header                                                                     */
/* -------------------------------------------------------------------------- */

export const ENABLED_SWITCH_LABEL = i18n.translate('xpack.pnd.watches.settings.enabledSwitch', {
  defaultMessage: 'Enabled',
});

/* -------------------------------------------------------------------------- */
/* Draft, save and discard                                                    */
/* -------------------------------------------------------------------------- */

export const SAVE = i18n.translate('xpack.pnd.watches.settings.save', {
  defaultMessage: 'Save',
});

export const SAVE_NO_CHANGES_TOOLTIP = i18n.translate(
  'xpack.pnd.watches.settings.saveNoChangesTooltip',
  { defaultMessage: 'No changes to save' }
);

export const DISCARD_CHANGES = i18n.translate('xpack.pnd.watches.settings.discardChanges', {
  defaultMessage: 'Discard changes',
});

export const UNSAVED_CHANGES_BADGE = i18n.translate(
  'xpack.pnd.watches.settings.unsavedChangesBadge',
  { defaultMessage: 'Unsaved changes' }
);

/**
 * Says which controls the badge does *not* speak for. The autonomy dial and the Enabled switch write
 * as soon as they are used, so leaving the page with the badge showing loses the settings edits and
 * nothing else.
 */
export const UNSAVED_CHANGES_BADGE_TOOLTIP = i18n.translate(
  'xpack.pnd.watches.settings.unsavedChangesBadgeTooltip',
  {
    defaultMessage:
      'These settings are not saved yet. Select Save to apply them. Autonomy and the Enabled switch are applied as soon as you change them, so they are never pending.',
  }
);

export const SAVE_FAILED = i18n.translate('xpack.pnd.watches.settings.saveFailed', {
  defaultMessage: 'Could not save these settings',
});

export const SAVE_FAILED_FALLBACK = i18n.translate(
  'xpack.pnd.watches.settings.saveFailedFallback',
  {
    defaultMessage: 'Nothing was saved. Your changes are still on this page, so you can try again.',
  }
);

export const LEAVE_MODAL_TITLE = i18n.translate('xpack.pnd.watches.settings.leaveModalTitle', {
  defaultMessage: 'Leave without saving?',
});

export const LEAVE_MODAL_BODY = i18n.translate('xpack.pnd.watches.settings.leaveModalBody', {
  defaultMessage: 'Your changes have not been saved. Are you sure you want to leave?',
});

export const LEAVE_MODAL_CANCEL = i18n.translate('xpack.pnd.watches.settings.leaveModalCancel', {
  defaultMessage: 'Cancel',
});

export const LEAVE_MODAL_CONFIRM = i18n.translate('xpack.pnd.watches.settings.leaveModalConfirm', {
  defaultMessage: 'Confirm',
});

/* -------------------------------------------------------------------------- */
/* Section headings                                                           */
/* -------------------------------------------------------------------------- */

export const AUTONOMY_SECTION_TITLE = i18n.translate(
  'xpack.pnd.watches.settings.autonomy.sectionTitle',
  { defaultMessage: 'Autonomy' }
);

export const AUTONOMY_SECTION_SUBTITLE = i18n.translate(
  'xpack.pnd.watches.settings.autonomy.sectionSubtitle',
  { defaultMessage: 'applies to this watch only' }
);

export const TRIGGERS_SECTION_TITLE = i18n.translate(
  'xpack.pnd.watches.settings.triggers.sectionTitle',
  { defaultMessage: 'Triggers' }
);

export const TRIGGERS_SECTION_SUBTITLE = i18n.translate(
  'xpack.pnd.watches.settings.triggers.sectionSubtitle',
  { defaultMessage: 'owned by the Workers in this Watch' }
);

export const SCOPE_SECTION_TITLE = i18n.translate('xpack.pnd.watches.settings.scope.sectionTitle', {
  defaultMessage: 'Scope & routing',
});

export const SCOPE_SECTION_SUBTITLE = i18n.translate(
  'xpack.pnd.watches.settings.scope.sectionSubtitle',
  { defaultMessage: 'what it may read, where work lands' }
);

export const WORKERS_SECTION_TITLE = i18n.translate(
  'xpack.pnd.watches.settings.workers.sectionTitle',
  { defaultMessage: 'Workers' }
);

export const WORKERS_SECTION_SUBTITLE = i18n.translate(
  'xpack.pnd.watches.settings.workers.sectionSubtitle',
  { defaultMessage: "the agent steps this Watch's lane runs" }
);

export const SKILLS_SECTION_TITLE = i18n.translate(
  'xpack.pnd.watches.settings.skills.sectionTitle',
  { defaultMessage: 'Skills' }
);

export const SKILLS_SECTION_SUBTITLE = i18n.translate(
  'xpack.pnd.watches.settings.skills.sectionSubtitle',
  { defaultMessage: "what this Watch's Workers can use" }
);

export const LEDGER_SECTION_TITLE = i18n.translate(
  'xpack.pnd.watches.settings.ledger.sectionTitle',
  { defaultMessage: 'Recent runs' }
);

export const LEDGER_SECTION_SUBTITLE = i18n.translate(
  'xpack.pnd.watches.settings.ledger.sectionSubtitle',
  { defaultMessage: 'ledger for this Watch' }
);

/* -------------------------------------------------------------------------- */
/* Autonomy                                                                   */
/* -------------------------------------------------------------------------- */

export const AUTONOMY_LEVEL_NAMES: Record<string, string> = {
  manual: i18n.translate('xpack.pnd.watches.settings.autonomy.manual.name', {
    defaultMessage: 'Manual',
  }),
  assisted: i18n.translate('xpack.pnd.watches.settings.autonomy.assisted.name', {
    defaultMessage: 'Assisted',
  }),
  supervised: i18n.translate('xpack.pnd.watches.settings.autonomy.supervised.name', {
    defaultMessage: 'Supervised',
  }),
};

export const AUTONOMY_LEVEL_DESCRIPTIONS: Record<string, string> = {
  manual: i18n.translate('xpack.pnd.watches.settings.autonomy.manual.description', {
    defaultMessage:
      'Nothing runs on its own. The Watch drafts actions and every one of them waits for your review.',
  }),
  assisted: i18n.translate('xpack.pnd.watches.settings.autonomy.assisted.description', {
    defaultMessage:
      'Routine, reversible steps run on their own. Anything consequential is staged and waits for approval.',
  }),
  supervised: i18n.translate('xpack.pnd.watches.settings.autonomy.supervised.description', {
    defaultMessage:
      'The Watch acts within its allow-list and tells you afterwards. Consequential actions still gate.',
  }),
};

export const autonomyLevelName = (levelId: string): string =>
  AUTONOMY_LEVEL_NAMES[levelId] ?? levelId;

export const AUTONOMY_RANGE_ARIA_LABEL = i18n.translate(
  'xpack.pnd.watches.settings.autonomy.rangeAriaLabel',
  { defaultMessage: 'Autonomy level' }
);

/* -------------------------------------------------------------------------- */
/* Header identity line (what the General section collapsed into)             */
/* -------------------------------------------------------------------------- */

/**
 * Accessible name for the run-as identity line under the watch's description.
 *
 * The 2026-08-17 simplification collapsed the whole General section into the header: the run-as
 * account is now a muted lock icon plus a monospace account name, with no field label and no MVP-scope
 * callout. A lock glyph beside bare text carries no meaning to a screen reader, so the pair is labelled
 * here instead — the visual label the `EuiFormRow` used to supply is exactly what the design removed.
 */
export const RUN_AS_IDENTITY_ARIA_LABEL = i18n.translate(
  'xpack.pnd.watches.settings.header.runAsAriaLabel',
  { defaultMessage: 'Runs as service account' }
);

/* -------------------------------------------------------------------------- */
/* Triggers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * ⚠️ The message **ids** below still read `schedule*` while the copy reads "Frequency".
 *
 * Deliberate, and the same call bead kibana-phf4.25 made for decision 6's "Open an incident": an id is
 * a translation key, so churning it drops every existing translation of a string whose meaning did not
 * change. The rule bead kibana-phf4.15 set is change `defaultMessage`, never the id.
 */
export const SCHEDULE_LABEL = i18n.translate('xpack.pnd.watches.settings.triggers.scheduleLabel', {
  defaultMessage: 'Frequency',
});

export const SCHEDULE_HELP = i18n.translate('xpack.pnd.watches.settings.triggers.scheduleHelp', {
  defaultMessage: "How often this Watch runs. Persisted output triggers this Watch's Workers.",
});

/**
 * Shown instead of the Frequency select on a watch in {@link PND_SIGNAL_DRIVEN_WATCH_TRIGGERS}.
 *
 * A frequency on such a watch would be a lie: nothing is polled. Ours is the phase-4 post-incident
 * watch, which runs when a producer raises a `security.detectionChangeSignal`, so the body names the
 * real producers from its own trigger condition rather than the prototype's "every watch" — Watch
 * Floor, Watch Officer, Dark Watch and Deep Watch are exactly the four `sourceWatchId` values that
 * condition admits.
 */
export const SIGNAL_DRIVEN_CALLOUT_TITLE = i18n.translate(
  'xpack.pnd.watches.settings.triggers.signalDrivenTitle',
  { defaultMessage: 'Signal-driven' }
);

export const SIGNAL_DRIVEN_CALLOUT_BODY = i18n.translate(
  'xpack.pnd.watches.settings.triggers.signalDrivenBody',
  {
    defaultMessage:
      'This Watch has no frequency: it runs when another Watch raises a detection change signal — a contained incident from Watch Floor, a finding from Watch Officer, or a coverage gap from Dark Watch or Deep Watch. Every run records the signal that triggered it.',
  }
);

export const MANUAL_RUN_LABEL = i18n.translate(
  'xpack.pnd.watches.settings.triggers.manualRunLabel',
  { defaultMessage: 'Manual run' }
);

export const MANUAL_RUN_SWITCH_LABEL = i18n.translate(
  'xpack.pnd.watches.settings.triggers.manualRunSwitchLabel',
  { defaultMessage: 'Allow manual run' }
);

export const MANUAL_RUN_HELP = i18n.translate('xpack.pnd.watches.settings.triggers.manualRunHelp', {
  defaultMessage: 'Lets an analyst start a run outside the schedule.',
});

export const SCHEDULE_OPTION_LABELS: Record<string, string> = {
  'every-5m': i18n.translate('xpack.pnd.watches.settings.schedule.every5m', {
    defaultMessage: 'Every 5 minutes',
  }),
  'every-15m': i18n.translate('xpack.pnd.watches.settings.schedule.every15m', {
    defaultMessage: 'Every 15 minutes',
  }),
  'every-30m': i18n.translate('xpack.pnd.watches.settings.schedule.every30m', {
    defaultMessage: 'Every 30 minutes',
  }),
  hourly: i18n.translate('xpack.pnd.watches.settings.schedule.hourly', {
    defaultMessage: 'Every hour',
  }),
};

/* -------------------------------------------------------------------------- */
/* Scope & routing                                                            */
/* -------------------------------------------------------------------------- */

export const DATA_SOURCES_LABEL = i18n.translate('xpack.pnd.watches.settings.scope.dataSources', {
  defaultMessage: 'Allowed data sources',
});

export const DATA_SOURCES_HELP = i18n.translate(
  'xpack.pnd.watches.settings.scope.dataSourcesHelp',
  {
    defaultMessage: 'What this Watch may read while it works.',
  }
);

export const ASSIGNEE_QUEUE_LABEL = i18n.translate(
  'xpack.pnd.watches.settings.scope.assigneeQueue',
  { defaultMessage: 'Default assignee queue' }
);

export const ASSIGNEE_QUEUE_HELP = i18n.translate(
  'xpack.pnd.watches.settings.scope.assigneeQueueHelp',
  { defaultMessage: 'Where actions land for review.' }
);

export const ESCALATION_CONTACT_LABEL = i18n.translate(
  'xpack.pnd.watches.settings.scope.escalationContact',
  { defaultMessage: 'Escalation contact' }
);

export const ESCALATION_CONTACT_HELP = i18n.translate(
  'xpack.pnd.watches.settings.scope.escalationContactHelp',
  { defaultMessage: 'Who is paged when something cannot wait for the queue.' }
);

export const DATA_BOUNDARIES_TITLE = i18n.translate(
  'xpack.pnd.watches.settings.scope.dataBoundaries',
  { defaultMessage: 'Data boundaries' }
);

export const DATA_SOURCE_OPTION_LABELS: Record<string, string> = {
  'alerts-only': i18n.translate('xpack.pnd.watches.settings.dataSources.alertsOnly', {
    defaultMessage: 'Alerts',
  }),
  'alerts-entities': i18n.translate('xpack.pnd.watches.settings.dataSources.alertsEntities', {
    defaultMessage: 'Alerts, entities',
  }),
  'alerts-entities-timelines': i18n.translate(
    'xpack.pnd.watches.settings.dataSources.alertsEntitiesTimelines',
    { defaultMessage: 'Alerts, entities, timelines' }
  ),
  'alerts-entities-timelines-edr': i18n.translate(
    'xpack.pnd.watches.settings.dataSources.alertsEntitiesTimelinesEdr',
    { defaultMessage: 'Alerts, entities, timelines, EDR telemetry' }
  ),
};

export const ASSIGNEE_QUEUE_OPTION_LABELS: Record<string, string> = {
  unassigned: i18n.translate('xpack.pnd.watches.settings.assigneeQueue.unassigned', {
    defaultMessage: 'Unassigned',
  }),
  'tier-1-alert-triage': i18n.translate('xpack.pnd.watches.settings.assigneeQueue.tier1', {
    defaultMessage: 'Tier 1 — Alert triage',
  }),
  'tier-2-escalations': i18n.translate('xpack.pnd.watches.settings.assigneeQueue.tier2', {
    defaultMessage: 'Tier 2 — Escalations',
  }),
  'detection-engineering': i18n.translate(
    'xpack.pnd.watches.settings.assigneeQueue.detectionEngineering',
    { defaultMessage: 'Detection engineering' }
  ),
  'threat-hunting': i18n.translate('xpack.pnd.watches.settings.assigneeQueue.threatHunting', {
    defaultMessage: 'Threat hunting',
  }),
};

export const ESCALATION_CONTACT_OPTION_LABELS: Record<string, string> = {
  none: i18n.translate('xpack.pnd.watches.settings.escalationContact.none', {
    defaultMessage: 'None',
  }),
  'soc-lead-on-call': i18n.translate('xpack.pnd.watches.settings.escalationContact.socLead', {
    defaultMessage: 'SOC lead on-call',
  }),
  'ir-on-call': i18n.translate('xpack.pnd.watches.settings.escalationContact.irOnCall', {
    defaultMessage: 'IR on-call',
  }),
  'detection-lead': i18n.translate('xpack.pnd.watches.settings.escalationContact.detectionLead', {
    defaultMessage: 'Detection lead',
  }),
};

/* -------------------------------------------------------------------------- */
/* Workers & skills sections                                                  */
/* -------------------------------------------------------------------------- */

/**
 * "View all …" links on the Workers and Skills section headers (2026-08-17 simplification).
 *
 * Both catalogs already exist as full pages in this section's subnav, so the link is navigation rather
 * than a new surface: the section lists what *this* watch attaches, and the catalog lists every one.
 */
export const VIEW_ALL_WORKERS = i18n.translate('xpack.pnd.watches.settings.viewAllWorkers', {
  defaultMessage: 'View all workers',
});

export const VIEW_ALL_SKILLS = i18n.translate('xpack.pnd.watches.settings.viewAllSkills', {
  defaultMessage: 'View all skills',
});

export const COL_SKILL = i18n.translate('xpack.pnd.watches.settings.col.skill', {
  defaultMessage: 'Skill',
});

export const STATUS_ENABLED = i18n.translate('xpack.pnd.watches.settings.status.enabled', {
  defaultMessage: 'enabled',
});

export const STATUS_DISABLED = i18n.translate('xpack.pnd.watches.settings.status.disabled', {
  defaultMessage: 'disabled',
});

export const STATUS_UNAVAILABLE = i18n.translate('xpack.pnd.watches.settings.status.unavailable', {
  defaultMessage: 'unavailable',
});

export const STATUS_DISABLED_GLOBALLY = i18n.translate(
  'xpack.pnd.watches.settings.status.disabledGlobally',
  { defaultMessage: 'disabled for every Watch' }
);

export const lastRunStatus = (relativeTime: string) =>
  i18n.translate('xpack.pnd.watches.settings.status.lastRun', {
    defaultMessage: 'last run {relativeTime}',
    values: { relativeTime },
  });

/* -------------------------------------------------------------------------- */
/* Run ledger                                                                 */
/* -------------------------------------------------------------------------- */

export const COL_TIME = i18n.translate('xpack.pnd.watches.settings.ledger.col.time', {
  defaultMessage: 'Time',
});

export const COL_WORKFLOW = i18n.translate('xpack.pnd.watches.settings.ledger.col.workflow', {
  defaultMessage: 'Workflow',
});

export const COL_ACTION = i18n.translate('xpack.pnd.watches.settings.ledger.col.action', {
  defaultMessage: 'Action',
});

export const COL_EVENT = i18n.translate('xpack.pnd.watches.settings.ledger.col.event', {
  defaultMessage: 'Event',
});

export const COL_OUTCOME = i18n.translate('xpack.pnd.watches.settings.ledger.col.outcome', {
  defaultMessage: 'Outcome',
});

export const NO_LEDGER_ENTRIES = i18n.translate('xpack.pnd.watches.settings.ledger.empty', {
  defaultMessage: 'No runs recorded for this Watch yet.',
});

export const RUN_ACTION_LABELS: Record<string, string> = {
  read: i18n.translate('xpack.pnd.watches.settings.ledger.action.read', {
    defaultMessage: 'Read',
  }),
  draft: i18n.translate('xpack.pnd.watches.settings.ledger.action.draft', {
    defaultMessage: 'Draft',
  }),
  gated: i18n.translate('xpack.pnd.watches.settings.ledger.action.gated', {
    defaultMessage: 'Gated',
  }),
  auto: i18n.translate('xpack.pnd.watches.settings.ledger.action.auto', {
    defaultMessage: 'Auto',
  }),
};

export const RUN_OUTCOME_LABELS: Record<string, string> = {
  'awaiting-review': i18n.translate('xpack.pnd.watches.settings.ledger.outcome.awaitingReview', {
    defaultMessage: 'Awaiting review',
  }),
  accepted: i18n.translate('xpack.pnd.watches.settings.ledger.outcome.accepted', {
    defaultMessage: 'Accepted',
  }),
  dismissed: i18n.translate('xpack.pnd.watches.settings.ledger.outcome.dismissed', {
    defaultMessage: 'Dismissed',
  }),
  executed: i18n.translate('xpack.pnd.watches.settings.ledger.outcome.executed', {
    defaultMessage: 'Executed',
  }),
  completed: i18n.translate('xpack.pnd.watches.settings.ledger.outcome.completed', {
    defaultMessage: 'Completed',
  }),
};

/* -------------------------------------------------------------------------- */
/* Per-watch intro                                                            */
/* -------------------------------------------------------------------------- */

const WATCH_INTROS: Record<string, string> = {
  [SYSTEM_SECURITY_WATCH_FLOOR_ID]: i18n.translate('xpack.pnd.watches.settings.intro.floor', {
    defaultMessage:
      'A group of Workers that reduce alert volume and route what matters. One Watch, one or more Workers. Everything below configures this one Watch — Agents are managed in Workflows & Agent Builder.',
  }),
  [SYSTEM_SECURITY_WATCH_OFFICER_ID]: i18n.translate('xpack.pnd.watches.settings.intro.officer', {
    defaultMessage:
      'Takes what the Floor hands over and decides who needs to know. Assembles cases, escalates criticals, and stages response actions for approval. Everything below configures this one Watch.',
  }),
  [SYSTEM_SECURITY_WATCH_DARK_ID]: i18n.translate('xpack.pnd.watches.settings.intro.dark', {
    defaultMessage:
      'Hunts continuously for threats and coverage gaps nobody has reported yet, and sweeps overnight. Findings arrive as reviewable evidence rather than alerts. Everything below configures this one Watch.',
  }),
  [SYSTEM_SECURITY_WATCH_DEEP_ID]: i18n.translate('xpack.pnd.watches.settings.intro.deep', {
    defaultMessage:
      'Specialist depth on demand — forensics, timelines, and hunts that need more than triage. Draws draft-only conclusions for a human to confirm. Everything below configures this one Watch.',
  }),
  [SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID]: i18n.translate(
    'xpack.pnd.watches.settings.intro.detection',
    {
      defaultMessage:
        'Turns false-positive noise and coverage gaps into reviewable rule actions — tuning, new rules, and prebuilt onboarding. Nothing ships without a detection engineer. Everything below configures this one Watch.',
    }
  ),
};

export const watchIntro = (watchId: string): string | undefined => WATCH_INTROS[watchId];
