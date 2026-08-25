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
  defaultMessage: 'Orchestrated work shared across Watches',
});

export const TABLE_CAPTION = i18n.translate('xpack.pnd.watches.workers.tableCaption', {
  defaultMessage: 'Workers available to Security Watches',
});

export const COL_WORKER = i18n.translate('xpack.pnd.watches.workers.col.worker', {
  defaultMessage: 'Worker',
});

export const COL_WATCHES = i18n.translate('xpack.pnd.watches.workers.col.watches', {
  defaultMessage: 'Watches',
});

export const COL_LAST_RUN = i18n.translate('xpack.pnd.watches.workers.col.lastRun', {
  defaultMessage: 'Last run',
});

export const COL_ENABLED = i18n.translate('xpack.pnd.watches.workers.col.enabled', {
  defaultMessage: 'Enabled',
});

export const NO_WORKERS = i18n.translate('xpack.pnd.watches.workers.empty', {
  defaultMessage: 'No workers are available yet.',
});

export const LOAD_ERROR = i18n.translate('xpack.pnd.watches.workers.loadError', {
  defaultMessage: 'Unable to load workers.',
});

export const NOT_IMPLEMENTED_TITLE = i18n.translate(
  'xpack.pnd.watches.workers.notImplemented.title',
  {
    defaultMessage: 'Workers are not implemented yet',
  }
);

export const NOT_IMPLEMENTED_BODY = i18n.translate(
  'xpack.pnd.watches.workers.notImplemented.body',
  {
    defaultMessage:
      'The worker catalog has no durable storage in live mode. Open a Watch on the left to change its settings.',
  }
);

export const enableWorkerAriaLabel = (name: string) =>
  i18n.translate('xpack.pnd.watches.workers.enableAriaLabel', {
    defaultMessage: 'Enable worker {name}',
    values: { name },
  });

/**
 * Name and description per worker id. The API carries ids only, so all worker copy lives here.
 * Keep in step with `WORKERS_SEED` in `@kbn/pnd-common`.
 */
export const WORKER_NAMES: Record<string, string> = {
  'threat-intel-enrichment': i18n.translate(
    'xpack.pnd.watches.workers.threatIntelEnrichment.name',
    {
      defaultMessage: 'Threat intel enrichment',
    }
  ),
  'alert-correlation': i18n.translate('xpack.pnd.watches.workers.alertCorrelation.name', {
    defaultMessage: 'Alert correlation',
  }),
  'host-context': i18n.translate('xpack.pnd.watches.workers.hostContext.name', {
    defaultMessage: 'Host context',
  }),
  'attack-discovery-continuation': i18n.translate(
    'xpack.pnd.watches.workers.attackDiscoveryContinuation.name',
    {
      defaultMessage: 'Attack Discovery continuation',
    }
  ),
  containment: i18n.translate('xpack.pnd.watches.workers.containment.name', {
    defaultMessage: 'Containment',
  }),
  'case-assembly': i18n.translate('xpack.pnd.watches.workers.caseAssembly.name', {
    defaultMessage: 'Case assembly',
  }),
  'rule-tuning': i18n.translate('xpack.pnd.watches.workers.ruleTuning.name', {
    defaultMessage: 'Rule tuning',
  }),
  'rule-creation': i18n.translate('xpack.pnd.watches.workers.ruleCreation.name', {
    defaultMessage: 'Rule creation',
  }),
  'prebuilt-rule-onboarding': i18n.translate(
    'xpack.pnd.watches.workers.prebuiltRuleOnboarding.name',
    {
      defaultMessage: 'Prebuilt rule onboarding',
    }
  ),
};

export const WORKER_DESCRIPTIONS: Record<string, string> = {
  'threat-intel-enrichment': i18n.translate(
    'xpack.pnd.watches.workers.threatIntelEnrichment.description',
    {
      defaultMessage: 'Pulls external intel into alerts and drafts enrichment context for triage.',
    }
  ),
  'alert-correlation': i18n.translate('xpack.pnd.watches.workers.alertCorrelation.description', {
    defaultMessage: 'Groups related alerts into a single proposed case or finding.',
  }),
  'host-context': i18n.translate('xpack.pnd.watches.workers.hostContext.description', {
    defaultMessage: 'Attaches host, user, and asset context for investigation readiness.',
  }),
  'attack-discovery-continuation': i18n.translate(
    'xpack.pnd.watches.workers.attackDiscoveryContinuation.description',
    {
      defaultMessage: 'Builds investigation evidence and an attack-assessment proposal from AD.',
    }
  ),
  containment: i18n.translate('xpack.pnd.watches.workers.containment.description', {
    defaultMessage: 'Executes scoped response actions when a Watch is allowed to act.',
  }),
  'case-assembly': i18n.translate('xpack.pnd.watches.workers.caseAssembly.description', {
    defaultMessage: 'Assembles drafted cases for human review and hand-off.',
  }),
  'rule-tuning': i18n.translate('xpack.pnd.watches.workers.ruleTuning.description', {
    defaultMessage:
      'Routes each false-positive signal to an exception, suppression, or rule-update proposal, with rule diff and expected impact. Works on rules of any type.',
  }),
  'rule-creation': i18n.translate('xpack.pnd.watches.workers.ruleCreation.description', {
    defaultMessage:
      'Drafts new-rule proposals from coverage gap signals, with ATT&CK mapping and backtest summary. Checks installed and prebuilt rules first and defers to tuning when an existing rule covers the gap. MVP supports ES|QL rule types only.',
  }),
  'prebuilt-rule-onboarding': i18n.translate(
    'xpack.pnd.watches.workers.prebuiltRuleOnboarding.description',
    {
      defaultMessage:
        'Recommends prebuilt rules relevant to active data sources and drafts installation proposals with environment-specific configuration.',
    }
  ),
};

export const workerName = (workerId: string): string => WORKER_NAMES[workerId] ?? workerId;
export const workerDescription = (workerId: string): string | undefined =>
  WORKER_DESCRIPTIONS[workerId];
