/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.pnd.watches.workers.pageTitle', {
  defaultMessage: 'Workers',
});

export const PAGE_SUBTITLE = i18n.translate('xpack.pnd.watches.workers.pageSubtitle', {
  defaultMessage: 'The agent steps the Watch lanes run',
});

export const TABLE_CAPTION = i18n.translate('xpack.pnd.watches.workers.tableCaption', {
  defaultMessage: 'Workers the Security Watch lanes run',
});

export const COL_WORKER = i18n.translate('xpack.pnd.watches.workers.col.worker', {
  defaultMessage: 'Worker',
});

export const COL_PHASE = i18n.translate('xpack.pnd.watches.workers.col.phase', {
  defaultMessage: 'Phase',
});

export const COL_AGENT = i18n.translate('xpack.pnd.watches.workers.col.agent', {
  defaultMessage: 'Agent',
});

export const COL_WATCHES = i18n.translate('xpack.pnd.watches.workers.col.watches', {
  defaultMessage: 'Watches',
});

export const NO_WORKERS = i18n.translate('xpack.pnd.watches.workers.empty', {
  defaultMessage: 'No workers are available yet.',
});

export const LOAD_ERROR = i18n.translate('xpack.pnd.watches.workers.loadError', {
  defaultMessage: 'Unable to load workers.',
});

export const workerSkills = (skillIds: string) =>
  i18n.translate('xpack.pnd.watches.workers.skills', {
    defaultMessage: 'Skills: {skillIds}',
    values: { skillIds },
  });

export const NO_SKILLS = i18n.translate('xpack.pnd.watches.workers.noSkills', {
  defaultMessage: 'No skills configured',
});

/**
 * Name and description per worker id, where a worker id is the orchestrator step name the lane
 * declares. The API carries ids only, so all worker copy lives here.
 *
 * Keep in step with the `ai.agent` steps of the managed watch definitions: these are what
 * `projectWorkers` in the server projects the catalog from, and an id missing here renders as its raw
 * step name rather than breaking. Today `watch_floor.yaml` contributes the first five and
 * `watch_post_incident.yaml` the last three; no other lane runs an agent PND installs.
 */
export const WORKER_NAMES: Record<string, string> = {
  draft_tuning: i18n.translate('xpack.pnd.watches.workers.draftTuning.name', {
    defaultMessage: 'Draft tuning',
  }),
  recommend_actions: i18n.translate('xpack.pnd.watches.workers.recommendActions.name', {
    defaultMessage: 'Recommend containment actions',
  }),
  open_incident: i18n.translate('xpack.pnd.watches.workers.openIncident.name', {
    defaultMessage: 'Open incident',
  }),
  open_investigation: i18n.translate('xpack.pnd.watches.workers.openInvestigation.name', {
    defaultMessage: 'Open investigation',
  }),
  record_containment_outcome: i18n.translate(
    'xpack.pnd.watches.workers.recordContainmentOutcome.name',
    {
      defaultMessage: 'Record containment outcome',
    }
  ),
  record_dismissed_incident: i18n.translate(
    'xpack.pnd.watches.workers.recordDismissedIncident.name',
    {
      defaultMessage: 'Record dismissed incident',
    }
  ),
  record_dismissed_investigation: i18n.translate(
    'xpack.pnd.watches.workers.recordDismissedInvestigation.name',
    {
      defaultMessage: 'Record dismissed investigation',
    }
  ),
  record_dismissed_tuning: i18n.translate('xpack.pnd.watches.workers.recordDismissedTuning.name', {
    defaultMessage: 'Record dismissed tuning',
  }),
  record_tuning_outcome: i18n.translate('xpack.pnd.watches.workers.recordTuningOutcome.name', {
    defaultMessage: 'Record tuning outcome',
  }),
};

export const WORKER_DESCRIPTIONS: Record<string, string> = {
  draft_tuning: i18n.translate('xpack.pnd.watches.workers.draftTuning.description', {
    defaultMessage:
      'Drafts a detection-rule change from the incident, with the query diff and its backtested impact, for a human to approve.',
  }),
  recommend_actions: i18n.translate('xpack.pnd.watches.workers.recommendActions.description', {
    defaultMessage:
      'Stages evidence-based containment and response actions for the incident via the recommended-actions skill; a per-action human gate approves what executes.',
  }),
  open_incident: i18n.translate('xpack.pnd.watches.workers.openIncident.description', {
    defaultMessage:
      'Opens the incident thread once an escalation is approved, and assembles the picture the analyst answers the containment gate against.',
  }),
  open_investigation: i18n.translate('xpack.pnd.watches.workers.openInvestigation.description', {
    defaultMessage:
      'Opens the investigation thread for an attack discovery: fetches the alert, correlates related alerts, enriches with threat intel, and assesses entity risk.',
  }),
  record_containment_outcome: i18n.translate(
    'xpack.pnd.watches.workers.recordContainmentOutcome.description',
    {
      defaultMessage:
        "Appends the analyst's containment decision to the incident thread, so the thread records what was actually done.",
    }
  ),
  record_dismissed_incident: i18n.translate(
    'xpack.pnd.watches.workers.recordDismissedIncident.description',
    {
      defaultMessage:
        'Appends a refused escalation to the investigation thread, where the escalation was proposed.',
    }
  ),
  record_dismissed_investigation: i18n.translate(
    'xpack.pnd.watches.workers.recordDismissedInvestigation.description',
    {
      defaultMessage:
        'Appends a dismissed attack discovery to the investigation thread, rather than leaving the dismissal unrecorded.',
    }
  ),
  record_dismissed_tuning: i18n.translate(
    'xpack.pnd.watches.workers.recordDismissedTuning.description',
    {
      defaultMessage:
        'Appends a refused rule change to the tuning thread, the most consequential thing a human says on that path.',
    }
  ),
  record_tuning_outcome: i18n.translate(
    'xpack.pnd.watches.workers.recordTuningOutcome.description',
    {
      defaultMessage: 'Appends the approved rule change to the tuning thread as an audit record.',
    }
  ),
};

export const workerName = (workerId: string): string => WORKER_NAMES[workerId] ?? workerId;
export const workerDescription = (workerId: string): string | undefined =>
  WORKER_DESCRIPTIONS[workerId];
